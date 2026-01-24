import type {
  BatchSkillOptions,
  BatchSkillTemplate,
  CcjkSkill,
  SkillCategory,
  SkillExport,
  SkillInstallResult,
  SkillRegistry,
  SkillSearchOptions,
} from './types'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'pathe'
import { cloudSyncSkill } from '../cloud-sync/skill'
import { CCJK_SKILLS_DIR } from '../constants'
import { marketplaceSkill } from '../mcp-marketplace/skill'
import { browserSkill } from '../utils/agent-browser/skill'
import { writeFileAtomic } from '../utils/fs-operations'
import { workflowSkill } from '../workflow/skill'

// ============================================================================
// Built-in Skills (内置技能)
// ============================================================================

/**
 * Built-in skills that are always available
 */
const BUILTIN_SKILLS: CcjkSkill[] = [
  cloudSyncSkill,
  browserSkill,
  marketplaceSkill,
  workflowSkill,
]

/**
 * Get built-in skill by ID
 */
export function getBuiltinSkill(id: string): CcjkSkill | undefined {
  return BUILTIN_SKILLS.find(s => s.id === id)
}

/**
 * Get all built-in skills
 */
export function getBuiltinSkills(): CcjkSkill[] {
  return [...BUILTIN_SKILLS]
}

/**
 * Check if a skill is built-in
 */
export function isBuiltinSkill(id: string): boolean {
  return BUILTIN_SKILLS.some(s => s.id === id)
}

// In-memory registry
let registry: SkillRegistry | null = null

/**
 * Initialize skills directory
 */
export function ensureSkillsDir(): void {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    mkdirSync(CCJK_SKILLS_DIR, { recursive: true })
  }
}

/**
 * Get the skills registry
 */
export function getRegistry(): SkillRegistry {
  if (!registry) {
    registry = loadRegistry()
  }
  return registry
}

/**
 * Load registry from disk
 */
function loadRegistry(): SkillRegistry {
  ensureSkillsDir()

  const skills = new Map<string, CcjkSkill>()
  const categories = new Map<SkillCategory, string[]>()

  // Load built-in skills first
  for (const skill of BUILTIN_SKILLS) {
    skills.set(skill.id, skill)
    const categorySkills = categories.get(skill.category) || []
    categorySkills.push(skill.id)
    categories.set(skill.category, categorySkills)
  }

  // Scan skills directory (user skills can override built-in)
  const files = readdirSync(CCJK_SKILLS_DIR).filter(f => f.endsWith('.json'))

  for (const file of files) {
    try {
      const content = readFileSync(join(CCJK_SKILLS_DIR, file), 'utf-8')
      const skill = JSON.parse(content) as CcjkSkill
      skills.set(skill.id, skill)

      // Update category index
      const categorySkills = categories.get(skill.category) || []
      categorySkills.push(skill.id)
      categories.set(skill.category, categorySkills)
    }
    catch {
      // Skip invalid files
    }
  }

  return {
    skills,
    categories,
    lastUpdated: new Date(),
  }
}

/**
 * Refresh registry from disk
 */
export function refreshRegistry(): void {
  registry = loadRegistry()
}

/**
 * Get all skills
 */
export function getAllSkills(): CcjkSkill[] {
  return Array.from(getRegistry().skills.values())
}

/**
 * Get skill by ID
 */
export function getSkill(id: string): CcjkSkill | undefined {
  return getRegistry().skills.get(id)
}

/**
 * Search skills
 */
export function searchSkills(options: SkillSearchOptions): CcjkSkill[] {
  let skills = getAllSkills()

  if (options.category) {
    skills = skills.filter(s => s.category === options.category)
  }

  if (options.enabled !== undefined) {
    skills = skills.filter(s => s.enabled === options.enabled)
  }

  if (options.tags && options.tags.length > 0) {
    skills = skills.filter(s =>
      s.tags && options.tags!.some(tag => s.tags!.includes(tag)),
    )
  }

  if (options.query) {
    const query = options.query.toLowerCase()
    skills = skills.filter(s => {
      // Handle both string and multilingual object for name
      const nameEn = typeof s.name === 'string' ? s.name : (s.name?.en || '')
      const nameZh = typeof s.name === 'string' ? s.name : (s.name?.['zh-CN'] || '')
      return s.id.toLowerCase().includes(query)
        || nameEn.toLowerCase().includes(query)
        || nameZh.toLowerCase().includes(query)
        || s.triggers.some(t => t.toLowerCase().includes(query))
    })
  }

  if (options.limit) {
    skills = skills.slice(0, options.limit)
  }

  return skills
}

/**
 * Add a skill
 */
export function addSkill(skill: CcjkSkill): SkillInstallResult {
  ensureSkillsDir()

  try {
    const filePath = join(CCJK_SKILLS_DIR, `${skill.id}.json`)
    writeFileAtomic(filePath, JSON.stringify(skill, null, 2))
    refreshRegistry()

    return {
      skillId: skill.id,
      success: true,
      path: filePath,
    }
  }
  catch (error) {
    return {
      skillId: skill.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Remove a skill
 */
export function removeSkill(id: string): boolean {
  const filePath = join(CCJK_SKILLS_DIR, `${id}.json`)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
    refreshRegistry()
    return true
  }
  return false
}

/**
 * Enable/disable a skill
 */
export function setSkillEnabled(id: string, enabled: boolean): boolean {
  const skill = getSkill(id)
  if (!skill)
    return false

  skill.enabled = enabled
  addSkill(skill)
  return true
}

/**
 * Export skills to JSON
 */
export function exportSkills(skillIds?: string[]): SkillExport {
  const skills = skillIds
    ? skillIds.map(id => getSkill(id)).filter(Boolean) as CcjkSkill[]
    : getAllSkills()

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    skills,
  }
}

/**
 * Import skills from JSON
 */
export function importSkills(data: SkillExport): SkillInstallResult[] {
  return data.skills.map(skill => addSkill(skill))
}

/**
 * Batch skill templates
 */
const BATCH_TEMPLATES: Record<string, BatchSkillTemplate> = {
  typescript: {
    category: 'dev',
    skills: [
      {
        id: 'ts-debug',
        name: { 'en': 'TypeScript Debug', 'zh-CN': 'TypeScript 调试' },
        description: { 'en': 'Debug TypeScript code', 'zh-CN': '调试 TypeScript 代码' },
        triggers: ['/ts-debug', '/tsd'],
        templateFile: 'ts-debug.md',
        tags: ['typescript', 'debug'],
      },
      {
        id: 'ts-refactor',
        name: { 'en': 'TypeScript Refactor', 'zh-CN': 'TypeScript 重构' },
        description: { 'en': 'Refactor TypeScript code', 'zh-CN': '重构 TypeScript 代码' },
        triggers: ['/ts-refactor', '/tsr'],
        templateFile: 'ts-refactor.md',
        tags: ['typescript', 'refactor'],
      },
      {
        id: 'ts-test',
        name: { 'en': 'TypeScript Test', 'zh-CN': 'TypeScript 测试' },
        description: { 'en': 'Generate TypeScript tests', 'zh-CN': '生成 TypeScript 测试' },
        triggers: ['/ts-test', '/tst'],
        templateFile: 'ts-test.md',
        tags: ['typescript', 'testing'],
      },
      {
        id: 'ts-type-check',
        name: { 'en': 'TypeScript Type Check', 'zh-CN': 'TypeScript 类型检查' },
        description: { 'en': 'Fix TypeScript type errors', 'zh-CN': '修复 TypeScript 类型错误' },
        triggers: ['/ts-type', '/tstc'],
        templateFile: 'ts-type-check.md',
        tags: ['typescript', 'types'],
      },
      {
        id: 'ts-migrate',
        name: { 'en': 'TypeScript Migration', 'zh-CN': 'TypeScript 迁移' },
        description: { 'en': 'Migrate JS to TypeScript', 'zh-CN': '从 JS 迁移到 TypeScript' },
        triggers: ['/ts-migrate', '/tsm'],
        templateFile: 'ts-migrate.md',
        tags: ['typescript', 'migration'],
      },
    ],
  },
  python: {
    category: 'dev',
    skills: [
      {
        id: 'py-debug',
        name: { 'en': 'Python Debug', 'zh-CN': 'Python 调试' },
        description: { 'en': 'Debug Python code', 'zh-CN': '调试 Python 代码' },
        triggers: ['/py-debug', '/pyd'],
        templateFile: 'py-debug.md',
        tags: ['python', 'debug'],
      },
      {
        id: 'py-refactor',
        name: { 'en': 'Python Refactor', 'zh-CN': 'Python 重构' },
        description: { 'en': 'Refactor Python code', 'zh-CN': '重构 Python 代码' },
        triggers: ['/py-refactor', '/pyr'],
        templateFile: 'py-refactor.md',
        tags: ['python', 'refactor'],
      },
      {
        id: 'py-test',
        name: { 'en': 'Python Test', 'zh-CN': 'Python 测试' },
        description: { 'en': 'Generate Python tests', 'zh-CN': '生成 Python 测试' },
        triggers: ['/py-test', '/pyt'],
        templateFile: 'py-test.md',
        tags: ['python', 'testing'],
      },
    ],
  },
  seo: {
    category: 'seo',
    skills: [
      {
        id: 'seo-meta',
        name: { 'en': 'SEO Meta Optimization', 'zh-CN': 'SEO 元数据优化' },
        description: { 'en': 'Optimize meta tags for SEO', 'zh-CN': '优化 SEO 元标签' },
        triggers: ['/seo-meta', '/meta'],
        templateFile: 'seo-meta.md',
        tags: ['seo', 'meta'],
      },
      {
        id: 'seo-sitemap',
        name: { 'en': 'Sitemap Generator', 'zh-CN': '站点地图生成' },
        description: { 'en': 'Generate XML sitemap', 'zh-CN': '生成 XML 站点地图' },
        triggers: ['/sitemap', '/seo-sitemap'],
        templateFile: 'seo-sitemap.md',
        tags: ['seo', 'sitemap'],
      },
      {
        id: 'seo-schema',
        name: { 'en': 'Schema Markup', 'zh-CN': '结构化数据标记' },
        description: { 'en': 'Add structured data markup', 'zh-CN': '添加结构化数据标记' },
        triggers: ['/schema', '/seo-schema'],
        templateFile: 'seo-schema.md',
        tags: ['seo', 'schema'],
      },
      {
        id: 'seo-cwv',
        name: { 'en': 'Core Web Vitals', 'zh-CN': '核心网页指标' },
        description: { 'en': 'Optimize Core Web Vitals', 'zh-CN': '优化核心网页指标' },
        triggers: ['/cwv', '/seo-cwv'],
        templateFile: 'seo-cwv.md',
        tags: ['seo', 'performance'],
      },
    ],
  },
  devops: {
    category: 'devops',
    skills: [
      {
        id: 'devops-docker',
        name: { 'en': 'Docker Setup', 'zh-CN': 'Docker 配置' },
        description: { 'en': 'Set up Docker configuration', 'zh-CN': '配置 Docker' },
        triggers: ['/docker', '/devops-docker'],
        templateFile: 'devops-docker.md',
        tags: ['devops', 'docker'],
      },
      {
        id: 'devops-ci',
        name: { 'en': 'CI Pipeline', 'zh-CN': 'CI 流水线' },
        description: { 'en': 'Set up CI pipeline', 'zh-CN': '配置 CI 流水线' },
        triggers: ['/ci', '/devops-ci'],
        templateFile: 'devops-ci.md',
        tags: ['devops', 'ci'],
      },
      {
        id: 'devops-deploy',
        name: { 'en': 'Deploy Script', 'zh-CN': '部署脚本' },
        description: { 'en': 'Create deployment script', 'zh-CN': '创建部署脚本' },
        triggers: ['/deploy', '/devops-deploy'],
        templateFile: 'devops-deploy.md',
        tags: ['devops', 'deploy'],
      },
      {
        id: 'devops-monitor',
        name: { 'en': 'Monitoring Setup', 'zh-CN': '监控配置' },
        description: { 'en': 'Set up monitoring', 'zh-CN': '配置监控' },
        triggers: ['/monitor', '/devops-monitor'],
        templateFile: 'devops-monitor.md',
        tags: ['devops', 'monitoring'],
      },
    ],
  },
}

/**
 * Create skills from batch template
 */
export function createBatchSkills(options: BatchSkillOptions): SkillInstallResult[] {
  const results: SkillInstallResult[] = []

  // Helper to safely extract string from name/description
  const extractStr = (val: string | Record<string, string> | undefined, fallback: string): string => {
    if (!val) return fallback
    if (typeof val === 'string') return val
    return val.en || val['zh-CN'] || Object.values(val)[0] || fallback
  }

  // Language-specific skills
  if (options.lang) {
    const template = BATCH_TEMPLATES[options.lang]
    if (template) {
      for (const skillDef of template.skills) {
        const nameStr = extractStr(skillDef.name as any, skillDef.id)
        const descStr = extractStr(skillDef.description as any, '')
        const skill: CcjkSkill = {
          ...skillDef,
          category: template.category,
          enabled: true,
          version: '1.0.0',
          template: `# ${nameStr}\n\n${descStr}\n\nThis is a placeholder template.`,
        }
        results.push(addSkill(skill))
      }
    }
  }

  // SEO skills
  if (options.seo) {
    const template = BATCH_TEMPLATES.seo
    for (const skillDef of template.skills) {
      const nameStr = extractStr(skillDef.name as any, skillDef.id)
      const descStr = extractStr(skillDef.description as any, '')
      const skill: CcjkSkill = {
        ...skillDef,
        category: template.category,
        enabled: true,
        version: '1.0.0',
        template: `# ${nameStr}\n\n${descStr}\n\nThis is a placeholder template.`,
      }
      results.push(addSkill(skill))
    }
  }

  // DevOps skills
  if (options.devops) {
    const template = BATCH_TEMPLATES.devops
    for (const skillDef of template.skills) {
      const nameStr = extractStr(skillDef.name as any, skillDef.id)
      const descStr = extractStr(skillDef.description as any, '')
      const skill: CcjkSkill = {
        ...skillDef,
        category: template.category,
        enabled: true,
        version: '1.0.0',
        template: `# ${nameStr}\n\n${descStr}\n\nThis is a placeholder template.`,
      }
      results.push(addSkill(skill))
    }
  }

  return results
}

/**
 * Get available batch categories
 */
export function getBatchCategories(): string[] {
  return Object.keys(BATCH_TEMPLATES)
}
