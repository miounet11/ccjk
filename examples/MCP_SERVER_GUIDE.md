# CCJK MCP Server Examples

This directory contains example configurations for using CCJK as an MCP (Model Context Protocol) server.

## Quick Start

### For Claude Code

Add the following to your Claude Code configuration file (`.claude/config.json` or `~/.claude/config.json`):

```json
{
  "mcpServers": {
    "ccjk": {
      "command": "npx",
      "args": ["ccjk", "serve", "--mcp", "--stdio"]
    }
  }
}
```

### For Other MCP Clients

#### Stdio Transport (Recommended)

```bash
npx ccjk serve --mcp --stdio
```

#### HTTP Transport

```bash
npx ccjk serve --mcp --http --port 3000
```

## Available Tools

Once configured, the following tools are available via MCP:

### 1. `ccjk_chat`
Send messages to Claude via CCJK with custom provider/model selection.

**Parameters:**
- `message` (required): The message to send
- `provider` (optional): API provider name (e.g., "302ai", "openai")
- `model` (optional): Model name (e.g., "claude-3-5-sonnet-20241022")
- `systemPrompt` (optional): System prompt to guide the response

**Example:**
```json
{
  "name": "ccjk_chat",
  "arguments": {
    "message": "Explain async/await in JavaScript",
    "provider": "302ai",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### 2. `ccjk_providers`
List all configured API providers.

**Example:**
```json
{
  "name": "ccjk_providers",
  "arguments": {}
}
```

### 3. `ccjk_stats`
Get usage statistics (requires CCusage tool).

**Parameters:**
- `period` (optional): Time period ("7d", "30d", "all")

**Example:**
```json
{
  "name": "ccjk_stats",
  "arguments": {
    "period": "7d"
  }
}
```

### 4. `ccjk_workflows`
List available workflows.

**Parameters:**
- `category` (optional): Filter by category

**Example:**
```json
{
  "name": "ccjk_workflows",
  "arguments": {
    "category": "git"
  }
}
```

### 5. `ccjk_mcp_services`
List configured MCP services.

**Parameters:**
- `detailed` (optional): Include detailed configuration

**Example:**
```json
{
  "name": "ccjk_mcp_services",
  "arguments": {
    "detailed": true
  }
}
```

### 6. `ccjk_config`
Get or set CCJK configuration.

**Parameters:**
- `action` (required): "get", "set", or "list"
- `key` (optional): Configuration key (for get/set)
- `value` (optional): Configuration value (for set)

**Example:**
```json
{
  "name": "ccjk_config",
  "arguments": {
    "action": "get",
    "key": "preferredLang"
  }
}
```

### 7. `ccjk_init`
Initialize or update Claude Code configuration.

**Parameters:**
- `mode` (optional): "full", "workflows-only", or "api-only"
- `force` (optional): Force overwrite existing configuration

**Example:**
```json
{
  "name": "ccjk_init",
  "arguments": {
    "mode": "workflows-only",
    "force": false
  }
}
```

### 8. `ccjk_doctor`
Run health check and diagnostics.

**Parameters:**
- `verbose` (optional): Show detailed information

**Example:**
```json
{
  "name": "ccjk_doctor",
  "arguments": {
    "verbose": true
  }
}
```

## Configuration Options

### Environment Variables

- `CCJK_LANG`: Set display language ("en" or "zh-CN")

### Command Line Options

```bash
# Stdio transport (default)
npx ccjk serve --mcp --stdio

# HTTP transport
npx ccjk serve --mcp --http --port 3000 --host localhost

# Enable debug logging
npx ccjk serve --mcp --stdio --debug
```

## Testing the Server

### Test with curl (HTTP mode)

```bash
# Start server
npx ccjk serve --mcp --http --port 3000 &

# Initialize
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call a tool
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ccjk_providers","arguments":{}}}'
```

### Test with stdio

```bash
# Start server
npx ccjk serve --mcp --stdio

# Send JSON-RPC messages via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | npx ccjk serve --mcp --stdio
```

## Troubleshooting

### Server not starting

1. Check Node.js version (requires Node.js >= 20)
2. Ensure CCJK is installed: `npm install -g ccjk`
3. Check for port conflicts (HTTP mode)

### Tools not working

1. Verify CCJK is properly initialized: `npx ccjk doctor`
2. Check configuration files exist
3. Enable debug mode: `--debug`

### Claude Code integration issues

1. Verify MCP configuration in `.claude/config.json`
2. Restart Claude Code after configuration changes
3. Check Claude Code logs for errors

## Advanced Usage

### Custom Configuration

Create a custom MCP configuration file:

```json
{
  "mcpServers": {
    "ccjk": {
      "command": "npx",
      "args": ["ccjk", "serve", "--mcp", "--stdio", "--debug"],
      "env": {
        "CCJK_LANG": "zh-CN",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Multiple Instances

Run multiple CCJK MCP servers with different configurations:

```json
{
  "mcpServers": {
    "ccjk-dev": {
      "command": "npx",
      "args": ["ccjk", "serve", "--mcp", "--stdio"],
      "env": {
        "CCJK_LANG": "en"
      }
    },
    "ccjk-prod": {
      "command": "npx",
      "args": ["ccjk", "serve", "--mcp", "--http", "--port", "3001"],
      "env": {
        "CCJK_LANG": "zh-CN"
      }
    }
  }
}
```

## Protocol Details

CCJK MCP Server implements the Model Context Protocol specification (version 2024-11-05).

### Supported Methods

- `initialize`: Initialize the server connection
- `tools/list`: List available tools
- `tools/call`: Execute a tool
- `ping`: Health check

### Response Format

All responses follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool result data"
      }
    ]
  }
}
```

## Contributing

To add new tools to the MCP server:

1. Define the tool in `src/mcp/mcp-tools.ts`
2. Implement the handler in `src/mcp/mcp-handler.ts`
3. Add tests in `tests/mcp/`
4. Update this documentation

## License

MIT
