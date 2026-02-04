/**
 * Agent Validator
 *
 * Validates agent definitions for correctness and completeness
 */

import type { AgentValidationResult } from '../types/agent'
import type { AgentCapability, AgentDefinition } from './types'

/**
 * Validate agent definition
 */
export function validateAgentDefinition(agent: AgentDefinition): AgentValidationResult {
  const errors: Array<{ field: string, message: string, code: string }> = []
  const warnings: Array<{ field: string, message: string, code: string }> = []

  // Validate required fields
  if (!agent.id || agent.id.trim().length === 0) {
    errors.push({
      field: 'id',
      message: 'Agent ID is required',
      code: 'MISSING_ID',
    })
  }

  if (!agent.persona || agent.persona.trim().length === 0) {
    errors.push({
      field: 'persona',
      message: 'Agent persona is required',
      code: 'MISSING_PERSONA',
    })
  }

  if (!agent.instructions || agent.instructions.trim().length === 0) {
    errors.push({
      field: 'instructions',
      message: 'Agent instructions are required',
      code: 'MISSING_INSTRUCTIONS',
    })
  }

  // Validate capabilities
  if (!agent.capabilities || agent.capabilities.length === 0) {
    warnings.push({
      field: 'capabilities',
      message: 'Agent has no capabilities defined',
      code: 'NO_CAPABILITIES',
    })
  }

  // Validate skills
  if (!agent.skills || agent.skills.length === 0) {
    warnings.push({
      field: 'skills',
      message: 'Agent has no skills defined',
      code: 'NO_SKILLS',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate agent capabilities
 */
export function validateCapabilities(capabilities: AgentCapability[]): boolean {
  const validTypes: AgentCapability[] = [
    'code-generation',
    'code-review',
    'testing',
    'documentation',
    'deployment',
    'debugging',
    'refactoring',
    'git-operations',
    'file-management',
    'web-search',
    'api-integration',
  ]

  return capabilities.every(cap =>
    cap && validTypes.includes(cap),
  )
}

/**
 * Validate agent name
 */
export function validateAgentName(name: string): boolean {
  // Must be alphanumeric with hyphens and underscores, 3-50 characters
  return /^[\w-]{3,50}$/.test(name)
}

/**
 * Check if agent is valid for submission
 */
export function isAgentValidForSubmission(agent: AgentDefinition): boolean {
  const result = validateAgentDefinition(agent)
  return result.valid
}
