/**
 * Aider adapter
 */

import { BaseCodeTool } from '../core/base-tool';
import { ToolMetadata } from '../core/types';
import { IChatTool, IFileEditTool } from '../core/interfaces';
import { ExecutionResult } from '../core/types';

/**
 * Aider tool adapter
 */
export class AiderTool extends BaseCodeTool implements IChatTool, IFileEditTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'aider',
      displayName: 'Aider',
      description: 'AI pair programming in your terminal',
      version: '1.0.0',
      homepage: 'https://aider.chat',
      documentation: 'https://aider.chat/docs',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: true,
        supportsTesting: false,
        supportsDebugging: true,
      },
    };
  }

  protected getInstallCheckCommand(): string {
    return 'aider --version';
  }

  protected getInstallCommand(): string {
    return 'pip install aider-chat';
  }

  protected getUninstallCommand(): string {
    return 'pip uninstall -y aider-chat';
  }

  /**
   * Start a chat session
   */
  async chat(prompt: string): Promise<ExecutionResult> {
    return this.execute('aider', ['--message', prompt]);
  }

  /**
   * Continue a chat session
   */
  async continueChat(message: string): Promise<ExecutionResult> {
    return this.execute('aider', ['--message', message]);
  }

  /**
   * End chat session
   */
  async endChat(): Promise<void> {
    await this.execute('aider', ['--exit']);
  }

  /**
   * Edit a file
   */
  async editFile(filePath: string, instructions: string): Promise<ExecutionResult> {
    return this.execute('aider', [filePath, '--message', instructions]);
  }

  /**
   * Edit multiple files
   */
  async editFiles(files: string[], instructions: string): Promise<ExecutionResult> {
    return this.execute('aider', [...files, '--message', instructions]);
  }
}
