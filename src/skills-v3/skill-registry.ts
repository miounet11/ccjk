/**
 * CCJK Skills V3 - Unified Skill Registry
 *
 * Manages skill registration, lookup, conflict detection, and dependency resolution.
 * Provides a single source of truth for all skills in the system.
 *
 * @module skills-v3/skill-registry
 */

import type {
  DependencyResolution,
  RegistryLookupOptions,
  RegistryStats,
  SkillCategory,
  SkillConflict,
  SkillRegistryEntry,
  SkillSource,
  SkillV3,
} from './types'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { SkillError, SkillErrorType } from './types'

// ============================================================================
// Constants
// ============================================================================

/** Token estimation: ~4 characters per token */
const CHARS_PER_TOKEN = 4

// ============================================================================
// Skill Registry Class
// ============================================================================

/**
 * Unified Skill Registry
 *
 * Central registry for all skills with support for:
 * - Registration and lookup by ID, trigger, or criteria
 * - Conflict detection (duplicate IDs, overlapping triggers)
 * - Dependency resolution with topological sorting
 * - Event emission for registry changes
 */
export class SkillRegistry extends EventEmitter {
  /** Skills indexed by ID */
  private skills: Map<string, SkillRegistryEntry> = new Map()

  /** File path to skill ID index */
  private filePathIndex: Map<string, string> = new Map()

  /** Trigger to skill IDs index */
  private triggerIndex: Map<string, Set<string>> = new Map()

  /** Category to skill IDs index */
  private categoryIndex: Map<SkillCategory, Set<string>> = new Map()

  constructor() {
    super()
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a skill
   */
  register(
    skill: SkillV3,
    filePath: string,
    source: SkillSource = 'user',
  ): SkillRegistryEntry {
    const existing = this.skills.get(skill.id)

    // Check for conflicts
    const conflicts = this.detectConflicts(skill, existing?.skill)
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        this.emit('conflict:detected', conflict)
      }
    }

    // Create entry
    const entry: SkillRegistryEntry = {
      skill,
      filePath,
      enabled: existing?.enabled ?? true,
      source,
      originalVersion: existing?.originalVersion,
      registeredAt: existing?.registeredAt ?? Date.now(),
      modifiedAt: Date.now(),
      estimatedTokens: this.estimateTokens(skill),
      dependents: existing?.dependents ?? new Set(),
      checksum: this.computeChecksum(skill),
    }

    // Update indexes
    this.skills.set(skill.id, entry)
    this.filePathIndex.set(filePath, skill.id)
    this.updateTriggerIndex(skill.id, skill.triggers)
    this.updateCategoryIndex(skill.id, skill.metadata.category)
    this.updateDependencyGraph(skill.id, skill.dependencies || [])

    // Emit event
    if (existing) {
      this.emit('skill:updated', existing, entry)
    }
    else {
      this.emit('skill:registered', entry)
    }

    return entry
  }

  /**
   * Unregister a skill by ID
   */
  unregister(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry)
      return false

    // Check for dependents
    if (entry.dependents.size > 0) {
      throw new SkillError(
        SkillErrorType.DEPENDENCY_ERROR,
        `Cannot unregister skill "${id}": depended upon by: ${Array.from(entry.dependents).join(', ')}`,
        { skillId: id, dependents: Array.from(entry.dependents) },
      )
    }

    // Remove from indexes
    this.skills.delete(id)
    this.filePathIndex.delete(entry.filePath)
    this.removeTriggerIndex(id, entry.skill.triggers)
    this.removeCategoryIndex(id, entry.skill.metadata.category)
    this.removeDependencyGraph(id, entry.skill.dependencies || [])

    // Emit event
    this.emit('skill:unregistered', entry)

    return true
  }

  /**
   * Unregister a skill by file path
   */
  unregisterByPath(filePath: string): boolean {
    const id = this.filePathIndex.get(filePath)
    if (!id)
      return false
    return this.unregister(id)
  }

  // ==========================================================================
  // Lookup
  // ==========================================================================

  /**
   * Get a skill by ID
   */
  getById(id: string): SkillRegistryEntry | undefined {
    return this.skills.get(id)
  }

  /**
   * Get a skill by file path
   */
  getByPath(filePath: string): SkillRegistryEntry | undefined {
    const id = this.filePathIndex.get(filePath)
    return id ? this.skills.get(id) : undefined
  }

  /**
   * Get skills by trigger
   */
  getByTrigger(trigger: string): SkillRegistryEntry[] {
    const ids = this.triggerIndex.get(trigger)
    if (!ids)
      return []

    return Array.from(ids)
      .map(id => this.skills.get(id))
      .filter((e): e is SkillRegistryEntry => e !== undefined && e.enabled)
      .sort((a, b) => (b.skill.metadata.priority || 5) - (a.skill.metadata.priority || 5))
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): SkillRegistryEntry[] {
    const ids = this.categoryIndex.get(category)
    if (!ids)
      return []

    return Array.from(ids)
      .map(id => this.skills.get(id))
      .filter((e): e is SkillRegistryEntry => e !== undefined)
  }

  /**
   * Lookup skills with filters
   */
  lookup(options: RegistryLookupOptions = {}): SkillRegistryEntry[] {
    let results = Array.from(this.skills.values())

    // Apply filters
    if (options.enabled !== undefined) {
      results = results.filter(e => e.enabled === options.enabled)
    }

    if (options.category) {
      results = results.filter(e => e.skill.metadata.category === options.category)
    }

    if (options.source) {
      results = results.filter(e => e.source === options.source)
    }

    if (options.userInvocable !== undefined) {
      results = results.filter(e =>
        (e.skill.metadata.userInvocable ?? true) === options.userInvocable,
      )
    }

    if (options.autoActivate !== undefined) {
      results = results.filter(e =>
        (e.skill.metadata.autoActivate ?? false) === options.autoActivate,
      )
    }

    if (options.agent) {
      results = results.filter(e =>
        e.skill.config?.agents?.includes(options.agent!),
      )
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(e =>
        options.tags!.some(tag => e.skill.metadata.tags.includes(tag)),
      )
    }

    if (options.search) {
      const query = options.search.toLowerCase()
      results = results.filter((e) => {
        const nameEn = e.skill.metadata.name.en.toLowerCase()
        const nameZh = e.skill.metadata.name['zh-CN'].toLowerCase()
        const descEn = e.skill.metadata.description.en.toLowerCase()
        const descZh = e.skill.metadata.description['zh-CN'].toLowerCase()

        return e.skill.id.toLowerCase().includes(query)
          || nameEn.includes(query)
          || nameZh.includes(query)
          || descEn.includes(query)
          || descZh.includes(query)
          || e.skill.triggers.some(t => t.toLowerCase().includes(query))
          || e.skill.metadata.tags.some(t => t.toLowerCase().includes(query))
      })
    }

    // Apply sorting
    if (options.sortBy) {
      const dir = options.sortDir === 'desc' ? -1 : 1
      results.sort((a, b) => {
        switch (options.sortBy) {
          case 'name':
            return a.skill.id.localeCompare(b.skill.id) * dir
          case 'priority':
            return ((a.skill.metadata.priority ?? 5) - (b.skill.metadata.priority ?? 5)) * dir
          case 'registeredAt':
            return (a.registeredAt - b.registeredAt) * dir
          case 'modifiedAt':
            return (a.modifiedAt - b.modifiedAt) * dir
          default:
            return 0
        }
      })
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  /**
   * Search skills by query
   */
  search(query: string, limit?: number): SkillRegistryEntry[] {
    return this.lookup({ search: query, enabled: true, limit })
  }

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  /**
   * Enable a skill
   */
  enable(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry || entry.enabled)
      return false

    entry.enabled = true
    this.emit('skill:enabled', entry)
    return true
  }

  /**
   * Disable a skill
   */
  disable(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry || !entry.enabled)
      return false

    entry.enabled = false
    this.emit('skill:disabled', entry)
    return true
  }

  /**
   * Toggle skill enabled state
   */
  toggle(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry)
      return false

    entry.enabled = !entry.enabled
    this.emit(entry.enabled ? 'skill:enabled' : 'skill:disabled', entry)
    return entry.enabled
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Detect conflicts for a skill
   */
  detectConflicts(skill: SkillV3, _existingSkill?: SkillV3): SkillConflict[] {
    const conflicts: SkillConflict[] = []

    // Check for trigger conflicts
    for (const trigger of skill.triggers) {
      const existingIds = this.triggerIndex.get(trigger)
      if (existingIds) {
        const conflictingIds = Array.from(existingIds).filter(id => id !== skill.id)
        if (conflictingIds.length > 0) {
          conflicts.push({
            type: 'trigger',
            skillIds: [skill.id, ...conflictingIds],
            details: `Trigger "${trigger}" is already used by: ${conflictingIds.join(', ')}`,
            suggestion: 'Consider using a unique trigger or adjusting priority',
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Get all conflicts in the registry
   */
  getAllConflicts(): SkillConflict[] {
    const conflicts: SkillConflict[] = []

    // Check trigger conflicts
    for (const [trigger, ids] of this.triggerIndex) {
      if (ids.size > 1) {
        conflicts.push({
          type: 'trigger',
          skillIds: Array.from(ids),
          details: `Trigger "${trigger}" is used by multiple skills`,
          suggestion: 'Adjust priorities or use unique triggers',
        })
      }
    }

    return conflicts
  }

  // ==========================================================================
  // Dependency Resolution
  // ==========================================================================

  /**
   * Resolve dependencies for all skills
   */
  resolveDependencies(): DependencyResolution {
    const missing: Array<{ skillId: string, missingDeps: string[] }> = []
    const circular: string[][] = []

    // Check for missing dependencies
    for (const [id, entry] of this.skills) {
      const deps = entry.skill.dependencies || []
      const missingDeps = deps.filter(dep => !this.skills.has(dep))
      if (missingDeps.length > 0) {
        missing.push({ skillId: id, missingDeps })
        this.emit('dependency:error', id, missingDeps)
      }
    }

    // Topological sort
    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (id: string, path: string[] = []): boolean => {
      if (visiting.has(id)) {
        // Circular dependency detected
        const cycleStart = path.indexOf(id)
        circular.push(path.slice(cycleStart))
        return false
      }

      if (visited.has(id))
        return true

      visiting.add(id)
      const entry = this.skills.get(id)

      if (entry) {
        for (const dep of entry.skill.dependencies || []) {
          if (this.skills.has(dep)) {
            if (!visit(dep, [...path, id])) {
              visiting.delete(id)
              return false
            }
          }
        }
      }

      visiting.delete(id)
      visited.add(id)
      order.push(id)
      return true
    }

    for (const id of this.skills.keys()) {
      visit(id)
    }

    return {
      success: missing.length === 0 && circular.length === 0,
      order,
      missing,
      circular,
    }
  }

  /**
   * Get dependencies for a skill
   */
  getDependencies(id: string): string[] {
    return this.skills.get(id)?.skill.dependencies || []
  }

  /**
   * Get dependents for a skill
   */
  getDependents(id: string): string[] {
    return Array.from(this.skills.get(id)?.dependents || [])
  }

  /**
   * Get missing dependencies for a skill
   */
  getMissingDependencies(id: string): string[] {
    const deps = this.getDependencies(id)
    return deps.filter(dep => !this.skills.has(dep))
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const all = Array.from(this.skills.values())
    const enabled = all.filter(e => e.enabled)

    const byCategory: Record<SkillCategory, number> = {
      dev: 0,
      git: 0,
      review: 0,
      testing: 0,
      docs: 0,
      devops: 0,
      planning: 0,
      debugging: 0,
      seo: 0,
      custom: 0,
    }

    const bySource: Record<SkillSource, number> = {
      builtin: 0,
      user: 0,
      marketplace: 0,
      migrated: 0,
    }

    let totalTokens = 0
    let lastRegistered = 0
    let lastModified = 0
    let lastRegisteredId: string | undefined
    let lastModifiedId: string | undefined

    for (const entry of all) {
      byCategory[entry.skill.metadata.category]++
      bySource[entry.source]++
      totalTokens += entry.estimatedTokens

      if (entry.registeredAt > lastRegistered) {
        lastRegistered = entry.registeredAt
        lastRegisteredId = entry.skill.id
      }
      if (entry.modifiedAt > lastModified) {
        lastModified = entry.modifiedAt
        lastModifiedId = entry.skill.id
      }
    }

    return {
      totalSkills: all.length,
      enabledSkills: enabled.length,
      disabledSkills: all.length - enabled.length,
      byCategory,
      bySource,
      totalTokens,
      lastRegistered: lastRegisteredId,
      lastModified: lastModifiedId,
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if a skill exists
   */
  has(id: string): boolean {
    return this.skills.has(id)
  }

  /**
   * Check if a skill is enabled
   */
  isEnabled(id: string): boolean {
    return this.skills.get(id)?.enabled ?? false
  }

  /**
   * Get all skill IDs
   */
  getIds(): string[] {
    return Array.from(this.skills.keys())
  }

  /**
   * Get all entries
   */
  getAll(): SkillRegistryEntry[] {
    return Array.from(this.skills.values())
  }

  /**
   * Get enabled entries
   */
  getEnabled(): SkillRegistryEntry[] {
    return this.lookup({ enabled: true })
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.skills.size
  }

  /**
   * Clear all skills
   */
  clear(): void {
    this.skills.clear()
    this.filePathIndex.clear()
    this.triggerIndex.clear()
    this.categoryIndex.clear()
    this.emit('registry:cleared')
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Update trigger index
   */
  private updateTriggerIndex(id: string, triggers: string[]): void {
    // Remove old triggers
    this.removeTriggerIndex(id, [])

    // Add new triggers
    for (const trigger of triggers) {
      if (!this.triggerIndex.has(trigger)) {
        this.triggerIndex.set(trigger, new Set())
      }
      this.triggerIndex.get(trigger)!.add(id)
    }
  }

  /**
   * Remove from trigger index
   */
  private removeTriggerIndex(id: string, _triggers: string[]): void {
    for (const [trigger, ids] of this.triggerIndex) {
      ids.delete(id)
      if (ids.size === 0) {
        this.triggerIndex.delete(trigger)
      }
    }
  }

  /**
   * Update category index
   */
  private updateCategoryIndex(id: string, category: SkillCategory): void {
    // Remove from old categories
    for (const [cat, ids] of this.categoryIndex) {
      ids.delete(id)
      if (ids.size === 0) {
        this.categoryIndex.delete(cat)
      }
    }

    // Add to new category
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, new Set())
    }
    this.categoryIndex.get(category)!.add(id)
  }

  /**
   * Remove from category index
   */
  private removeCategoryIndex(id: string, category: SkillCategory): void {
    const ids = this.categoryIndex.get(category)
    if (ids) {
      ids.delete(id)
      if (ids.size === 0) {
        this.categoryIndex.delete(category)
      }
    }
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(id: string, dependencies: string[]): void {
    // Remove old dependency relationships
    for (const entry of this.skills.values()) {
      entry.dependents.delete(id)
    }

    // Add new dependency relationships
    for (const dep of dependencies) {
      const depEntry = this.skills.get(dep)
      if (depEntry) {
        depEntry.dependents.add(id)
      }
    }
  }

  /**
   * Remove from dependency graph
   */
  private removeDependencyGraph(id: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      const depEntry = this.skills.get(dep)
      if (depEntry) {
        depEntry.dependents.delete(id)
      }
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokens(skill: SkillV3): number {
    let totalChars = skill.template.length
    totalChars += skill.id.length
    totalChars += JSON.stringify(skill.metadata).length
    totalChars += skill.triggers.join(',').length

    if (skill.config) {
      totalChars += JSON.stringify(skill.config).length
    }

    return Math.ceil(totalChars / CHARS_PER_TOKEN)
  }

  /**
   * Compute checksum for change detection
   */
  private computeChecksum(skill: SkillV3): string {
    const content = JSON.stringify({
      id: skill.id,
      version: skill.version,
      metadata: skill.metadata,
      triggers: skill.triggers,
      template: skill.template,
      config: skill.config,
      dependencies: skill.dependencies,
    })

    return createHash('md5').update(content).digest('hex')
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let registryInstance: SkillRegistry | null = null

/**
 * Get singleton registry instance
 */
export function getSkillRegistry(): SkillRegistry {
  if (!registryInstance) {
    registryInstance = new SkillRegistry()
  }
  return registryInstance
}

/**
 * Reset registry instance (for testing)
 */
export function resetSkillRegistry(): void {
  registryInstance?.clear()
  registryInstance?.removeAllListeners()
  registryInstance = null
}

/**
 * Register a skill
 */
export function registerSkill(
  skill: SkillV3,
  filePath: string,
  source?: SkillSource,
): SkillRegistryEntry {
  return getSkillRegistry().register(skill, filePath, source)
}

/**
 * Lookup skills
 */
export function lookupSkills(options?: RegistryLookupOptions): SkillRegistryEntry[] {
  return getSkillRegistry().lookup(options)
}

/**
 * Get skill by ID
 */
export function getSkillById(id: string): SkillRegistryEntry | undefined {
  return getSkillRegistry().getById(id)
}

/**
 * Get skills by trigger
 */
export function getSkillsByTrigger(trigger: string): SkillRegistryEntry[] {
  return getSkillRegistry().getByTrigger(trigger)
}
