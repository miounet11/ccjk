/**
 * CCJK Skills V3 - V1/V2 Migrator
 *
 * Migrates skills from V1 (CcjkSkill) and V2 (CognitiveProtocol) formats
 * to the unified V3 format. Preserves user customizations and generates
 * migration reports.
 *
 * @module skills-v3/migrator
 */

import type {
  LocalizedString,
  MigrationReport,
  MigrationResult,
  SkillCategory,
  SkillV1,
  SkillV2,
  SkillV3,
  SkillVersion,
} from './types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

/** V1 to V3 category mapping */
const V1_TO_V3_CATEGORY: Record<string, SkillCategory> = {
  git: 'git',
  dev: 'dev',
  seo: 'seo',
  devops: 'devops',
  testing: 'testing',
  docs: 'docs',
  review: 'review',
  custom: 'custom',
}

// ============================================================================
// Migrator Class
// ============================================================================

/**
 * Skill Migrator
 *
 * Migrates skills from V1 and V2 formats to V3.
 * Supports:
 * - Automatic format detection
 * - V1 CcjkSkill to V3 conversion
 * - V2 CognitiveProtocol to V3 conversion
 * - Migration report generation
 * - Backup creation
 */
export class SkillMigrator {
  /**
   * Migrate a V1 skill to V3
   */
  migrateV1(v1Skill: SkillV1, filePath: string, warnings: string[] = []): MigrationResult {
    try {
      // Convert name from V1 format (Record<SupportedLang, string>) to V3 format
      const name: LocalizedString = {
        'en': typeof v1Skill.name === 'string' ? v1Skill.name : (v1Skill.name.en || ''),
        'zh-CN': typeof v1Skill.name === 'string' ? v1Skill.name : (v1Skill.name['zh-CN'] || ''),
      }

      // Convert description
      const description: LocalizedString = {
        'en': typeof v1Skill.description === 'string'
          ? v1Skill.description
          : (v1Skill.description.en || ''),
        'zh-CN': typeof v1Skill.description === 'string'
          ? v1Skill.description
          : (v1Skill.description['zh-CN'] || ''),
      }

      // Build V3 skill
      const skill: SkillV3 = {
        id: v1Skill.id,
        version: v1Skill.version || '1.0.0',
        metadata: {
          name,
          description,
          category: V1_TO_V3_CATEGORY[v1Skill.category] || v1Skill.category,
          tags: v1Skill.tags || [],
          author: v1Skill.author,
        },
        triggers: v1Skill.triggers,
        template: v1Skill.template,
        config: v1Skill.agents ? { agents: v1Skill.agents } : undefined,
      }

      return {
        success: true,
        skill,
        originalVersion: 'v1',
        sourcePath: filePath,
        warnings,
      }
    }
    catch (error) {
      return {
        success: false,
        originalVersion: 'v1',
        sourcePath: filePath,
        warnings,
        error: `V1 migration failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Migrate a V2 skill to V3
   */
  migrateV2(v2Skill: SkillV2, filePath: string, warnings: string[] = []): MigrationResult {
    try {
      const meta = v2Skill.metadata
      const proto = v2Skill.protocol

      // Convert V2 format to V3
      const skill: SkillV3 = {
        id: meta.id,
        version: meta.version || '1.0.0',
        metadata: {
          name: {
            'en': meta.name,
            'zh-CN': meta.name,
          },
          description: {
            'en': meta.description,
            'zh-CN': meta.description,
          },
          category: this.v2LayerToCategory(meta.layer),
          tags: meta.tags || [],
          author: meta.author,
          priority: this.v2PriorityToV3(meta.priority),
        },
        triggers: [`/${meta.id}`],
        template: this.v2ProtocolToTemplate(proto, meta),
        config: {
          custom: {
            layer: meta.layer,
            coreQuestion: proto.coreQuestion,
            traceUp: proto.traceUp,
            traceDown: proto.traceDown,
            quickReference: proto.quickReference,
          },
        },
        dependencies: meta.dependencies,
      }

      warnings.push('V2 cognitive protocol converted to V3 format')
      warnings.push('Original layer and protocol info stored in config.custom')

      return {
        success: true,
        skill,
        originalVersion: 'v2',
        sourcePath: filePath,
        warnings,
      }
    }
    catch (error) {
      return {
        success: false,
        originalVersion: 'v2',
        sourcePath: filePath,
        warnings,
        error: `V2 migration failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Migrate a skill file
   */
  async migrateFile(filePath: string): Promise<MigrationResult> {
    const warnings: string[] = []

    try {
      // Read file
      const content = readFileSync(filePath, 'utf-8')

      // Detect version and migrate
      const trimmed = content.trim()

      if (trimmed.startsWith('{')) {
        // JSON format
        const json = JSON.parse(content)
        const detectedVersion = this.detectVersion(json)

        if (detectedVersion === 'v1') {
          return this.migrateV1(json as SkillV1, filePath, warnings)
        }
        else if (detectedVersion === 'v2') {
          return this.migrateV2(json as SkillV2, filePath, warnings)
        }
        else if (detectedVersion === 'v3') {
          warnings.push('File is already V3 format')
          return {
            success: false,
            originalVersion: 'v3',
            sourcePath: filePath,
            warnings,
            error: 'File is already V3 format',
          }
        }
      }
      else if (trimmed.startsWith('---')) {
        // Markdown format - likely V3 already
        warnings.push('Markdown format detected, may be V3 already')
        return {
          success: false,
          originalVersion: 'v3',
          sourcePath: filePath,
          warnings,
          error: 'Markdown format, parse as SKILL.md instead',
        }
      }

      return {
        success: false,
        originalVersion: 'v1',
        sourcePath: filePath,
        warnings,
        error: 'Unknown format',
      }
    }
    catch (error) {
      return {
        success: false,
        originalVersion: 'v1',
        sourcePath: filePath,
        warnings,
        error: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Migrate directory of skills
   */
  async migrateDirectory(dirPath: string, options?: {
    outputDir?: string
    createBackups?: boolean
  }): Promise<MigrationReport> {
    const startTime = Date.now()
    const results: MigrationResult[] = []

    // Import glob for file scanning
    const { glob } = await import('glob')

    // Find all skill files
    const files = await glob('**/*.{json,md}', {
      cwd: dirPath,
      absolute: true,
      nodir: true,
    })

    for (const filePath of files) {
      const result = await this.migrateFile(filePath)
      results.push(result)

      // Write migrated file if successful and outputDir specified
      if (result.success && result.skill && options?.outputDir) {
        await this.writeMigratedSkill(result.skill, options.outputDir, filePath, options.createBackups)
      }
    }

    // Generate report
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success && r.originalVersion !== 'v3').length
    const skippedCount = results.filter(r => r.originalVersion === 'v3').length

    return {
      totalFound: results.length,
      successCount,
      failedCount,
      skippedCount,
      results,
      timestamp: startTime,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Write migrated skill to file
   */
  private async writeMigratedSkill(
    skill: SkillV3,
    outputDir: string,
    originalPath: string,
    createBackups?: boolean,
  ): Promise<void> {
    // Create output directory if needed
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Generate filename
    const filename = `${skill.id}.md`
    const outputPath = join(outputDir, filename)

    // Create backup if requested
    if (createBackups && existsSync(originalPath)) {
      const backupDir = join(dirname(originalPath), '.backup')
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true })
      }
      const backupPath = join(backupDir, `${basename(originalPath)}.bak`)
      writeFileSync(backupPath, readFileSync(originalPath))
    }

    // Write SKILL.md format
    const content = this.skillToMarkdown(skill)
    writeFileSync(outputPath, content)
  }

  /**
   * Convert skill to markdown format
   */
  private skillToMarkdown(skill: SkillV3): string {
    const lines = ['---']

    // Basic metadata
    lines.push(`id: ${skill.id}`)
    lines.push(`version: ${skill.version}`)

    // Name (localized)
    lines.push(`name:`)
    lines.push(`  en: ${skill.metadata.name.en}`)
    lines.push(`  'zh-CN': ${skill.metadata.name['zh-CN']}`)

    // Description (localized)
    lines.push(`description:`)
    lines.push(`  en: ${skill.metadata.description.en}`)
    lines.push(`  'zh-CN': ${skill.metadata.description['zh-CN']}`)

    // Other metadata
    lines.push(`category: ${skill.metadata.category}`)
    if (skill.metadata.author)
      lines.push(`author: ${skill.metadata.author}`)
    if (skill.metadata.difficulty)
      lines.push(`difficulty: ${skill.metadata.difficulty}`)
    if (skill.metadata.priority)
      lines.push(`priority: ${skill.metadata.priority}`)
    if (skill.metadata.autoActivate !== undefined) {
      lines.push(`auto_activate: ${skill.metadata.autoActivate}`)
    }
    if (skill.metadata.userInvocable !== undefined) {
      lines.push(`user_invocable: ${skill.metadata.userInvocable}`)
    }

    // Triggers
    lines.push(`triggers:`)
    for (const trigger of skill.triggers) {
      lines.push(`  - ${trigger}`)
    }

    // Tags
    if (skill.metadata.tags.length > 0) {
      lines.push(`tags:`)
      for (const tag of skill.metadata.tags) {
        lines.push(`  - ${tag}`)
      }
    }

    // Use when
    if (skill.metadata.useWhen && skill.metadata.useWhen.length > 0) {
      lines.push(`use_when:`)
      for (const condition of skill.metadata.useWhen) {
        lines.push(`  - ${condition}`)
      }
    }

    // Config
    if (skill.config) {
      if (skill.config.allowedTools) {
        lines.push(`allowed_tools:`)
        for (const tool of skill.config.allowedTools) {
          lines.push(`  - ${tool}`)
        }
      }
      if (skill.config.agents) {
        lines.push(`agents:`)
        for (const agent of skill.config.agents) {
          lines.push(`  - ${agent}`)
        }
      }
      if (skill.config.permissions) {
        lines.push(`permissions:`)
        for (const perm of skill.config.permissions) {
          lines.push(`  - ${perm}`)
        }
      }
      if (skill.config.timeout) {
        lines.push(`timeout: ${skill.config.timeout}`)
      }
    }

    // Dependencies
    if (skill.dependencies && skill.dependencies.length > 0) {
      lines.push(`dependencies:`)
      for (const dep of skill.dependencies) {
        lines.push(`  - ${dep}`)
      }
    }

    lines.push('---')
    lines.push('')
    lines.push(skill.template)

    return lines.join('\n')
  }

  /**
   * Detect skill version from JSON object
   */
  private detectVersion(json: Record<string, unknown>): SkillVersion {
    // V3: has metadata.name as object with en/zh-CN
    if (json.metadata && typeof json.metadata === 'object') {
      const metadata = json.metadata as Record<string, unknown>
      if (metadata.name && typeof metadata.name === 'object') {
        return 'v3'
      }
    }

    // V2: has protocol and ast
    if (json.protocol && json.ast) {
      return 'v2'
    }

    // V1: has name as object at top level with en/zh-CN keys
    if (json.name && typeof json.name === 'object' && json.triggers) {
      const nameObj = json.name as Record<string, unknown>
      if (nameObj.en || nameObj['zh-CN']) {
        return 'v1'
      }
    }

    return 'v1'
  }

  /**
   * Convert V2 layer to V3 category
   */
  private v2LayerToCategory(layer: string): SkillCategory {
    const mapping: Record<string, SkillCategory> = {
      L1: 'dev',
      L2: 'dev',
      L3: 'dev',
    }
    return mapping[layer] || 'dev'
  }

  /**
   * Convert V2 priority to V3 priority
   */
  private v2PriorityToV3(priority: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
    if (priority < 1)
      return 1
    if (priority > 10)
      return 10
    return priority as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  }

  /**
   * Convert V2 protocol to template
   */
  private v2ProtocolToTemplate(
    protocol: { coreQuestion: string, traceUp: string, traceDown: string, quickReference: Record<string, unknown> },
    metadata: { name: string, description: string },
  ): string {
    const lines = [
      `# ${metadata.name}`,
      '',
      metadata.description,
      '',
      '## Core Question',
      protocol.coreQuestion,
      '',
      '## Trace Up',
      protocol.traceUp || 'N/A',
      '',
      '## Trace Down',
      protocol.traceDown || 'N/A',
      '',
    ]

    if (Object.keys(protocol.quickReference).length > 0) {
      lines.push('## Quick Reference')
      for (const [key, value] of Object.entries(protocol.quickReference)) {
        lines.push(`- **${key}**: ${value}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let migratorInstance: SkillMigrator | null = null

/**
 * Get singleton migrator instance
 */
export function getSkillMigrator(): SkillMigrator {
  if (!migratorInstance) {
    migratorInstance = new SkillMigrator()
  }
  return migratorInstance
}

/**
 * Reset migrator instance (for testing)
 */
export function resetSkillMigrator(): void {
  migratorInstance = null
}

/**
 * Migrate a skill file
 */
export async function migrateFile(filePath: string): Promise<MigrationResult> {
  return getSkillMigrator().migrateFile(filePath)
}

/**
 * Migrate directory of skills
 */
export async function migrateDirectory(
  dirPath: string,
  options?: { outputDir?: string, createBackups?: boolean },
): Promise<MigrationReport> {
  return getSkillMigrator().migrateDirectory(dirPath, options)
}
