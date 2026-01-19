/**
 * MCP Request Handler
 * Handles tool calls from MCP clients and integrates with CCJK functionality
 */

import { getToolByName, validateToolInput } from './mcp-tools'

export interface MCPToolCallResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * MCP Handler Class
 * Processes tool calls and integrates with CCJK features
 */
export class MCPHandler {
  /**
   * Handle a tool call from MCP client
   */
  async handleToolCall(toolName: string, args: any): Promise<MCPToolCallResult> {
    const tool = getToolByName(toolName)
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      }
    }

    // Validate input
    const validation = validateToolInput(tool, args)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid input: ${validation.errors?.join(', ')}`,
      }
    }

    // Route to appropriate handler
    try {
      switch (toolName) {
        case 'ccjk_chat':
          return await this.handleChat(args)
        case 'ccjk_providers':
          return await this.handleProviders(args)
        case 'ccjk_stats':
          return await this.handleStats(args)
        case 'ccjk_workflows':
          return await this.handleWorkflows(args)
        case 'ccjk_mcp_services':
          return await this.handleMcpServices(args)
        case 'ccjk_config':
          return await this.handleConfig(args)
        case 'ccjk_init':
          return await this.handleInit(args)
        case 'ccjk_doctor':
          return await this.handleDoctor(args)
        default:
          return {
            success: false,
            error: `Tool not implemented: ${toolName}`,
          }
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Handle ccjk_chat tool
   */
  private async handleChat(args: any): Promise<MCPToolCallResult> {
    const { message, provider, model } = args

    // TODO: Integrate with actual Claude API client
    // For now, return a placeholder response
    return {
      success: true,
      data: {
        response: `[CCJK MCP] Received message: "${message}"`,
        provider: provider || 'default',
        model: model || 'default',
        note: 'This is a placeholder. Actual Claude API integration pending.',
      },
    }
  }

  /**
   * Handle ccjk_providers tool
   */
  private async handleProviders(_args: any): Promise<MCPToolCallResult> {
    try {
      const { readMcpConfig } = await import('../utils/claude-config')
      const config = readMcpConfig()

      const providers: any[] = []

      // Extract MCP server configurations as providers
      if (config?.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          providers.push({
            name,
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
          })
        }
      }

      return {
        success: true,
        data: {
          providers,
          count: providers.length,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to read providers: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_stats tool
   */
  private async handleStats(args: any): Promise<MCPToolCallResult> {
    const { period = 'all' } = args

    try {
      // Check if CCusage is available
      const { x } = await import('tinyexec')
      const result = await x('ccusage', ['--json', '--period', period])

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: 'CCusage tool not available or failed',
        }
      }

      const stats = JSON.parse(result.stdout)
      return {
        success: true,
        data: stats,
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_workflows tool
   */
  private async handleWorkflows(args: any): Promise<MCPToolCallResult> {
    const { category } = args

    try {
      const { getWorkflowConfigs } = await import('../config/workflows')

      let workflows = getWorkflowConfigs()
      if (category) {
        workflows = workflows.filter(w => w.category === category)
      }

      return {
        success: true,
        data: {
          workflows: workflows.map(w => ({
            id: w.id,
            name: w.name,
            category: w.category,
            description: w.description,
          })),
          count: workflows.length,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_mcp_services tool
   */
  private async handleMcpServices(args: any): Promise<MCPToolCallResult> {
    const { detailed = false } = args

    try {
      const { readMcpConfig } = await import('../utils/claude-config')
      const config = await readMcpConfig()

      const services = config?.mcpServers || {}
      const serviceList = Object.entries(services).map(([name, config]) => {
        if (detailed) {
          return { name, config }
        }
        return { name }
      })

      return {
        success: true,
        data: {
          services: serviceList,
          count: serviceList.length,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to list MCP services: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_config tool
   */
  private async handleConfig(args: any): Promise<MCPToolCallResult> {
    const { action, key, value } = args

    try {
      const { readZcfConfig, updateZcfConfig } = await import('../utils/ccjk-config')

      if (action === 'list') {
        const config = await readZcfConfig()
        return {
          success: true,
          data: config || {},
        }
      }

      if (action === 'get') {
        if (!key) {
          return {
            success: false,
            error: 'Key is required for get action',
          }
        }
        const config = await readZcfConfig()
        return {
          success: true,
          data: {
            key,
            value: (config as any)?.[key],
          },
        }
      }

      if (action === 'set') {
        if (!key || value === undefined) {
          return {
            success: false,
            error: 'Key and value are required for set action',
          }
        }
        await updateZcfConfig({ [key]: value })
        return {
          success: true,
          data: {
            key,
            value,
            message: 'Configuration updated',
          },
        }
      }

      return {
        success: false,
        error: `Unknown action: ${action}`,
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to handle config: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_init tool
   */
  private async handleInit(args: any): Promise<MCPToolCallResult> {
    const { mode = 'full', force = false } = args

    try {
      const { init } = await import('../commands/init')

      // Map mode to init options
      const options: any = {
        force,
        skipPrompt: true,
      }

      if (mode === 'workflows-only') {
        options.configAction = 'skip'
        options.apiType = 'skip'
      }
      else if (mode === 'api-only') {
        options.workflows = false
      }

      await init(options)

      return {
        success: true,
        data: {
          message: `Initialization completed in ${mode} mode`,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Handle ccjk_doctor tool
   */
  private async handleDoctor(args: any): Promise<MCPToolCallResult> {
    const { verbose = false } = args

    try {
      const { doctor } = await import('../commands/doctor')

      // Capture doctor output
      const originalLog = console.log
      const output: string[] = []
      console.log = (...args: any[]) => {
        output.push(args.join(' '))
      }

      await doctor()

      console.log = originalLog

      return {
        success: true,
        data: {
          output: output.join('\n'),
          verbose,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Doctor check failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
