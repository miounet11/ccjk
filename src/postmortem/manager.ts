/**
 * Postmortem Manager - 尸检报告管理与 CLAUDE.md 集成
 */

import type {
  ClaudeMdInjection,
  CodeCheckResult,
  PostmortemCheckReport,
  PostmortemConfig,
  PostmortemIndex,
  PostmortemMeta,
  PostmortemReport,
  PostmortemSeverity,
  ReleaseSummary,
} from './types';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { PostmortemAnalyzer } from './analyzer';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: PostmortemConfig = {
  enabled: true,
  directory: './postmortem',
  autoSyncToClaudeMd: true,
  maxSyncItems: 10,
  minSyncSeverity: 'medium',
  detection: {
    enabled: true,
    excludePatterns: ['node_modules/**', 'dist/**', '*.test.*', '*.spec.*'],
    includePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
  },
  aiAnalysis: {
    provider: 'claude',
  },
};

const INDEX_FILE = 'index.json';
const CLAUDE_MD_SECTION_START = '<!-- POSTMORTEM_START -->';
const CLAUDE_MD_SECTION_END = '<!-- POSTMORTEM_END -->';

// ============================================================================
// Postmortem Manager
// ============================================================================

export class PostmortemManager {
  private config: PostmortemConfig;
  private projectRoot: string;
  private postmortemDir: string;

  constructor(projectRoot: string = process.cwd(), config: Partial<PostmortemConfig> = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.postmortemDir = path.join(projectRoot, this.config.directory);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * 初始化 Postmortem 系统
   */
  async init(): Promise<{ created: number; directory: string }> {
    // 创建目录结构
    this.ensureDirectories();

    // 分析历史 fix commits
    const commits = PostmortemAnalyzer.getFixCommits({
      limit: 200,
      cwd: this.projectRoot,
    });

    if (commits.length === 0) {
      // 创建空索引
      this.saveIndex(this.createEmptyIndex());
      return { created: 0, directory: this.postmortemDir };
    }

    // 分析每个 commit
    const analyses = commits.map(commit =>
      PostmortemAnalyzer.analyzeFixCommit(commit, this.projectRoot),
    );

    // 生成 Postmortem 报告
    const reports = PostmortemAnalyzer.generatePostmortem(analyses, []);

    // 保存报告
    for (const report of reports) {
      this.saveReport(report);
    }

    // 更新索引
    this.updateIndex();

    // 同步到 CLAUDE.md
    if (this.config.autoSyncToClaudeMd) {
      await this.syncToClaudeMd();
    }

    return { created: reports.length, directory: this.postmortemDir };
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    const dirs = [
      this.postmortemDir,
      path.join(this.postmortemDir, 'categories'),
      path.join(this.postmortemDir, 'summaries'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  // ==========================================================================
  // Report Management
  // ==========================================================================

  /**
   * 保存 Postmortem 报告
   */
  saveReport(report: PostmortemReport): string {
    const filename = `${report.id}-${this.slugify(report.title)}.md`;
    const filepath = path.join(this.postmortemDir, filename);

    const content = this.renderReportToMarkdown(report);
    fs.writeFileSync(filepath, content, 'utf-8');

    // 同时保存 JSON 版本用于程序读取
    const jsonPath = path.join(this.postmortemDir, `${report.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    return filepath;
  }

  /**
   * 读取 Postmortem 报告
   */
  getReport(id: string): PostmortemReport | null {
    const jsonPath = path.join(this.postmortemDir, `${id}.json`);

    if (!fs.existsSync(jsonPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content) as PostmortemReport;
    }
    catch {
      return null;
    }
  }

  /**
   * 列出所有 Postmortem
   */
  listReports(): PostmortemMeta[] {
    const index = this.loadIndex();
    return index?.reports || [];
  }

  /**
   * 渲染报告为 Markdown
   */
  private renderReportToMarkdown(report: PostmortemReport): string {
    const severityEmoji: Record<PostmortemSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    return `# ${report.id}: ${report.title}

## 元数据
- **ID**: ${report.id}
- **严重程度**: ${severityEmoji[report.severity]} ${report.severity.toUpperCase()}
- **类别**: ${report.category}
- **状态**: ${report.status}
- **创建时间**: ${report.createdAt}
- **更新时间**: ${report.updatedAt}

## 相关提交
${report.relatedCommits.map(c => `- \`${c.shortHash}\` - ${c.message} (${c.author}, ${c.date})`).join('\n')}

## 影响版本
- **从**: ${report.affectedVersions.from}
- **到**: ${report.affectedVersions.to}

## 问题描述
${report.description}

## 根本原因
${report.rootCause.map(c => `- ${c}`).join('\n')}

## 修复方案
${report.solution.description}

${report.solution.codeExample
  ? `
### 代码示例

**❌ 错误写法**
\`\`\`typescript
${report.solution.codeExample.bad}
\`\`\`

**✅ 正确写法**
\`\`\`typescript
${report.solution.codeExample.good}
\`\`\`
`
  : ''}

## 预防措施
${report.preventionMeasures.map((m, i) => `${i + 1}. ${m}`).join('\n')}

## AI 开发指令
> 以下指令会自动注入到 CLAUDE.md 中，指导 AI 在开发时避免类似问题

${report.aiDirectives.map(d => `- ${d}`).join('\n')}

## 检测模式
${report.detectionPatterns.length > 0
  ? report.detectionPatterns.map(p => `
### ${p.description}
- **类型**: ${p.type}
- **模式**: \`${p.pattern}\`
- **适用文件**: ${p.fileTypes.join(', ')}
- **严重程度**: ${p.severity}
`).join('\n')
  : '暂无自动检测模式'}

## 相关文件
${report.relatedFiles.map(f => `- \`${f}\``).join('\n')}

## 标签
${report.tags.map(t => `\`${t}\``).join(' ')}

---
*由 CCJK Postmortem System 自动生成*
`;
  }

  /**
   * 生成 slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  // ==========================================================================
  // Index Management
  // ==========================================================================

  /**
   * 创建空索引
   */
  private createEmptyIndex(): PostmortemIndex {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      stats: {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byCategory: {
          'type-safety': 0,
          'error-handling': 0,
          'performance': 0,
          'security': 0,
          'logic-error': 0,
          'race-condition': 0,
          'memory-leak': 0,
          'api-misuse': 0,
          'configuration': 0,
          'dependency': 0,
          'other': 0,
        },
        byStatus: { active: 0, resolved: 0, monitoring: 0, archived: 0 },
      },
      reports: [],
    };
  }

  /**
   * 加载索引
   */
  loadIndex(): PostmortemIndex | null {
    const indexPath = path.join(this.postmortemDir, INDEX_FILE);

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return JSON.parse(content) as PostmortemIndex;
    }
    catch {
      return null;
    }
  }

  /**
   * 保存索引
   */
  private saveIndex(index: PostmortemIndex): void {
    const indexPath = path.join(this.postmortemDir, INDEX_FILE);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 更新索引
   */
  updateIndex(): PostmortemIndex {
    const index = this.createEmptyIndex();

    // 扫描所有 JSON 文件
    const files = fs.readdirSync(this.postmortemDir)
      .filter(f => f.startsWith('PM-') && f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.postmortemDir, file), 'utf-8');
        const report = JSON.parse(content) as PostmortemReport;

        // 更新统计
        index.stats.total++;
        index.stats.bySeverity[report.severity]++;
        index.stats.byCategory[report.category]++;
        index.stats.byStatus[report.status]++;

        // 添加元数据
        index.reports.push({
          id: report.id,
          title: report.title,
          severity: report.severity,
          category: report.category,
          status: report.status,
          createdAt: report.createdAt,
          filePath: file.replace('.json', '.md'),
        });
      }
      catch {
        // 忽略解析错误
      }
    }

    // 按严重程度和时间排序
    index.reports.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0)
        return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    index.lastUpdated = new Date().toISOString();
    this.saveIndex(index);

    return index;
  }

  // ==========================================================================
  // CLAUDE.md Integration
  // ==========================================================================

  /**
   * 同步到 CLAUDE.md
   */
  async syncToClaudeMd(): Promise<{ synced: number; claudeMdPath: string }> {
    const claudeMdPath = path.join(this.projectRoot, 'CLAUDE.md');
    const injection = this.generateClaudeMdInjection();

    let content = '';
    if (fs.existsSync(claudeMdPath)) {
      content = fs.readFileSync(claudeMdPath, 'utf-8');
    }

    // 移除旧的注入内容
    const startIndex = content.indexOf(CLAUDE_MD_SECTION_START);
    const endIndex = content.indexOf(CLAUDE_MD_SECTION_END);

    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(0, startIndex) + content.substring(endIndex + CLAUDE_MD_SECTION_END.length);
    }

    // 添加新的注入内容
    const injectionContent = `
${CLAUDE_MD_SECTION_START}
${injection.content}
${CLAUDE_MD_SECTION_END}
`;

    // 在文件末尾添加
    content = `${content.trim()}\n\n${injectionContent.trim()}\n`;

    fs.writeFileSync(claudeMdPath, content, 'utf-8');

    return {
      synced: injection.sourcePostmortems.length,
      claudeMdPath,
    };
  }

  /**
   * 生成 CLAUDE.md 注入内容
   */
  generateClaudeMdInjection(): ClaudeMdInjection {
    const index = this.loadIndex();
    const reports: PostmortemReport[] = [];

    if (index) {
      // 获取高优先级的报告
      const severityOrder: Record<PostmortemSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };

      const minSeverityOrder = severityOrder[this.config.minSyncSeverity];

      for (const meta of index.reports) {
        if (severityOrder[meta.severity] <= minSeverityOrder && meta.status === 'active') {
          const report = this.getReport(meta.id);
          if (report) {
            reports.push(report);
          }
        }

        if (reports.length >= this.config.maxSyncItems) {
          break;
        }
      }
    }

    // 生成内容
    const lines: string[] = [
      '## ⚠️ 已知问题预警 (Postmortem Intelligence)',
      '',
      '> 基于历史 bug 分析自动生成，帮助避免重复犯错',
      '',
    ];

    if (reports.length === 0) {
      lines.push('暂无需要关注的问题。');
    }
    else {
      // 按严重程度分组
      const critical = reports.filter(r => r.severity === 'critical');
      const high = reports.filter(r => r.severity === 'high');
      const medium = reports.filter(r => r.severity === 'medium');

      if (critical.length > 0) {
        lines.push('### 🔴 严重');
        for (const r of critical) {
          lines.push(`- **${r.id}**: ${r.title}`);
          lines.push(`  - ${r.aiDirectives[0] || r.preventionMeasures[0]}`);
        }
        lines.push('');
      }

      if (high.length > 0) {
        lines.push('### 🟠 高优先级');
        for (const r of high) {
          lines.push(`- **${r.id}**: ${r.title}`);
          lines.push(`  - ${r.aiDirectives[0] || r.preventionMeasures[0]}`);
        }
        lines.push('');
      }

      if (medium.length > 0) {
        lines.push('### 🟡 中优先级');
        for (const r of medium) {
          lines.push(`- **${r.id}**: ${r.title}`);
        }
        lines.push('');
      }

      // 添加通用指令
      lines.push('### 📋 开发指令');
      const allDirectives = new Set<string>();
      for (const r of reports.slice(0, 5)) {
        for (const d of r.aiDirectives.slice(0, 2)) {
          allDirectives.add(d);
        }
      }
      for (const d of allDirectives) {
        lines.push(`- ${d}`);
      }
      lines.push('');

      lines.push(`> 详细信息请查看 \`${this.config.directory}/\` 目录`);
    }

    return {
      sectionId: 'postmortem-warnings',
      title: '已知问题预警',
      content: lines.join('\n'),
      priority: 100,
      sourcePostmortems: reports.map(r => r.id),
      lastUpdated: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Code Checking
  // ==========================================================================

  /**
   * 检查代码是否可能触发已知问题
   */
  async checkCode(options: {
    files?: string[];
    staged?: boolean;
  } = {}): Promise<PostmortemCheckReport> {
    const { files, staged } = options;
    let filesToCheck: string[] = [];

    if (files && files.length > 0) {
      filesToCheck = files;
    }
    else if (staged) {
      filesToCheck = this.getStagedFiles();
    }
    else {
      filesToCheck = this.getAllSourceFiles();
    }

    const issues: CodeCheckResult[] = [];
    const index = this.loadIndex();

    if (!index) {
      return this.createEmptyCheckReport(filesToCheck.length);
    }

    // 收集所有检测模式
    const patterns: Array<{ pattern: import('./types').DetectionPattern; postmortemId: string }> = [];

    for (const meta of index.reports) {
      if (meta.status !== 'active')
        continue;

      const report = this.getReport(meta.id);
      if (!report)
        continue;

      for (const pattern of report.detectionPatterns) {
        patterns.push({ pattern, postmortemId: report.id });
      }
    }

    // 检查每个文件
    for (const file of filesToCheck) {
      const fullPath = path.isAbsolute(file) ? file : path.join(this.projectRoot, file);

      if (!fs.existsSync(fullPath))
        continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      for (const { pattern, postmortemId } of patterns) {
        // 检查文件类型
        if (!pattern.fileTypes.some(ft => file.endsWith(ft))) {
          continue;
        }

        if (pattern.type === 'regex') {
          try {
            const regex = new RegExp(pattern.pattern, 'g');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const matches = line.match(regex);

              if (matches) {
                issues.push({
                  file,
                  line: i + 1,
                  column: line.indexOf(matches[0]) + 1,
                  pattern,
                  postmortemId,
                  message: `可能触发 ${postmortemId}: ${pattern.description}`,
                  suggestion: `参考 ${this.config.directory}/${postmortemId}.md`,
                });
              }
            }
          }
          catch {
            // 忽略无效的正则表达式
          }
        }
      }
    }

    // 生成报告
    const summary = {
      critical: issues.filter(i => i.pattern.severity === 'critical').length,
      high: issues.filter(i => i.pattern.severity === 'high').length,
      medium: issues.filter(i => i.pattern.severity === 'medium').length,
      low: issues.filter(i => i.pattern.severity === 'low').length,
    };

    return {
      timestamp: new Date().toISOString(),
      filesChecked: filesToCheck.length,
      issuesFound: issues,
      summary,
      passed: summary.critical === 0 && summary.high === 0,
    };
  }

  /**
   * 获取暂存的文件
   */
  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      return output.trim().split('\n').filter(Boolean);
    }
    catch {
      return [];
    }
  }

  /**
   * 获取所有源文件
   */
  private getAllSourceFiles(): string[] {
    const files: string[] = [];

    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);

        // 检查排除模式
        if (this.config.detection.excludePatterns.some(p => this.matchGlob(relativePath, p))) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        }
        else if (entry.isFile()) {
          // 检查包含模式
          if (this.config.detection.includePatterns.some(p => this.matchGlob(relativePath, p))) {
            files.push(relativePath);
          }
        }
      }
    };

    walk(this.projectRoot);
    return files;
  }

  /**
   * 简单的 glob 匹配
   */
  private matchGlob(filepath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(filepath);
  }

  /**
   * 创建空的检查报告
   */
  private createEmptyCheckReport(filesChecked: number): PostmortemCheckReport {
    return {
      timestamp: new Date().toISOString(),
      filesChecked,
      issuesFound: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      passed: true,
    };
  }

  // ==========================================================================
  // Release Summary
  // ==========================================================================

  /**
   * 生成发布摘要
   */
  async generateReleaseSummary(options: {
    version: string;
    since?: string;
    until?: string;
  }): Promise<ReleaseSummary> {
    const { version, since, until } = options;

    // 获取这个版本的 fix commits
    const commits = PostmortemAnalyzer.getFixCommits({
      since,
      until,
      cwd: this.projectRoot,
    });

    // 分析 commits
    const analyses = commits.map(c =>
      PostmortemAnalyzer.analyzeFixCommit(c, this.projectRoot),
    );

    // 获取现有的 postmortem IDs
    const existingIds = this.listReports().map(r => r.id);

    // 生成新的 postmortems
    const newReports = PostmortemAnalyzer.generatePostmortem(analyses, existingIds);

    // 保存新报告
    const newIds: string[] = [];
    for (const report of newReports) {
      report.affectedVersions = { from: since || 'unknown', to: version };
      this.saveReport(report);
      newIds.push(report.id);
    }

    // 更新索引
    this.updateIndex();

    // 生成摘要
    const summary: ReleaseSummary = {
      version,
      releaseDate: new Date().toISOString(),
      fixCommitCount: commits.length,
      newPostmortems: newIds,
      updatedPostmortems: [],
      summary: this.generateReleaseSummaryText(commits, newReports),
      keyLessons: this.extractKeyLessons(newReports),
    };

    // 保存摘要
    const summaryPath = path.join(this.postmortemDir, 'summaries', `${version}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    // 同步到 CLAUDE.md
    if (this.config.autoSyncToClaudeMd) {
      await this.syncToClaudeMd();
    }

    return summary;
  }

  /**
   * 生成发布摘要文本
   */
  private generateReleaseSummaryText(commits: import('./types').CommitInfo[], reports: PostmortemReport[]): string {
    const lines: string[] = [
      `本次发布包含 ${commits.length} 个 bug 修复，生成了 ${reports.length} 个新的 Postmortem 报告。`,
      '',
    ];

    if (reports.length > 0) {
      lines.push('主要问题类型:');
      const categories = new Map<string, number>();
      for (const r of reports) {
        categories.set(r.category, (categories.get(r.category) || 0) + 1);
      }
      for (const [cat, count] of categories) {
        lines.push(`- ${cat}: ${count} 个`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 提取关键教训
   */
  private extractKeyLessons(reports: PostmortemReport[]): string[] {
    const lessons = new Set<string>();

    for (const report of reports) {
      for (const measure of report.preventionMeasures.slice(0, 2)) {
        lessons.add(measure);
      }
    }

    return Array.from(lessons).slice(0, 10);
  }
}

// ============================================================================
// Export singleton factory
// ============================================================================

let managerInstance: PostmortemManager | null = null;

export function getPostmortemManager(projectRoot?: string, config?: Partial<PostmortemConfig>): PostmortemManager {
  if (!managerInstance || projectRoot) {
    managerInstance = new PostmortemManager(projectRoot, config);
  }
  return managerInstance;
}
