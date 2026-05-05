/**
 * Context Compact Advisor
 *
 * 智能上下文清理建议器
 * 在 Plan 完成后提供清理建议，与 Claude Code CLI 协同
 */

import type { PlanDocument } from '../workflow/plan-persistence.js';
import { i18n } from '../i18n/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ContextState {
  /** 当前 Token 使用量 */
  currentTokens: number;
  /** 最大 Token 限制 */
  maxTokens: number;
  /** 消息数量 */
  messageCount: number;
  /** Plan 阶段消息数量 */
  planningMessageCount?: number;
}

export type CompactReason
  = | 'plan_complete' // Plan 阶段完成
    | 'token_threshold' // Token 超过阈值
    | 'message_threshold' // 消息数超过阈值
    | 'user_request'; // 用户请求

export type ContextAction
  = | { type: 'suggest_clear'; reason: CompactReason; message: string }
    | { type: 'auto_save_plan'; planPath: string }
    | { type: 'warning'; message: string }
    | { type: 'none' };

export interface CompactSuggestion {
  /** 是否建议清理 */
  shouldCompact: boolean;
  /** 清理原因 */
  reason?: CompactReason;
  /** 建议消息 */
  message: string;
  /** Token 使用率 */
  usagePercent: number;
  /** 预计节省的 Token */
  estimatedSavings?: number;
  /** 建议的操作 */
  suggestedActions: string[];
}

export interface CompactAdvisorConfig {
  /** Token 使用率警告阈值（0-1） */
  warningThreshold: number;
  /** Token 使用率建议清理阈值（0-1） */
  compactThreshold: number;
  /** 消息数量阈值 */
  messageThreshold: number;
  /** Plan 阶段消息数量阈值 */
  planningMessageThreshold: number;
  /** 默认最大 Token 数 */
  defaultMaxTokens: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_COMPACT_CONFIG: CompactAdvisorConfig = {
  warningThreshold: 0.7, // 70% 时警告
  compactThreshold: 0.85, // 85% 时建议清理
  messageThreshold: 100, // 100 条消息
  planningMessageThreshold: 50, // Plan 阶段 50 条消息
  defaultMaxTokens: 200000, // 200k tokens (Claude 3.5 Sonnet)
};

// ============================================================================
// Compact Advisor
// ============================================================================

export class CompactAdvisor {
  private config: CompactAdvisorConfig;

  constructor(config: Partial<CompactAdvisorConfig> = {}) {
    this.config = { ...DEFAULT_COMPACT_CONFIG, ...config };
  }

  /**
   * 检测是否需要建议 compact
   */
  shouldSuggestCompact(context: ContextState): CompactSuggestion {
    const maxTokens = context.maxTokens || this.config.defaultMaxTokens;
    const usagePercent = context.currentTokens / maxTokens;

    // 检查 Token 阈值
    if (usagePercent >= this.config.compactThreshold) {
      return {
        shouldCompact: true,
        reason: 'token_threshold',
        message: this.getTokenThresholdMessage(usagePercent, context.currentTokens, maxTokens),
        usagePercent,
        estimatedSavings: Math.floor(context.currentTokens * 0.6), // 预计节省 60%
        suggestedActions: this.getSuggestedActions('token_threshold'),
      };
    }

    // 检查消息数量阈值
    if (context.messageCount >= this.config.messageThreshold) {
      return {
        shouldCompact: true,
        reason: 'message_threshold',
        message: this.getMessageThresholdMessage(context.messageCount),
        usagePercent,
        estimatedSavings: Math.floor(context.currentTokens * 0.5),
        suggestedActions: this.getSuggestedActions('message_threshold'),
      };
    }

    // 检查警告阈值
    if (usagePercent >= this.config.warningThreshold) {
      return {
        shouldCompact: false,
        message: this.getWarningMessage(usagePercent, context.currentTokens, maxTokens),
        usagePercent,
        suggestedActions: [],
      };
    }

    return {
      shouldCompact: false,
      message: this.getHealthyMessage(usagePercent),
      usagePercent,
      suggestedActions: [],
    };
  }

  /**
   * 检测 Plan 阶段完成
   */
  detectPlanCompletion(planContent: string): boolean {
    // 检测 Plan 完成的标志
    const completionPatterns = [
      /##\s*(实施计划|Implementation Plan|执行计划)/i,
      /##\s*(任务(清单|列表)|Task List|Tasks)/i,
      /##\s*(验收标准|Acceptance Criteria)/i,
      /✅\s*(规划完成|Plan Complete|Planning Complete)/i,
      /---[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*💡\s*(下一步|Next Step)/i,
    ];

    return completionPatterns.some(pattern => pattern.test(planContent));
  }

  /**
   * 生成 Plan 完成后的建议
   */
  generatePlanCompleteSuggestion(
    plan: PlanDocument,
    context: ContextState,
  ): CompactSuggestion {
    const maxTokens = context.maxTokens || this.config.defaultMaxTokens;
    const usagePercent = context.currentTokens / maxTokens;
    const planningMessages = context.planningMessageCount || 0;

    // Plan 完成后，建议清理
    const shouldCompact = planningMessages >= this.config.planningMessageThreshold
      || usagePercent >= 0.3; // 即使只用了 30%，Plan 完成后也建议清理

    return {
      shouldCompact,
      reason: 'plan_complete',
      message: this.getPlanCompleteMessage(plan, context, usagePercent),
      usagePercent,
      estimatedSavings: Math.floor(context.currentTokens * 0.7), // Plan 阶段可节省 70%
      suggestedActions: this.getSuggestedActions('plan_complete'),
    };
  }

  /**
   * 生成建议输出（用于显示给用户）
   */
  generateSuggestionOutput(suggestion: CompactSuggestion, planPath?: string): string {
    const lines: string[] = [];
    const isZh = i18n.language === 'zh-CN';

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (suggestion.reason === 'plan_complete') {
      lines.push(isZh ? '✅ 规划完成！' : '✅ Planning Complete!');
    }
    else if (suggestion.shouldCompact) {
      lines.push(isZh ? '⚠️ 上下文使用率较高' : '⚠️ High Context Usage');
    }
    else {
      lines.push(isZh ? '📊 上下文状态' : '📊 Context Status');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // Plan 保存路径
    if (planPath) {
      lines.push(isZh ? `📄 Plan 已保存: ${planPath}` : `📄 Plan saved: ${planPath}`);
      lines.push('');
    }

    // 上下文状态
    lines.push(isZh ? '📊 当前上下文状态:' : '📊 Current context status:');
    lines.push(`   • Token ${isZh ? '使用' : 'usage'}: ${(suggestion.usagePercent * 100).toFixed(1)}%`);

    if (suggestion.estimatedSavings) {
      lines.push(`   • ${isZh ? '预计可节省' : 'Estimated savings'}: ~${this.formatTokens(suggestion.estimatedSavings)} tokens`);
    }

    lines.push('');

    // 建议消息
    lines.push(suggestion.message);
    lines.push('');

    // 建议操作
    if (suggestion.shouldCompact && suggestion.suggestedActions.length > 0) {
      lines.push(isZh ? '💡 建议操作:' : '💡 Suggested actions:');
      lines.push('');

      for (let i = 0; i < suggestion.suggestedActions.length; i++) {
        lines.push(`   [${i + 1}] ${suggestion.suggestedActions[i]}`);
      }

      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getTokenThresholdMessage(usagePercent: number, current: number, max: number): string {
    const isZh = i18n.language === 'zh-CN';
    const percent = (usagePercent * 100).toFixed(1);

    if (isZh) {
      return `上下文使用率已达 ${percent}%（${this.formatTokens(current)} / ${this.formatTokens(max)}），建议清理以避免性能下降。`;
    }
    return `Context usage at ${percent}% (${this.formatTokens(current)} / ${this.formatTokens(max)}). Consider clearing to maintain performance.`;
  }

  private getMessageThresholdMessage(count: number): string {
    const isZh = i18n.language === 'zh-CN';

    if (isZh) {
      return `当前会话已有 ${count} 条消息，建议清理以保持响应质量。`;
    }
    return `Current session has ${count} messages. Consider clearing to maintain response quality.`;
  }

  private getWarningMessage(usagePercent: number, _current: number, _max: number): string {
    const isZh = i18n.language === 'zh-CN';
    const percent = (usagePercent * 100).toFixed(1);

    if (isZh) {
      return `⚠️ 上下文使用率 ${percent}%，接近阈值。继续工作时请注意。`;
    }
    return `⚠️ Context usage at ${percent}%, approaching threshold. Monitor as you continue.`;
  }

  private getHealthyMessage(usagePercent: number): string {
    const isZh = i18n.language === 'zh-CN';
    const percent = (usagePercent * 100).toFixed(1);

    if (isZh) {
      return `✅ 上下文状态良好（${percent}%），无需清理。`;
    }
    return `✅ Context is healthy (${percent}%), no action needed.`;
  }

  private getPlanCompleteMessage(plan: PlanDocument, _context: ContextState, _usagePercent: number): string {
    const isZh = i18n.language === 'zh-CN';

    if (isZh) {
      return `Claude Code 新功能支持在接受计划后自动清空上下文，
这能让 Claude 更专注于执行，提升任务完成质量。

Plan "${plan.name}" 已保存，您可以选择：

🧹 清空上下文并执行（推荐）
   - 自动清理规划阶段的讨论
   - 保留 Plan 文档作为执行依据
   - 获得干净的上下文窗口

📎 保留上下文并执行
   - 保留所有历史对话
   - 适合需要参考讨论细节的情况`;
    }

    return `Claude Code now supports automatically clearing context after accepting a plan.
This helps Claude stay focused and improves task completion quality.

Plan "${plan.name}" has been saved. You can choose:

🧹 Clear context and execute (Recommended)
   - Automatically clear planning discussions
   - Keep Plan document as execution reference
   - Get a fresh context window

📎 Keep context and execute
   - Preserve all conversation history
   - Suitable when you need to reference discussion details`;
  }

  private getSuggestedActions(reason: CompactReason): string[] {
    const isZh = i18n.language === 'zh-CN';

    switch (reason) {
      case 'plan_complete':
        return isZh
          ? [
              '🧹 清空上下文并执行 (推荐) - 使用 Claude Code Plan Mode 的清空选项',
              '📎 保留上下文并执行 - 继续当前会话',
              '💾 仅保存 Plan - 稍后执行',
            ]
          : [
              '🧹 Clear context and execute (Recommended) - Use Claude Code Plan Mode clear option',
              '📎 Keep context and execute - Continue current session',
              '💾 Save Plan only - Execute later',
            ];

      case 'token_threshold':
      case 'message_threshold':
        return isZh
          ? [
              '执行 /compact 压缩上下文',
              '开始新会话',
              '保存当前进度后清理',
            ]
          : [
              'Run /compact to compress context',
              'Start a new session',
              'Save progress and clear',
            ];

      default:
        return [];
    }
  }

  private formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: CompactAdvisor | null = null;

export function getCompactAdvisor(config?: Partial<CompactAdvisorConfig>): CompactAdvisor {
  if (!instance) {
    instance = new CompactAdvisor(config);
  }
  return instance;
}

export function resetCompactAdvisor(): void {
  instance = null;
}
