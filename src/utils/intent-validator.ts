/**
 * Intent Validator
 *
 * Validates Intent IR structures for correctness and completeness.
 *
 * @module utils/intent-validator
 */

import type { Intent, IntentValidationResult } from '../types/intent'

/**
 * Validate an Intent IR structure
 */
export function validateIntent(intent: Intent): IntentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!intent.id) {
    errors.push('Intent must have an id')
  }

  if (!intent.goal || intent.goal.trim().length === 0) {
    errors.push('Intent must have a non-empty goal')
  }

  if (!intent.tools || intent.tools.length === 0) {
    warnings.push('Intent has no tools specified')
  }

  if (!intent.input || Object.keys(intent.input).length === 0) {
    warnings.push('Intent has no input schema')
  }

  if (!intent.how || intent.how.trim().length === 0) {
    errors.push('Intent must specify execution strategy (how)')
  }

  if (!intent.output || Object.keys(intent.output).length === 0) {
    errors.push('Intent must define output schema')
  }

  // Validate input schemas
  if (intent.input) {
    for (const [key, schema] of Object.entries(intent.input)) {
      if (!schema.type) {
        errors.push(`Input '${key}' missing type`)
      }
      if (!schema.description) {
        warnings.push(`Input '${key}' missing description`)
      }
    }
  }

  // Validate output schemas
  if (intent.output) {
    for (const [key, schema] of Object.entries(intent.output)) {
      if (!schema.type) {
        errors.push(`Output '${key}' missing type`)
      }
      if (!schema.description) {
        warnings.push(`Output '${key}' missing description`)
      }
    }
  }

  // Validate tools exist
  if (intent.tools) {
    for (const tool of intent.tools) {
      if (typeof tool !== 'string' || tool.trim().length === 0) {
        errors.push(`Invalid tool: ${tool}`)
      }
    }
  }

  // Check for reasonable goal length
  if (intent.goal && intent.goal.length > 200) {
    warnings.push('Goal is very long (>200 chars), consider making it more concise')
  }

  // Check for reasonable strategy length
  if (intent.how && intent.how.length > 500) {
    warnings.push('Strategy is very long (>500 chars), consider breaking into sub-intents')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate intent composition
 */
export function validateComposition(composite: any): IntentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!composite.intents || composite.intents.length === 0) {
    errors.push('Composite intent must have at least one intent')
    return { valid: false, errors, warnings }
  }

  // Validate each intent
  const intentIds = new Set<string>()
  for (const intent of composite.intents) {
    const result = validateIntent(intent)
    errors.push(...result.errors.map(e => `Intent '${intent.id}': ${e}`))
    warnings.push(...result.warnings.map(w => `Intent '${intent.id}': ${w}`))

    if (intentIds.has(intent.id)) {
      errors.push(`Duplicate intent id: ${intent.id}`)
    }
    intentIds.add(intent.id)
  }

  // Validate dependencies
  if (composite.dependencies) {
    for (const dep of composite.dependencies) {
      if (!intentIds.has(dep.from)) {
        errors.push(`Dependency references unknown intent: ${dep.from}`)
      }
      if (!intentIds.has(dep.to)) {
        errors.push(`Dependency references unknown intent: ${dep.to}`)
      }
    }

    // Check for circular dependencies
    const graph = new Map<string, Set<string>>()
    for (const id of intentIds) {
      graph.set(id, new Set())
    }
    for (const dep of composite.dependencies) {
      graph.get(dep.from)!.add(dep.to)
    }

    if (hasCycle(graph)) {
      errors.push('Circular dependency detected in composite intent')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Detect cycles in dependency graph using DFS
 */
function hasCycle(graph: Map<string, Set<string>>): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(node: string): boolean {
    visited.add(node)
    recStack.add(node)

    const neighbors = graph.get(node) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      }
      else if (recStack.has(neighbor)) {
        return true
      }
    }

    recStack.delete(node)
    return false
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true
    }
  }

  return false
}
