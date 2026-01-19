/**
 * Tool Priority Configuration
 * Defines priority order for tools in different categories
 */

/**
 * Fallback behavior when primary tool is unavailable
 */
export type FallbackBehavior = 'next' | 'error' | 'prompt'

/**
 * Tool category configuration
 */
export interface ToolCategory {
  /**
   * Tools in priority order (highest to lowest)
   */
  tools: string[]

  /**
   * Behavior when primary tool is unavailable
   * - 'next': Automatically use next available tool
   * - 'error': Throw error if primary unavailable
   * - 'prompt': Ask user which tool to use
   */
  fallbackBehavior: FallbackBehavior

  /**
   * Category description
   */
  description?: string
}

/**
 * Complete tool priority configuration
 */
export interface ToolPriorityConfig {
  /**
   * Tool categories with priority definitions
   */
  categories: {
    [category: string]: ToolCategory
  }
}

/**
 * Default tool priority configuration
 *
 * Priority Rules:
 * 1. Native CLI tools > MCP tools (lighter, faster, zero-config)
 * 2. Built-in skills > External tools (better integration)
 * 3. Specialized tools > General tools (better performance)
 */
export const DEFAULT_TOOL_PRIORITIES: ToolPriorityConfig = {
  categories: {
    /**
     * Browser automation tools
     * agent-browser: Native Rust CLI, AI-native, zero-config
     * mcp__Playwright: Heavy Node.js, requires MCP config
     */
    browser: {
      tools: ['agent-browser', 'mcp__Playwright'],
      fallbackBehavior: 'next',
      description: 'Browser automation and web scraping',
    },

    /**
     * Web search tools
     * WebSearch: Built-in skill, fast, reliable
     * mcp__exa: External MCP, requires API key
     */
    search: {
      tools: ['WebSearch', 'mcp__exa'],
      fallbackBehavior: 'next',
      description: 'Web search and information retrieval',
    },

    /**
     * File search tools
     * Glob/Grep: Built-in skills, fast
     * Bash find/grep: Fallback for complex patterns
     */
    fileSearch: {
      tools: ['Glob', 'Grep', 'Bash'],
      fallbackBehavior: 'next',
      description: 'File and content search',
    },

    /**
     * File operations
     * Read/Write/Edit: Built-in skills, optimized
     * Bash: Fallback for complex operations
     */
    fileOps: {
      tools: ['Read', 'Write', 'Edit', 'Bash'],
      fallbackBehavior: 'next',
      description: 'File reading, writing, and editing',
    },

    /**
     * Documentation and context
     * mcp__context7: Specialized for documentation
     * WebFetch: General web content fetching
     */
    documentation: {
      tools: ['mcp__context7', 'WebFetch'],
      fallbackBehavior: 'next',
      description: 'Documentation lookup and context retrieval',
    },

    /**
     * Code execution
     * Bash: Primary execution environment
     */
    execution: {
      tools: ['Bash'],
      fallbackBehavior: 'error',
      description: 'Command and code execution',
    },
  },
}

/**
 * Tool metadata for better decision making
 */
export interface ToolMetadata {
  /**
   * Tool name
   */
  name: string

  /**
   * Tool type
   */
  type: 'skill' | 'mcp' | 'cli' | 'builtin'

  /**
   * Categories this tool belongs to
   */
  categories: string[]

  /**
   * Tool description
   */
  description?: string

  /**
   * Installation requirements
   */
  requirements?: string[]

  /**
   * Performance characteristics
   */
  performance?: {
    speed: 'fast' | 'medium' | 'slow'
    memory: 'light' | 'medium' | 'heavy'
  }
}

/**
 * Tool metadata registry
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  'agent-browser': {
    name: 'agent-browser',
    type: 'cli',
    categories: ['browser'],
    description: 'Native Rust CLI for browser automation with AI-native element references',
    requirements: ['agent-browser CLI installed'],
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'mcp__Playwright': {
    name: 'mcp__Playwright',
    type: 'mcp',
    categories: ['browser'],
    description: 'Playwright MCP server for advanced browser automation',
    requirements: ['MCP configuration', 'Node.js', 'Playwright browsers'],
    performance: {
      speed: 'medium',
      memory: 'heavy',
    },
  },

  'WebSearch': {
    name: 'WebSearch',
    type: 'skill',
    categories: ['search'],
    description: 'Built-in web search skill',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'mcp__exa': {
    name: 'mcp__exa',
    type: 'mcp',
    categories: ['search'],
    description: 'Exa MCP server for advanced search',
    requirements: ['MCP configuration', 'Exa API key'],
    performance: {
      speed: 'medium',
      memory: 'medium',
    },
  },

  'Glob': {
    name: 'Glob',
    type: 'skill',
    categories: ['fileSearch'],
    description: 'Built-in glob pattern file search',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'Grep': {
    name: 'Grep',
    type: 'skill',
    categories: ['fileSearch'],
    description: 'Built-in content search',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'Read': {
    name: 'Read',
    type: 'skill',
    categories: ['fileOps'],
    description: 'Built-in file reading',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'Write': {
    name: 'Write',
    type: 'skill',
    categories: ['fileOps'],
    description: 'Built-in file writing',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'Edit': {
    name: 'Edit',
    type: 'skill',
    categories: ['fileOps'],
    description: 'Built-in file editing',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'Bash': {
    name: 'Bash',
    type: 'builtin',
    categories: ['fileSearch', 'fileOps', 'execution'],
    description: 'Built-in bash command execution',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },

  'mcp__context7': {
    name: 'mcp__context7',
    type: 'mcp',
    categories: ['documentation'],
    description: 'Context7 MCP for documentation lookup',
    requirements: ['MCP configuration'],
    performance: {
      speed: 'medium',
      memory: 'medium',
    },
  },

  'WebFetch': {
    name: 'WebFetch',
    type: 'skill',
    categories: ['documentation'],
    description: 'Built-in web content fetching',
    performance: {
      speed: 'fast',
      memory: 'light',
    },
  },
}
