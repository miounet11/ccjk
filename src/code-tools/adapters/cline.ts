/**
 * Cline adapter
 */

import { BaseCodeTool } from '../core/base-tool';
import { ToolMetadata } from '../core/types';
import { IChatTool, IFileEditTool, ICodeGenTool } from '../core/interfaces';
import { ExecutionResult } from '../core/types';

/**
 * Cline tool adapter
 */
export class ClineTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'cline',
      displayName: 'Cline',
      description: 'Autonomous coding agent for VS Code',
      version: '1.0.0',
      homepage: 'https://github.com/cline/cline',
      documentation: 'https://github.com/cline/cline/wiki',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: true,
        supportsDebugging: true,
      },
    };
  }

  protected getInstallCheckCommand(): string {
    return 'cline --version';
  }

  protected getInstallCommand(): string {
    return 'npm install -g cline';
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g cline';
  }

  /**
   * Start a chat session
   */
  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('cline', ['chat', prompt]);
  }

  /**
   * Continue a chat session
   */
  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('cline', ['continue', message]);
  }

  /**
   * End chat session
   */
  async endChat(): Promise<void> {
    await this.execute('cline', ['exit']);
  }

  /**
   * Edit a file
   */
  async editFile(filePath: string, instructions: string): Promise<ExecutionResult> {
    return this.execute('cline', ['edit', filePath, '--instructions', instructions]);
  }

  /**
   * Edit multiple files
   */
  async editFiles(files: string[], instructions: string): Promise<ExecutionResult> {
    const fileArgs = files.flatMap(f => ['--file', f]);
    return this.execute('cline', ['edit', ...fileArgs, '--instructions', instructions]);
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt];
    if (outputPath) {
      args.push('--output', outputPath);
    }
    return this.execute('cline', args);
  }
}
