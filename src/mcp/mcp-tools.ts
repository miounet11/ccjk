/**
 * MCP Tools Definition
 * Defines the tools that CCJK exposes via MCP protocol
 */

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * CCJK MCP Tools Registry
 * These tools allow Claude Code to interact with CCJK functionality
 */
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'ccjk_chat',
    description: 'Send a message to Claude via CCJK and get a response. Supports custom provider and model selection.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to Claude',
        },
        provider: {
          type: 'string',
          description: 'Optional API provider name (e.g., "302ai", "openai", "anthropic")',
        },
        model: {
          type: 'string',
          description: 'Optional model name (e.g., "claude-3-5-sonnet-20241022", "gpt-4")',
        },
        systemPrompt: {
          type: 'string',
          description: 'Optional system prompt to guide the AI response',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'ccjk_providers',
    description: 'List all available API providers configured in CCJK',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ccjk_stats',
    description: 'Get usage statistics from CCJK (requires CCusage tool)',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for statistics (7d, 30d, all)',
          enum: ['7d', '30d', 'all'],
        },
      },
    },
  },
  {
    name: 'ccjk_workflows',
    description: 'List available workflows in CCJK',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by workflow category (git, sixStep, common-tools, etc.)',
        },
      },
    },
  },
  {
    name: 'ccjk_mcp_services',
    description: 'List configured MCP services in Claude Code',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed configuration information',
        },
      },
    },
  },
  {
    name: 'ccjk_config',
    description: 'Get or set CCJK configuration values',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform (get, set, list)',
          enum: ['get', 'set', 'list'],
        },
        key: {
          type: 'string',
          description: 'Configuration key (for get/set actions)',
        },
        value: {
          type: 'string',
          description: 'Configuration value (for set action)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'ccjk_init',
    description: 'Initialize or update Claude Code configuration via CCJK',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Initialization mode (full, workflows-only, api-only)',
          enum: ['full', 'workflows-only', 'api-only'],
        },
        force: {
          type: 'boolean',
          description: 'Force overwrite existing configuration',
        },
      },
    },
  },
  {
    name: 'ccjk_doctor',
    description: 'Run CCJK health check and diagnostics',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Show detailed diagnostic information',
        },
      },
    },
  },
]

/**
 * Get tool by name
 */
export function getToolByName(name: string): MCPTool | undefined {
  return MCP_TOOLS.find(tool => tool.name === name)
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(tool: MCPTool, input: any): { valid: boolean, errors?: string[] } {
  const errors: string[] = []

  // Check required fields
  if (tool.inputSchema.required) {
    for (const field of tool.inputSchema.required) {
      if (!(field in input)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  // Check field types
  for (const [key, value] of Object.entries(input)) {
    const schema = tool.inputSchema.properties[key]
    if (!schema) {
      errors.push(`Unknown field: ${key}`)
      continue
    }

    // Type validation
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`Field ${key} must be a string`)
    }
    else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Field ${key} must be a boolean`)
    }
    else if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`Field ${key} must be a number`)
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Field ${key} must be one of: ${schema.enum.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}
