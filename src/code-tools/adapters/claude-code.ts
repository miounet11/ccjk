/**
 * Claude Code adapter
 */

import type { IChatTool, ICodeGenTool, IFileEditTool } from '../core/interfaces'
import type { ExecutionResult, ToolMetadata } from '../core/types'
import { BaseCodeTool } from '../core/base-tool'

/**
 * Claude Code tool adapter
 */
export class ClaudeCodeTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'claude-code',
      displayName: 'Claude Code',
      description: 'Anthropic\'s official CLI tool for Claude AI',
      version: '1.0.0',
      homepage: 'https://claude.ai',
      documentation: 'https://docs.anthropic.com/claude/docs',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true,
      },
      runtime: {
        runtime: 'claude-code',
        ownership: 'host-native',
        configBackend: 'claude-family',
        native: {
          agentLoop: true,
          planTask: true,
          subagents: true,
          slashCommands: true,
          mcp: true,
          permissions: true,
          memory: true,
          ideIntegration: true,
          worktree: true,
          statusline: true,
        },
        managedByCcjk: {
          providerProfiles: false,
          modelRouting: true,
          configSync: true,
          permissionRepair: true,
          mcpBundles: true,
          doctor: true,
        },
      },
    }
  }

  protected getInstallCheckCommand(): string {
    return 'claude --version'
  }

  protected getInstallCommand(): string {
    return 'npm install -g @anthropic-ai/claude-code'
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g @anthropic-ai/claude-code'
  }

  /**
   * Start a chat session
   */
  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('claude', ['chat', prompt])
  }

  /**
   * Continue a chat session
   */
  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('claude', ['continue', message])
  }

  /**
   * End chat session
   */
  async endChat(): Promise<void> {
    await this.execute('claude', ['exit'])
  }

  /**
   * Edit a file
   */
  async editFile(filePath: string, instructions: string): Promise<ExecutionResult> {
    return this.execute('claude', ['edit', filePath, '--instructions', instructions])
  }

  /**
   * Edit multiple files
   */
  async editFiles(files: string[], instructions: string): Promise<ExecutionResult> {
    const fileArgs = files.flatMap(f => ['--file', f])
    return this.execute('claude', ['edit', ...fileArgs, '--instructions', instructions])
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt]
    if (outputPath) {
      args.push('--output', outputPath)
    }
    return this.execute('claude', args)
  }
}
