/**
 * Codex adapter
 */

import type { ICodeGenTool } from '../core/interfaces'
import type { ExecutionResult, ToolMetadata } from '../core/types'
import { BaseCodeTool } from '../core/base-tool'

/**
 * OpenAI Codex tool adapter
 */
export class CodexTool extends BaseCodeTool implements ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'codex',
      displayName: 'OpenAI Codex',
      description: 'OpenAI\'s code generation model',
      version: '1.0.0',
      homepage: 'https://openai.com/codex',
      documentation: 'https://platform.openai.com/docs',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: false,
        supportsCodeGen: true,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    }
  }

  protected getInstallCheckCommand(): string {
    return 'codex --version'
  }

  protected getInstallCommand(): string {
    return 'pip install openai-codex'
  }

  protected getUninstallCommand(): string {
    return 'pip uninstall -y openai-codex'
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt]
    if (outputPath) {
      args.push('--output', outputPath)
    }
    return this.execute('codex', args)
  }
}
