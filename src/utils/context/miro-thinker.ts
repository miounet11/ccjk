/**
 * MiroThinker Context Compressor
 *
 * 实现 "去肉留骨" 策略：
 * - "肉"（原始数据）：工具返回的原始内容，用占位符替代
 * - "骨"（信息切片）：AI 的思考和结论，完整保留
 *
 * 原理：AI 的回复已经是对原始数据的高保真提炼
 * 保留 Assistant 的回复就等于保留了信息的精华
 */

import type { FCSummary } from '../../types/context';

/**
 * 消息类型
 */
export type MessageRole = 'user' | 'assistant' | 'tool_result';

/**
 * 对话消息
 */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  /** 工具调用 ID（仅 tool_result） */
  toolCallId?: string;
  /** 工具名称（仅 tool_result） */
  toolName?: string;
  /** 原始 token 数量 */
  originalTokens?: number;
  /** 是否已压缩 */
  compressed?: boolean;
}

/**
 * 压缩后的对话
 */
export interface CompressedConversation {
  messages: ConversationMessage[];
  /** 原始 token 总数 */
  originalTokens: number;
  /** 压缩后 token 总数 */
  compressedTokens: number;
  /** 压缩率 */
  compressionRatio: number;
  /** 被省略的工具结果数量 */
  omittedToolResults: number;
}

/**
 * MiroThinker 配置
 */
export interface MiroThinkerConfig {
  /** 工具结果的 token 阈值，超过则省略 */
  toolResultThreshold: number;
  /** 是否保留错误信息 */
  preserveErrors: boolean;
  /** 是否保留关键工具的结果（如 Read 的文件路径） */
  preserveKeyInfo: boolean;
  /** 关键工具列表 */
  keyTools: string[];
  /** 占位符模板 */
  placeholderTemplate: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MiroThinkerConfig = {
  toolResultThreshold: 500, // 超过 500 tokens 的工具结果会被省略
  preserveErrors: true,
  preserveKeyInfo: true,
  keyTools: ['Read', 'Grep', 'Glob', 'Bash', 'WebFetch'],
  placeholderTemplate: '<Tool result omitted to save tokens. The assistant\'s response below contains the key findings.>',
};

/**
 * 估算 token 数量（简单估算）
 */
function estimateTokens(text: string): number {
  // 简单估算：平均每 4 个字符约 1 个 token
  return Math.ceil(text.length / 4);
}

/**
 * 提取工具结果的关键信息
 */
function extractKeyInfo(toolName: string, result: string): string {
  const lines = result.split('\n').filter(l => l.trim());

  switch (toolName) {
    case 'Read': {
      // 保留文件路径和行数信息
      const pathMatch = result.match(/Reading file: (.+)/);
      const lineCount = lines.length;
      return pathMatch
        ? `[Read ${pathMatch[1]}, ${lineCount} lines]`
        : `[Read file, ${lineCount} lines]`;
    }

    case 'Grep': {
      // 保留匹配数量
      const matchCount = lines.length;
      return `[Grep found ${matchCount} matches]`;
    }

    case 'Glob': {
      // 保留文件数量
      const fileCount = lines.length;
      return `[Glob found ${fileCount} files]`;
    }

    case 'Bash': {
      // 保留命令和退出状态
      const exitMatch = result.match(/exit code (\d+)/);
      const exitCode = exitMatch ? exitMatch[1] : '0';
      return `[Bash completed, exit code ${exitCode}]`;
    }

    case 'WebFetch': {
      // 保留 URL
      const urlMatch = result.match(/https?:\/\/\S+/);
      return urlMatch
        ? `[WebFetch from ${urlMatch[0].substring(0, 50)}...]`
        : '[WebFetch completed]';
    }

    default:
      return `[${toolName} completed]`;
  }
}

/**
 * MiroThinker 上下文压缩器
 *
 * 核心策略：
 * 1. 完整保留 Assistant 回复（骨）
 * 2. 省略大型 Tool Result 原始数据（肉）
 * 3. 保留工具调用的关键元信息
 * 4. 保留错误信息用于调试
 */
export class MiroThinkerCompressor {
  private config: MiroThinkerConfig;

  constructor(config: Partial<MiroThinkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 压缩对话历史
   *
   * @param messages - 原始对话消息
   * @returns 压缩后的对话
   */
  compress(messages: ConversationMessage[]): CompressedConversation {
    let originalTokens = 0;
    let compressedTokens = 0;
    let omittedToolResults = 0;

    const compressedMessages: ConversationMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgTokens = estimateTokens(msg.content);
      originalTokens += msgTokens;

      if (msg.role === 'tool_result') {
        // 检查是否需要压缩工具结果
        const shouldCompress = this.shouldCompressToolResult(msg, msgTokens);

        if (shouldCompress) {
          // 生成压缩后的消息
          const compressedContent = this.compressToolResult(msg);
          const compressedMsg: ConversationMessage = {
            ...msg,
            content: compressedContent,
            originalTokens: msgTokens,
            compressed: true,
          };

          compressedMessages.push(compressedMsg);
          compressedTokens += estimateTokens(compressedContent);
          omittedToolResults++;
        }
        else {
          // 保留原始内容
          compressedMessages.push({ ...msg, originalTokens: msgTokens });
          compressedTokens += msgTokens;
        }
      }
      else {
        // User 和 Assistant 消息完整保留
        compressedMessages.push({ ...msg, originalTokens: msgTokens });
        compressedTokens += msgTokens;
      }
    }

    return {
      messages: compressedMessages,
      originalTokens,
      compressedTokens,
      compressionRatio: originalTokens > 0 ? compressedTokens / originalTokens : 1,
      omittedToolResults,
    };
  }

  /**
   * 判断是否应该压缩工具结果
   */
  private shouldCompressToolResult(msg: ConversationMessage, tokens: number): boolean {
    // 小于阈值的不压缩
    if (tokens < this.config.toolResultThreshold) {
      return false;
    }

    // 错误信息根据配置决定
    if (this.config.preserveErrors && this.isErrorResult(msg.content)) {
      return false;
    }

    return true;
  }

  /**
   * 检查是否是错误结果
   */
  private isErrorResult(content: string): boolean {
    const errorPatterns = [
      /error/i,
      /failed/i,
      /exception/i,
      /not found/i,
      /permission denied/i,
    ];

    return errorPatterns.some(p => p.test(content));
  }

  /**
   * 压缩工具结果
   */
  private compressToolResult(msg: ConversationMessage): string {
    const parts: string[] = [];

    // 添加占位符
    parts.push(this.config.placeholderTemplate);

    // 如果配置了保留关键信息，添加元信息
    if (this.config.preserveKeyInfo && msg.toolName) {
      const keyInfo = extractKeyInfo(msg.toolName, msg.content);
      parts.push(keyInfo);
    }

    return parts.join('\n');
  }

  /**
   * 从 FC 摘要生成压缩消息
   */
  compressFromFCSummaries(summaries: FCSummary[]): ConversationMessage[] {
    return summaries.map(summary => ({
      role: 'tool_result' as MessageRole,
      content: `<Tool result omitted> ${summary.summary}`,
      toolCallId: summary.fcId,
      toolName: summary.fcName,
      originalTokens: summary.tokens,
      compressed: true,
    }));
  }

  /**
   * 生成摘要提示词
   *
   * 用于指导 AI 理解压缩后的上下文
   */
  generateSummaryPrompt(): string {
    return `
【上下文压缩说明 - MiroThinker 策略】

本对话历史已应用"去肉留骨"压缩策略：
- "肉"（原始数据）：工具返回的原始内容已省略，用占位符替代
- "骨"（信息切片）：AI 的思考和结论完整保留

原理：AI 的回复已经是对原始数据的高保真提炼。
当你看到 "<Tool result omitted>" 时，请参考紧随其后的 Assistant 回复，
那里包含了工具结果的关键发现和结论。

【摘要要求】
1. 保留所有关键决策和重要结论（这是"骨"）
2. 保留项目背景和当前任务
3. 保留 AI 的思考链和推理过程
4. 不需要恢复被省略的原始数据
`.trim();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MiroThinkerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): MiroThinkerConfig {
    return { ...this.config };
  }
}

/**
 * 创建 MiroThinker 压缩器实例
 */
export function createMiroThinkerCompressor(
  config?: Partial<MiroThinkerConfig>,
): MiroThinkerCompressor {
  return new MiroThinkerCompressor(config);
}

/**
 * 快速压缩对话（便捷函数）
 */
export function compressConversation(
  messages: ConversationMessage[],
  config?: Partial<MiroThinkerConfig>,
): CompressedConversation {
  const compressor = createMiroThinkerCompressor(config);
  return compressor.compress(messages);
}

/**
 * 生成压缩统计报告
 */
export function generateCompressionReport(result: CompressedConversation): string {
  const savedTokens = result.originalTokens - result.compressedTokens;
  const savingsPercent = ((1 - result.compressionRatio) * 100).toFixed(1);

  return `
📊 MiroThinker 压缩报告
━━━━━━━━━━━━━━━━━━━━━━━━
原始 Tokens: ${result.originalTokens.toLocaleString()}
压缩后 Tokens: ${result.compressedTokens.toLocaleString()}
节省 Tokens: ${savedTokens.toLocaleString()} (${savingsPercent}%)
省略的工具结果: ${result.omittedToolResults} 个
━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
