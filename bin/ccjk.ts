#!/usr/bin/env node

/**
 * CLI tool for managing code tools
 */

import { createTool, getRegistry } from '../src/index';
import { ICodeTool } from '../src/code-tools/core/interfaces';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'list':
      await listTools();
      break;
    case 'info':
      await showToolInfo(args[1]);
      break;
    case 'check':
      await checkInstallation(args[1]);
      break;
    case 'install':
      await installTool(args[1]);
      break;
    case 'configure':
      await configureTool(args[1]);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

async function listTools() {
  console.log('Available tools:\n');
  const registry = getRegistry();
  const metadata = await registry.getAllMetadata();

  for (const meta of metadata) {
    console.log(`  ${meta.displayName} (${meta.name})`);
    console.log(`    ${meta.description}`);
    console.log(`    Homepage: ${meta.homepage || 'N/A'}`);
    console.log('');
  }
}

async function showToolInfo(toolName: string) {
  if (!toolName) {
    console.error('Error: Tool name required');
    console.log('Usage: ccjk info <tool-name>');
    process.exit(1);
  }

  try {
    const tool = createTool(toolName);
    const metadata = tool.getMetadata();
    const status = await tool.isInstalled();
    const config = await tool.getConfig();

    console.log(`\n${metadata.displayName}`);
    console.log('='.repeat(metadata.displayName.length));
    console.log(`\nDescription: ${metadata.description}`);
    console.log(`Version: ${metadata.version}`);
    console.log(`Homepage: ${metadata.homepage || 'N/A'}`);
    console.log(`Documentation: ${metadata.documentation || 'N/A'}`);
    console.log(`\nInstalled: ${status.installed ? 'Yes' : 'No'}`);
    if (status.installed) {
      console.log(`  Version: ${status.version || 'Unknown'}`);
      console.log(`  Path: ${status.path || 'Unknown'}`);
    }
    console.log('\nCapabilities:');
    console.log(`  Chat: ${metadata.capabilities.supportsChat ? '✅' : '❌'}`);
    console.log(`  File Edit: ${metadata.capabilities.supportsFileEdit ? '✅' : '❌'}`);
    console.log(`  Code Gen: ${metadata.capabilities.supportsCodeGen ? '✅' : '❌'}`);
    console.log(`  Review: ${metadata.capabilities.supportsReview ? '✅' : '❌'}`);
    console.log(`  Testing: ${metadata.capabilities.supportsTesting ? '✅' : '❌'}`);
    console.log(`  Debugging: ${metadata.capabilities.supportsDebugging ? '✅' : '❌'}`);
    console.log('\nConfiguration:');
    console.log(`  Model: ${config.model || 'Not set'}`);
    console.log(`  API Key: ${config.apiKey ? '***' : 'Not set'}`);
    console.log('');
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function checkInstallation(toolName: string) {
  if (!toolName) {
    console.log('Checking all tools...\n');
    const registry = getRegistry();
    const toolNames = registry.getToolNames();

    for (const name of toolNames) {
      const tool = createTool(name);
      const metadata = tool.getMetadata();
      const status = await tool.isInstalled();

      console.log(`${metadata.displayName}: ${status.installed ? '✅' : '❌'}`);
      if (status.installed && status.version) {
        console.log(`  Version: ${status.version}`);
      }
    }
    console.log('');
  } else {
    try {
      const tool = createTool(toolName);
      const metadata = tool.getMetadata();
      const status = await tool.isInstalled();

      console.log(`\n${metadata.displayName}: ${status.installed ? '✅ Installed' : '❌ Not installed'}`);
      if (status.installed) {
        console.log(`Version: ${status.version || 'Unknown'}`);
        console.log(`Path: ${status.path || 'Unknown'}`);
      } else {
        console.log('\nTo install, run:');
        console.log(`  ccjk install ${toolName}`);
      }
      console.log('');
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

async function installTool(toolName: string) {
  if (!toolName) {
    console.error('Error: Tool name required');
    console.log('Usage: ccjk install <tool-name>');
    process.exit(1);
  }

  try {
    const tool = createTool(toolName);
    const metadata = tool.getMetadata();

    console.log(`Installing ${metadata.displayName}...`);
    const result = await tool.install();

    if (result.success) {
      console.log(`✅ ${metadata.displayName} installed successfully!`);
      if (result.output) {
        console.log(result.output);
      }
    } else {
      console.error(`❌ Installation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function configureTool(toolName: string) {
  if (!toolName) {
    console.error('Error: Tool name required');
    console.log('Usage: ccjk configure <tool-name>');
    process.exit(1);
  }

  try {
    const tool = createTool(toolName);
    const metadata = tool.getMetadata();
    const config = await tool.getConfig();

    console.log(`\nCurrent configuration for ${metadata.displayName}:`);
    console.log(JSON.stringify(config, null, 2));
    console.log('\nTo update configuration, use the API:');
    console.log(`  const tool = createTool('${toolName}');`);
    console.log(`  await tool.updateConfig({ apiKey: 'your-key' });`);
    console.log('');
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
CCJK - Code Tools Abstraction Layer

Usage:
  ccjk <command> [options]

Commands:
  list                    List all available tools
  info <tool-name>        Show detailed information about a tool
  check [tool-name]       Check if tool(s) are installed
  install <tool-name>     Install a tool
  configure <tool-name>   Show tool configuration
  help                    Show this help message

Examples:
  ccjk list
  ccjk info claude-code
  ccjk check
  ccjk check aider
  ccjk install claude-code
  ccjk configure cursor

Available tools:
  claude-code, codex, aider, continue, cline, cursor

For more information, visit: https://github.com/your-org/ccjk
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
