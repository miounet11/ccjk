/**
 * MCP Server Implementation
 * Implements Model Context Protocol server for CCJK
 * Supports both stdio and HTTP transport modes
 */

import type { Server as HttpServer } from 'node:http'
import { createServer } from 'node:http'
import process from 'node:process'
import { MCPHandler } from './mcp-handler'
import { MCP_TOOLS } from './mcp-tools'

export interface MCPServerOptions {
  transport?: 'stdio' | 'http'
  port?: number
  host?: string
  debug?: boolean
}

export interface MCPRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id?: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface MCPServerInfo {
  name: string
  version: string
  protocolVersion: string
  capabilities: {
    tools: boolean
    prompts: boolean
    resources: boolean
  }
}

/**
 * MCP Server Class
 * Handles MCP protocol communication and tool execution
 */
export class MCPServer {
  private handler: MCPHandler
  private httpServer?: HttpServer
  private options: Required<MCPServerOptions>
  private serverInfo: MCPServerInfo
  private initialized = false

  constructor(options: MCPServerOptions = {}) {
    this.options = {
      transport: options.transport || 'stdio',
      port: options.port || 3000,
      host: options.host || 'localhost',
      debug: options.debug || false,
    }

    this.handler = new MCPHandler()
    this.serverInfo = {
      name: 'ccjk-mcp-server',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: true,
        prompts: false,
        resources: false,
      },
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.options.transport === 'stdio') {
      await this.startStdio()
    }
    else {
      await this.startHttp()
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve, reject) => {
        this.httpServer!.close((err) => {
          if (err)
            reject(err)
          else resolve()
        })
      })
    }
  }

  /**
   * Start stdio transport mode
   */
  private async startStdio(): Promise<void> {
    this.log('Starting MCP server in stdio mode...')

    // Set up stdin/stdout communication
    process.stdin.setEncoding('utf8')

    let buffer = ''

    process.stdin.on('data', (chunk) => {
      buffer += chunk

      // Process complete JSON-RPC messages (newline-delimited)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          this.handleStdioMessage(line).catch((error) => {
            this.logError('Error handling stdio message:', error)
          })
        }
      }
    })

    process.stdin.on('end', () => {
      this.log('Stdin closed, shutting down...')
      process.exit(0)
    })

    this.log('MCP server ready (stdio mode)')
  }

  /**
   * Start HTTP transport mode
   */
  private async startHttp(): Promise<void> {
    this.log(`Starting MCP server in HTTP mode on ${this.options.host}:${this.options.port}...`)

    this.httpServer = createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const request = JSON.parse(body) as MCPRequest
          const response = await this.handleRequest(request)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        }
        catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error',
              data: error instanceof Error ? error.message : String(error),
            },
          }))
        }
      })
    })

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.options.port, this.options.host, () => {
        this.log(`MCP server listening on http://${this.options.host}:${this.options.port}`)
        resolve()
      })

      this.httpServer!.on('error', reject)
    })
  }

  /**
   * Handle stdio message
   */
  private async handleStdioMessage(message: string): Promise<void> {
    try {
      const request = JSON.parse(message) as MCPRequest
      const response = await this.handleRequest(request)

      // Send response to stdout
      process.stdout.write(`${JSON.stringify(response)}\n`)
    }
    catch (error) {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error instanceof Error ? error.message : String(error),
        },
      }
      process.stdout.write(`${JSON.stringify(errorResponse)}\n`)
    }
  }

  /**
   * Handle MCP request
   */
  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    this.log(`Received request: ${request.method}`)

    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request)
        case 'tools/list':
          return this.handleToolsList(request)
        case 'tools/call':
          return await this.handleToolsCall(request)
        case 'ping':
          return this.handlePing(request)
        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          }
      }
    }
    catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: MCPRequest): MCPResponse {
    this.initialized = true
    this.log('Server initialized')

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: this.serverInfo.protocolVersion,
        capabilities: this.serverInfo.capabilities,
        serverInfo: {
          name: this.serverInfo.name,
          version: this.serverInfo.version,
        },
      },
    }
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(request: MCPRequest): MCPResponse {
    if (!this.initialized) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32002,
          message: 'Server not initialized',
        },
      }
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: MCP_TOOLS,
      },
    }
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    if (!this.initialized) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32002,
          message: 'Server not initialized',
        },
      }
    }

    const { name, arguments: args } = request.params || {}

    if (!name) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32602,
          message: 'Invalid params: missing tool name',
        },
      }
    }

    this.log(`Calling tool: ${name}`)

    const result = await this.handler.handleToolCall(name, args || {})

    if (!result.success) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000,
          message: result.error || 'Tool execution failed',
        },
      }
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      },
    }
  }

  /**
   * Handle ping request
   */
  private handlePing(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Log message (only in debug mode)
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.error('[MCP Server]', ...args)
    }
  }

  /**
   * Log error (always)
   */
  private logError(...args: any[]): void {
    console.error('[MCP Server Error]', ...args)
  }
}

/**
 * Create and start MCP server
 */
export async function startMCPServer(options: MCPServerOptions = {}): Promise<MCPServer> {
  const server = new MCPServer(options)
  await server.start()
  return server
}
