/**
 * Postmortem Auto-Loader
 *
 * 在 CCJK 启动时自动加载 Postmortem 系统
 * 确保 AI 在开发时能够参考历史 bug 经验
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'pathe';
import { getPostmortemManager } from './manager';

/**
 * Postmortem 自动加载配置
 */
export interface PostmortemAutoLoadConfig {
  /** 项目根目录 */
  projectRoot: string;
  /** 是否静默模式（不输出日志） */
  silent?: boolean;
  /** 是否自动初始化（如果未初始化） */
  autoInit?: boolean;
  /** 是否自动同步到 CLAUDE.md */
  autoSync?: boolean;
}

/**
 * Postmortem 加载结果
 */
export interface PostmortemLoadResult {
  /** 是否成功加载 */
  loaded: boolean;
  /** 报告数量 */
  reportCount: number;
  /** 是否已同步到 CLAUDE.md */
  syncedToClaudeMd: boolean;
  /** 关键教训（用于上下文注入） */
  keyLessons: string[];
  /** 高优先级警告 */
  criticalWarnings: string[];
  /** 错误信息 */
  error?: string;
}

/**
 * 检查 Postmortem 是否已初始化
 */
export function isPostmortemInitialized(projectRoot: string): boolean {
  const postmortemDir = join(projectRoot, 'postmortem');
  const indexPath = join(postmortemDir, 'index.json');
  return existsSync(postmortemDir) && existsSync(indexPath);
}

/**
 * 检查 CLAUDE.md 是否包含 Postmortem 内容
 */
export function hasPostmortemInClaudeMd(projectRoot: string): boolean {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    return false;
  }

  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes('<!-- POSTMORTEM_START -->');
}

/**
 * 自动加载 Postmortem 系统
 *
 * 这个函数应该在 CCJK 启动时调用，确保：
 * 1. Postmortem 系统已初始化
 * 2. 关键教训已同步到 CLAUDE.md
 * 3. AI 能够参考历史 bug 经验
 */
export async function autoLoadPostmortem(
  config: PostmortemAutoLoadConfig,
): Promise<PostmortemLoadResult> {
  const { projectRoot, silent = false, autoInit = true, autoSync = true } = config;

  const result: PostmortemLoadResult = {
    loaded: false,
    reportCount: 0,
    syncedToClaudeMd: false,
    keyLessons: [],
    criticalWarnings: [],
  };

  try {
    const manager = getPostmortemManager(projectRoot);

    // 检查是否已初始化
    if (!isPostmortemInitialized(projectRoot)) {
      if (autoInit) {
        if (!silent) {
          console.log('🔬 Postmortem: 首次运行，正在初始化...');
        }

        const initResult = await manager.init();
        result.reportCount = initResult.created;

        if (!silent && initResult.created > 0) {
          console.log(`🔬 Postmortem: 从历史 commits 生成了 ${initResult.created} 个报告`);
        }
      }
      else {
        result.error = 'Postmortem 未初始化，请运行 ccjk postmortem init';
        return result;
      }
    }

    // 加载索引
    const index = manager.loadIndex();
    if (!index) {
      result.error = '无法加载 Postmortem 索引';
      return result;
    }

    result.reportCount = index.stats.total;
    result.loaded = true;

    // 提取关键教训
    const activeReports = index.reports.filter(r => r.status === 'active');
    for (const meta of activeReports.slice(0, 10)) {
      const report = manager.getReport(meta.id);
      if (report) {
        // 收集 AI 指令作为关键教训
        result.keyLessons.push(...report.aiDirectives.slice(0, 2));

        // 收集严重警告
        if (report.severity === 'critical' || report.severity === 'high') {
          result.criticalWarnings.push(`${report.id}: ${report.title}`);
        }
      }
    }

    // 去重
    result.keyLessons = [...new Set(result.keyLessons)].slice(0, 15);
    result.criticalWarnings = [...new Set(result.criticalWarnings)].slice(0, 5);

    // 检查并同步到 CLAUDE.md
    if (autoSync && !hasPostmortemInClaudeMd(projectRoot)) {
      if (!silent) {
        console.log('🔬 Postmortem: 同步到 CLAUDE.md...');
      }

      await manager.syncToClaudeMd();
      result.syncedToClaudeMd = true;
    }
    else if (hasPostmortemInClaudeMd(projectRoot)) {
      result.syncedToClaudeMd = true;
    }

    return result;
  }
  catch (error) {
    result.error = error instanceof Error ? error.message : '未知错误';
    return result;
  }
}

/**
 * 生成 Postmortem 上下文注入内容
 *
 * 用于在对话开始时注入关键的历史 bug 经验
 * 这是 MiroThinker 策略的一部分：将重要信息作为"骨"保留
 */
export function generatePostmortemContext(loadResult: PostmortemLoadResult): string {
  if (!loadResult.loaded || loadResult.reportCount === 0) {
    return '';
  }

  const lines: string[] = [
    '## 🔬 Postmortem Intelligence (历史 Bug 经验)',
    '',
  ];

  // 严重警告
  if (loadResult.criticalWarnings.length > 0) {
    lines.push('### ⚠️ 高优先级警告');
    for (const warning of loadResult.criticalWarnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  // 关键教训
  if (loadResult.keyLessons.length > 0) {
    lines.push('### 📋 开发指令（基于历史 Bug 分析）');
    for (const lesson of loadResult.keyLessons) {
      lines.push(`- ${lesson}`);
    }
    lines.push('');
  }

  lines.push(`> 共 ${loadResult.reportCount} 个 Postmortem 报告，详见 ./postmortem/`);

  return lines.join('\n');
}

/**
 * 快速检查并加载 Postmortem（用于启动时）
 */
export async function quickLoadPostmortem(projectRoot: string): Promise<string> {
  const result = await autoLoadPostmortem({
    projectRoot,
    silent: true,
    autoInit: false, // 快速模式不自动初始化
    autoSync: false,
  });

  return generatePostmortemContext(result);
}
