/**
 * CCJK 2.0 - Hook Enforcement Engine
 */

import { EnforcementLevel, HookDefinition, HookExecutionResult, HookExecutionContext } from './types.js';

export class HookEnforcementError extends Error {
  constructor(
    message: string,
    public readonly level: EnforcementLevel,
    public readonly hookId: string,
    public readonly context?: any
  ) {
    super(`[Hook ${hookId}] ${message}`);
    this.name = 'HookEnforcementError';
  }
}

export class HookEnforcer {
  private registeredHooks = new Map<string, HookDefinition>();

  /**
   * Register a hook
   */
  public async register(hook: HookDefinition): Promise<void> {
    if (this.registeredHooks.has(hook.id)) {
      throw new HookEnforcementError(
        `Hook '${hook.id}' already registered`,
        EnforcementLevel.L3_CRITICAL,
        hook.id
      );
    }
    this.registeredHooks.set(hook.id, hook);
  }

  /**
   * Execute a hook
   */
  public async execute(
    hookId: string,
    context: HookExecutionContext
  ): Promise<HookExecutionResult> {
    const hook = this.registeredHooks.get(hookId);
    if (!hook) {
      throw new HookEnforcementError(
        `Hook '${hookId}' not registered`,
        EnforcementLevel.L3_CRITICAL,
        hookId
      );
    }

    const startTime = Date.now();

    try {
      // L3 强制执行
      if (hook.level === EnforcementLevel.L3_CRITICAL) {
        const output = await this.runHook(hook, context);
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          hookId,
          level: hook.level,
          executed: true,
          bypassed: false,
          executionTime,
          output,
          timestamp: new Date().toISOString(),
        };
      }

      // 执行 Hook
      const output = await this.runHook(hook, context);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        hookId,
        level: hook.level,
        executed: true,
        bypassed: false,
        executionTime,
        output,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        hookId,
        level: hook.level,
        executed: false,
        bypassed: false,
        executionTime,
        error: err instanceof Error ? err : new Error(String(err)),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runHook(
    hook: HookDefinition,
    context: HookExecutionContext
  ): Promise<any> {
    console.log(`[${hook.level}] Executing Hook '${hook.id}'`);

    return {
      hookId: hook.id,
      command: hook.command,
      context: context.prompt,
      executed: true,
    };
  }

  /**
   * Match hook to context
   */
  public async match(
    context: HookExecutionContext
  ): Promise<HookDefinition | undefined> {
    for (const hook of this.registeredHooks.values()) {
      const match = await this.checkMatch(hook, context);
      if (match) {
        return hook;
      }
    }
    return undefined;
  }

  private async checkMatch(
    hook: HookDefinition,
    context: HookExecutionContext
  ): Promise<boolean> {
    const prompt = context.prompt;
    const matcher = hook.matcher;

    if (matcher instanceof RegExp) {
      return matcher.test(prompt);
    }

    if (typeof matcher === 'string') {
      return prompt.includes(matcher);
    }

    return false;
  }
}
