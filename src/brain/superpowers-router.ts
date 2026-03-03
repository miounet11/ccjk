/**
 * Superpowers Router - 智能路由层
 * 将 CCJK 快捷操作映射到 Superpowers 技能
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import type { SupportedLang } from '../constants'
import { i18n } from '../i18n'

export interface SuperpowerSkill {
  id: string
  name: string
  description: string
  content: string
  supportingFiles?: string[]
}

export interface SuperpowerMapping {
  actionId: number
  actionName: string
  primarySkill: string
  supportingSkills?: string[]
  autoTriggers?: string[]
}

/**
 * CCJK 快捷操作 → Superpowers 技能映射
 */
export const SUPERPOWERS_MAPPINGS: SuperpowerMapping[] = [
  {
    actionId: 1,
    actionName: 'Smart Commit',
    primarySkill: 'finishing-a-development-branch',
    supportingSkills: ['verification-before-completion'],
    autoTriggers: ['commit', 'push', '提交'],
  },
  {
    actionId: 2,
    actionName: 'Code Review',
    primarySkill: 'requesting-code-review',
    supportingSkills: ['receiving-code-review'],
    autoTriggers: ['review', 'pr', 'merge', '审查'],
  },
  {
    actionId: 3,
    actionName: 'Write Tests',
    primarySkill: 'test-driven-development',
    supportingSkills: [],
    autoTriggers: ['test', 'tdd', '测试'],
  },
  {
    actionId: 4,
    actionName: 'Plan Feature',
    primarySkill: 'subagent-driven-development',
    supportingSkills: ['writing-plans', 'executing-plans'],
    autoTriggers: ['plan', 'feature', 'implement', '规划', '实现'],
  },
  {
    actionId: 5,
    actionName: 'Debug Issue',
    primarySkill: 'systematic-debugging',
    supportingSkills: [],
    autoTriggers: ['debug', 'bug', 'fix', 'error', '调试', '修复'],
  },
  {
    actionId: 6,
    actionName: 'Brainstorm',
    primarySkill: 'brainstorming',
    supportingSkills: ['dispatching-parallel-agents'],
    autoTriggers: ['brainstorm', 'explore', 'idea', '头脑风暴', '探索'],
  },
  {
    actionId: 7,
    actionName: 'Verify Code',
    primarySkill: 'verification-before-completion',
    supportingSkills: [],
    autoTriggers: ['verify', 'check', 'validate', '验证', '检查'],
  },
  {
    actionId: 8,
    actionName: 'Write Docs',
    primarySkill: 'writing-skills',
    supportingSkills: [],
    autoTriggers: ['doc', 'documentation', 'readme', '文档'],
  },
]

/**
 * Superpowers 技能加载器
 */
export class SuperpowersRouter {
  private skillsPath: string
  private cache: Map<string, SuperpowerSkill> = new Map()

  constructor() {
    this.skillsPath = join(homedir(), '.claude', 'plugins', 'superpowers', 'skills')
  }

  /**
   * 检查 Superpowers 是否已安装
   */
  isInstalled(): boolean {
    return existsSync(this.skillsPath)
  }

  /**
   * 根据快捷操作 ID 路由到对应的 Superpowers 技能
   */
  async routeByActionId(actionId: number): Promise<SuperpowerSkill | null> {
    const mapping = SUPERPOWERS_MAPPINGS.find(m => m.actionId === actionId)
    if (!mapping) {
      return null
    }

    return this.loadSkill(mapping.primarySkill)
  }

  /**
   * 根据用户输入自动检测并路由到合适的技能
   */
  async routeByContext(userInput: string): Promise<SuperpowerSkill | null> {
    const input = userInput.toLowerCase()

    // 查找匹配的映射
    for (const mapping of SUPERPOWERS_MAPPINGS) {
      if (mapping.autoTriggers?.some(trigger => input.includes(trigger))) {
        return this.loadSkill(mapping.primarySkill)
      }
    }

    return null
  }

  /**
   * 加载指定的 Superpowers 技能
   */
  async loadSkill(skillName: string): Promise<SuperpowerSkill | null> {
    // 检查缓存
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName)!
    }

    const skillPath = join(this.skillsPath, skillName)
    if (!existsSync(skillPath)) {
      return null
    }

    try {
      // 读取主技能文件 (SKILL.md 或 skill.md)
      let skillFile = join(skillPath, 'SKILL.md')
      if (!existsSync(skillFile)) {
        skillFile = join(skillPath, 'skill.md')
      }

      if (!existsSync(skillFile)) {
        return null
      }

      const content = readFileSync(skillFile, 'utf-8')

      // 解析 frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      let name = skillName
      let description = ''

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]
        const nameMatch = frontmatter.match(/name:\s*(.+)/)
        const descMatch = frontmatter.match(/description:\s*(.+)/)

        if (nameMatch)
          name = nameMatch[1].trim()
        if (descMatch)
          description = descMatch[1].trim()
      }

      // 查找支持文件
      const supportingFiles = this.findSupportingFiles(skillPath)

      const skill: SuperpowerSkill = {
        id: skillName,
        name,
        description,
        content,
        supportingFiles,
      }

      // 缓存
      this.cache.set(skillName, skill)

      return skill
    }
    catch (error) {
      console.error(`Failed to load skill ${skillName}:`, error)
      return null
    }
  }

  /**
   * 查找技能的支持文件
   */
  private findSupportingFiles(skillPath: string): string[] {
    const supportingFiles: string[] = []

    try {
      const { readdirSync } = require('node:fs')
      const files = readdirSync(skillPath)

      for (const file of files) {
        if (file.endsWith('.md') && !file.match(/^(SKILL|skill)\.md$/i)) {
          supportingFiles.push(join(skillPath, file))
        }
      }
    }
    catch {
      // Ignore errors
    }

    return supportingFiles
  }

  /**
   * 获取所有可用的技能列表
   */
  async listAvailableSkills(): Promise<string[]> {
    if (!this.isInstalled()) {
      return []
    }

    try {
      const { readdirSync } = require('node:fs')
      const entries = readdirSync(this.skillsPath, { withFileTypes: true })
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
    }
    catch {
      return []
    }
  }

  /**
   * 生成增强的 system prompt
   */
  async generateEnhancedPrompt(
    actionId: number,
    userContext: string,
    lang: SupportedLang = 'zh-CN',
  ): Promise<string> {
    const mapping = SUPERPOWERS_MAPPINGS.find(m => m.actionId === actionId)
    if (!mapping) {
      return userContext
    }

    // 加载主技能
    const primarySkill = await this.loadSkill(mapping.primarySkill)
    if (!primarySkill) {
      return userContext
    }

    // 加载支持技能
    const supportingSkills: SuperpowerSkill[] = []
    if (mapping.supportingSkills) {
      for (const skillName of mapping.supportingSkills) {
        const skill = await this.loadSkill(skillName)
        if (skill) {
          supportingSkills.push(skill)
        }
      }
    }

    // 构建增强的 prompt
    let enhancedPrompt = `# ${mapping.actionName} - Enhanced by Superpowers\n\n`
    enhancedPrompt += `## User Context\n${userContext}\n\n`
    enhancedPrompt += `## Primary Workflow: ${primarySkill.name}\n\n`
    enhancedPrompt += primarySkill.content
    enhancedPrompt += '\n\n'

    if (supportingSkills.length > 0) {
      enhancedPrompt += '## Supporting Workflows\n\n'
      for (const skill of supportingSkills) {
        enhancedPrompt += `### ${skill.name}\n\n`
        enhancedPrompt += skill.content
        enhancedPrompt += '\n\n'
      }
    }

    enhancedPrompt += `## Instructions\n\n`
    enhancedPrompt += this.getInstructions(mapping.actionId, lang)

    return enhancedPrompt
  }

  /**
   * 获取特定操作的指令
   */
  private getInstructions(actionId: number, lang: SupportedLang): string {
    const instructions: Record<number, Record<SupportedLang, string>> = {
      1: {
        'zh-CN': `
请按照 "finishing-a-development-branch" 工作流完成提交：
1. 运行所有测试确保通过
2. 检查代码质量（linting, formatting）
3. 生成符合 Conventional Commits 的消息
4. 询问是否需要 code review
`,
        'en': `
Follow the "finishing-a-development-branch" workflow:
1. Run all tests to ensure they pass
2. Check code quality (linting, formatting)
3. Generate Conventional Commits message
4. Ask if code review is needed
`,
      },
      3: {
        'zh-CN': `
严格遵循 TDD 的 Red-Green-Refactor 循环：
1. RED: 先写失败的测试
2. Verify RED: 确认测试失败且失败原因正确
3. GREEN: 写最小代码使测试通过
4. Verify GREEN: 确认测试通过
5. REFACTOR: 重构代码

⚠️ 如果发现用户先写了实现代码，必须警告并建议删除重来。
`,
        'en': `
Strictly follow TDD Red-Green-Refactor cycle:
1. RED: Write failing test first
2. Verify RED: Confirm test fails correctly
3. GREEN: Write minimal code to pass
4. Verify GREEN: Confirm test passes
5. REFACTOR: Clean up code

⚠️ If user wrote implementation first, warn and suggest starting over.
`,
      },
      5: {
        'zh-CN': `
强制执行系统性调试的四个阶段：
1. Phase 1: Root Cause Investigation（必须完成才能进入下一阶段）
2. Phase 2: Pattern Analysis
3. Phase 3: Hypothesis and Testing
4. Phase 4: Implementation

⚠️ 如果用户跳过 Phase 1 直接提出修复方案，必须拒绝并要求先完成根因分析。
⚠️ 如果修复失败 3 次以上，必须停止并质疑架构设计。
`,
        'en': `
Enforce systematic debugging four phases:
1. Phase 1: Root Cause Investigation (must complete before next)
2. Phase 2: Pattern Analysis
3. Phase 3: Hypothesis and Testing
4. Phase 4: Implementation

⚠️ If user skips Phase 1 and proposes fixes, refuse and require root cause analysis first.
⚠️ If 3+ fixes failed, stop and question the architecture.
`,
      },
    }

    return instructions[actionId]?.[lang] || ''
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * 全局单例
 */
export const superpowersRouter = new SuperpowersRouter()
