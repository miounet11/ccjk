import ansis from 'ansis';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';
import { g as getPluginManager } from '../shared/ccjk.DH6cOJsf.mjs';
import 'tinyexec';
import 'node:child_process';

const CLAUDE_CONFIG_PATH = join(homedir(), ".claude.json");
const TOOL_CACHE_TTL = 5 * 60 * 1e3;
class McpServerManager {
  servers = /* @__PURE__ */ new Map();
  toolCache = /* @__PURE__ */ new Map();
  configPath;
  initialized = false;
  constructor(configPath = CLAUDE_CONFIG_PATH) {
    this.configPath = configPath;
  }
  // ==========================================================================
  // Initialization
  // ==========================================================================
  /**
   * Initialize the manager by loading MCP configuration
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    await this.loadConfiguration();
    this.initialized = true;
  }
  /**
   * Load MCP configuration from file
   */
  async loadConfiguration() {
    const config = this.readConfigFile();
    if (!config?.mcpServers) {
      return;
    }
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      this.servers.set(name, {
        name,
        config: serverConfig,
        status: "unknown"
      });
    }
  }
  /**
   * Read the Claude configuration file
   */
  readConfigFile() {
    if (!existsSync(this.configPath)) {
      return null;
    }
    try {
      const content = readFileSync(this.configPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read MCP config from ${this.configPath}:`, error);
      return null;
    }
  }
  /**
   * Reload configuration (useful after config changes)
   */
  async reload() {
    this.servers.clear();
    this.toolCache.clear();
    this.initialized = false;
    await this.initialize();
  }
  // ==========================================================================
  // Server Management
  // ==========================================================================
  /**
   * Get all configured MCP servers
   */
  getServers() {
    return Array.from(this.servers.values());
  }
  /**
   * Get a specific server by name
   */
  getServer(name) {
    return this.servers.get(name);
  }
  /**
   * Get server names
   */
  getServerNames() {
    return Array.from(this.servers.keys());
  }
  /**
   * Check if a server is configured
   */
  hasServer(name) {
    return this.servers.has(name);
  }
  // ==========================================================================
  // Tool Discovery
  // ==========================================================================
  /**
   * Get available tools from a specific MCP server
   *
   * This method attempts to discover tools by querying the MCP server.
   * Results are cached to avoid repeated queries.
   */
  async getServerTools(serverName) {
    const server = this.servers.get(serverName);
    if (!server) {
      return [];
    }
    const cached = this.toolCache.get(serverName);
    if (cached && Date.now() - cached.timestamp < TOOL_CACHE_TTL) {
      return cached.tools;
    }
    const tools = await this.discoverTools(server);
    this.toolCache.set(serverName, {
      tools,
      timestamp: Date.now()
    });
    server.tools = tools;
    server.lastUpdated = Date.now();
    return tools;
  }
  /**
   * Get all available tools from all configured servers
   */
  async getAllTools() {
    const allTools = [];
    for (const serverName of this.servers.keys()) {
      const tools = await this.getServerTools(serverName);
      allTools.push(...tools);
    }
    return allTools;
  }
  /**
   * Get tools for specific servers (used by AgentRuntime)
   *
   * @param mcpRefs - Array of MCP server references from agent definition
   */
  async getToolsForAgent(mcpRefs) {
    const tools = [];
    for (const ref of mcpRefs) {
      const serverTools = await this.getServerTools(ref.serverName);
      if (ref.tools && ref.tools.length > 0) {
        const filteredTools = serverTools.filter((t) => ref.tools.includes(t.name));
        tools.push(...filteredTools);
      } else {
        tools.push(...serverTools);
      }
    }
    return tools;
  }
  /**
   * Discover tools from an MCP server
   *
   * This is a simplified implementation that returns predefined tools
   * based on known MCP server types. In a full implementation, this would
   * actually connect to the MCP server and query its capabilities.
   */
  async discoverTools(server) {
    const tools = [];
    try {
      if (server.config.type === "stdio" && server.config.command) {
        const discoveredTools = await this.queryStdioServerTools(server);
        if (discoveredTools.length > 0) {
          server.status = "connected";
          return discoveredTools;
        }
      }
      if (server.config.type === "sse" && server.config.url) {
        const discoveredTools = await this.querySseServerTools(server);
        if (discoveredTools.length > 0) {
          server.status = "connected";
          return discoveredTools;
        }
      }
      const knownTools = this.getKnownServerTools(server.name, server.config);
      if (knownTools.length > 0) {
        server.status = "unknown";
        return knownTools;
      }
      server.status = "unknown";
      return tools;
    } catch (error) {
      server.status = "error";
      server.error = error instanceof Error ? error.message : String(error);
      return tools;
    }
  }
  /**
   * Query tools from a stdio-based MCP server
   *
   * Note: This is a placeholder implementation. Real MCP tool discovery
   * would require implementing the MCP protocol handshake.
   */
  async queryStdioServerTools(_server) {
    return [];
  }
  /**
   * Query tools from an SSE-based MCP server
   *
   * Note: This is a placeholder implementation.
   */
  async querySseServerTools(_server) {
    return [];
  }
  /**
   * Get known tools for common MCP servers
   *
   * This provides tool information for well-known MCP servers
   * without needing to actually connect to them.
   */
  getKnownServerTools(serverName, config) {
    const tools = [];
    const command = config.command || "";
    const args = config.args?.join(" ") || "";
    const identifier = `${serverName} ${command} ${args}`.toLowerCase();
    if (identifier.includes("filesystem") || identifier.includes("fs")) {
      tools.push(
        {
          server: serverName,
          name: "read_file",
          description: "Read the contents of a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file to read" }
            },
            required: ["path"]
          }
        },
        {
          server: serverName,
          name: "write_file",
          description: "Write content to a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file to write" },
              content: { type: "string", description: "Content to write" }
            },
            required: ["path", "content"]
          }
        },
        {
          server: serverName,
          name: "list_directory",
          description: "List contents of a directory",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the directory" }
            },
            required: ["path"]
          }
        }
      );
    }
    if (identifier.includes("exa")) {
      tools.push(
        {
          server: serverName,
          name: "web_search",
          description: "Search the web using Exa",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              numResults: { type: "number", description: "Number of results to return" }
            },
            required: ["query"]
          }
        },
        {
          server: serverName,
          name: "find_similar",
          description: "Find similar content to a URL",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to find similar content for" }
            },
            required: ["url"]
          }
        }
      );
    }
    if (identifier.includes("github")) {
      tools.push(
        {
          server: serverName,
          name: "search_repositories",
          description: "Search GitHub repositories",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" }
            },
            required: ["query"]
          }
        },
        {
          server: serverName,
          name: "get_file_contents",
          description: "Get contents of a file from a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              path: { type: "string", description: "File path" }
            },
            required: ["owner", "repo", "path"]
          }
        },
        {
          server: serverName,
          name: "create_issue",
          description: "Create a new issue in a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue body" }
            },
            required: ["owner", "repo", "title"]
          }
        }
      );
    }
    if (identifier.includes("playwright")) {
      tools.push(
        {
          server: serverName,
          name: "browser_navigate",
          description: "Navigate to a URL",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to navigate to" }
            },
            required: ["url"]
          }
        },
        {
          server: serverName,
          name: "browser_snapshot",
          description: "Take an accessibility snapshot of the page",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          server: serverName,
          name: "browser_click",
          description: "Click on an element",
          inputSchema: {
            type: "object",
            properties: {
              element: { type: "string", description: "Element description" },
              ref: { type: "string", description: "Element reference" }
            },
            required: ["element", "ref"]
          }
        }
      );
    }
    if (identifier.includes("context7")) {
      tools.push(
        {
          server: serverName,
          name: "resolve-library-id",
          description: "Resolve a library name to Context7 library ID",
          inputSchema: {
            type: "object",
            properties: {
              libraryName: { type: "string", description: "Library name to search for" }
            },
            required: ["libraryName"]
          }
        },
        {
          server: serverName,
          name: "query-docs",
          description: "Query documentation for a library",
          inputSchema: {
            type: "object",
            properties: {
              libraryId: { type: "string", description: "Context7 library ID" },
              query: { type: "string", description: "Query string" }
            },
            required: ["libraryId", "query"]
          }
        }
      );
    }
    if (identifier.includes("fetch") || identifier.includes("http")) {
      tools.push({
        server: serverName,
        name: "fetch",
        description: "Fetch content from a URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to fetch" },
            method: { type: "string", description: "HTTP method", enum: ["GET", "POST", "PUT", "DELETE"] },
            headers: { type: "object", description: "Request headers" },
            body: { type: "string", description: "Request body" }
          },
          required: ["url"]
        }
      });
    }
    if (identifier.includes("memory") || identifier.includes("knowledge")) {
      tools.push(
        {
          server: serverName,
          name: "store_memory",
          description: "Store information in memory",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Memory key" },
              value: { type: "string", description: "Value to store" }
            },
            required: ["key", "value"]
          }
        },
        {
          server: serverName,
          name: "retrieve_memory",
          description: "Retrieve information from memory",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Memory key" }
            },
            required: ["key"]
          }
        }
      );
    }
    return tools;
  }
  // ==========================================================================
  // Tool Execution (Optional Proxy)
  // ==========================================================================
  /**
   * Execute a tool call through the MCP server
   *
   * Note: This is a placeholder for future implementation.
   * In a full implementation, this would:
   * 1. Connect to the appropriate MCP server
   * 2. Send the tool call request
   * 3. Return the response
   *
   * For now, agents should use Claude Code's native MCP integration.
   */
  async callTool(request) {
    const server = this.servers.get(request.server);
    if (!server) {
      return {
        success: false,
        error: `Server not found: ${request.server}`
      };
    }
    const startTime = Date.now();
    try {
      return {
        success: false,
        error: "Direct tool execution not yet implemented. Use Claude Code's native MCP integration.",
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  /**
   * Get tool information formatted for agent system prompt
   */
  formatToolsForPrompt(tools) {
    if (tools.length === 0) {
      return "";
    }
    const lines = ["## Available MCP Tools", ""];
    const byServer = /* @__PURE__ */ new Map();
    for (const tool of tools) {
      const serverTools = byServer.get(tool.server) || [];
      serverTools.push(tool);
      byServer.set(tool.server, serverTools);
    }
    for (const [server, serverTools] of byServer) {
      lines.push(`### ${server}`);
      lines.push("");
      for (const tool of serverTools) {
        lines.push(`**${tool.name}**: ${tool.description}`);
        const schema = tool.inputSchema;
        if (schema.properties) {
          const params = Object.entries(schema.properties);
          if (params.length > 0) {
            lines.push("Parameters:");
            for (const [name, prop] of params) {
              const required = schema.required?.includes(name) ? " (required)" : "";
              lines.push(`  - \`${name}\`: ${prop.description || prop.type}${required}`);
            }
          }
        }
        lines.push("");
      }
    }
    return lines.join("\n");
  }
  /**
   * Check if the manager is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Get configuration file path
   */
  getConfigPath() {
    return this.configPath;
  }
  /**
   * Clear tool cache
   */
  clearCache() {
    this.toolCache.clear();
  }
}
let managerInstance = null;
async function getMcpServerManager() {
  if (!managerInstance) {
    managerInstance = new McpServerManager();
    await managerInstance.initialize();
  }
  return managerInstance;
}

join(homedir(), ".ccjk", "agents");
const AGENT_TEMPLATES_DIR = join(homedir(), ".ccjk", "agent-templates");
class AgentBuilder {
  definition = {
    skills: [],
    mcpServers: [],
    capabilities: []
  };
  /**
   * Set agent ID
   */
  id(id) {
    this.definition.id = id;
    return this;
  }
  /**
   * Set agent name
   */
  name(name) {
    this.definition.name = typeof name === "string" ? { "en": name, "zh-CN": name } : name;
    return this;
  }
  /**
   * Set agent description
   */
  description(desc) {
    this.definition.description = typeof desc === "string" ? { "en": desc, "zh-CN": desc } : desc;
    return this;
  }
  /**
   * Set agent persona/role
   */
  persona(persona) {
    this.definition.persona = persona;
    return this;
  }
  /**
   * Set agent instructions
   */
  instructions(instructions) {
    this.definition.instructions = instructions;
    return this;
  }
  /**
   * Add a skill
   */
  addSkill(pluginId, options = {}) {
    this.definition.skills.push({
      pluginId,
      ...options
    });
    return this;
  }
  /**
   * Add multiple skills
   */
  addSkills(pluginIds) {
    for (const id of pluginIds) {
      this.addSkill(id);
    }
    return this;
  }
  /**
   * Add an MCP server
   */
  addMcpServer(serverName, options = {}) {
    this.definition.mcpServers.push({
      serverName,
      ...options
    });
    return this;
  }
  /**
   * Add multiple MCP servers
   */
  addMcpServers(serverNames) {
    for (const name of serverNames) {
      this.addMcpServer(name);
    }
    return this;
  }
  /**
   * Add capability
   */
  addCapability(capability) {
    if (!this.definition.capabilities.includes(capability)) {
      this.definition.capabilities.push(capability);
    }
    return this;
  }
  /**
   * Add multiple capabilities
   */
  addCapabilities(capabilities) {
    for (const cap of capabilities) {
      this.addCapability(cap);
    }
    return this;
  }
  /**
   * Set trigger patterns
   */
  triggers(patterns) {
    this.definition.triggers = patterns;
    return this;
  }
  /**
   * Build the agent definition
   */
  build() {
    if (!this.definition.id) {
      throw new Error("Agent ID is required");
    }
    if (!this.definition.name) {
      throw new Error("Agent name is required");
    }
    if (!this.definition.description) {
      throw new Error("Agent description is required");
    }
    if (!this.definition.persona) {
      this.definition.persona = "You are a helpful AI assistant.";
    }
    if (!this.definition.instructions) {
      this.definition.instructions = "";
    }
    return this.definition;
  }
  /**
   * Build and save the agent
   */
  async save() {
    const definition = this.build();
    const manager = await getPluginManager();
    await manager.createAgent(definition);
    return definition;
  }
}
class AgentCreator {
  /**
   * Create a new agent builder
   */
  create() {
    return new AgentBuilder();
  }
  /**
   * Create agent from template
   */
  async fromTemplate(templateId, overrides = {}) {
    const template = await this.loadTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    const definition = {
      ...template,
      ...overrides,
      id: overrides.id || `${templateId}-${Date.now()}`,
      skills: [...template.skills || [], ...overrides.skills || []],
      mcpServers: [...template.mcpServers || [], ...overrides.mcpServers || []],
      capabilities: [.../* @__PURE__ */ new Set([...template.capabilities || [], ...overrides.capabilities || []])]
    };
    const manager = await getPluginManager();
    await manager.createAgent(definition);
    return definition;
  }
  /**
   * Create agent from skills only
   */
  async fromSkills(id, name, skillIds, options = {}) {
    const builder = this.create().id(id).name(name).description(options.description || `Agent using skills: ${skillIds.join(", ")}`).addSkills(skillIds);
    if (options.persona) {
      builder.persona(options.persona);
    }
    if (options.instructions) {
      builder.instructions(options.instructions);
    }
    return builder.save();
  }
  /**
   * Create agent from MCP servers only
   */
  async fromMcpServers(id, name, serverNames, options = {}) {
    const builder = this.create().id(id).name(name).description(options.description || `Agent using MCP servers: ${serverNames.join(", ")}`).addMcpServers(serverNames);
    if (options.persona) {
      builder.persona(options.persona);
    }
    if (options.instructions) {
      builder.instructions(options.instructions);
    }
    return builder.save();
  }
  /**
   * Load a template
   */
  async loadTemplate(templateId) {
    const builtIn = BUILT_IN_TEMPLATES[templateId];
    if (builtIn) {
      return builtIn;
    }
    const templatePath = join(AGENT_TEMPLATES_DIR, `${templateId}.json`);
    if (existsSync(templatePath)) {
      return JSON.parse(readFileSync(templatePath, "utf-8"));
    }
    return null;
  }
  /**
   * Save a template
   */
  async saveTemplate(templateId, template) {
    const templatePath = join(AGENT_TEMPLATES_DIR, `${templateId}.json`);
    writeFileSync(templatePath, JSON.stringify(template, null, 2));
  }
  /**
   * List available templates
   */
  listTemplates() {
    const templates = Object.keys(BUILT_IN_TEMPLATES);
    if (existsSync(AGENT_TEMPLATES_DIR)) {
      const files = readdirSync(AGENT_TEMPLATES_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          templates.push(file.replace(".json", ""));
        }
      }
    }
    return templates;
  }
}
class AgentRuntime {
  context;
  constructor(context) {
    this.context = context;
  }
  /**
   * Create runtime from agent ID
   */
  static async fromAgentId(agentId) {
    const manager = await getPluginManager();
    const agent = manager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    const skills = [];
    for (const skillRef of agent.skills) {
      const plugin = manager.getPlugin(skillRef.pluginId);
      if (plugin) {
        skills.push(plugin);
      }
    }
    let mcpTools = [];
    if (agent.mcpServers && agent.mcpServers.length > 0) {
      try {
        const mcpManager = await getMcpServerManager();
        mcpTools = await mcpManager.getToolsForAgent(agent.mcpServers);
      } catch (error) {
        console.warn("Failed to load MCP tools:", error instanceof Error ? error.message : String(error));
      }
    }
    return new AgentRuntime({
      agent,
      skills,
      mcpTools,
      task: "",
      history: []
    });
  }
  /**
   * Get the system prompt for this agent
   */
  getSystemPrompt() {
    const parts = [];
    parts.push(this.context.agent.persona);
    parts.push("");
    if (this.context.agent.instructions) {
      parts.push("## Instructions");
      parts.push(this.context.agent.instructions);
      parts.push("");
    }
    if (this.context.skills.length > 0) {
      parts.push("## Available Skills");
      parts.push("");
      for (const skill of this.context.skills) {
        if (skill.skill) {
          parts.push(`### ${skill.skill.title}`);
          parts.push(skill.skill.description);
          parts.push("");
          if (skill.skill.applicability.taskTypes.length > 0) {
            parts.push("**When to use:**");
            for (const task of skill.skill.applicability.taskTypes) {
              parts.push(`- ${task}`);
            }
            parts.push("");
          }
          if (skill.skill.rules && skill.skill.rules.length > 0) {
            parts.push("**Key Rules:**");
            const criticalRules = skill.skill.rules.filter((r) => r.priority === "critical" || r.priority === "high");
            for (const rule of criticalRules.slice(0, 5)) {
              parts.push(`- **${rule.id}**: ${rule.title}`);
            }
            parts.push("");
          }
        }
      }
    }
    if (this.context.mcpTools.length > 0) {
      parts.push("## Available MCP Tools");
      parts.push("");
      const byServer = /* @__PURE__ */ new Map();
      for (const tool of this.context.mcpTools) {
        const serverTools = byServer.get(tool.server) || [];
        serverTools.push(tool);
        byServer.set(tool.server, serverTools);
      }
      for (const [server, serverTools] of byServer) {
        parts.push(`### ${server}`);
        parts.push("");
        for (const tool of serverTools) {
          parts.push(`**${tool.name}**: ${tool.description}`);
          const schema = tool.inputSchema;
          if (schema.properties) {
            const params = Object.entries(schema.properties);
            if (params.length > 0) {
              parts.push("Parameters:");
              for (const [name, prop] of params) {
                const required = schema.required?.includes(name) ? " (required)" : "";
                parts.push(`  - \`${name}\`: ${prop.description || prop.type}${required}`);
              }
            }
          }
          parts.push("");
        }
      }
    }
    if (this.context.agent.capabilities.length > 0) {
      parts.push("## Capabilities");
      parts.push("");
      for (const cap of this.context.agent.capabilities) {
        parts.push(`- ${this.formatCapability(cap)}`);
      }
      parts.push("");
    }
    return parts.join("\n");
  }
  /**
   * Get full skill content for context
   */
  getSkillContent() {
    const parts = [];
    for (const skill of this.context.skills) {
      if (skill.skill) {
        parts.push(`# ${skill.skill.title}`);
        parts.push("");
        parts.push(skill.skill.rawContent);
        parts.push("");
        parts.push("---");
        parts.push("");
      }
    }
    return parts.join("\n");
  }
  /**
   * Add message to history
   */
  addMessage(role, content) {
    this.context.history = this.context.history || [];
    this.context.history.push({
      role,
      content,
      timestamp: Date.now()
    });
  }
  /**
   * Get conversation history
   */
  getHistory() {
    return this.context.history || [];
  }
  /**
   * Set current task
   */
  setTask(task) {
    this.context.task = task;
  }
  /**
   * Format capability for display
   */
  formatCapability(cap) {
    const labels = {
      "code-generation": "Code Generation",
      "code-review": "Code Review",
      "testing": "Testing",
      "documentation": "Documentation",
      "deployment": "Deployment",
      "debugging": "Debugging",
      "refactoring": "Refactoring",
      "git-operations": "Git Operations",
      "file-management": "File Management",
      "web-search": "Web Search",
      "api-integration": "API Integration"
    };
    return labels[cap] || cap;
  }
}
const BUILT_IN_TEMPLATES = {
  "code-assistant": {
    name: { "en": "Code Assistant", "zh-CN": "\u4EE3\u7801\u52A9\u624B" },
    description: { "en": "General-purpose coding assistant", "zh-CN": "\u901A\u7528\u7F16\u7A0B\u52A9\u624B" },
    persona: `You are an expert software engineer with deep knowledge of multiple programming languages and frameworks. You write clean, efficient, and well-documented code. You follow best practices and design patterns.`,
    capabilities: ["code-generation", "code-review", "debugging", "refactoring"],
    instructions: `
- Always explain your reasoning before writing code
- Follow the project's existing code style
- Write comprehensive error handling
- Add helpful comments for complex logic
- Suggest tests for new functionality
`
  },
  "git-master": {
    name: { "en": "Git Master", "zh-CN": "Git \u5927\u5E08" },
    description: { "en": "Expert Git operations assistant", "zh-CN": "Git \u64CD\u4F5C\u4E13\u5BB6" },
    persona: `You are a Git expert who helps with version control operations. You write clear, conventional commit messages and help manage branches effectively.`,
    capabilities: ["git-operations"],
    instructions: `
- Use conventional commit format (feat:, fix:, docs:, etc.)
- Suggest appropriate branch names
- Help resolve merge conflicts
- Explain Git concepts when needed
`
  },
  "test-engineer": {
    name: { "en": "Test Engineer", "zh-CN": "\u6D4B\u8BD5\u5DE5\u7A0B\u5E08" },
    description: { "en": "Testing and quality assurance specialist", "zh-CN": "\u6D4B\u8BD5\u548C\u8D28\u91CF\u4FDD\u8BC1\u4E13\u5BB6" },
    persona: `You are a QA engineer specializing in software testing. You write comprehensive test cases and help ensure code quality.`,
    capabilities: ["testing", "code-review"],
    instructions: `
- Write tests that cover edge cases
- Use appropriate testing frameworks (Jest, Vitest, etc.)
- Follow AAA pattern (Arrange, Act, Assert)
- Aim for high test coverage
- Include both unit and integration tests
`
  },
  "devops-engineer": {
    name: { "en": "DevOps Engineer", "zh-CN": "DevOps \u5DE5\u7A0B\u5E08" },
    description: { "en": "DevOps and deployment specialist", "zh-CN": "DevOps \u548C\u90E8\u7F72\u4E13\u5BB6" },
    persona: `You are a DevOps engineer who helps with CI/CD, containerization, and deployment. You write efficient Dockerfiles and deployment configurations.`,
    capabilities: ["deployment", "file-management"],
    instructions: `
- Write optimized Dockerfiles with multi-stage builds
- Create comprehensive CI/CD pipelines
- Follow security best practices
- Use environment variables for configuration
- Document deployment procedures
`
  },
  "full-stack": {
    name: { "en": "Full Stack Developer", "zh-CN": "\u5168\u6808\u5F00\u53D1\u8005" },
    description: { "en": "Full stack development assistant", "zh-CN": "\u5168\u6808\u5F00\u53D1\u52A9\u624B" },
    persona: `You are a full-stack developer proficient in both frontend and backend development. You build complete, production-ready applications.`,
    capabilities: ["code-generation", "code-review", "testing", "documentation", "deployment"],
    instructions: `
- Consider both frontend and backend implications
- Write responsive and accessible UI
- Design RESTful APIs
- Implement proper authentication and authorization
- Optimize for performance
`
  }
};
let creatorInstance = null;
function getAgentCreator() {
  if (!creatorInstance) {
    creatorInstance = new AgentCreator();
  }
  return creatorInstance;
}
function createAgent() {
  return new AgentBuilder();
}
async function createAgentFromTemplate(templateId, overrides = {}) {
  const creator = getAgentCreator();
  return creator.fromTemplate(templateId, overrides);
}
async function getAgentRuntime(agentId) {
  return AgentRuntime.fromAgentId(agentId);
}

async function handleAgentCommand(args, options = {}) {
  const subcommand = args[0];
  const restArgs = args.slice(1);
  switch (subcommand) {
    case "create":
    case "new":
      await createNewAgent(restArgs[0], options);
      break;
    case "list":
    case "ls":
      await listAgents(options);
      break;
    case "info":
    case "show":
      await showAgentInfo(restArgs[0], options);
      break;
    case "remove":
    case "rm":
    case "delete":
      await removeAgent(restArgs[0]);
      break;
    case "run":
    case "start":
      await runAgent(restArgs[0], restArgs.slice(1).join(" "));
      break;
    case "templates":
      await listTemplates(options);
      break;
    default:
      showAgentHelp();
  }
}
async function createNewAgent(name, options) {
  if (!name) {
    console.log(ansis.red("Error: Please specify an agent name"));
    console.log(ansis.dim("Example: agent create my-assistant"));
    return;
  }
  console.log(ansis.cyan(`
\u{1F916} Creating agent: ${name}
`));
  try {
    let agent;
    if (options.template) {
      console.log(ansis.dim(`Using template: ${options.template}`));
      agent = await createAgentFromTemplate(options.template, {
        id: name,
        name: { "en": name, "zh-CN": name }
      });
    } else {
      const builder = createAgent().id(name).name(name).description(`Custom agent: ${name}`);
      if (options.skills && options.skills.length > 0) {
        builder.addSkills(options.skills);
        console.log(ansis.dim(`Adding skills: ${options.skills.join(", ")}`));
      }
      if (options.mcp && options.mcp.length > 0) {
        builder.addMcpServers(options.mcp);
        console.log(ansis.dim(`Adding MCP servers: ${options.mcp.join(", ")}`));
      }
      if (options.persona) {
        builder.persona(options.persona);
      }
      agent = await builder.save();
    }
    console.log(ansis.green(`
\u2705 Agent created successfully!`));
    console.log("");
    console.log(ansis.bold("Agent Details:"));
    console.log(ansis.dim(`  ID: ${agent.id}`));
    console.log(ansis.dim(`  Name: ${agent.name.en}`));
    console.log(ansis.dim(`  Skills: ${agent.skills.length}`));
    console.log(ansis.dim(`  MCP Servers: ${agent.mcpServers.length}`));
    console.log(ansis.dim(`  Capabilities: ${agent.capabilities.join(", ")}`));
    console.log("");
    console.log(ansis.dim(`Run with: agent run ${agent.id}`));
  } catch (error) {
    console.log(ansis.red(`\u274C Failed to create agent: ${error instanceof Error ? error.message : error}`));
  }
}
async function listAgents(options) {
  const manager = await getPluginManager();
  const agents = manager.listAgents();
  if (options.json) {
    console.log(JSON.stringify(agents, null, 2));
    return;
  }
  console.log(ansis.cyan("\n\u{1F916} Installed Agents\n"));
  if (agents.length === 0) {
    console.log(ansis.dim("No agents created yet."));
    console.log(ansis.dim("\nCreate an agent with:"));
    console.log(ansis.dim("  agent create my-assistant --template code-assistant"));
    console.log(ansis.dim("  agent create my-agent --skills git-helper,code-reviewer"));
    return;
  }
  for (const agent of agents) {
    const name = agent.name.en || agent.id;
    console.log(`  ${ansis.bold(name)} ${ansis.dim(`(${agent.id})`)}`);
    console.log(ansis.dim(`    ${agent.description.en}`));
    const badges = [];
    if (agent.skills.length > 0)
      badges.push(`\u{1F4DA} ${agent.skills.length} skills`);
    if (agent.mcpServers.length > 0)
      badges.push(`\u{1F527} ${agent.mcpServers.length} MCP`);
    if (agent.capabilities.length > 0)
      badges.push(`\u26A1 ${agent.capabilities.length} capabilities`);
    if (badges.length > 0) {
      console.log(ansis.dim(`    ${badges.join(" \u2022 ")}`));
    }
    console.log("");
  }
  console.log(ansis.dim(`Total: ${agents.length} agents`));
}
async function showAgentInfo(agentId, options) {
  if (!agentId) {
    console.log(ansis.red("Error: Please specify an agent ID"));
    return;
  }
  const manager = await getPluginManager();
  const agent = manager.getAgent(agentId);
  if (!agent) {
    console.log(ansis.red(`Agent not found: ${agentId}`));
    return;
  }
  if (options.json) {
    console.log(JSON.stringify(agent, null, 2));
    return;
  }
  console.log("");
  console.log(ansis.bold(ansis.cyan(`\u{1F916} ${agent.name.en}`)));
  console.log(ansis.dim(`ID: ${agent.id}`));
  console.log("");
  console.log(ansis.bold("\u{1F4DD} Description"));
  console.log(ansis.dim(`  ${agent.description.en}`));
  console.log("");
  console.log(ansis.bold("\u{1F3AD} Persona"));
  console.log(ansis.dim(`  ${agent.persona.substring(0, 200)}${agent.persona.length > 200 ? "..." : ""}`));
  console.log("");
  if (agent.instructions) {
    console.log(ansis.bold("\u{1F4CB} Instructions"));
    const lines = agent.instructions.split("\n").slice(0, 5);
    for (const line of lines) {
      console.log(ansis.dim(`  ${line}`));
    }
    if (agent.instructions.split("\n").length > 5) {
      console.log(ansis.dim("  ..."));
    }
    console.log("");
  }
  if (agent.skills.length > 0) {
    console.log(ansis.bold("\u{1F4DA} Skills"));
    for (const skill of agent.skills) {
      const plugin = manager.getPlugin(skill.pluginId);
      const name = plugin?.manifest.name.en || skill.pluginId;
      console.log(ansis.dim(`  \u2022 ${name}`));
    }
    console.log("");
  }
  if (agent.mcpServers.length > 0) {
    console.log(ansis.bold("\u{1F527} MCP Servers"));
    for (const mcp of agent.mcpServers) {
      console.log(ansis.dim(`  \u2022 ${mcp.serverName}`));
      if (mcp.tools && mcp.tools.length > 0) {
        console.log(ansis.dim(`    Tools: ${mcp.tools.join(", ")}`));
      }
    }
    console.log("");
  }
  if (agent.capabilities.length > 0) {
    console.log(ansis.bold("\u26A1 Capabilities"));
    for (const cap of agent.capabilities) {
      console.log(ansis.dim(`  \u2022 ${formatCapability(cap)}`));
    }
    console.log("");
  }
  if (agent.triggers && agent.triggers.length > 0) {
    console.log(ansis.bold("\u{1F3AF} Triggers"));
    for (const trigger of agent.triggers) {
      console.log(ansis.dim(`  \u2022 ${trigger}`));
    }
    console.log("");
  }
  console.log(ansis.bold("\u{1F4AC} System Prompt Preview"));
  try {
    const runtime = await getAgentRuntime(agentId);
    const prompt = runtime.getSystemPrompt();
    const lines = prompt.split("\n").slice(0, 10);
    for (const line of lines) {
      console.log(ansis.dim(`  ${line}`));
    }
    console.log(ansis.dim("  ..."));
  } catch {
    console.log(ansis.dim("  (Unable to generate preview)"));
  }
}
async function removeAgent(agentId) {
  if (!agentId) {
    console.log(ansis.red("Error: Please specify an agent ID"));
    return;
  }
  const manager = await getPluginManager();
  const agent = manager.getAgent(agentId);
  if (!agent) {
    console.log(ansis.red(`Agent not found: ${agentId}`));
    return;
  }
  console.log(ansis.yellow(`
\u26A0\uFE0F  Removing agent: ${agent.name.en}`));
  console.log(ansis.red("Agent removal not yet implemented"));
}
async function runAgent(agentId, task) {
  if (!agentId) {
    console.log(ansis.red("Error: Please specify an agent ID"));
    return;
  }
  const manager = await getPluginManager();
  const agent = manager.getAgent(agentId);
  if (!agent) {
    console.log(ansis.red(`Agent not found: ${agentId}`));
    return;
  }
  console.log(ansis.cyan(`
\u{1F916} Starting agent: ${agent.name.en}
`));
  try {
    const runtime = await getAgentRuntime(agentId);
    console.log(ansis.bold("System Prompt:"));
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log(ansis.dim(runtime.getSystemPrompt()));
    console.log(ansis.dim("\u2500".repeat(60)));
    console.log("");
    if (task) {
      runtime.setTask(task);
      console.log(ansis.bold("Task:"));
      console.log(ansis.dim(task));
      console.log("");
    }
    const skillContent = runtime.getSkillContent();
    if (skillContent) {
      console.log(ansis.bold("Skill Knowledge:"));
      console.log(ansis.dim("\u2500".repeat(60)));
      const lines = skillContent.split("\n").slice(0, 20);
      for (const line of lines) {
        console.log(ansis.dim(line));
      }
      if (skillContent.split("\n").length > 20) {
        console.log(ansis.dim("... (truncated)"));
      }
      console.log(ansis.dim("\u2500".repeat(60)));
    }
    console.log("");
    console.log(ansis.green("\u2705 Agent ready!"));
    console.log(ansis.dim("The system prompt and skill knowledge above can be used with Claude."));
  } catch (error) {
    console.log(ansis.red(`\u274C Failed to start agent: ${error instanceof Error ? error.message : error}`));
  }
}
async function listTemplates(options) {
  const creator = getAgentCreator();
  const templates = creator.listTemplates();
  if (options.json) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }
  console.log(ansis.cyan("\n\u{1F4CB} Available Agent Templates\n"));
  const templateInfo = {
    "code-assistant": {
      name: "Code Assistant",
      description: "General-purpose coding assistant",
      capabilities: ["code-generation", "code-review", "debugging", "refactoring"]
    },
    "git-master": {
      name: "Git Master",
      description: "Expert Git operations assistant",
      capabilities: ["git-operations"]
    },
    "test-engineer": {
      name: "Test Engineer",
      description: "Testing and quality assurance specialist",
      capabilities: ["testing", "code-review"]
    },
    "devops-engineer": {
      name: "DevOps Engineer",
      description: "DevOps and deployment specialist",
      capabilities: ["deployment", "file-management"]
    },
    "full-stack": {
      name: "Full Stack Developer",
      description: "Full stack development assistant",
      capabilities: ["code-generation", "code-review", "testing", "documentation", "deployment"]
    }
  };
  for (const templateId of templates) {
    const info = templateInfo[templateId];
    if (info) {
      console.log(`  ${ansis.bold(info.name)} ${ansis.dim(`(${templateId})`)}`);
      console.log(ansis.dim(`    ${info.description}`));
      console.log(ansis.dim(`    Capabilities: ${info.capabilities.join(", ")}`));
      console.log("");
    } else {
      console.log(`  ${ansis.bold(templateId)}`);
      console.log("");
    }
  }
  console.log(ansis.dim("Create an agent from template:"));
  console.log(ansis.dim("  agent create my-assistant --template code-assistant"));
}
function formatCapability(cap) {
  const labels = {
    "code-generation": "Code Generation",
    "code-review": "Code Review",
    "testing": "Testing",
    "documentation": "Documentation",
    "deployment": "Deployment",
    "debugging": "Debugging",
    "refactoring": "Refactoring",
    "git-operations": "Git Operations",
    "file-management": "File Management",
    "web-search": "Web Search",
    "api-integration": "API Integration"
  };
  return labels[cap] || cap;
}
function showAgentHelp() {
  console.log(`
${ansis.bold(ansis.cyan("\u{1F916} Agent Command"))}

${ansis.bold("Usage:")}
  agent <command> [options]

${ansis.bold("Commands:")}
  ${ansis.green("create")} <name>     Create a new agent
  ${ansis.green("list")}              List all agents
  ${ansis.green("info")} <id>         Show agent details
  ${ansis.green("remove")} <id>       Remove an agent
  ${ansis.green("run")} <id> [task]   Run an agent
  ${ansis.green("templates")}         List available templates

${ansis.bold("Options:")}
  --template <id>    Use a template (code-assistant, git-master, etc.)
  --skills <ids>     Comma-separated skill IDs to include
  --mcp <servers>    Comma-separated MCP server names
  --persona <text>   Custom persona for the agent
  --json             Output as JSON

${ansis.bold("Examples:")}
  ${ansis.dim("# Create from template")}
  agent create my-assistant --template code-assistant

  ${ansis.dim("# Create with specific skills")}
  agent create reviewer --skills code-reviewer,react-best-practices

  ${ansis.dim("# Create with MCP servers")}
  agent create deployer --mcp vercel,github --skills vercel-deploy

  ${ansis.dim("# List all agents")}
  agent list

  ${ansis.dim("# Run an agent")}
  agent run my-assistant "Review this code"

${ansis.bold("Agent Composition:")}
  Agents combine Skills (knowledge) + MCP (tools) + Persona (behavior)

  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502                   Agent                      \u2502
  \u2502  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u2502
  \u2502  \u2502 Skills  \u2502 +\u2502   MCP   \u2502 +\u2502   Persona   \u2502 \u2502
  \u2502  \u2502(\u77E5\u8BC6\u5E93) \u2502  \u2502 (\u5DE5\u5177)  \u2502  \u2502  (\u884C\u4E3A)     \u2502 \u2502
  \u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);
}

export { handleAgentCommand as default, handleAgentCommand };
