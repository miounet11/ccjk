/**
 * Continue adapter
 */

import type { IChatTool, ICodeGenTool } from '../core/interfaces'
import type { ExecutionResult, ToolMetadata } from '../core/types'
import { BaseCodeTool } from '../core/base-tool'

/**
 * Continue tool adapter
 */
export class ContinueTool extends BaseCodeTool implements IChatTool, ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'continue',
      displayName: 'Continue',
      description: 'Open-source autopilot for software development',
      version: '1.0.0',
      homepage: 'https://continue.dev',
      documentation: 'https://continue.dev/docs',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true,
      },
    }
  }

  protected getInstallCheckCommand(): string {
    return 'continue --version'
  }

  protected getInstallCommand(): string {
    return 'npm install -g continue'
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g continue'
  }

  /**
   * Start a chat session
   */
  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('continue', ['chat', prompt])
  }

  /**
   * Continue a chat session
   */
  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('continue', ['chat', message])
  }

  /**
   * End chat session
   */
  async endChat(): Promise<void> {
    await this.execute('continue', ['exit'])
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt]
    if (outputPath) {
      args.push('--output', outputPath)
    }
    return this.execute('continue', args)
  }
}
