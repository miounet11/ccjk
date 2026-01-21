import { createServer } from 'node:http';
import process__default from 'node:process';

const MCP_TOOLS = [
  {
    name: "ccjk_chat",
    description: "Send a message to Claude via CCJK and get a response. Supports custom provider and model selection.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to send to Claude"
        },
        provider: {
          type: "string",
          description: 'Optional API provider name (e.g., "302ai", "openai", "anthropic")'
        },
        model: {
          type: "string",
          description: 'Optional model name (e.g., "claude-3-5-sonnet-20241022", "gpt-4")'
        },
        systemPrompt: {
          type: "string",
          description: "Optional system prompt to guide the AI response"
        }
      },
      required: ["message"]
    }
  },
  {
    name: "ccjk_providers",
    description: "List all available API providers configured in CCJK",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "ccjk_stats",
    description: "Get usage statistics from CCJK (requires CCusage tool)",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Time period for statistics (7d, 30d, all)",
          enum: ["7d", "30d", "all"]
        }
      }
    }
  },
  {
    name: "ccjk_workflows",
    description: "List available workflows in CCJK",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by workflow category (git, sixStep, common-tools, etc.)"
        }
      }
    }
  },
  {
    name: "ccjk_mcp_services",
    description: "List configured MCP services in Claude Code",
    inputSchema: {
      type: "object",
      properties: {
        detailed: {
          type: "boolean",
          description: "Include detailed configuration information"
        }
      }
    }
  },
  {
    name: "ccjk_config",
    description: "Get or set CCJK configuration values",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action to perform (get, set, list)",
          enum: ["get", "set", "list"]
        },
        key: {
          type: "string",
          description: "Configuration key (for get/set actions)"
        },
        value: {
          type: "string",
          description: "Configuration value (for set action)"
        }
      },
      required: ["action"]
    }
  },
  {
    name: "ccjk_init",
    description: "Initialize or update Claude Code configuration via CCJK",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description: "Initialization mode (full, workflows-only, api-only)",
          enum: ["full", "workflows-only", "api-only"]
        },
        force: {
          type: "boolean",
          description: "Force overwrite existing configuration"
        }
      }
    }
  },
  {
    name: "ccjk_doctor",
    description: "Run CCJK health check and diagnostics",
    inputSchema: {
      type: "object",
      properties: {
        verbose: {
          type: "boolean",
          description: "Show detailed diagnostic information"
        }
      }
    }
  }
];
function getToolByName(name) {
  return MCP_TOOLS.find((tool) => tool.name === name);
}
function validateToolInput(tool, input) {
  const errors = [];
  if (tool.inputSchema.required) {
    for (const field of tool.inputSchema.required) {
      if (!(field in input)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  for (const [key, value] of Object.entries(input)) {
    const schema = tool.inputSchema.properties[key];
    if (!schema) {
      errors.push(`Unknown field: ${key}`);
      continue;
    }
    if (schema.type === "string" && typeof value !== "string") {
      errors.push(`Field ${key} must be a string`);
    } else if (schema.type === "boolean" && typeof value !== "boolean") {
      errors.push(`Field ${key} must be a boolean`);
    } else if (schema.type === "number" && typeof value !== "number") {
      errors.push(`Field ${key} must be a number`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Field ${key} must be one of: ${schema.enum.join(", ")}`);
    }
  }
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : void 0
  };
}

class MCPHandler {
  /**
   * Handle a tool call from MCP client
   */
  async handleToolCall(toolName, args) {
    const tool = getToolByName(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
    }
    const validation = validateToolInput(tool, args);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid input: ${validation.errors?.join(", ")}`
      };
    }
    try {
      switch (toolName) {
        case "ccjk_chat":
          return await this.handleChat(args);
        case "ccjk_providers":
          return await this.handleProviders(args);
        case "ccjk_stats":
          return await this.handleStats(args);
        case "ccjk_workflows":
          return await this.handleWorkflows(args);
        case "ccjk_mcp_services":
          return await this.handleMcpServices(args);
        case "ccjk_config":
          return await this.handleConfig(args);
        case "ccjk_init":
          return await this.handleInit(args);
        case "ccjk_doctor":
          return await this.handleDoctor(args);
        default:
          return {
            success: false,
            error: `Tool not implemented: ${toolName}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Handle ccjk_chat tool
   */
  async handleChat(args) {
    const { message, provider, model } = args;
    return {
      success: true,
      data: {
        response: `[CCJK MCP] Received message: "${message}"`,
        provider: provider || "default",
        model: model || "default",
        note: "This is a placeholder. Actual Claude API integration pending."
      }
    };
  }
  /**
   * Handle ccjk_providers tool
   */
  async handleProviders(_args) {
    try {
      const { readMcpConfig } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      const config = readMcpConfig();
      const providers = [];
      if (config?.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          providers.push({
            name,
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env
          });
        }
      }
      return {
        success: true,
        data: {
          providers,
          count: providers.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read providers: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_stats tool
   */
  async handleStats(args) {
    const { period = "all" } = args;
    try {
      const { x } = await import('tinyexec');
      const result = await x("ccusage", ["--json", "--period", period]);
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: "CCusage tool not available or failed"
        };
      }
      const stats = JSON.parse(result.stdout);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_workflows tool
   */
  async handleWorkflows(args) {
    const { category } = args;
    try {
      const { getWorkflowConfigs } = await import('./workflows.mjs');
      let workflows = getWorkflowConfigs();
      if (category) {
        workflows = workflows.filter((w) => w.category === category);
      }
      return {
        success: true,
        data: {
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            category: w.category,
            description: w.description
          })),
          count: workflows.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_mcp_services tool
   */
  async handleMcpServices(args) {
    const { detailed = false } = args;
    try {
      const { readMcpConfig } = await import('./claude-config.mjs').then(function (n) { return n.e; });
      const config = await readMcpConfig();
      const services = config?.mcpServers || {};
      const serviceList = Object.entries(services).map(([name, config2]) => {
        if (detailed) {
          return { name, config: config2 };
        }
        return { name };
      });
      return {
        success: true,
        data: {
          services: serviceList,
          count: serviceList.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list MCP services: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_config tool
   */
  async handleConfig(args) {
    const { action, key, value } = args;
    try {
      const { readZcfConfig, updateZcfConfig } = await import('./ccjk-config.mjs');
      if (action === "list") {
        const config = await readZcfConfig();
        return {
          success: true,
          data: config || {}
        };
      }
      if (action === "get") {
        if (!key) {
          return {
            success: false,
            error: "Key is required for get action"
          };
        }
        const config = await readZcfConfig();
        return {
          success: true,
          data: {
            key,
            value: config?.[key]
          }
        };
      }
      if (action === "set") {
        if (!key || value === void 0) {
          return {
            success: false,
            error: "Key and value are required for set action"
          };
        }
        await updateZcfConfig({ [key]: value });
        return {
          success: true,
          data: {
            key,
            value,
            message: "Configuration updated"
          }
        };
      }
      return {
        success: false,
        error: `Unknown action: ${action}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to handle config: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_init tool
   */
  async handleInit(args) {
    const { mode = "full", force = false } = args;
    try {
      const { init } = await import('./init.mjs').then(function (n) { return n.k; });
      const options = {
        force,
        skipPrompt: true
      };
      if (mode === "workflows-only") {
        options.configAction = "skip";
        options.apiType = "skip";
      } else if (mode === "api-only") {
        options.workflows = false;
      }
      await init(options);
      return {
        success: true,
        data: {
          message: `Initialization completed in ${mode} mode`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * Handle ccjk_doctor tool
   */
  async handleDoctor(args) {
    const { verbose = false } = args;
    try {
      const { doctor } = await import('./doctor.mjs');
      const originalLog = console.log;
      const output = [];
      console.log = (...args2) => {
        output.push(args2.join(" "));
      };
      await doctor();
      console.log = originalLog;
      return {
        success: true,
        data: {
          output: output.join("\n"),
          verbose
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Doctor check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

class MCPServer {
  handler;
  httpServer;
  options;
  serverInfo;
  initialized = false;
  constructor(options = {}) {
    this.options = {
      transport: options.transport || "stdio",
      port: options.port || 3e3,
      host: options.host || "localhost",
      debug: options.debug || false
    };
    this.handler = new MCPHandler();
    this.serverInfo = {
      name: "ccjk-mcp-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: true,
        prompts: false,
        resources: false
      }
    };
  }
  /**
   * Start the MCP server
   */
  async start() {
    if (this.options.transport === "stdio") {
      await this.startStdio();
    } else {
      await this.startHttp();
    }
  }
  /**
   * Stop the MCP server
   */
  async stop() {
    if (this.httpServer) {
      return new Promise((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err)
            reject(err);
          else resolve();
        });
      });
    }
  }
  /**
   * Start stdio transport mode
   */
  async startStdio() {
    this.log("Starting MCP server in stdio mode...");
    process__default.stdin.setEncoding("utf8");
    let buffer = "";
    process__default.stdin.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          this.handleStdioMessage(line).catch((error) => {
            this.logError("Error handling stdio message:", error);
          });
        }
      }
    });
    process__default.stdin.on("end", () => {
      this.log("Stdin closed, shutting down...");
      process__default.exit(0);
    });
    this.log("MCP server ready (stdio mode)");
  }
  /**
   * Start HTTP transport mode
   */
  async startHttp() {
    this.log(`Starting MCP server in HTTP mode on ${this.options.host}:${this.options.port}...`);
    this.httpServer = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", async () => {
        try {
          const request = JSON.parse(body);
          const response = await this.handleRequest(request);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error",
              data: error instanceof Error ? error.message : String(error)
            }
          }));
        }
      });
    });
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.options.port, this.options.host, () => {
        this.log(`MCP server listening on http://${this.options.host}:${this.options.port}`);
        resolve();
      });
      this.httpServer.on("error", reject);
    });
  }
  /**
   * Handle stdio message
   */
  async handleStdioMessage(message) {
    try {
      const request = JSON.parse(message);
      const response = await this.handleRequest(request);
      process__default.stdout.write(`${JSON.stringify(response)}
`);
    } catch (error) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: error instanceof Error ? error.message : String(error)
        }
      };
      process__default.stdout.write(`${JSON.stringify(errorResponse)}
`);
    }
  }
  /**
   * Handle MCP request
   */
  async handleRequest(request) {
    this.log(`Received request: ${request.method}`);
    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        case "tools/list":
          return this.handleToolsList(request);
        case "tools/call":
          return await this.handleToolsCall(request);
        case "ping":
          return this.handlePing(request);
        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  /**
   * Handle initialize request
   */
  handleInitialize(request) {
    this.initialized = true;
    this.log("Server initialized");
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: this.serverInfo.protocolVersion,
        capabilities: this.serverInfo.capabilities,
        serverInfo: {
          name: this.serverInfo.name,
          version: this.serverInfo.version
        }
      }
    };
  }
  /**
   * Handle tools/list request
   */
  handleToolsList(request) {
    if (!this.initialized) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32002,
          message: "Server not initialized"
        }
      };
    }
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: MCP_TOOLS
      }
    };
  }
  /**
   * Handle tools/call request
   */
  async handleToolsCall(request) {
    if (!this.initialized) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32002,
          message: "Server not initialized"
        }
      };
    }
    const { name, arguments: args } = request.params || {};
    if (!name) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32602,
          message: "Invalid params: missing tool name"
        }
      };
    }
    this.log(`Calling tool: ${name}`);
    const result = await this.handler.handleToolCall(name, args || {});
    if (!result.success) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32e3,
          message: result.error || "Tool execution failed"
        }
      };
    }
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data, null, 2)
          }
        ]
      }
    };
  }
  /**
   * Handle ping request
   */
  handlePing(request) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  /**
   * Log message (only in debug mode)
   */
  log(...args) {
    if (this.options.debug) {
      console.error("[MCP Server]", ...args);
    }
  }
  /**
   * Log error (always)
   */
  logError(...args) {
    console.error("[MCP Server Error]", ...args);
  }
}
async function startMCPServer(options = {}) {
  const server = new MCPServer(options);
  await server.start();
  return server;
}

export { MCPServer, startMCPServer };
