/**
 * CCJK Unified Discovery API
 *
 * Provides a single entry point for discovering all CCJK components:
 * - Hooks: Lifecycle event handlers
 * - Skills: User-invocable capabilities
 * - Agents: AI-powered task executors
 *
 * @module core/discovery
 */

import type { CCJKHookType } from './hook-skill-bridge'
import type { LifecycleState } from './lifecycle-hooks'
import { getHookSkillBridge } from './hook-skill-bridge'
import { getLifecycleManager } from './lifecycle-hooks'

// ============================================================================
// Types
// ============================================================================

/**
 * Discovered hook information
 */
export interface DiscoveredHook {
  id: string
  type: CCJKHookType
  priority: number
  enabled: boolean
  source: 'builtin' | 'user' | 'skill' | 'plugin'
  matcher?: string | RegExp
  triggersSkill?: string
}

/**
 * Discovered skill information
 */
export interface DiscoveredSkill {
  id: string
  name: string
  description?: string
  version?: string
  category?: string
  triggers: string[]
  args?: Array<{
    name: string
    description?: string
    required?: boolean
    default?: string
  }>
  hooks?: Array<{
    type: string
    command?: string
  }>
  userInvocable: boolean
  autoActivate: boolean
  priority: number
}

/**
 * Discovered agent information
 */
export interface DiscoveredAgent {
  id: string
  name: string
  description?: string
  model?: string
  capabilities: string[]
  tools?: string[]
  isBuiltin: boolean
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  hooks: DiscoveredHook[]
  skills: DiscoveredSkill[]
  agents: DiscoveredAgent[]
  lifecycle: LifecycleState
  timestamp: number
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  includeDisabled?: boolean
  includeBuiltin?: boolean
  hookTypes?: CCJKHookType[]
  skillCategories?: string[]
  agentCapabilities?: string[]
}

// ============================================================================
// Discovery Functions
// ============================================================================

/**
 * Discover all hooks
 */
export function discoverHooks(options: DiscoveryOptions = {}): DiscoveredHook[] {
  const bridge = getHookSkillBridge()
  const allHooks = bridge.getHooks()

  return allHooks
    .filter((hook) => {
      // Filter by enabled status
      if (!options.includeDisabled && !hook.enabled) {
        return false
      }
      // Filter by builtin status
      if (!options.includeBuiltin && hook.source === 'builtin') {
        return false
      }
      // Filter by hook type
      if (options.hookTypes && !options.hookTypes.includes(hook.type)) {
        return false
      }
      return true
    })
    .map(hook => ({
      id: hook.id,
      type: hook.type,
      priority: hook.priority,
      enabled: hook.enabled,
      source: hook.source,
      matcher: hook.matcher,
      triggersSkill: hook.skillTrigger?.skillId,
    }))
}

/**
 * Discover all skills
 */
export async function discoverSkills(options: DiscoveryOptions = {}): Promise<DiscoveredSkill[]> {
  // Dynamic import to avoid circular dependency
  const { getSkillRegistry } = await import('../brain/skill-registry')
  const registry = getSkillRegistry()
  const allSkills = registry.getAll()

  return allSkills
    .filter((skill) => {
      // Filter by category
      if (options.skillCategories && skill.metadata.category) {
        if (!options.skillCategories.includes(skill.metadata.category)) {
          return false
        }
      }
      return true
    })
    .map(skill => ({
      id: skill.id || skill.metadata.name,
      name: skill.metadata.name,
      description: skill.metadata.description,
      version: skill.metadata.version,
      category: skill.metadata.category,
      triggers: skill.metadata.triggers || [],
      args: skill.metadata.args?.map(arg => ({
        name: arg.name,
        description: arg.description,
        required: arg.required,
        default: arg.default,
      })),
      hooks: skill.metadata.hooks?.map(hook => ({
        type: hook.type,
        command: hook.command,
      })),
      userInvocable: skill.metadata.user_invocable ?? true,
      autoActivate: skill.metadata.auto_activate ?? false,
      priority: skill.metadata.priority ?? 50,
    }))
}

/**
 * Discover all agents
 */
export async function discoverAgents(options: DiscoveryOptions = {}): Promise<DiscoveredAgent[]> {
  // Dynamic import to avoid circular dependency
  const { AGENT_REGISTRY } = await import('../agents/registry')
  const allAgents = AGENT_REGISTRY

  return allAgents
    .filter((agent) => {
      // Filter by builtin status - all registry agents are builtin
      if (!options.includeBuiltin) {
        return false
      }
      // Filter by capabilities
      if (options.agentCapabilities) {
        const hasCapability = options.agentCapabilities.some(
          cap => agent.expertise?.includes(cap),
        )
        if (!hasCapability) {
          return false
        }
      }
      return true
    })
    .map(agent => ({
      id: agent.id,
      name: agent.name,
      capabilities: agent.expertise || [],
      isBuiltin: true, // All registry agents are builtin
    }))
}

/**
 * Discover all CCJK components
 */
export async function discoverAll(options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const [hooks, skills, agents] = await Promise.all([
    Promise.resolve(discoverHooks(options)),
    discoverSkills(options),
    discoverAgents(options),
  ])

  const lifecycleManager = getLifecycleManager()

  return {
    hooks,
    skills,
    agents,
    lifecycle: lifecycleManager.getState(),
    timestamp: Date.now(),
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find hooks that trigger a specific skill
 */
export function findHooksForSkill(skillId: string): DiscoveredHook[] {
  const bridge = getHookSkillBridge()
  const allHooks = bridge.getHooks()

  return allHooks
    .filter(hook => hook.skillTrigger?.skillId === skillId)
    .map(hook => ({
      id: hook.id,
      type: hook.type,
      priority: hook.priority,
      enabled: hook.enabled,
      source: hook.source,
      matcher: hook.matcher,
      triggersSkill: skillId,
    }))
}

/**
 * Find skills by trigger pattern
 */
export async function findSkillsByTrigger(trigger: string): Promise<DiscoveredSkill[]> {
  const { getSkillRegistry } = await import('../brain/skill-registry')
  const registry = getSkillRegistry()
  const skills = registry.getByTrigger(trigger)

  if (!skills || skills.length === 0) {
    return []
  }

  return skills.map(skill => ({
    id: skill.id || skill.metadata.name,
    name: skill.metadata.name,
    description: skill.metadata.description,
    version: skill.metadata.version,
    category: skill.metadata.category,
    triggers: skill.metadata.triggers || [],
    args: skill.metadata.args?.map((arg: any) => ({
      name: arg.name,
      description: arg.description,
      required: arg.required,
      default: arg.default,
    })),
    hooks: skill.metadata.hooks?.map((hook: any) => ({
      type: hook.type,
      command: hook.command,
    })),
    userInvocable: skill.metadata.user_invocable ?? true,
    autoActivate: skill.metadata.auto_activate ?? false,
    priority: skill.metadata.priority ?? 50,
  }))
}

/**
 * Find agents by capability
 */
export async function findAgentsByCapability(capability: string): Promise<DiscoveredAgent[]> {
  const { getAgentsByExpertise } = await import('../agents/registry')
  const agents = getAgentsByExpertise(capability)

  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    capabilities: agent.expertise || [],
    isBuiltin: true, // All registry agents are builtin
  }))
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get discovery statistics
 */
export async function getDiscoveryStats(): Promise<{
  totalHooks: number
  enabledHooks: number
  totalSkills: number
  userInvocableSkills: number
  totalAgents: number
  builtinAgents: number
  hooksByType: Record<string, number>
  skillsByCategory: Record<string, number>
}> {
  const result = await discoverAll({ includeDisabled: true, includeBuiltin: true })

  const hooksByType: Record<string, number> = {}
  for (const hook of result.hooks) {
    hooksByType[hook.type] = (hooksByType[hook.type] || 0) + 1
  }

  const skillsByCategory: Record<string, number> = {}
  for (const skill of result.skills) {
    const category = skill.category || 'uncategorized'
    skillsByCategory[category] = (skillsByCategory[category] || 0) + 1
  }

  return {
    totalHooks: result.hooks.length,
    enabledHooks: result.hooks.filter(h => h.enabled).length,
    totalSkills: result.skills.length,
    userInvocableSkills: result.skills.filter(s => s.userInvocable).length,
    totalAgents: result.agents.length,
    builtinAgents: result.agents.filter(a => a.isBuiltin).length,
    hooksByType,
    skillsByCategory,
  }
}
