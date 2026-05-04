/**
 * Clavue adapter
 */

import type { IChatTool, ICodeGenTool, IFileEditTool } from '../core/interfaces'
import type { ExecutionResult, ToolMetadata } from '../core/types'
import { BaseCodeTool } from '../core/base-tool'

/**
 * Clavue tool adapter.
 *
 * Clavue is Claude Code-compatible at the command surface, but it owns its
 * runtime binary and provider-profile state. Keep this adapter separate so
 * callers do not accidentally execute `claude` when Clavue is selected.
 */
export class ClavueTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'clavue',
      displayName: 'Clavue',
      description: 'Execution-first Claude-family CLI with native provider profiles',
      version: '1.0.0',
      homepage: 'https://www.clavue.com',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true,
      },
      runtime: {
        runtime: 'clavue',
        ownership: 'hybrid',
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
          providerProfiles: true,
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
    return 'clavue --version'
  }

  protected getInstallCommand(): string {
    return 'npm install -g clavue'
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g clavue'
  }

  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('clavue', ['chat', prompt])
  }

  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('clavue', ['continue', message])
  }

  async endChat(): Promise<void> {
    await this.execute('clavue', ['exit'])
  }

  async editFile(filePath: string, instructions: string): Promise<ExecutionResult> {
    return this.execute('clavue', ['edit', filePath, '--instructions', instructions])
  }

  async editFiles(files: string[], instructions: string): Promise<ExecutionResult> {
    const fileArgs = files.flatMap(f => ['--file', f])
    return this.execute('clavue', ['edit', ...fileArgs, '--instructions', instructions])
  }

  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt]
    if (outputPath) {
      args.push('--output', outputPath)
    }
    return this.execute('clavue', args)
  }
}
