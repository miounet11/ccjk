/**
 * Example usage of the code tools abstraction layer
 */

import {
  createTool,
  getRegistry,
  ICodeTool,
  IChatTool,
  IFileEditTool,
  ICodeGenTool,
} from '../index';

/**
 * Example 1: Basic tool usage
 */
async function example1_BasicUsage() {
  console.log('=== Example 1: Basic Tool Usage ===\n');

  // Create a tool instance
  const claude = createTool('claude-code');

  // Get tool metadata
  const metadata = claude.getMetadata();
  console.log(`Tool: ${metadata.displayName}`);
  console.log(`Description: ${metadata.description}`);
  console.log(`Capabilities:`, metadata.capabilities);

  // Check if installed
  const status = await claude.isInstalled();
  console.log(`\nInstalled: ${status.installed}`);
  if (status.installed) {
    console.log(`Version: ${status.version}`);
    console.log(`Path: ${status.path}`);
  }
}

/**
 * Example 2: Configuration management
 */
async function example2_Configuration() {
  console.log('\n=== Example 2: Configuration Management ===\n');

  const tool = createTool('claude-code');

  // Configure the tool
  await tool.configure({
    name: 'claude-code',
    apiKey: process.env.CLAUDE_API_KEY || 'your-api-key',
    model: 'claude-opus-4',
    settings: {
      temperature: 0.7,
      maxTokens: 4096,
    },
  });

  // Get current configuration
  const config = await tool.getConfig();
  console.log('Current configuration:', config);

  // Update specific fields
  await tool.updateConfig({
    model: 'claude-sonnet-3.5',
  });

  console.log('Updated model:', (await tool.getConfig()).model);
}

/**
 * Example 3: Working with multiple tools
 */
async function example3_MultipleTools() {
  console.log('\n=== Example 3: Multiple Tools ===\n');

  const toolNames = ['claude-code', 'aider', 'cursor'];

  for (const name of toolNames) {
    const tool = createTool(name);
    const metadata = tool.getMetadata();
    const status = await tool.isInstalled();

    console.log(`${metadata.displayName}: ${status.installed ? '✅' : '❌'}`);
  }
}

/**
 * Example 4: Using the registry
 */
async function example4_Registry() {
  console.log('\n=== Example 4: Tool Registry ===\n');

  const registry = getRegistry();

  // Get all registered tool names
  const toolNames = registry.getToolNames();
  console.log('Registered tools:', toolNames);

  // Get all tool metadata
  const allMetadata = await registry.getAllMetadata();
  console.log('\nTool capabilities:');
  allMetadata.forEach(meta => {
    console.log(`\n${meta.displayName}:`);
    console.log(`  Chat: ${meta.capabilities.supportsChat ? '✅' : '❌'}`);
    console.log(`  File Edit: ${meta.capabilities.supportsFileEdit ? '✅' : '❌'}`);
    console.log(`  Code Gen: ${meta.capabilities.supportsCodeGen ? '✅' : '❌'}`);
  });
}

/**
 * Example 5: Chat interface
 */
async function example5_ChatInterface() {
  console.log('\n=== Example 5: Chat Interface ===\n');

  const tool = createTool('claude-code') as IChatTool;

  // Start a chat
  console.log('Starting chat...');
  const response = await tool.chat('Explain the concept of closures in JavaScript');
  console.log('Response:', response.output?.substring(0, 100) + '...');

  // Continue the conversation
  const followUp = await tool.continueChat('Can you show a practical example?');
  console.log('Follow-up:', followUp.output?.substring(0, 100) + '...');

  // End the chat
  await tool.endChat();
  console.log('Chat ended');
}

/**
 * Example 6: File editing
 */
async function example6_FileEditing() {
  console.log('\n=== Example 6: File Editing ===\n');

  const tool = createTool('aider') as IFileEditTool;

  // Edit a single file
  console.log('Editing single file...');
  const result = await tool.editFile(
    './src/example.ts',
    'Add JSDoc comments to all functions'
  );
  console.log('Edit result:', result.success ? '✅' : '❌');

  // Edit multiple files
  console.log('\nEditing multiple files...');
  const multiResult = await tool.editFiles(
    ['./src/index.ts', './src/utils.ts'],
    'Add error handling to all async functions'
  );
  console.log('Multi-edit result:', multiResult.success ? '✅' : '❌');
}

/**
 * Example 7: Code generation
 */
async function example7_CodeGeneration() {
  console.log('\n=== Example 7: Code Generation ===\n');

  const tool = createTool('codex') as ICodeGenTool;

  // Generate code
  console.log('Generating code...');
  const result = await tool.generateCode(
    'Create a TypeScript function that validates email addresses',
    './src/validators/email.ts'
  );

  if (result.success) {
    console.log('Code generated successfully!');
    console.log('Output:', result.output);
  } else {
    console.log('Generation failed:', result.error);
  }
}

/**
 * Example 8: Tool selection based on capabilities
 */
async function example8_CapabilityBasedSelection() {
  console.log('\n=== Example 8: Capability-Based Selection ===\n');

  const registry = getRegistry();
  const allMetadata = await registry.getAllMetadata();

  // Find tools that support chat
  const chatTools = allMetadata.filter(m => m.capabilities.supportsChat);
  console.log('Tools with chat support:', chatTools.map(m => m.displayName));

  // Find tools that support file editing
  const editTools = allMetadata.filter(m => m.capabilities.supportsFileEdit);
  console.log('Tools with file edit support:', editTools.map(m => m.displayName));

  // Find the most capable tool
  const mostCapable = allMetadata.reduce((best, current) => {
    const bestScore = Object.values(best.capabilities).filter(Boolean).length;
    const currentScore = Object.values(current.capabilities).filter(Boolean).length;
    return currentScore > bestScore ? current : best;
  });
  console.log('\nMost capable tool:', mostCapable.displayName);
}

/**
 * Example 9: Error handling
 */
async function example9_ErrorHandling() {
  console.log('\n=== Example 9: Error Handling ===\n');

  try {
    // Try to create a non-existent tool
    const tool = createTool('non-existent-tool');
  } catch (error) {
    console.log('Error creating tool:', (error as Error).message);
  }

  // Handle installation failures gracefully
  const tool = createTool('claude-code');
  const status = await tool.isInstalled();

  if (!status.installed) {
    console.log('Tool not installed, attempting installation...');
    const installResult = await tool.install();

    if (installResult.success) {
      console.log('Installation successful!');
    } else {
      console.log('Installation failed:', installResult.error);
    }
  }
}

/**
 * Example 10: Custom tool wrapper
 */
class MyCustomToolWrapper {
  private tool: ICodeTool;

  constructor(toolName: string) {
    this.tool = createTool(toolName);
  }

  async ensureInstalled(): Promise<boolean> {
    const status = await this.tool.isInstalled();
    if (!status.installed) {
      const result = await this.tool.install();
      return result.success;
    }
    return true;
  }

  async executeWithRetry(
    command: string,
    args: string[],
    maxRetries = 3
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      const result = await this.tool.execute(command, args);
      if (result.success) {
        return result;
      }
      console.log(`Attempt ${i + 1} failed, retrying...`);
    }
    throw new Error('Max retries exceeded');
  }

  getMetadata() {
    return this.tool.getMetadata();
  }
}

async function example10_CustomWrapper() {
  console.log('\n=== Example 10: Custom Tool Wrapper ===\n');

  const wrapper = new MyCustomToolWrapper('claude-code');

  // Ensure tool is installed
  const installed = await wrapper.ensureInstalled();
  console.log('Tool ready:', installed);

  // Execute with retry logic
  try {
    const result = await wrapper.executeWithRetry('chat', ['Hello!']);
    console.log('Execution result:', result.success ? '✅' : '❌');
  } catch (error) {
    console.log('Execution failed after retries:', (error as Error).message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await example1_BasicUsage();
    await example2_Configuration();
    await example3_MultipleTools();
    await example4_Registry();
    // await example5_ChatInterface(); // Requires actual tool installation
    // await example6_FileEditing(); // Requires actual tool installation
    // await example7_CodeGeneration(); // Requires actual tool installation
    await example8_CapabilityBasedSelection();
    await example9_ErrorHandling();
    await example10_CustomWrapper();

    console.log('\n=== All examples completed! ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BasicUsage,
  example2_Configuration,
  example3_MultipleTools,
  example4_Registry,
  example5_ChatInterface,
  example6_FileEditing,
  example7_CodeGeneration,
  example8_CapabilityBasedSelection,
  example9_ErrorHandling,
  example10_CustomWrapper,
};
