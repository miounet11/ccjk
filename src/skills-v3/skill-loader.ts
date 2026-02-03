/**
 * CCJK Skills V3 - Skill Loader
 *
 * Loads skills from directories, supporting recursive scanning,
 * pattern matching, and automatic migration of old formats.
 *
 * @module skills-v3/skill-loader
 */

import type {
  LoaderOptions,
  LoadResult,
  MigrationResult,
  SkillSource,
  SkillV3,
} from './types'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join } from 'pathe'
import { migrateFile } from './migrator'
import { parseSkillFile } from './parser'
import { getSkillRegistry } from './skill-registry'

// ============================================================================
// Constants
// ============================================================================

/** Default home skills directory */
const DEFAULT_HOME_SKILLS_DIR = join(homedir(), '.claude', 'skills')

/** Default CCJK skills directory - uses ~/.claude/skills for Claude Code compatibility */
const DEFAULT_CCJK_SKILLS_DIR = join(homedir(), '.claude', 'skills')

/** Default local skills directory */
const DEFAULT_LOCAL_SKILLS_DIR = '.claude/skills'

/** Default file patterns */
const DEFAULT_PATTERNS = ['*.md', '*.MD', '*.markdown', '*.json', 'SKILL.md', 'skill.md']

/** Valid skill file extensions */
const VALID_EXTENSIONS = ['.md', '.markdown', '.json']

// ============================================================================
// Skill Loader Class
// ============================================================================

/**
 * Skill Loader
 *
 * Loads skills from file system with support for:
 * - Recursive directory scanning
 * - Pattern matching
 * - Automatic V1/V2 migration
 * - Error handling and reporting
 */
export class SkillLoader {
  private options: Required<LoaderOptions>

  constructor(options: Partial<LoaderOptions> = {}) {
    this.options = {
      directories: options.directories || [
        DEFAULT_HOME_SKILLS_DIR,
        DEFAULT_CCJK_SKILLS_DIR,
        DEFAULT_LOCAL_SKILLS_DIR,
      ],
      recursive: options.recursive ?? true,
      patterns: options.patterns || DEFAULT_PATTERNS,
      autoMigrate: options.autoMigrate ?? true,
      skipInvalid: options.skipInvalid ?? true,
    }
  }

  /**
   * Load all skills from configured directories
   */
  async loadAll(): Promise<LoadResult> {
    const startTime = Date.now()
    const skills: SkillV3[] = []
    const errors: Array<{ filePath: string, error: string }> = []
    const migrated: MigrationResult[] = []
    let totalScanned = 0

    for (const dir of this.options.directories) {
      const result = await this.loadDirectory(dir)
      skills.push(...result.skills)
      errors.push(...result.errors)
      migrated.push(...result.migrated)
      totalScanned += result.totalScanned
    }

    return {
      skills,
      errors,
      migrated,
      totalScanned,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Load skills from a specific directory
   */
  async loadDirectory(dirPath: string): Promise<LoadResult> {
    const startTime = Date.now()
    const skills: SkillV3[] = []
    const errors: Array<{ filePath: string, error: string }> = []
    const migrated: MigrationResult[] = []
    let totalScanned = 0

    // Check if directory exists
    if (!existsSync(dirPath)) {
      return { skills, errors, migrated, totalScanned, durationMs: 0 }
    }

    // Get all skill files
    const files = this.scanDirectory(dirPath)
    totalScanned = files.length

    // Load each file
    for (const filePath of files) {
      const result = await this.loadFile(filePath)

      if (result.skill) {
        skills.push(result.skill)
        if (result.migrated) {
          migrated.push(result.migrated)
        }
      }
      else if (result.error) {
        if (!this.options.skipInvalid) {
          errors.push({ filePath, error: result.error })
        }
      }
    }

    return {
      skills,
      errors,
      migrated,
      totalScanned,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Load a single skill file
   */
  async loadFile(filePath: string): Promise<{
    skill?: SkillV3
    error?: string
    migrated?: MigrationResult
  }> {
    try {
      // Parse the file
      const parseResult = parseSkillFile(filePath)

      // If parsing succeeded, return the skill
      if (parseResult.success && parseResult.skill) {
        return { skill: parseResult.skill }
      }

      // If auto-migrate is enabled and it's an old format, try migration
      if (this.options.autoMigrate && parseResult.detectedVersion && parseResult.detectedVersion !== 'v3') {
        const migrationResult = await migrateFile(filePath)
        if (migrationResult.success && migrationResult.skill) {
          return {
            skill: migrationResult.skill,
            migrated: migrationResult,
          }
        }
        return { error: migrationResult.error || 'Migration failed' }
      }

      return { error: parseResult.error || 'Unknown parse error' }
    }
    catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Load and register all skills
   */
  async loadAndRegister(): Promise<LoadResult> {
    const result = await this.loadAll()
    const registry = getSkillRegistry()

    for (const skill of result.skills) {
      // Determine source based on file path
      const source = this.determineSource(skill.id)
      registry.register(skill, skill.id, source)
    }

    return result
  }

  /**
   * Scan directory for skill files
   */
  private scanDirectory(dirPath: string): string[] {
    const files: string[] = []

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          // Skip hidden directories and common non-skill directories
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue
          }

          // Recurse if enabled
          if (this.options.recursive) {
            files.push(...this.scanDirectory(fullPath))
          }
        }
        else if (entry.isFile()) {
          // Check if file matches patterns
          if (this.matchesPattern(entry.name)) {
            files.push(fullPath)
          }
        }
      }
    }
    catch {
      // Directory doesn't exist or can't be read
    }

    return files
  }

  /**
   * Check if filename matches any pattern
   */
  private matchesPattern(filename: string): boolean {
    const ext = extname(filename).toLowerCase()

    // Check extension
    if (!VALID_EXTENSIONS.includes(ext)) {
      return false
    }

    // Check for SKILL.md specifically
    if (filename.toUpperCase() === 'SKILL.MD') {
      return true
    }

    // Check patterns
    for (const pattern of this.options.patterns) {
      if (this.matchGlob(filename, pattern)) {
        return true
      }
    }

    return VALID_EXTENSIONS.includes(ext)
  }

  /**
   * Simple glob matching
   */
  private matchGlob(filename: string, pattern: string): boolean {
    // Convert glob to regex
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')

    return new RegExp(`^${regex}$`, 'i').test(filename)
  }

  /**
   * Determine skill source from context
   */
  private determineSource(skillId: string): SkillSource {
    // Built-in skills (could be expanded with a list)
    const builtinSkills = ['cloud-sync', 'browser', 'marketplace', 'workflow']
    if (builtinSkills.includes(skillId)) {
      return 'builtin'
    }

    return 'user'
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let loaderInstance: SkillLoader | null = null

/**
 * Get singleton loader instance
 */
export function getSkillLoader(options?: Partial<LoaderOptions>): SkillLoader {
  if (!loaderInstance) {
    loaderInstance = new SkillLoader(options)
  }
  return loaderInstance
}

/**
 * Reset loader instance (for testing)
 */
export function resetSkillLoader(): void {
  loaderInstance = null
}

/**
 * Load all skills from default directories
 */
export async function loadAllSkills(options?: Partial<LoaderOptions>): Promise<LoadResult> {
  const loader = options ? new SkillLoader(options) : getSkillLoader()
  return loader.loadAll()
}

/**
 * Load skills from a specific directory
 */
export async function loadSkillsFromDirectory(dirPath: string, options?: Partial<LoaderOptions>): Promise<LoadResult> {
  const loader = new SkillLoader({ ...options, directories: [dirPath] })
  return loader.loadAll()
}

/**
 * Load and register all skills
 */
export async function loadAndRegisterSkills(options?: Partial<LoaderOptions>): Promise<LoadResult> {
  const loader = options ? new SkillLoader(options) : getSkillLoader()
  return loader.loadAndRegister()
}

/**
 * Get default skill directories
 */
export function getDefaultSkillDirectories(): string[] {
  return [
    DEFAULT_HOME_SKILLS_DIR,
    DEFAULT_CCJK_SKILLS_DIR,
    DEFAULT_LOCAL_SKILLS_DIR,
  ]
}
