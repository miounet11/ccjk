/**
 * Plan Persistence Module
 *
 * 保存和管理工作流规划文档
 * 支持 Plan 完成后上下文清理时的状态恢复
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'pathe'

// ============================================================================
// Types
// ============================================================================

export interface PlanDocument {
  /** 唯一标识符 */
  id: string

  /** Plan 名称 */
  name: string

  /** Plan 内容（Markdown） */
  content: string

  /** 关联的工作流会话 ID */
  sessionId?: string

  /** 来源 Skill */
  sourceSkill?: string

  /** 创建时间 */
  createdAt: Date

  /** 更新时间 */
  updatedAt: Date

  /** 元数据 */
  metadata: {
    /** Token 估算 */
    tokenEstimate?: number
    /** 规划阶段消息数 */
    planningMessages?: number
    /** 关键决策 */
    keyDecisions?: string[]
    /** 涉及的文件 */
    affectedFiles?: string[]
    /** 任务列表 */
    tasks?: PlanTask[]
  }
}

export interface PlanTask {
  /** 任务标题 */
  title: string
  /** 任务描述 */
  description?: string
  /** 是否完成 */
  completed: boolean
  /** 优先级 */
  priority?: 'high' | 'medium' | 'low'
}

export interface PlanSaveOptions {
  /** 项目路径（用于确定保存位置） */
  projectPath?: string
  /** 是否覆盖已存在的同名文件 */
  overwrite?: boolean
}

// ============================================================================
// Plan Persistence Manager
// ============================================================================

export class PlanPersistenceManager {
  private baseDir: string
  private projectPlanDir: string

  constructor(projectPath?: string) {
    // 全局 Plan 存储
    this.baseDir = join(homedir(), '.ccjk', 'plans')

    // 项目级 Plan 存储
    const cwd = projectPath || process.cwd()
    this.projectPlanDir = join(cwd, '.ccjk', 'plan', 'current')

    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    for (const dir of [this.baseDir, this.projectPlanDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  /**
   * 生成 Plan ID
   */
  private generateId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  }

  /**
   * 生成安全的文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
  }

  /**
   * 保存 Plan 文档
   */
  savePlan(plan: Omit<PlanDocument, 'id' | 'createdAt' | 'updatedAt'>, options: PlanSaveOptions = {}): PlanDocument {
    const now = new Date()
    const id = this.generateId()

    const document: PlanDocument = {
      ...plan,
      id,
      createdAt: now,
      updatedAt: now,
    }

    // 生成文件名
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const safeName = this.sanitizeFileName(plan.name)
    const fileName = `${safeName}-${timestamp}.md`

    // 保存到项目目录
    const projectFilePath = join(this.projectPlanDir, fileName)
    this.writePlanFile(projectFilePath, document, options.overwrite)

    // 同时保存到全局目录（作为备份）
    const globalFilePath = join(this.baseDir, fileName)
    this.writePlanFile(globalFilePath, document, true)

    return document
  }

  /**
   * 写入 Plan 文件
   */
  private writePlanFile(filePath: string, plan: PlanDocument, overwrite = false): void {
    if (existsSync(filePath) && !overwrite) {
      // 添加序号避免覆盖
      const ext = '.md'
      const base = filePath.slice(0, -ext.length)
      let counter = 1
      let newPath = `${base}-v${counter}${ext}`
      while (existsSync(newPath)) {
        counter++
        newPath = `${base}-v${counter}${ext}`
      }
      filePath = newPath
    }

    // 构建 Markdown 内容
    const content = this.buildPlanMarkdown(plan)
    writeFileSync(filePath, content, 'utf-8')
  }

  /**
   * 构建 Plan Markdown 内容
   */
  private buildPlanMarkdown(plan: PlanDocument): string {
    const lines: string[] = []

    // YAML frontmatter
    lines.push('---')
    lines.push(`id: ${plan.id}`)
    lines.push(`name: ${plan.name}`)
    lines.push(`created: ${plan.createdAt.toISOString()}`)
    lines.push(`updated: ${plan.updatedAt.toISOString()}`)
    if (plan.sessionId) {
      lines.push(`session: ${plan.sessionId}`)
    }
    if (plan.sourceSkill) {
      lines.push(`skill: ${plan.sourceSkill}`)
    }
    if (plan.metadata.tokenEstimate) {
      lines.push(`tokens: ${plan.metadata.tokenEstimate}`)
    }
    lines.push('---')
    lines.push('')

    // Plan 内容
    lines.push(plan.content)

    // 任务列表（如果有）
    if (plan.metadata.tasks && plan.metadata.tasks.length > 0) {
      lines.push('')
      lines.push('## 任务清单')
      lines.push('')
      for (const task of plan.metadata.tasks) {
        const checkbox = task.completed ? '[x]' : '[ ]'
        const priority = task.priority ? ` (${task.priority})` : ''
        lines.push(`- ${checkbox} ${task.title}${priority}`)
        if (task.description) {
          lines.push(`  - ${task.description}`)
        }
      }
    }

    // 关键决策（如果有）
    if (plan.metadata.keyDecisions && plan.metadata.keyDecisions.length > 0) {
      lines.push('')
      lines.push('## 关键决策')
      lines.push('')
      for (const decision of plan.metadata.keyDecisions) {
        lines.push(`- ${decision}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 读取 Plan 文档
   */
  readPlan(fileName: string): PlanDocument | null {
    // 先尝试项目目录
    let filePath = join(this.projectPlanDir, fileName)
    if (!existsSync(filePath)) {
      // 再尝试全局目录
      filePath = join(this.baseDir, fileName)
    }

    if (!existsSync(filePath)) {
      return null
    }

    return this.parsePlanFile(filePath)
  }

  /**
   * 解析 Plan 文件
   */
  private parsePlanFile(filePath: string): PlanDocument | null {
    try {
      const content = readFileSync(filePath, 'utf-8')

      // 解析 YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      if (!frontmatterMatch) {
        // 没有 frontmatter，作为纯内容处理
        return {
          id: basename(filePath, '.md'),
          name: basename(filePath, '.md'),
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        }
      }

      const frontmatter = frontmatterMatch[1]
      const body = frontmatterMatch[2]

      // 简单解析 YAML
      const meta: Record<string, string> = {}
      for (const line of frontmatter.split('\n')) {
        const match = line.match(/^(\w+):\s*(.*)$/)
        if (match) {
          meta[match[1]] = match[2]
        }
      }

      return {
        id: meta.id || basename(filePath, '.md'),
        name: meta.name || basename(filePath, '.md'),
        content: body.trim(),
        sessionId: meta.session,
        sourceSkill: meta.skill,
        createdAt: meta.created ? new Date(meta.created) : new Date(),
        updatedAt: meta.updated ? new Date(meta.updated) : new Date(),
        metadata: {
          tokenEstimate: meta.tokens ? Number.parseInt(meta.tokens, 10) : undefined,
        },
      }
    }
    catch {
      return null
    }
  }

  /**
   * 列出所有 Plan 文档
   */
  listPlans(location: 'project' | 'global' | 'all' = 'project'): string[] {
    const plans: string[] = []

    if (location === 'project' || location === 'all') {
      if (existsSync(this.projectPlanDir)) {
        const files = readdirSync(this.projectPlanDir).filter(f => f.endsWith('.md'))
        plans.push(...files.map(f => join(this.projectPlanDir, f)))
      }
    }

    if (location === 'global' || location === 'all') {
      if (existsSync(this.baseDir)) {
        const files = readdirSync(this.baseDir).filter(f => f.endsWith('.md'))
        plans.push(...files.map(f => join(this.baseDir, f)))
      }
    }

    return plans
  }

  /**
   * 获取最新的 Plan 文档
   */
  getLatestPlan(): PlanDocument | null {
    const plans = this.listPlans('project')
    if (plans.length === 0) {
      return null
    }

    // 按修改时间排序
    const sorted = plans
      .map((p) => {
        const doc = this.parsePlanFile(p)
        return doc ? { path: p, doc } : null
      })
      .filter((p): p is { path: string, doc: PlanDocument } => p !== null)
      .sort((a, b) => b.doc.updatedAt.getTime() - a.doc.updatedAt.getTime())

    return sorted[0]?.doc || null
  }

  /**
   * 获取项目 Plan 目录路径
   */
  getProjectPlanDir(): string {
    return this.projectPlanDir
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: PlanPersistenceManager | null = null

export function getPlanPersistenceManager(projectPath?: string): PlanPersistenceManager {
  if (!instance) {
    instance = new PlanPersistenceManager(projectPath)
  }
  return instance
}

export function resetPlanPersistenceManager(): void {
  instance = null
}
