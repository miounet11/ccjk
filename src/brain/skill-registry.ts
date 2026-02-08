/**
 * Skill Registry - Hot-reload skill registration and lookup
 *
 * This module manages the in-memory registry of skills, supporting:
 * - Registration and lookup by ID
 * - Hot-swap (replace without restart)
 * - Dependency tracking
 * - Event emission for skill changes
 *
 * @module brain/skill-registry
 */

import type {
  SkillCategory,
  SkillMdFile,
  SkillMdMetadata,
} from '../types/skill-md'
import type { MessageType } from './types'
import { EventEmitter } from 'node:events'
import { getMessageBus } from './message-bus'

// ============================================================================
// Types
// ============================================================================

/**
 * Skill registry entry
 */
export interface SkillRegistryEntry {
  /** Unique skill identifier (from metadata.name) */
  id: string

  /** Skill metadata */
  metadata: SkillMdMetadata

  /** Skill content */
  content: string

  /** File path */
  filePath: string

  /** Whether skill is enabled */
  enabled: boolean

  /** Source type */
  source: 'builtin' | 'user' | 'marketplace'

  /** Timestamp when skill was registered */
  registeredAt: number

  /** Timestamp when skill was last modified */
  modifiedAt: number

  /** Estimated token count */
  estimatedTokens: number

  /** Dependencies (from metadata.agents or related_skills) */
  dependencies: string[]

  /** Dependent skills that depend on this skill */
  dependents: Set<string>
}

/**
 * Skill lookup options
 */
export interface SkillLookupOptions {
  /** Filter by enabled status */
  enabled?: boolean

  /** Filter by category */
  category?: SkillCategory

  /** Filter by source */
  source?: 'builtin' | 'user' | 'marketplace'

  /** Filter by user invocable */
  userInvocable?: boolean

  /** Filter by auto activate */
  autoActivate?: boolean

  /** Filter by agent */
  agent?: string

  /** Search in name, description, tags */
  search?: string

  /** Limit results */
  limit?: number

  /** Sort by field */
  sortBy?: 'name' | 'priority' | 'registeredAt' | 'modifiedAt'

  /** Sort direction */
  sortDir?: 'asc' | 'desc'
}

/**
 * Skill registry statistics
 */
export interface SkillRegistryStats {
  /** Total number of registered skills */
  totalSkills: number

  /** Number of enabled skills */
  enabledSkills: number

  /** Number of disabled skills */
  disabledSkills: number

  /** Skills by category */
  byCategory: Record<SkillCategory, number>

  /** Skills by source */
  bySource: Record<'builtin' | 'user' | 'marketplace', number>

  /** Total estimated tokens */
  totalTokens: number

  /** Most recently registered skill */
  lastRegistered?: string

  /** Most recently modified skill */
  lastModified?: string
}

/**
 * Skill registry events
 */
export interface SkillRegistryEvents {
  /** Emitted when a skill is registered */
  'skill:registered': (entry: SkillRegistryEntry) => void

  /** Emitted when a skill is updated (hot-swapped) */
  'skill:updated': (oldEntry: SkillRegistryEntry, newEntry: SkillRegistryEntry) => void

  /** Emitted when a skill is unregistered */
  'skill:unregistered': (entry: SkillRegistryEntry) => void

  /** Emitted when a skill is enabled */
  'skill:enabled': (entry: SkillRegistryEntry) => void

  /** Emitted when a skill is disabled */
  'skill:disabled': (entry: SkillRegistryEntry) => void

  /** Emitted when registry is cleared */
  'registry:cleared': () => void

  /** Emitted when a dependency error is detected */
  'dependency:error': (skillId: string, missingDeps: string[]) => void
}

// ============================================================================
// Skill Registry Class
// ============================================================================

/**
 * Skill Registry
 *
 * Manages hot-reloadable skill registration with dependency tracking.
 *
 * @example
 * ```typescript
 * const registry = new SkillRegistry()
 *
 * // Register a skill
 * registry.register(skillFile)
 *
 * // Lookup by ID
 * const skill = registry.getById('git-commit')
 *
 * // Search for skills
 * const gitSkills = registry.lookup({ category: 'git' })
 *
 * // Hot-swap a skill
 * registry.update(updatedSkillFile)
 * ```
 */
export class SkillRegistry extends EventEmitter {
  private skills: Map<string, SkillRegistryEntry>
  private filePathIndex: Map<string, string>
  private triggerIndex: Map<string, Set<string>>
  private messageBus = getMessageBus()

  constructor() {
    super()
    this.skills = new Map()
    this.filePathIndex = new Map()
    this.triggerIndex = new Map()
  }

  /**
   * Register a skill
   *
   * @param skill - Parsed skill file
   * @param source - Skill source type
   * @returns Registered entry
   */
  register(skill: SkillMdFile, source: 'builtin' | 'user' | 'marketplace' = 'user'): SkillRegistryEntry {
    const id = skill.metadata.name

    // Check for existing entry (hot-swap scenario)
    const existing = this.skills.get(id)

    // Extract dependencies
    const dependencies = this.extractDependencies(skill.metadata)

    // Create entry
    const entry: SkillRegistryEntry = {
      id,
      metadata: skill.metadata,
      content: skill.content,
      filePath: skill.filePath,
      enabled: existing?.enabled ?? true,
      source,
      registeredAt: existing?.registeredAt ?? Date.now(),
      modifiedAt: skill.modifiedAt?.getTime() ?? Date.now(),
      estimatedTokens: this.estimateTokens(skill),
      dependencies,
      dependents: existing?.dependents || new Set(),
    }

    // Update indexes
    this.skills.set(id, entry)
    this.filePathIndex.set(skill.filePath, id)

    // Update trigger index
    this.updateTriggerIndex(id, entry.metadata.triggers)

    // Update dependency graph
    this.updateDependencyGraph(id, dependencies)

    // Emit appropriate event
    if (existing) {
      this.emit('skill:updated', existing, entry)
      this.publishMessage('skill:updated' as MessageType, { oldSkill: existing, newSkill: entry })
    }
    else {
      this.emit('skill:registered', entry)
      this.publishMessage('skill:registered' as MessageType, entry)
    }

    return entry
  }

  /**
   * Unregister a skill by ID
   *
   * @param id - Skill ID
   * @returns True if skill was unregistered
   */
  unregister(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry)
      return false

    // Check for dependents
    if (entry.dependents.size > 0) {
      const dependentList = Array.from(entry.dependents).join(', ')
      throw new Error(`Cannot unregister skill "${id}": depended upon by: ${dependentList}`)
    }

    // Remove from indexes
    this.skills.delete(id)
    this.filePathIndex.delete(entry.filePath)

    // Remove from trigger index
    for (const trigger of entry.metadata.triggers) {
      const skills = this.triggerIndex.get(trigger)
      if (skills) {
        skills.delete(id)
        if (skills.size === 0)
          this.triggerIndex.delete(trigger)
      }
    }

    // Remove from dependency graph
    for (const dep of entry.dependencies) {
      const depEntry = this.skills.get(dep)
      if (depEntry)
        depEntry.dependents.delete(id)
    }

    // Emit event
    this.emit('skill:unregistered', entry)
    this.publishMessage('skill:unregistered' as MessageType, entry)

    return true
  }

  /**
   * Unregister a skill by file path
   *
   * @param filePath - File path
   * @returns True if skill was unregistered
   */
  unregisterByPath(filePath: string): boolean {
    const id = this.filePathIndex.get(filePath)
    return id ? this.unregister(id) : false
  }

  /**
   * Get a skill by ID
   *
   * @param id - Skill ID
   * @returns Skill entry or undefined
   */
  getById(id: string): SkillRegistryEntry | undefined {
    return this.skills.get(id)
  }

  /**
   * Get a skill by file path
   *
   * @param filePath - File path
   * @returns Skill entry or undefined
   */
  getByPath(filePath: string): SkillRegistryEntry | undefined {
    const id = this.filePathIndex.get(filePath)
    return id ? this.skills.get(id) : undefined
  }

  /**
   * Get skills by trigger
   *
   * @param trigger - Trigger string (e.g., '/commit')
   * @returns Array of matching skills
   */
  getByTrigger(trigger: string): SkillRegistryEntry[] {
    const ids = this.triggerIndex.get(trigger)
    if (!ids)
      return []

    return Array.from(ids)
      .map(id => this.skills.get(id))
      .filter((e): e is SkillRegistryEntry => e !== undefined && e.enabled)
  }

  /**
   * Lookup skills with filters
   *
   * @param options - Lookup options
   * @returns Array of matching skills
   */
  lookup(options: SkillLookupOptions = {}): SkillRegistryEntry[] {
    let results = Array.from(this.skills.values())

    // Apply filters
    if (options.enabled !== undefined) {
      results = results.filter(e => e.enabled === options.enabled)
    }

    if (options.category) {
      results = results.filter(e => e.metadata.category === options.category)
    }

    if (options.source) {
      results = results.filter(e => e.source === options.source)
    }

    if (options.userInvocable !== undefined) {
      results = results.filter(e =>
        (e.metadata.user_invocable ?? true) === options.userInvocable,
      )
    }

    if (options.autoActivate !== undefined) {
      results = results.filter(e =>
        (e.metadata.auto_activate ?? false) === options.autoActivate,
      )
    }

    if (options.agent) {
      results = results.filter(e =>
        e.metadata.agent === options.agent
        || e.metadata.agents?.includes(options.agent!),
      )
    }

    if (options.search) {
      const query = options.search.toLowerCase()
      results = results.filter(e =>
        e.id.toLowerCase().includes(query)
        || e.metadata.description.toLowerCase().includes(query)
        || e.metadata.tags?.some(t => t.toLowerCase().includes(query)),
      )
    }

    // Apply sorting
    if (options.sortBy) {
      const dir = options.sortDir === 'desc' ? -1 : 1
      results.sort((a, b) => {
        switch (options.sortBy) {
          case 'name':
            return a.id.localeCompare(b.id) * dir
          case 'priority':
            return ((a.metadata.priority ?? 5) - (b.metadata.priority ?? 5)) * dir
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
   * Enable a skill
   *
   * @param id - Skill ID
   * @returns True if enabled
   */
  enable(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry || entry.enabled)
      return false

    entry.enabled = true
    this.emit('skill:enabled', entry)
    this.publishMessage('skill:enabled' as MessageType, entry)
    return true
  }

  /**
   * Disable a skill
   *
   * @param id - Skill ID
   * @returns True if disabled
   */
  disable(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry || !entry.enabled)
      return false

    entry.enabled = false
    this.emit('skill:disabled', entry)
    this.publishMessage('skill:disabled' as MessageType, entry)
    return true
  }

  /**
   * Toggle skill enabled state
   *
   * @param id - Skill ID
   * @returns New enabled state
   */
  toggle(id: string): boolean {
    const entry = this.skills.get(id)
    if (!entry)
      return false

    entry.enabled = !entry.enabled
    const event = entry.enabled ? 'skill:enabled' : 'skill:disabled'
    this.emit(event, entry)
    this.publishMessage(event as MessageType, entry)
    return entry.enabled
  }

  /**
   * Check if a skill exists
   *
   * @param id - Skill ID
   * @returns True if skill exists
   */
  has(id: string): boolean {
    return this.skills.has(id)
  }

  /**
   * Check if a skill is enabled
   *
   * @param id - Skill ID
   * @returns True if enabled, false if disabled or not found
   */
  isEnabled(id: string): boolean {
    return this.skills.get(id)?.enabled ?? false
  }

  /**
   * Get all skill IDs
   *
   * @returns Array of skill IDs
   */
  getIds(): string[] {
    return Array.from(this.skills.keys())
  }

  /**
   * Get all entries
   *
   * @returns Array of all entries
   */
  getAll(): SkillRegistryEntry[] {
    return Array.from(this.skills.values())
  }

  /**
   * Get enabled entries
   *
   * @returns Array of enabled entries
   */
  getEnabled(): SkillRegistryEntry[] {
    return this.lookup({ enabled: true })
  }

  /**
   * Get registry statistics
   *
   * @returns Registry statistics
   */
  getStats(): SkillRegistryStats {
    const all = this.getAll()
    const enabled = this.getEnabled()
    const byCategory: Record<SkillCategory, number> = {
      dev: 0,
      git: 0,
      review: 0,
      testing: 0,
      docs: 0,
      devops: 0,
      planning: 0,
      debugging: 0,
      custom: 0,
    }
    const bySource = { builtin: 0, user: 0, marketplace: 0 }

    let totalTokens = 0
    let lastRegistered = 0
    let lastModified = 0

    for (const entry of all) {
      byCategory[entry.metadata.category]++
      bySource[entry.source]++
      totalTokens += entry.estimatedTokens

      if (entry.registeredAt > lastRegistered)
        lastRegistered = entry.registeredAt
      if (entry.modifiedAt > lastModified)
        lastModified = entry.modifiedAt
    }

    return {
      totalSkills: all.length,
      enabledSkills: enabled.length,
      disabledSkills: all.length - enabled.length,
      byCategory,
      bySource,
      totalTokens,
      lastRegistered: lastRegistered > 0 ? this.getById(this.getEntriesSortedBy('registeredAt')[0]?.id || '')?.id : undefined,
      lastModified: lastModified > 0 ? this.getById(this.getEntriesSortedBy('modifiedAt')[0]?.id || '')?.id : undefined,
    }
  }

  /**
   * Get dependent skills
   *
   * @param id - Skill ID
   * @returns Array of dependent skill IDs
   */
  getDependents(id: string): string[] {
    return Array.from(this.skills.get(id)?.dependents || [])
  }

  /**
   * Get skill dependencies
   *
   * @param id - Skill ID
   * @returns Array of dependency IDs
   */
  getDependencies(id: string): string[] {
    return this.skills.get(id)?.dependencies || []
  }

  /**
   * Check for missing dependencies
   *
   * @param id - Skill ID
   * @returns Array of missing dependency IDs
   */
  getMissingDependencies(id: string): string[] {
    const deps = this.getDependencies(id)
    return deps.filter(dep => !this.has(dep))
  }

  /**
   * Validate all dependencies
   *
   * @returns Map of skill ID to missing dependencies
   */
  validateDependencies(): Map<string, string[]> {
    const missing = new Map<string, string[]>()

    Array.from(this.skills.entries()).forEach(([id, entry]) => {
      const missingDeps = entry.dependencies.filter(dep => !this.has(dep))
      if (missingDeps.length > 0) {
        missing.set(id, missingDeps)
      }
    })

    return missing
  }

  /**
   * Clear all skills from registry
   */
  clear(): void {
    this.skills.clear()
    this.filePathIndex.clear()
    this.triggerIndex.clear()
    this.emit('registry:cleared')
    this.publishMessage('registry:cleared' as MessageType, {})
  }

  /**
   * Get the size of the registry
   *
   * @returns Number of registered skills
   */
  size(): number {
    return this.skills.size
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Extract dependencies from skill metadata
   */
  private extractDependencies(metadata: SkillMdMetadata): string[] {
    const deps: string[] = []

    // Agents are dependencies
    if (metadata.agents) {
      deps.push(...metadata.agents)
    }

    // Related skills may also be dependencies
    if (metadata.related_skills) {
      deps.push(...metadata.related_skills)
    }

    return deps
  }

  /**
   * Update trigger index
   */
  private updateTriggerIndex(id: string, triggers: string[]): void {
    // Remove old triggers for this skill
    Array.from(this.triggerIndex.entries()).forEach(([trigger, skillIds]) => {
      skillIds.delete(id)
      if (skillIds.size === 0)
        this.triggerIndex.delete(trigger)
    })

    // Add new triggers
    for (const trigger of triggers) {
      if (!this.triggerIndex.has(trigger)) {
        this.triggerIndex.set(trigger, new Set())
      }
      this.triggerIndex.get(trigger)!.add(id)
    }
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(id: string, dependencies: string[]): void {
    // Remove old dependency relationships
    Array.from(this.skills.entries()).forEach(([_depId, entry]) => {
      if (entry.dependencies.includes(id)) {
        entry.dependents.delete(id)
      }
    })

    // Add new dependency relationships
    for (const dep of dependencies) {
      const depEntry = this.skills.get(dep)
      if (depEntry) {
        depEntry.dependents.add(id)
      }
    }
  }

  /**
   * Estimate token count for a skill
   */
  private estimateTokens(skill: SkillMdFile): number {
    // Rough estimate: ~4 characters per token
    const contentTokens = Math.ceil(skill.content.length / 4)
    const metadataTokens = Math.ceil(JSON.stringify(skill.metadata).length / 4)
    return contentTokens + metadataTokens
  }

  /**
   * Get entries sorted by a field
   */
  private getEntriesSortedBy(field: 'registeredAt' | 'modifiedAt'): SkillRegistryEntry[] {
    return Array.from(this.skills.values())
      .sort((a, b) => b[field] - a[field])
  }

  /**
   * Publish message to event bus
   */
  private publishMessage(type: MessageType, payload: unknown): void {
    this.messageBus.publish(
      type,
      'coordinator',
      'all',
      `Skill registry event: ${type}`,
      payload,
      { priority: 'normal' },
    ).catch(console.error)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: SkillRegistry | null = null

/**
 * Get the singleton SkillRegistry instance
 */
export function getSkillRegistry(): SkillRegistry {
  if (!registryInstance) {
    registryInstance = new SkillRegistry()
  }
  return registryInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSkillRegistry(): void {
  registryInstance?.clear()
  registryInstance?.removeAllListeners()
  registryInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Register a skill
 *
 * @param skill - Parsed skill file
 * @param source - Skill source type
 * @returns Registered entry
 */
export function registerSkill(skill: SkillMdFile, source?: 'builtin' | 'user' | 'marketplace'): SkillRegistryEntry {
  return getSkillRegistry().register(skill, source)
}

/**
 * Lookup skills
 *
 * @param options - Lookup options
 * @returns Array of matching skills
 */
export function lookupSkills(options?: SkillLookupOptions): SkillRegistryEntry[] {
  return getSkillRegistry().lookup(options)
}

/**
 * Get a skill by ID
 *
 * @param id - Skill ID
 * @returns Skill entry or undefined
 */
export function getSkillById(id: string): SkillRegistryEntry | undefined {
  return getSkillRegistry().getById(id)
}

/**
 * Get skills by trigger
 *
 * @param trigger - Trigger string
 * @returns Array of matching skills
 */
export function getSkillsByTrigger(trigger: string): SkillRegistryEntry[] {
  return getSkillRegistry().getByTrigger(trigger)
}
