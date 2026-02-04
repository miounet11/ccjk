/**
 * LSP Client - JSON-RPC client wrapper for Language Server Protocol
 *
 * Handles communication with LSP servers via stdio transport.
 * Supports request/response pattern with proper error handling.
 */

import type { ChildProcess } from 'node:child_process'
import type {
  LspCompletionItem,
  LspCompletionList,
  LspDiagnostic,
  LspHover,
  LspLocation,
  LspReferenceParams,
  LspServerCapabilities,
  LspServerConfig,
  LspTextDocumentPositionParams,
} from '../types/lsp'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { dirname, join } from 'pathe'
import { commandExists, isWindows } from '../utils/platform'

/**
 * JSON-RPC request format
 */
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

/**
 * JSON-RPC response format
 */
interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

/**
 * JSON-RPC notification format
 */
interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

/**
 * Pending request tracker
 */
interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
  method: string
}

/**
 * LSP client configuration options
 */
export interface LspClientOptions {
  /** Request timeout in milliseconds (default: 5000) */
  requestTimeout?: number
  /** Enable debug logging */
  debug?: boolean
  /** Logger function */
  logger?: (message: string, ...args: any[]) => void
}

/**
 * LSP Client class for handling JSON-RPC communication with LSP servers
 */
export class LspClient extends EventEmitter {
  private process: ChildProcess | null = null
  private pendingRequests = new Map<string | number, PendingRequest>()
  private messageId = 0
  private isInitialized = false
  private capabilities: LspServerCapabilities | null = null
  private requestTimeout: number
  private debug: boolean
  private logger: (message: string, ...args: any[]) => void
  private isShuttingDown = false
  private buffer = ''
  private contentLength = 0
  private readingHeaders = true

  constructor(
    private config: LspServerConfig,
    options: LspClientOptions = {},
  ) {
    super()
    this.requestTimeout = options.requestTimeout ?? 5000
    this.debug = options.debug ?? false
    this.logger = options.logger ?? console.debug
  }

  /**
   * Start the LSP server process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('LSP client already started')
    }

    const command = isWindows() && !this.config.command.endsWith('.cmd')
      ? `${this.config.command}.cmd`
      : this.config.command

    const args = this.config.args ?? []
    const env = { ...process.env, ...this.config.env }
    const cwd = this.config.cwd ?? process.cwd()

    this.log('Starting LSP server:', command, args)

    try {
      this.process = spawn(command, args, {
        env,
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      // Set up process event handlers
      this.process.on('error', (error) => {
        this.log('LSP process error:', error)
        this.emit('error', error)
        this.rejectAllPending(error)
      })

      this.process.on('exit', (code, signal) => {
        this.log(`LSP process exited: code=${code}, signal=${signal}`)
        this.isInitialized = false
        this.capabilities = null
        this.emit('exit', { code, signal })
        this.rejectAllPending(new Error(`Process exited: ${code ?? signal}`))
      })

      // Set up stdout handler for LSP messages
      this.process.stdout?.on('data', (data) => {
        this.handleData(data)
      })

      // Set up stderr handler for logging
      this.process.stderr?.on('data', (data) => {
        this.log('LSP stderr:', data.toString())
      })

      // Initialize the LSP server
      await this.initialize()

      this.log('LSP server started successfully')
      this.emit('started')
    }
    catch (error) {
      this.log('Failed to start LSP server:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Stop the LSP server process
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true

    // Reject all pending requests
    this.rejectAllPending(new Error('Client is shutting down'))

    if (!this.process) {
      return
    }

    this.log('Stopping LSP server...')

    // Try to shutdown gracefully
    try {
      await this.sendRequest('shutdown', {})
      await this.sendNotification('exit')
    }
    catch {
      // Ignore shutdown errors
    }

    // Kill the process if still running
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM')
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL')
          }
          resolve()
        }, 1000)
        this.process?.once('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    this.process = null
    this.isInitialized = false
    this.capabilities = null
    this.isShuttingDown = false
    this.buffer = ''
    this.contentLength = 0
    this.readingHeaders = true

    this.log('LSP server stopped')
    this.emit('stopped')
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.process !== null && !this.process.killed && this.isInitialized
  }

  /**
   * Get the process ID (if running)
   */
  getPid(): number | undefined {
    return this.process?.pid
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): LspServerCapabilities | null {
    return this.capabilities
  }

  /**
   * Check if a specific feature is supported
   */
  supportsFeature(feature: keyof LspServerCapabilities): boolean {
    if (!this.capabilities) {
      return false
    }
    const value = this.capabilities[feature]
    return value !== undefined && value !== false
  }

  /**
   * Send a request to the LSP server
   */
  async sendRequest<T = any>(method: string, params?: any, timeout?: number): Promise<T> {
    if (!this.process || this.process.killed) {
      throw new Error('LSP process is not running')
    }

    if (this.isShuttingDown) {
      throw new Error('Client is shutting down')
    }

    const id = ++this.messageId
    const requestTimeout = timeout ?? this.requestTimeout

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method} (${requestTimeout}ms)`))
      }, requestTimeout)

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
        method,
      })

      const message: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      }

      this.sendMessage(message)
    })
  }

  /**
   * Send a notification to the LSP server (no response expected)
   */
  sendNotification(method: string, params?: any): void {
    if (!this.process || this.process.killed) {
      throw new Error('LSP process is not running')
    }

    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }

    this.sendMessage(notification)
  }

  /**
   * Go to definition at position
   */
  async goToDefinition(params: LspTextDocumentPositionParams): Promise<LspLocation[]> {
    if (!this.supportsFeature('definitionProvider')) {
      throw new Error('Definition provider not supported')
    }
    return this.sendRequest<LspLocation[]>('textDocument/definition', params)
  }

  /**
   * Go to type definition at position
   */
  async goToTypeDefinition(params: LspTextDocumentPositionParams): Promise<LspLocation[]> {
    if (!this.supportsFeature('typeDefinitionProvider')) {
      throw new Error('Type definition provider not supported')
    }
    return this.sendRequest<LspLocation[]>('textDocument/typeDefinition', params)
  }

  /**
   * Go to implementation at position
   */
  async goToImplementation(params: LspTextDocumentPositionParams): Promise<LspLocation[]> {
    if (!this.supportsFeature('implementationProvider')) {
      throw new Error('Implementation provider not supported')
    }
    return this.sendRequest<LspLocation[]>('textDocument/implementation', params)
  }

  /**
   * Find references to symbol at position
   */
  async findReferences(params: LspReferenceParams): Promise<LspLocation[]> {
    if (!this.supportsFeature('referencesProvider')) {
      throw new Error('References provider not supported')
    }
    return this.sendRequest<LspLocation[]>('textDocument/references', params)
  }

  /**
   * Get hover information at position
   */
  async hover(params: LspTextDocumentPositionParams): Promise<LspHover | null> {
    if (!this.supportsFeature('hoverProvider')) {
      throw new Error('Hover provider not supported')
    }
    return this.sendRequest<LspHover>('textDocument/hover', params)
  }

  /**
   * Get completions at position
   */
  async completions(params: LspTextDocumentPositionParams): Promise<LspCompletionList> {
    if (!this.supportsFeature('completionProvider')) {
      throw new Error('Completion provider not supported')
    }
    return this.sendRequest<LspCompletionList>('textDocument/completion', params)
  }

  /**
   * Resolve a completion item
   */
  async resolveCompletion(item: LspCompletionItem): Promise<LspCompletionItem> {
    const provider = this.capabilities?.completionProvider
    if (typeof provider === 'object' && provider?.resolveProvider) {
      return this.sendRequest<LspCompletionItem>('completionItem/resolve', item)
    }
    return item
  }

  /**
   * Get document symbols
   */
  async documentSymbols(params: { textDocument: { uri: string } }): Promise<any[]> {
    if (!this.supportsFeature('documentSymbolProvider')) {
      throw new Error('Document symbol provider not supported')
    }
    return this.sendRequest('textDocument/documentSymbol', params)
  }

  /**
   * Get workspace symbols
   */
  async workspaceSymbols(params: { query: string }): Promise<any[]> {
    if (!this.supportsFeature('workspaceSymbolProvider')) {
      throw new Error('Workspace symbol provider not supported')
    }
    return this.sendRequest('workspace/symbol', params)
  }

  /**
   * Open a document
   */
  openDocument(params: {
    textDocument: {
      uri: string
      languageId: string
      version: number
      text: string
    }
  }): void {
    this.sendNotification('textDocument/didOpen', params)
  }

  /**
   * Change a document
   */
  changeDocument(params: {
    textDocument: { uri: string, version: number }
    contentChanges: Array<{ range?: { start: { line: number, character: number }, end: { line: number, character: number } }, text: string }>
  }): void {
    this.sendNotification('textDocument/didChange', params)
  }

  /**
   * Close a document
   */
  closeDocument(params: { textDocument: { uri: string } }): void {
    this.sendNotification('textDocument/didClose', params)
  }

  /**
   * Save a document
   */
  saveDocument(params: {
    textDocument: { uri: string }
    text?: string
  }): void {
    this.sendNotification('textDocument/didSave', params)
  }

  /**
   * Get diagnostics for a document
   */
  async getDiagnostics(uri: string): Promise<LspDiagnostic[]> {
    // Note: Most LSP servers push diagnostics via notifications
    // This is a placeholder for pulling diagnostics
    return []
  }

  /**
   * Execute a custom command
   */
  async executeCommand(command: string, args?: any[]): Promise<any> {
    const commands = this.capabilities?.executeCommandProvider
    if (!commands || !commands.includes(command)) {
      throw new Error(`Command not supported: ${command}`)
    }
    return this.sendRequest('workspace/executeCommand', { command, arguments: args })
  }

  /**
   * Initialize the LSP server
   */
  private async initialize(): Promise<void> {
    const rootUri = process.cwd()
    const workspaceFolders = [rootUri]

    const initParams = {
      processId: process.pid,
      rootUri,
      workspaceFolders: workspaceFolders.map(uri => ({ uri, name: dirname(uri) })),
      initializationOptions: this.config.initializationOptions ?? {},
      capabilities: {
        textDocument: {
          hover: { dynamicRegistration: true },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          definition: { dynamicRegistration: true },
          references: { dynamicRegistration: true },
          documentSymbol: { dynamicRegistration: true },
          workspaceSymbol: { dynamicRegistration: true },
        },
        workspace: {
          workspaceFolders: true,
        },
      },
    }

    const result = await this.sendRequest<{ capabilities: LspServerCapabilities }>(
      'initialize',
      initParams,
      this.config.startupTimeout ?? 10000,
    )

    if (result?.capabilities) {
      this.capabilities = result.capabilities
      this.isInitialized = true
      this.sendNotification('initialized')
      this.log('LSP server initialized with capabilities:', this.capabilities)
    }
    else {
      throw new Error('Invalid initialize response from LSP server')
    }
  }

  /**
   * Send a message to the LSP server
   */
  private sendMessage(message: JsonRpcRequest | JsonRpcNotification): void {
    if (!this.process?.stdin) {
      throw new Error('Process stdin is not available')
    }

    const content = JSON.stringify(message)
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`

    this.log('Sending message:', message.method ?? 'notification', content)
    this.process.stdin.write(header + content)
  }

  /**
   * Handle incoming data from stdout
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString()

    while (true) {
      if (this.readingHeaders) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) {
          break
        }

        const headers = this.buffer.slice(0, headerEnd)
        this.buffer = this.buffer.slice(headerEnd + 4)

        // Parse Content-Length header
        const lengthMatch = headers.match(/Content-Length: (\d+)/i)
        if (lengthMatch) {
          this.contentLength = Number.parseInt(lengthMatch[1], 10)
          this.readingHeaders = false
        }
      }
      else {
        if (this.buffer.length < this.contentLength) {
          break
        }

        const content = this.buffer.slice(0, this.contentLength)
        this.buffer = this.buffer.slice(this.contentLength)
        this.contentLength = 0
        this.readingHeaders = true

        this.handleMessage(content)
      }
    }
  }

  /**
   * Handle a parsed message
   */
  private handleMessage(content: string): void {
    try {
      const message: JsonRpcResponse | JsonRpcNotification = JSON.parse(content)
      this.log('Received message:', message)

      if ('id' in message) {
        // It's a response
        this.handleResponse(message as JsonRpcResponse)
      }
      else {
        // It's a notification
        this.handleNotification(message as JsonRpcNotification)
      }
    }
    catch (error) {
      this.log('Failed to handle message:', error, content)
    }
  }

  /**
   * Handle a response message
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id)
    if (!pending) {
      this.log('No pending request for response:', response.id)
      return
    }

    clearTimeout(pending.timeout)
    this.pendingRequests.delete(response.id)

    if (response.error) {
      pending.reject(new Error(`${response.error.message} (${response.error.code})`))
    }
    else {
      pending.resolve(response.result)
    }
  }

  /**
   * Handle a notification message
   */
  private handleNotification(notification: JsonRpcNotification): void {
    this.emit('notification', notification.method, notification.params)

    // Handle specific notifications
    switch (notification.method) {
      case 'textDocument/publishDiagnostics':
        this.emit('diagnostics', notification.params)
        break
      case 'window/logMessage':
        this.log('LSP log:', notification.params.message)
        break
      case 'window/showMessage':
        this.log('LSP message:', notification.params)
        break
      case 'workspace/applyEdit':
        this.emit('applyEdit', notification.params)
        break
    }
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }

  /**
   * Log a debug message
   */
  private log(message: string, ...args: any[]): void {
    if (this.debug) {
      this.logger(`[LSP:${this.config.id}] ${message}`, ...args)
    }
  }

  /**
   * Check if the LSP server command is available
   */
  static async isAvailable(config: LspServerConfig): Promise<boolean> {
    const command = isWindows() && !config.command.endsWith('.cmd')
      ? `${config.command}.cmd`
      : config.command

    // Check if command exists in PATH
    const commandExistsResult = await commandExists(command)
    if (!commandExistsResult) {
      return false
    }

    // Check for required files
    if (config.requires?.files) {
      for (const file of config.requires.files) {
        const { existsSync } = await import('node:fs')
        if (!existsSync(file)) {
          return false
        }
      }
    }

    // Check for required npm packages
    if (config.requires?.packages) {
      for (const pkg of config.requires.packages) {
        try {
          const pkgPath = join(process.cwd(), 'node_modules', pkg)
          const { existsSync } = await import('node:fs')
          if (!existsSync(pkgPath)) {
            // Check global
            const { execSync } = await import('node:child_process')
            try {
              execSync(`npm list -g ${pkg}`, { stdio: 'ignore' })
            }
            catch {
              return false
            }
          }
        }
        catch {
          return false
        }
      }
    }

    return true
  }
}

/**
 * Create an LSP client instance
 */
export async function createLspClient(
  config: LspServerConfig,
  options?: LspClientOptions,
): Promise<LspClient> {
  const client = new LspClient(config, options)
  await client.start()
  return client
}
