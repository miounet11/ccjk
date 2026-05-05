/**
 * CLI Interceptor - Optional input interception and routing.
 *
 * This component only affects runtimes that explicitly call it before handing
 * user input to another tool runtime. It is not enabled by default by the main
 * `src/cli.ts` → `src/cli-lazy.ts` entry path.
 */

import type { CodeToolType } from '../../constants';
import type { ExecutionResult } from './auto-executor';
import { EventEmitter } from 'node:events';
import { DEFAULT_CODE_TOOL_TYPE, getCodeToolNativeSlashCommands, isCodeToolType } from '../../constants';
import { readZcfConfig } from '../../utils/ccjk-config';
import { contextLoader } from '../context-loader';
import { emitCommandHookEvent } from '../hooks/command-hook-bridge';
import { getSkillRegistry } from '../skill-registry';
import { getGlobalAutoExecutor } from './auto-executor';

/**
 * Interceptor configuration
 */
export interface CliInterceptorConfig {
  enabled: boolean; // Default: true
  autoExecute: boolean; // Default: true
  showIntent: boolean; // Default: true (show what system is doing)
  bypassKeywords: string[]; // Keywords that bypass interception
  ccjkOwnedSlashPrefixes: string[]; // Slash commands owned by CCJK and not auto-bypassed
  verbose: boolean; // Default: false
}

/**
 * Interception result
 */
export interface InterceptionResult {
  intercepted: boolean;
  reason: string;
  executionResult?: ExecutionResult;
  bypassed?: boolean;
  bypassReason?: string;
}

/**
 * CLI Interceptor for runtimes that explicitly opt into brain routing.
 */
export class CliInterceptor extends EventEmitter {
  private config: Required<CliInterceptorConfig>;
  private autoExecutor = getGlobalAutoExecutor({
    autoCreateSkills: true,
    autoCreateAgents: true,
    autoSelectMcp: true,
    verbose: false,
  });

  private getActiveCodeTool(): CodeToolType {
    const codeToolType = readZcfConfig()?.codeToolType;
    return isCodeToolType(codeToolType) ? codeToolType : DEFAULT_CODE_TOOL_TYPE;
  }

  private getSystemCommands(): string[] {
    return getCodeToolNativeSlashCommands(this.getActiveCodeTool());
  }

  // Simple queries that don't need interception
  private readonly simpleQueryPatterns = [
    /^what is/i,
    /^who is/i,
    /^when was/i,
    /^where is/i,
    /^how do i/i,
    /^can you explain/i,
    /^tell me about/i,
  ];

  constructor(config: Partial<CliInterceptorConfig> = {}) {
    super();

    this.config = {
      enabled: config.enabled !== undefined ? config.enabled : true,
      autoExecute: config.autoExecute !== undefined ? config.autoExecute : true,
      showIntent: config.showIntent !== undefined ? config.showIntent : true,
      bypassKeywords: config.bypassKeywords || [],
      ccjkOwnedSlashPrefixes: config.ccjkOwnedSlashPrefixes || ['/ccjk', '/ccjk:', '/plugin', '/plugins', '/skill'],
      verbose: config.verbose !== undefined ? config.verbose : false,
    };
  }

  /**
   * Intercept user input when this component is explicitly integrated.
   */
  async intercept(userInput: string): Promise<InterceptionResult> {
    if (!this.config.enabled) {
      return {
        intercepted: false,
        reason: 'Interceptor disabled',
      };
    }

    this.emit('intercept:started', { input: userInput });

    // Check if should bypass
    const bypassCheck = this.shouldBypass(userInput);
    if (bypassCheck.bypass) {
      await this.handleBypassedCommand(userInput, bypassCheck.reason);
      this.emit('intercept:bypassed', { input: userInput, reason: bypassCheck.reason });
      return {
        intercepted: false,
        reason: 'Bypassed',
        bypassed: true,
        bypassReason: bypassCheck.reason,
      };
    }

    // Intercept and execute
    try {
      this.log(`Intercepting: ${userInput.substring(0, 50)}...`);

      // Show intent to user if enabled
      if (this.config.showIntent) {
        this.showIntentMessage(userInput);
      }

      // Execute automatically
      const executionResult = await this.autoExecutor.execute(userInput);

      this.emit('intercept:completed', { input: userInput, result: executionResult });

      return {
        intercepted: true,
        reason: 'Automatically routed and executed',
        executionResult,
      };
    }
    catch (error) {
      this.emit('intercept:failed', { input: userInput, error });
      throw error;
    }
  }

  /**
   * Check if input should bypass interception
   */
  private shouldBypass(input: string): { bypass: boolean; reason: string } {
    const normalized = input.trim().toLowerCase();

    const systemCommands = this.getSystemCommands();

    // Pass through target-native slash commands by default,
    // except CCJK-owned slash prefixes.
    if (normalized.startsWith('/')) {
      const isCcjkOwned = this.config.ccjkOwnedSlashPrefixes.some(prefix => normalized.startsWith(prefix));
      if (!isCcjkOwned && systemCommands.some(cmd => normalized.startsWith(cmd))) {
        return { bypass: true, reason: 'Native slash command passthrough' };
      }
    }

    // System commands bypass
    if (systemCommands.some(cmd => normalized.startsWith(cmd))) {
      return { bypass: true, reason: 'System command' };
    }

    // Custom bypass keywords
    if (this.config.bypassKeywords.some(kw => normalized.includes(kw.toLowerCase()))) {
      return { bypass: true, reason: 'Custom bypass keyword' };
    }

    // Simple informational queries bypass (let Claude answer directly)
    if (this.simpleQueryPatterns.some(pattern => pattern.test(input))) {
      return { bypass: true, reason: 'Simple informational query' };
    }

    // Very short inputs bypass (likely questions)
    if (input.split(/\s+/).length <= 3) {
      return { bypass: true, reason: 'Too short - likely a simple question' };
    }

    // No bypass needed
    return { bypass: false, reason: '' };
  }

  /**
   * Show intent message to user
   */
  private showIntentMessage(_input: string): void {
    console.log('\n🧠 Brain router is handling this request...');
    console.log('   It may use skills, agents, and MCP tools based on the active routing config.\n');
  }

  private async handleBypassedCommand(input: string, reason: string): Promise<void> {
    const normalized = input.trim().toLowerCase();
    const command = this.extractCommandName(normalized);

    if (normalized.startsWith('/clear')) {
      this.autoExecutor.clearTelemetry();
      contextLoader.clearCache();
      getSkillRegistry().clear();

      await emitCommandHookEvent('command-clear', {
        command,
        cleared: ['telemetry', 'context-cache', 'skill-registry'],
      });
    }

    if (normalized.startsWith('/')) {
      await emitCommandHookEvent('command-bypass', {
        command,
        reason,
      });
    }
  }

  private extractCommandName(input: string): string {
    if (!input.startsWith('/')) {
      return '';
    }
    return input.split(/\s+/)[0];
  }

  /**
   * Enable interceptor
   */
  enable(): void {
    this.config.enabled = true;
    this.emit('interceptor:enabled');
  }

  /**
   * Disable interceptor
   */
  disable(): void {
    this.config.enabled = false;
    this.emit('interceptor:disabled');
  }

  /**
   * Check if interceptor is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[CliInterceptor] ${message}`);
    }
  }
}

// Global singleton instance
let globalInterceptor: CliInterceptor | null = null;

/**
 * Get global CLI interceptor instance
 */
export function getGlobalCliInterceptor(config?: Partial<CliInterceptorConfig>): CliInterceptor {
  if (!globalInterceptor) {
    globalInterceptor = new CliInterceptor(config);
  }
  return globalInterceptor;
}

/**
 * Reset global interceptor (for testing)
 */
export function resetGlobalCliInterceptor(): void {
  globalInterceptor = null;
}

/**
 * Hook into CLI input - this is the main entry point
 * Call this function with user input before passing to Claude Code
 */
export async function interceptCliInput(userInput: string): Promise<InterceptionResult> {
  const interceptor = getGlobalCliInterceptor();
  return await interceptor.intercept(userInput);
}
