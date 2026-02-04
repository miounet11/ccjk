/**
 * Skills Adapter for Orchestrator
 * 将 Skills 系统集成到 Orchestrator
 */

import type { TaskExecutor } from '../lifecycle'
import type { Context, Task } from '../types'

/**
 * Skill 定义接口
 */
export interface SkillDefinition {
  name: string
  description?: string
  execute: (params: Record<string, unknown>, context: Context) => Promise<unknown>
}

/**
 * Skills 适配器
 * 负责将 Skills 系统集成到 Orchestrator
 */
export class SkillsAdapter {
  private skills: Map<string, SkillDefinition>

  constructor() {
    this.skills = new Map()
  }

  /**
   * 注册 Skill
   * @param skill Skill 定义
   */
  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill)
  }

  /**
   * 批量注册 Skills
   * @param skills Skill 定义列表
   */
  registerAll(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill)
    }
  }

  /**
   * 获取 Skill
   * @param name Skill 名称
   */
  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name)
  }

  /**
   * 检查 Skill 是否存在
   * @param name Skill 名称
   */
  has(name: string): boolean {
    return this.skills.has(name)
  }

  /**
   * 获取所有 Skill 名称
   */
  list(): string[] {
    return Array.from(this.skills.keys())
  }

  /**
   * 创建 Skill 执行器
   * 用于注册到 Orchestrator 的 LifecycleManager
   */
  createExecutor(): TaskExecutor {
    return async (task: Task, context: Context): Promise<unknown> => {
      const skill = this.skills.get(task.name)
      if (!skill) {
        throw new Error(`Skill not found: ${task.name}`)
      }

      // 记录执行开始
      const startTime = Date.now()

      try {
        // 执行 Skill
        const result = await skill.execute(task.params || {}, context)

        // 存储结果到上下文
        context.shared.skills.set(task.name, {
          skillName: task.name,
          success: true,
          output: result,
          duration: Date.now() - startTime,
        })

        return result
      }
      catch (error) {
        // 存储错误到上下文
        context.shared.skills.set(task.name, {
          skillName: task.name,
          success: false,
          output: undefined,
          error: error as Error,
          duration: Date.now() - startTime,
        })

        throw error
      }
    }
  }

  /**
   * 从模块加载 Skills
   * @param modulePath 模块路径
   */
  async loadFromModule(modulePath: string): Promise<void> {
    try {
      const module = await import(modulePath)
      const skills = module.default || module.skills || []

      if (Array.isArray(skills)) {
        this.registerAll(skills)
      }
      else if (typeof skills === 'object') {
        // 支持对象格式 { skillName: skillDefinition }
        for (const [name, definition] of Object.entries(skills)) {
          if (typeof definition === 'object' && definition !== null) {
            this.register({
              name,
              ...(definition as Omit<SkillDefinition, 'name'>),
            })
          }
        }
      }
    }
    catch (error) {
      console.error(`Failed to load skills from ${modulePath}:`, error)
      throw error
    }
  }
}

/**
 * 创建 Skills 适配器实例
 */
export function createSkillsAdapter(): SkillsAdapter {
  return new SkillsAdapter()
}
