/**
 * Skill Discovery Service Module
 *
 * Provides functionality for discovering, scanning, and validating
 * SKILL.md files across multiple directories.
 *
 * @module utils/skill-md/discovery
 */

import type { SkillMdFile, SkillValidationResult } from '../../types/skill-md.js'
import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { cwd } from 'node:process'
import { join, resolve } from 'pathe'
import { parseSkillMdFile, validateSkillMd } from './parser.js'

/**
 * Skill validation result with file path
 *
 * Extends the standard validation result with file path information
 * for better error reporting during discovery.
 */
export interface SkillValidationResultWithPath extends SkillValidationResult {
  /** File path that was validated */
  filePath: string
}

/**
 * Skill discovery service
 *
 * Provides methods for discovering and validating SKILL.md files
 * across multiple directories with comprehensive error handling.
 *
 * Features:
 * - Multi-directory scanning
 * - Recursive directory traversal
 * - Skill validation during discovery
 * - Default directory resolution
 * - Cross-platform path handling
 *
 * @example
 * ```typescript
 * const discovery = new SkillDiscovery()
 *
 * // Scan default directories
 * const skills = await discovery.scanDefaultDirs()
 *
 * // Scan specific directory
 * const customSkills = await discovery.scanDirectory('/path/to/skills')
 *
 * // Validate skill file
 * const validation = await discovery.validateSkillFile('/path/to/SKILL.md')
 * ```
 */
export class SkillDiscovery {
  /**
   * Get default skill directories
   *
   * Returns the standard locations where SKILL.md files are stored:
   * - `~/.claude/skills` - Global user skills
   * - `.claude/skills` - Project-local skills (relative to cwd)
   *
   * @returns Array of default skill directory paths (absolute)
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const dirs = discovery.getDefaultDirs()
   * console.log(dirs)
   * // ['/Users/username/.claude/skills', '/project/.claude/skills']
   * ```
   */
  getDefaultDirs(): string[] {
    const home = homedir()
    const globalSkillsDir = join(home, '.claude', 'skills')
    const localSkillsDir = resolve(cwd(), '.claude', 'skills')

    return [globalSkillsDir, localSkillsDir]
  }

  /**
   * Scan directory for SKILL.md files
   *
   * Recursively scans a directory for SKILL.md files and parses them.
   * Skips invalid files and continues scanning on errors.
   *
   * Directory structure expected:
   * ```
   * skills/
   * ├── git-commit/
   * │   └── SKILL.md
   * ├── code-review/
   * │   └── SKILL.md
   * └── custom-skill/
   *     └── SKILL.md
   * ```
   *
   * @param dir - Directory path to scan (absolute or relative)
   * @returns Array of successfully parsed skills
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const skills = await discovery.scanDirectory('~/.claude/skills')
   *
   * skills.forEach(skill => {
   *   console.log(`Found: ${skill.metadata.name}`)
   * })
   * ```
   */
  async scanDirectory(dir: string): Promise<SkillMdFile[]> {
    const skills: SkillMdFile[] = []
    const resolvedDir = resolve(dir)

    try {
      // Check if directory exists
      const dirStat = await stat(resolvedDir)
      if (!dirStat.isDirectory()) {
        return skills
      }

      // Read directory contents
      const entries = await readdir(resolvedDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(resolvedDir, entry.name)

        if (entry.isDirectory()) {
          // Look for SKILL.md in subdirectory
          const skillPath = join(fullPath, 'SKILL.md')

          try {
            await stat(skillPath)
            // SKILL.md exists, try to parse it
            const skill = await parseSkillMdFile(skillPath)
            skills.push(skill)
          }
          catch {
            // SKILL.md doesn't exist or failed to parse, skip
            continue
          }
        }
        else if (entry.name === 'SKILL.md') {
          // Found SKILL.md in root directory
          try {
            const skill = await parseSkillMdFile(fullPath)
            skills.push(skill)
          }
          catch {
            // Failed to parse, skip
            continue
          }
        }
      }
    }
    catch {
      // Directory doesn't exist or can't be read, return empty array
      return skills
    }

    return skills
  }

  /**
   * Scan all default directories for skills
   *
   * Convenience method that scans all default skill directories
   * and returns a combined array of all discovered skills.
   *
   * @returns Array of all discovered skills from default directories
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const allSkills = await discovery.scanDefaultDirs()
   *
   * console.log(`Found ${allSkills.length} skills`)
   * allSkills.forEach(skill => {
   *   console.log(`- ${skill.metadata.name}: ${skill.metadata.description}`)
   * })
   * ```
   */
  async scanDefaultDirs(): Promise<SkillMdFile[]> {
    const dirs = this.getDefaultDirs()
    const allSkills: SkillMdFile[] = []

    for (const dir of dirs) {
      const skills = await this.scanDirectory(dir)
      allSkills.push(...skills)
    }

    return allSkills
  }

  /**
   * Scan multiple directories for skills
   *
   * Scans multiple directories and returns a combined array of all
   * discovered skills. Useful for custom directory configurations.
   *
   * @param dirs - Array of directory paths to scan
   * @returns Array of all discovered skills
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const skills = await discovery.scanDirectories([
   *   '~/.claude/skills',
   *   './custom-skills',
   *   '/shared/team-skills'
   * ])
   * ```
   */
  async scanDirectories(dirs: string[]): Promise<SkillMdFile[]> {
    const allSkills: SkillMdFile[] = []

    for (const dir of dirs) {
      const skills = await this.scanDirectory(dir)
      allSkills.push(...skills)
    }

    return allSkills
  }

  /**
   * Validate a SKILL.md file
   *
   * Parses and validates a SKILL.md file, returning detailed
   * validation results including errors and warnings.
   *
   * @param filePath - Path to SKILL.md file
   * @returns Validation result with file path
   * @throws Error if file cannot be read or parsed
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const result = await discovery.validateSkillFile('/path/to/SKILL.md')
   *
   * if (!result.valid) {
   *   console.error('Validation errors:')
   *   result.errors.forEach(err => {
   *     console.error(`- ${err.field}: ${err.message}`)
   *   })
   * }
   *
   * if (result.warnings.length > 0) {
   *   console.warn('Validation warnings:')
   *   result.warnings.forEach(warn => {
   *     console.warn(`- ${warn.field}: ${warn.message}`)
   *   })
   * }
   * ```
   */
  async validateSkillFile(filePath: string): Promise<SkillValidationResultWithPath> {
    const skill = await parseSkillMdFile(filePath)
    const validation = validateSkillMd(skill)

    return {
      ...validation,
      filePath,
    }
  }

  /**
   * Find skill by name
   *
   * Searches default directories for a skill with the given name.
   * Returns the first match found.
   *
   * @param name - Skill name to search for
   * @returns Found skill or null if not found
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const skill = await discovery.findSkillByName('git-commit')
   *
   * if (skill) {
   *   console.log(`Found: ${skill.metadata.description}`)
   * } else {
   *   console.log('Skill not found')
   * }
   * ```
   */
  async findSkillByName(name: string): Promise<SkillMdFile | null> {
    const skills = await this.scanDefaultDirs()
    return skills.find(skill => skill.metadata.name === name) || null
  }

  /**
   * Find skills by trigger
   *
   * Searches default directories for skills that have the given trigger.
   * Returns all matching skills.
   *
   * @param trigger - Trigger to search for (e.g., '/commit')
   * @returns Array of skills with matching trigger
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const skills = await discovery.findSkillsByTrigger('/commit')
   *
   * skills.forEach(skill => {
   *   console.log(`${skill.metadata.name} has trigger /commit`)
   * })
   * ```
   */
  async findSkillsByTrigger(trigger: string): Promise<SkillMdFile[]> {
    const skills = await this.scanDefaultDirs()
    return skills.filter(skill => skill.metadata.triggers.includes(trigger))
  }

  /**
   * Find skills by category
   *
   * Searches default directories for skills in the given category.
   * Returns all matching skills.
   *
   * @param category - Category to search for (e.g., 'git', 'dev')
   * @returns Array of skills in the category
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const gitSkills = await discovery.findSkillsByCategory('git')
   *
   * console.log(`Found ${gitSkills.length} git skills`)
   * ```
   */
  async findSkillsByCategory(category: string): Promise<SkillMdFile[]> {
    const skills = await this.scanDefaultDirs()
    return skills.filter(skill => skill.metadata.category === category)
  }

  /**
   * Get skill statistics
   *
   * Returns aggregate statistics about discovered skills.
   *
   * @returns Skill statistics
   *
   * @example
   * ```typescript
   * const discovery = new SkillDiscovery()
   * const stats = await discovery.getStats()
   *
   * console.log(`Total skills: ${stats.totalSkills}`)
   * console.log(`Categories: ${stats.categories.join(', ')}`)
   * console.log(`Total triggers: ${stats.totalTriggers}`)
   * ```
   */
  async getStats(): Promise<{
    totalSkills: number
    categories: string[]
    totalTriggers: number
    autoActivateCount: number
  }> {
    const skills = await this.scanDefaultDirs()

    const categories = new Set(skills.map(skill => skill.metadata.category))
    const totalTriggers = skills.reduce((sum, skill) => sum + skill.metadata.triggers.length, 0)
    const autoActivateCount = skills.filter(skill => skill.metadata.auto_activate).length

    return {
      totalSkills: skills.length,
      categories: Array.from(categories),
      totalTriggers,
      autoActivateCount,
    }
  }
}
