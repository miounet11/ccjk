/**
 * Cursor adapter
 */

import { BaseCodeTool } from '../core/base-tool';
import { ToolMetadata } from '../core/types';
import { IChatTool, IFileEditTool, ICodeGenTool } from '../core/interfaces';
import { ExecutionResult } from '../core/types';

/**
 * Cursor tool adapter
 */
export class CursorTool extends BaseCodeTool implements IChatTool, IFileEditTool, ICodeGenTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'cursor',
      displayName: 'Cursor',
      description: 'AI-first code editor',
      version: '1.0.0',
      homepage: 'https://cursor.sh',
      documentation: 'https://cursor.sh/docs',
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
    return 'cursor --version';
  }

  protected getInstallCommand(): string {
    // Cursor is typically installed as a desktop app
    return 'echo "Please download Cursor from https://cursor.sh"';
  }

  protected getUninstallCommand(): string {
    return 'echo "Please uninstall Cursor manually"';
  }

  /**
   * Start a chat session
   */
  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('cursor', ['chat', prompt]);
  }

  /**
   * Continue a chat session
   */
  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('cursor', ['chat', message]);
  }

  /**
   * End chat session
   */
  async endChat(): Promise<void> {
    await this.execute('cursor', ['exit']);
  }

  /**
   * Edit a file
   */
  async editFile(filePath: string, instructions: string): Promise<ExecutionResult> {
    return this.execute('cursor', ['edit', filePath, '--instructions', instructions]);
  }

  /**
   * Edit multiple files
   */
  async editFiles(files: string[], instructions: string): Promise<ExecutionResult> {
    const fileArgs = files.flatMap(f => ['--file', f]);
    return this.execute('cursor', ['edit', ...fileArgs, '--instructions', instructions]);
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult> {
    const args = ['generate', prompt];
    if (outputPath) {
      args.push('--output', outputPath);
    }
    return this.execute('cursor', args);
  }
}
