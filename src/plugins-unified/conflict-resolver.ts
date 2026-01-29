import type { UnifiedPlugin } from './types'

/**
 * Conflict types that can occur between plugins
 */
export enum ConflictType {
  /** Two plugins provide the same command */
  COMMAND = 'command',
  /** Two plugins provide the same skill */
  SKILL = 'skill',
  /** Two plugins provide the same feature */
  FEATURE = 'feature',
  /** Plugin dependencies conflict */
  DEPENDENCY = 'dependency',
}

/**
 * Represents a conflict between plugins
 */
export interface PluginConflict {
  /** Type of conflict */
  type: ConflictType
  /** The conflicting resource (command name, skill name, etc.) */
  resource: string
  /** Plugins involved in the conflict */
  plugins: UnifiedPlugin[]
  /** Severity of the conflict (1-10, 10 being most severe) */
  severity: number
  /** Suggested resolution */
  resolution?: string
}

/**
 * Resolution strategy for conflicts
 */
export enum ResolutionStrategy {
  /** Keep the first plugin, disable others */
  KEEP_FIRST = 'keep_first',
  /** Keep the last plugin, disable others */
  KEEP_LAST = 'keep_last',
  /** Keep the highest rated plugin */
  KEEP_HIGHEST_RATED = 'keep_highest_rated',
  /** Keep the most downloaded plugin */
  KEEP_MOST_POPULAR = 'keep_most_popular',
  /** Keep the official/verified plugin */
  KEEP_VERIFIED = 'keep_verified',
  /** Keep the plugin from preferred source */
  KEEP_PREFERRED_SOURCE = 'keep_preferred_source',
  /** Manual resolution required */
  MANUAL = 'manual',
}

/**
 * Result of conflict resolution
 */
export interface ResolutionResult {
  /** Whether resolution was successful */
  success: boolean
  /** Plugins to keep enabled */
  enabled: UnifiedPlugin[]
  /** Plugins to disable */
  disabled: UnifiedPlugin[]
  /** Conflicts that couldn't be resolved automatically */
  unresolved: PluginConflict[]
  /** Resolution actions taken */
  actions: string[]
}

/**
 * Conflict resolver for managing plugin conflicts
 */
export class ConflictResolver {
  /**
   * Detect conflicts between plugins
   */
  detectConflicts(plugins: UnifiedPlugin[]): PluginConflict[] {
    const conflicts: PluginConflict[] = []

    // Detect command conflicts
    conflicts.push(...this.detectCommandConflicts(plugins))

    // Detect skill conflicts
    conflicts.push(...this.detectSkillConflicts(plugins))

    // Detect feature conflicts
    conflicts.push(...this.detectFeatureConflicts(plugins))

    // Detect dependency conflicts
    conflicts.push(...this.detectDependencyConflicts(plugins))

    return conflicts
  }

  /**
   * Detect command conflicts
   */
  private detectCommandConflicts(plugins: UnifiedPlugin[]): PluginConflict[] {
    const conflicts: PluginConflict[] = []
    const commandMap = new Map<string, UnifiedPlugin[]>()

    // Build command map
    for (const plugin of plugins) {
      if (!plugin.enabled) continue

      for (const command of plugin.commands || []) {
        if (!commandMap.has(command)) {
          commandMap.set(command, [])
        }
        commandMap.get(command)!.push(plugin)
      }
    }

    // Find conflicts
    for (const [command, conflictingPlugins] of commandMap) {
      if (conflictingPlugins.length > 1) {
        conflicts.push({
          type: ConflictType.COMMAND,
          resource: command,
          plugins: conflictingPlugins,
          severity: 8,
          resolution: `Multiple plugins provide the command '${command}'. Only one can be active.`,
        })
      }
    }

    return conflicts
  }

  /**
   * Detect skill conflicts
   */
  private detectSkillConflicts(plugins: UnifiedPlugin[]): PluginConflict[] {
    const conflicts: PluginConflict[] = []
    const skillMap = new Map<string, UnifiedPlugin[]>()

    // Build skill map
    for (const plugin of plugins) {
      if (!plugin.enabled) continue

      for (const skill of plugin.skills || []) {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, [])
        }
        skillMap.get(skill)!.push(plugin)
      }
    }

    // Find conflicts
    for (const [skill, conflictingPlugins] of skillMap) {
      if (conflictingPlugins.length > 1) {
        conflicts.push({
          type: ConflictType.SKILL,
          resource: skill,
          plugins: conflictingPlugins,
          severity: 7,
          resolution: `Multiple plugins provide the skill '${skill}'. Consider keeping the highest rated one.`,
        })
      }
    }

    return conflicts
  }

  /**
   * Detect feature conflicts
   */
  private detectFeatureConflicts(plugins: UnifiedPlugin[]): PluginConflict[] {
    const conflicts: PluginConflict[] = []
    const featureMap = new Map<string, UnifiedPlugin[]>()

    // Build feature map
    for (const plugin of plugins) {
      if (!plugin.enabled) continue

      for (const feature of plugin.features || []) {
        if (!featureMap.has(feature)) {
          featureMap.set(feature, [])
        }
        featureMap.get(feature)!.push(plugin)
      }
    }

    // Find conflicts
    for (const [feature, conflictingPlugins] of featureMap) {
      if (conflictingPlugins.length > 1) {
        conflicts.push({
          type: ConflictType.FEATURE,
          resource: feature,
          plugins: conflictingPlugins,
          severity: 5,
          resolution: `Multiple plugins provide the feature '${feature}'. This may cause unexpected behavior.`,
        })
      }
    }

    return conflicts
  }

  /**
   * Detect dependency conflicts
   */
  private detectDependencyConflicts(plugins: UnifiedPlugin[]): PluginConflict[] {
    const conflicts: PluginConflict[] = []
    const dependencyMap = new Map<string, Set<string>>()

    // Build dependency version map
    for (const plugin of plugins) {
      if (!plugin.enabled) continue

      for (const dep of plugin.dependencies || []) {
        // Parse dependency (format: "name@version" or "name")
        const [name, version] = dep.includes('@') ? dep.split('@') : [dep, '*']

        if (!dependencyMap.has(name)) {
          dependencyMap.set(name, new Set())
        }
        if (version !== '*') {
          dependencyMap.get(name)!.add(version)
        }
      }
    }

    // Find version conflicts
    for (const [dep, versions] of dependencyMap) {
      if (versions.size > 1) {
        const conflictingPlugins = plugins.filter(p =>
          p.enabled && p.dependencies?.some(d => d.startsWith(`${dep}@`))
        )

        conflicts.push({
          type: ConflictType.DEPENDENCY,
          resource: dep,
          plugins: conflictingPlugins,
          severity: 6,
          resolution: `Multiple versions of '${dep}' required: ${Array.from(versions).join(', ')}`,
        })
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts using the specified strategy
   */
  resolveConflicts(
    conflicts: PluginConflict[],
    strategy: ResolutionStrategy,
    preferredSource?: string
  ): ResolutionResult {
    const enabled = new Set<UnifiedPlugin>()
    const disabled = new Set<UnifiedPlugin>()
    const unresolved: PluginConflict[] = []
    const actions: string[] = []

    for (const conflict of conflicts) {
      const resolution = this.resolveConflict(conflict, strategy, preferredSource)

      if (resolution.success) {
        resolution.enabled.forEach(p => enabled.add(p))
        resolution.disabled.forEach(p => disabled.add(p))
        actions.push(...resolution.actions)
      } else {
        unresolved.push(conflict)
      }
    }

    return {
      success: unresolved.length === 0,
      enabled: Array.from(enabled),
      disabled: Array.from(disabled),
      unresolved,
      actions,
    }
  }

  /**
   * Resolve a single conflict
   */
  private resolveConflict(
    conflict: PluginConflict,
    strategy: ResolutionStrategy,
    preferredSource?: string
  ): ResolutionResult {
    const { plugins } = conflict

    let winner: UnifiedPlugin | null = null

    switch (strategy) {
      case ResolutionStrategy.KEEP_FIRST:
        winner = plugins[0]
        break

      case ResolutionStrategy.KEEP_LAST:
        winner = plugins[plugins.length - 1]
        break

      case ResolutionStrategy.KEEP_HIGHEST_RATED:
        winner = plugins.reduce((best, current) =>
          (current.rating || 0) > (best.rating || 0) ? current : best
        )
        break

      case ResolutionStrategy.KEEP_MOST_POPULAR:
        winner = plugins.reduce((best, current) =>
          (current.stats?.downloads || 0) > (best.stats?.downloads || 0) ? current : best
        )
        break

      case ResolutionStrategy.KEEP_VERIFIED:
        winner = plugins.find(p => p.verified) || plugins[0]
        break

      case ResolutionStrategy.KEEP_PREFERRED_SOURCE:
        if (preferredSource) {
          winner = plugins.find(p => p.source === preferredSource) || plugins[0]
        } else {
          winner = plugins[0]
        }
        break

      case ResolutionStrategy.MANUAL:
        return {
          success: false,
          enabled: [],
          disabled: [],
          unresolved: [conflict],
          actions: ['Manual resolution required'],
        }
    }

    if (!winner) {
      return {
        success: false,
        enabled: [],
        disabled: [],
        unresolved: [conflict],
        actions: ['Could not determine winner'],
      }
    }

    const losers = plugins.filter(p => p !== winner)

    return {
      success: true,
      enabled: [winner],
      disabled: losers,
      unresolved: [],
      actions: [
        `Resolved ${conflict.type} conflict for '${conflict.resource}':`,
        `  Kept: ${winner.name} (${winner.source})`,
        ...losers.map(p => `  Disabled: ${p.name} (${p.source})`),
      ],
    }
  }

  /**
   * Get conflict summary
   */
  getConflictSummary(conflicts: PluginConflict[]): string {
    if (conflicts.length === 0) {
      return 'No conflicts detected'
    }

    const byType = new Map<ConflictType, number>()
    for (const conflict of conflicts) {
      byType.set(conflict.type, (byType.get(conflict.type) || 0) + 1)
    }

    const lines = [
      `Found ${conflicts.length} conflict(s):`,
      ...Array.from(byType.entries()).map(
        ([type, count]) => `  ${type}: ${count}`
      ),
    ]

    return lines.join('\n')
  }
}
