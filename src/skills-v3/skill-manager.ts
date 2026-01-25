/**
 * CCJK Skills V3 - Unified Skill Manager
 *
 * Main entry point for the Skills V3 system. Coordinates parser,
 * registry, loader, migrator, and hot-reload components.
 *
 * @module skills-v3/skill-manager
 */

import type {
  DependencyResolution,
  HotReloadEvents,
  LocalizedString,
  LoaderOptions,
  ParseResult,
  ParserOptions,
  RegistryEvents,
  RegistryLookupOptions,
  RegistryStats,
  SkillCategory,
  SkillConflict,
  SkillRegistryEntry,
  SkillSource,
  SkillV3,
  SkillV3Input,
} from './types'
import { HotReloadManager } from './hot-reload'
import { SkillLoader } from './skill-loader'
import { getSkillMigrator } from './migrator'
import { SkillParser } from './parser'
import { getSkillRegistry, SkillRegistry } from './skill-registry'

// ============================================================================
// Skill Manager Class
// ============================================================================

/**
 * Unified Skill Manager
 *
 * Main coordinator for all skill operations:
 * - Loading and parsing skills
 * - Registration and lookup
 * - Hot-reload management
 * - Migration from V1/V2
 * - Conflict detection and resolution
 */
export class SkillManager {
  private registry: SkillRegistry
  private parser: SkillParser
  private loader: SkillLoader
  private hotReload: HotReloadManager

  constructor() {
    this.registry = getSkillRegistry()
    this.parser = new SkillParser()
    this.loader = new SkillLoader()
    this.hotReload = new HotReloadManager()
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a skill
   */
  register(skill: SkillV3, filePath: string, source: SkillSource = 'user'): SkillRegistryEntry {
    return this.registry.register(skill, filePath, source)
  }

  /**
   * Register multiple skills
   */
  registerBatch(skills: Array<{ skill: SkillV3, filePath: string, source?: SkillSource }>): SkillRegistryEntry[] {
    return skills.map(({ skill, filePath, source }) =>
      this.registry.register(skill, filePath, source || 'user'),
    )
  }

  /**
   * Unregister a skill
   */
  unregister(id: string): boolean {
    return this.registry.unregister(id)
  }

  /**
   * Unregister multiple skills
   */
  unregisterBatch(ids: string[]): { success: string[], failed: Array<{ id: string, error: string }> } {
    const success: string[] = []
    const failed: Array<{ id: string, error: string }> = []

    for (const id of ids) {
      try {
        if (this.unregister(id)) {
          success.push(id)
        }
        else {
          failed.push({ id, error: 'Skill not found' })
        }
      }
      catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed }
  }

  // ==========================================================================
  // Lookup
  // ==========================================================================

  /**
   * Get a skill by ID
   */
  get(id: string): SkillRegistryEntry | undefined {
    return this.registry.getById(id)
  }

  /**
   * Get multiple skills by IDs
   */
  getBatch(ids: string[]): Map<string, SkillRegistryEntry> {
    const result = new Map<string, SkillRegistryEntry>()
    for (const id of ids) {
      const entry = this.registry.getById(id)
      if (entry) {
        result.set(id, entry)
      }
    }
    return result
  }

  /**
   * Get skills by trigger
   */
  getByTrigger(trigger: string): SkillRegistryEntry[] {
    return this.registry.getByTrigger(trigger)
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): SkillRegistryEntry[] {
    return this.registry.getByCategory(category)
  }

  /**
   * Lookup skills with filters
   */
  lookup(options: RegistryLookupOptions): SkillRegistryEntry[] {
    return this.registry.lookup(options)
  }

  /**
   * Search skills by query
   */
  search(query: string, options?: Partial<RegistryLookupOptions>): SkillRegistryEntry[] {
    return this.registry.lookup({ ...options, search: query })
  }

  /**
   * List all skills
   */
  list(): SkillRegistryEntry[] {
    return this.registry.getAll()
  }

  /**
   * List enabled skills
   */
  listEnabled(): SkillRegistryEntry[] {
    return this.registry.getEnabled()
  }

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  /**
   * Enable a skill
   */
  enable(id: string): boolean {
    return this.registry.enable(id)
  }

  /**
   * Disable a skill
   */
  disable(id: string): boolean {
    return this.registry.disable(id)
  }

  /**
   * Toggle a skill
   */
  toggle(id: string): boolean {
    return this.registry.toggle(id)
  }

  /**
   * Enable multiple skills
   */
  enableBatch(ids: string[]): { success: string[], failed: string[] } {
    const success: string[] = []
    const failed: string[] = []

    for (const id of ids) {
      if (this.enable(id)) {
        success.push(id)
      }
      else {
        failed.push(id)
      }
    }

    return { success, failed }
  }

  /**
   * Disable multiple skills
   */
  disableBatch(ids: string[]): { success: string[], failed: string[] } {
    const success: string[] = []
    const failed: string[] = []

    for (const id of ids) {
      if (this.disable(id)) {
        success.push(id)
      }
      else {
        failed.push(id)
      }
    }

    return { success, failed }
  }

  // ==========================================================================
  // Loading
  // ==========================================================================

  /**
   * Load all skills
   */
  async loadAll(options?: Partial<LoaderOptions>): Promise<{
    skills: SkillV3[]
    registered: number
    errors: string[]
  }> {
    const result = await this.loader.loadAll()
    const registered: string[] = []
    const errors: string[] = []

    for (const skill of result.skills) {
      try {
        const source = this.determineSource(skill.id)
        this.registry.register(skill, skill.id, source)
        registered.push(skill.id)
      }
      catch (error) {
        errors.push(`${skill.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return {
      skills: result.skills,
      registered: registered.length,
      errors: [...errors, ...result.errors.map(e => e.error)],
    }
  }

  /**
   * Load skills from directory
   */
  async loadFromDirectory(dirPath: string, options?: Partial<LoaderOptions>): Promise<{
    skills: SkillV3[]
    registered: number
    errors: string[]
  }> {
    const loader = new SkillLoader({ ...options, directories: [dirPath] })
    const result = await loader.loadAll()
    const registered: string[] = []
    const errors: string[] = []

    for (const skill of result.skills) {
      try {
        const source = this.determineSource(skill.id)
        this.registry.register(skill, skill.id, source)
        registered.push(skill.id)
      }
      catch (error) {
        errors.push(`${skill.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return {
      skills: result.skills,
      registered: registered.length,
      errors: [...errors, ...result.errors.map(e => e.error)],
    }
  }

  // ==========================================================================
  // Parsing
  // ==========================================================================

  /**
   * Parse a skill file
   */
  parseFile(filePath: string, options?: Partial<ParserOptions>): ParseResult {
    const parser = options ? new SkillParser(options) : this.parser
    return parser.parseFile(filePath)
  }

  /**
   * Parse skill content
   */
  parseContent(content: string, filePath?: string, options?: Partial<ParserOptions>): ParseResult {
    const parser = options ? new SkillParser(options) : this.parser
    return parser.parseContent(content, filePath)
  }

  // ==========================================================================
  // Migration
  // ==========================================================================

  /**
   * Migrate a skill file
   */
  async migrateFile(filePath: string) {
    return getSkillMigrator().migrateFile(filePath)
  }

  /**
   * Migrate a directory
   */
  async migrateDirectory(dirPath: string, options?: {
    outputDir?: string
    createBackups?: boolean
  }) {
    return getSkillMigrator().migrateDirectory(dirPath, options)
  }

  // ==========================================================================
  // Hot Reload
  // ==========================================================================

  /**
   * Start hot reload
   */
  async startHotReload(): Promise<void> {
    await this.hotReload.start()
  }

  /**
   * Stop hot reload
   */
  async stopHotReload(): Promise<void> {
    await this.hotReload.stop()
  }

  /**
   * Get hot reload stats
   */
  getHotReloadStats() {
    return this.hotReload.getStats()
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Detect conflicts for a skill
   */
  detectConflicts(skill: SkillV3, existingSkill?: SkillV3): SkillConflict[] {
    return this.registry.detectConflicts(skill, existingSkill)
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): SkillConflict[] {
    return this.registry.getAllConflicts()
  }

  // ==========================================================================
  // Dependencies
  // ==========================================================================

  /**
   * Resolve all dependencies
   */
  resolveDependencies(): DependencyResolution {
    return this.registry.resolveDependencies()
  }

  /**
   * Get dependencies for a skill
   */
  getDependencies(id: string): string[] {
    return this.registry.getDependencies(id)
  }

  /**
   * Get dependents for a skill
   */
  getDependents(id: string): string[] {
    return this.registry.getDependents(id)
  }

  /**
   * Get missing dependencies for a skill
   */
  getMissingDependencies(id: string): string[] {
    return this.registry.getMissingDependencies(id)
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    return this.registry.getStats()
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.registry.size()
  }

  /**
   * Check if skill exists
   */
  has(id: string): boolean {
    return this.registry.has(id)
  }

  /**
   * Check if skill is enabled
   */
  isEnabled(id: string): boolean {
    return this.registry.isEnabled(id)
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clear all skills
   */
  clear(): void {
    this.registry.clear()
  }

  /**
   * Get all skill IDs
   */
  getIds(): string[] {
    return this.registry.getIds()
  }

  /**
   * Export skills
   */
  export(skillIds?: string[]): {
    version: string
    exportedAt: string
    skills: SkillV3[]
  } {
    const skills = skillIds
      ? skillIds.map(id => this.registry.getById(id)?.skill).filter(Boolean) as SkillV3[]
      : this.registry.getAll().map(e => e.skill)

    return {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      skills,
    }
  }

  /**
   * Import skills
   */
  import(data: {
    version: string
    skills: SkillV3[]
  }): {
    imported: string[]
    failed: Array<{ id: string, error: string }>
  } {
    const imported: string[] = []
    const failed: Array<{ id: string, error: string }> = []

    for (const skill of data.skills) {
      try {
        this.register(skill, skill.id, 'user')
        imported.push(skill.id)
      }
      catch (error) {
        failed.push({
          id: skill.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { imported, failed }
  }

  /**
   * Determine skill source from ID
   */
  private determineSource(skillId: string): SkillSource {
    const builtinSkills = ['cloud-sync', 'browser', 'marketplace', 'workflow']
    if (builtinSkills.includes(skillId)) {
      return 'builtin'
    }
    return 'user'
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Register event listener
   */
  on<K extends keyof RegistryEvents>(
    event: K,
    listener: RegistryEvents[K],
  ): this {
    this.registry.on(event, listener)
    return this
  }

  /**
   * Remove event listener
   */
  off<K extends keyof RegistryEvents>(
    event: K,
    listener: RegistryEvents[K],
  ): this {
    this.registry.off(event, listener)
    return this
  }

  /**
   * Register hot reload event listener
   */
  onHotReload<K extends keyof HotReloadEvents>(
    event: K,
    listener: HotReloadEvents[K],
  ): this {
    this.hotReload.on(event, listener)
    return this
  }

  /**
   * Remove hot reload event listener
   */
  offHotReload<K extends keyof HotReloadEvents>(
    event: K,
    listener: HotReloadEvents[K],
  ): this {
    this.hotReload.off(event, listener)
    return this
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let managerInstance: SkillManager | null = null

/**
 * Get singleton skill manager instance
 */
export function getSkillManager(): SkillManager {
  if (!managerInstance) {
    managerInstance = new SkillManager()
  }
  return managerInstance
}

/**
 * Reset skill manager (for testing)
 */
export async function resetSkillManager(): Promise<void> {
  if (managerInstance) {
    await managerInstance.stopHotReload()
    managerInstance.clear()
    managerInstance = null
  }
  // Note: Registry cleanup is handled by the clear() call above
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Register a skill
 */
export function registerSkill(
  skill: SkillV3,
  filePath: string,
  source?: SkillSource,
): SkillRegistryEntry {
  return getSkillManager().register(skill, filePath, source)
}

/**
 * Get a skill by ID
 */
export function getSkill(id: string): SkillRegistryEntry | undefined {
  return getSkillManager().get(id)
}

/**
 * Search for skills
 */
export function searchSkills(
  query: string,
  options?: Partial<RegistryLookupOptions>,
): SkillRegistryEntry[] {
  return getSkillManager().search(query, options)
}

/**
 * List all skills
 */
export function listSkills(): SkillRegistryEntry[] {
  return getSkillManager().list()
}

/**
 * Enable a skill
 */
export function enableSkill(id: string): boolean {
  return getSkillManager().enable(id)
}

/**
 * Disable a skill
 */
export function disableSkill(id: string): boolean {
  return getSkillManager().disable(id)
}

/**
 * Load all skills
 */
export async function loadAllSkills(options?: Partial<LoaderOptions>) {
  return getSkillManager().loadAll(options)
}

/**
 * Get statistics
 */
export function getSkillStats(): RegistryStats {
  return getSkillManager().getStats()
}
