/**
 * CCJK 2.0 - Hook Types
 */

export enum EnforcementLevel {
  L1_RECOMMENDED = 'L1',
  L2_STRONGLY_RECOMMENDED = 'L2',
  L3_CRITICAL = 'L3',
}

export interface HookExecutionResult {
  success: boolean;
  hookId: string;
  level: EnforcementLevel;
  executed: boolean;
  bypassed?: boolean;
  bypassReason?: string;
  executionTime: number;
  output?: any;
  error?: Error;
  timestamp: string;
}

export interface HookDefinition {
  id: string;
  name: string;
  description: string;
  level: EnforcementLevel;
  matcher: RegExp | string;
  command: string | string[];
  context?: Record<string, any>;
}
