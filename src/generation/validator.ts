/**
 * Smart Generation Validator
 *
 * Validates generated agents and skills for quality and compatibility
 */

import type {
  GeneratedAgent,
  GeneratedSkill,
  GenerationResult,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './types'
import consola from 'consola'

const logger = consola.withTag('generation-validator')

/**
 * Validate generation result
 */
export function validateGenerationResult(
  result: GenerationResult,
  level: 'strict' | 'normal' | 'relaxed' = 'normal',
): ValidationResult {
  logger.info(`Validating generation result (level: ${level})...`)

  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate agents
  for (const agent of result.agents) {
    const agentValidation = validateAgent(agent, level)
    errors.push(...agentValidation.errors)
    warnings.push(...agentValidation.warnings)
  }

  // Validate skills
  for (const skill of result.skills) {
    const skillValidation = validateSkill(skill, level)
    errors.push(...skillValidation.errors)
    warnings.push(...skillValidation.warnings)
  }

  // Check for duplicates
  const duplicateErrors = checkDuplicates(result)
  errors.push(...duplicateErrors)

  // Check for conflicts
  const conflictWarnings = checkConflicts(result)
  warnings.push(...conflictWarnings)

  // Calculate score
  const score = calculateValidationScore(errors, warnings, result)

  const valid = errors.length === 0

  logger.info(`Validation complete: ${valid ? 'PASSED' : 'FAILED'} (score: ${score})`)
  if (errors.length > 0) {
    logger.warn(`Errors: ${errors.length}`)
  }
  if (warnings.length > 0) {
    logger.info(`Warnings: ${warnings.length}`)
  }

  return {
    valid,
    errors,
    warnings,
    score,
  }
}

/**
 * Validate single agent
 */
export function validateAgent(
  agent: GeneratedAgent,
  level: 'strict' | 'normal' | 'relaxed' = 'normal',
): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required fields
  if (!agent.id) {
    errors.push({
      code: 'AGENT_MISSING_ID',
      message: 'Agent is missing required field: id',
      item: agent.name || 'unknown',
      fix: 'Add a unique id to the agent',
    })
  }

  if (!agent.name) {
    errors.push({
      code: 'AGENT_MISSING_NAME',
      message: 'Agent is missing required field: name',
      item: agent.id || 'unknown',
      fix: 'Add a name to the agent',
    })
  }

  if (!agent.description) {
    errors.push({
      code: 'AGENT_MISSING_DESCRIPTION',
      message: 'Agent is missing required field: description',
      item: agent.id || 'unknown',
      fix: 'Add a description to the agent',
    })
  }

  // ID format validation
  if (agent.id && !/^[a-z0-9-]+$/.test(agent.id)) {
    errors.push({
      code: 'AGENT_INVALID_ID',
      message: 'Agent id must be lowercase alphanumeric with hyphens',
      item: agent.id,
      fix: 'Use only lowercase letters, numbers, and hyphens in id',
    })
  }

  // Model validation
  if (agent.model && !['opus', 'sonnet', 'haiku'].includes(agent.model)) {
    errors.push({
      code: 'AGENT_INVALID_MODEL',
      message: `Invalid model: ${agent.model}`,
      item: agent.id,
      fix: 'Use one of: opus, sonnet, haiku',
    })
  }

  // Strict level checks
  if (level === 'strict') {
    if (!agent.competencies || agent.competencies.length === 0) {
      errors.push({
        code: 'AGENT_MISSING_COMPETENCIES',
        message: 'Agent should have at least one competency',
        item: agent.id,
        fix: 'Add competencies to define agent capabilities',
      })
    }

    if (!agent.workflow || agent.workflow.length === 0) {
      errors.push({
        code: 'AGENT_MISSING_WORKFLOW',
        message: 'Agent should have a defined workflow',
        item: agent.id,
        fix: 'Add workflow steps to define agent behavior',
      })
    }

    if (!agent.bestPractices || agent.bestPractices.length === 0) {
      errors.push({
        code: 'AGENT_MISSING_BEST_PRACTICES',
        message: 'Agent should have best practices defined',
        item: agent.id,
        fix: 'Add best practices for agent guidance',
      })
    }
  }

  // Normal level checks
  if (level !== 'relaxed') {
    if (agent.description && agent.description.length < 20) {
      warnings.push({
        code: 'AGENT_SHORT_DESCRIPTION',
        message: 'Agent description is too short',
        item: agent.id,
        suggestion: 'Provide a more detailed description (at least 20 characters)',
      })
    }

    if (!agent.specialization) {
      warnings.push({
        code: 'AGENT_MISSING_SPECIALIZATION',
        message: 'Agent is missing specialization',
        item: agent.id,
        suggestion: 'Add a specialization to clarify agent focus',
      })
    }

    if (!agent.tags || agent.tags.length === 0) {
      warnings.push({
        code: 'AGENT_MISSING_TAGS',
        message: 'Agent has no tags',
        item: agent.id,
        suggestion: 'Add tags for better discoverability',
      })
    }
  }

  return { errors, warnings }
}

/**
 * Validate single skill
 */
export function validateSkill(
  skill: GeneratedSkill,
  level: 'strict' | 'normal' | 'relaxed' = 'normal',
): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required fields
  if (!skill.id) {
    errors.push({
      code: 'SKILL_MISSING_ID',
      message: 'Skill is missing required field: id',
      item: skill.name?.en || 'unknown',
      fix: 'Add a unique id to the skill',
    })
  }

  if (!skill.name || (!skill.name.en && !skill.name['zh-CN'])) {
    errors.push({
      code: 'SKILL_MISSING_NAME',
      message: 'Skill is missing required field: name',
      item: skill.id || 'unknown',
      fix: 'Add a name to the skill',
    })
  }

  if (!skill.description || (!skill.description.en && !skill.description['zh-CN'])) {
    errors.push({
      code: 'SKILL_MISSING_DESCRIPTION',
      message: 'Skill is missing required field: description',
      item: skill.id || 'unknown',
      fix: 'Add a description to the skill',
    })
  }

  // ID format validation
  if (skill.id && !/^[a-z0-9-]+$/.test(skill.id)) {
    errors.push({
      code: 'SKILL_INVALID_ID',
      message: 'Skill id must be lowercase alphanumeric with hyphens',
      item: skill.id,
      fix: 'Use only lowercase letters, numbers, and hyphens in id',
    })
  }

  // Triggers validation
  if (!skill.triggers || skill.triggers.length === 0) {
    errors.push({
      code: 'SKILL_MISSING_TRIGGERS',
      message: 'Skill must have at least one trigger',
      item: skill.id,
      fix: 'Add at least one trigger (command, pattern, or event)',
    })
  }
  else {
    for (const trigger of skill.triggers) {
      if (!trigger.type || !trigger.value) {
        errors.push({
          code: 'SKILL_INVALID_TRIGGER',
          message: 'Trigger must have type and value',
          item: skill.id,
          fix: 'Ensure all triggers have type and value',
        })
      }

      if (trigger.type === 'command' && !trigger.value.startsWith('/')) {
        warnings.push({
          code: 'SKILL_COMMAND_FORMAT',
          message: 'Command triggers should start with /',
          item: skill.id,
          suggestion: `Change "${trigger.value}" to "/${trigger.value}"`,
        })
      }
    }
  }

  // Actions validation
  if (!skill.actions || skill.actions.length === 0) {
    errors.push({
      code: 'SKILL_MISSING_ACTIONS',
      message: 'Skill must have at least one action',
      item: skill.id,
      fix: 'Add at least one action (bash, tool, prompt, or workflow)',
    })
  }
  else {
    for (const action of skill.actions) {
      if (!action.type || !action.content) {
        errors.push({
          code: 'SKILL_INVALID_ACTION',
          message: 'Action must have type and content',
          item: skill.id,
          fix: 'Ensure all actions have type and content',
        })
      }
    }
  }

  // Strict level checks
  if (level === 'strict') {
    if (!skill.category) {
      errors.push({
        code: 'SKILL_MISSING_CATEGORY',
        message: 'Skill should have a category',
        item: skill.id,
        fix: 'Add a category to the skill',
      })
    }
  }

  // Normal level checks
  if (level !== 'relaxed') {
    if (!skill.tags || skill.tags.length === 0) {
      warnings.push({
        code: 'SKILL_MISSING_TAGS',
        message: 'Skill has no tags',
        item: skill.id,
        suggestion: 'Add tags for better discoverability',
      })
    }

    if (skill.priority === undefined || skill.priority < 1 || skill.priority > 10) {
      warnings.push({
        code: 'SKILL_INVALID_PRIORITY',
        message: 'Skill priority should be between 1 and 10',
        item: skill.id,
        suggestion: 'Set priority to a value between 1 and 10',
      })
    }
  }

  return { errors, warnings }
}

/**
 * Check for duplicate agents and skills
 */
function checkDuplicates(result: GenerationResult): ValidationError[] {
  const errors: ValidationError[] = []

  // Check agent duplicates
  const agentIds = new Set<string>()
  for (const agent of result.agents) {
    if (agentIds.has(agent.id)) {
      errors.push({
        code: 'DUPLICATE_AGENT',
        message: `Duplicate agent id: ${agent.id}`,
        item: agent.id,
        fix: 'Ensure all agent ids are unique',
      })
    }
    agentIds.add(agent.id)
  }

  // Check skill duplicates
  const skillIds = new Set<string>()
  for (const skill of result.skills) {
    if (skillIds.has(skill.id)) {
      errors.push({
        code: 'DUPLICATE_SKILL',
        message: `Duplicate skill id: ${skill.id}`,
        item: skill.id,
        fix: 'Ensure all skill ids are unique',
      })
    }
    skillIds.add(skill.id)
  }

  return errors
}

/**
 * Check for conflicts between agents and skills
 */
function checkConflicts(result: GenerationResult): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  // Check for command conflicts in skills
  const commands = new Map<string, string>()
  for (const skill of result.skills) {
    for (const trigger of skill.triggers || []) {
      if (trigger.type === 'command') {
        if (commands.has(trigger.value)) {
          warnings.push({
            code: 'COMMAND_CONFLICT',
            message: `Command "${trigger.value}" is used by multiple skills`,
            item: skill.id,
            suggestion: `Consider renaming command in ${skill.id} or ${commands.get(trigger.value)}`,
          })
        }
        commands.set(trigger.value, skill.id)
      }
    }
  }

  // Check for overlapping agent categories
  const categories = new Map<string, string[]>()
  for (const agent of result.agents) {
    if (!categories.has(agent.category)) {
      categories.set(agent.category, [])
    }
    categories.get(agent.category)!.push(agent.id)
  }

  for (const [category, agents] of categories) {
    if (agents.length > 2) {
      warnings.push({
        code: 'CATEGORY_OVERLAP',
        message: `Multiple agents (${agents.length}) in category "${category}"`,
        suggestion: 'Consider consolidating or differentiating agents',
      })
    }
  }

  return warnings
}

/**
 * Calculate validation score
 */
function calculateValidationScore(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  result: GenerationResult,
): number {
  const totalItems = result.agents.length + result.skills.length
  if (totalItems === 0)
    return 0

  // Start with 100
  let score = 100

  // Deduct for errors (10 points each)
  score -= errors.length * 10

  // Deduct for warnings (2 points each)
  score -= warnings.length * 2

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score))
}
