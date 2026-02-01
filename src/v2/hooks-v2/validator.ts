/**
 * Hook Validator - Compliance Verification
 *
 * @description
 * Validates hook compliance and ensures protocols are followed correctly.
 * Provides real-time validation feedback and compliance scoring.
 */

import type { HookProtocol, HookValidationResult, HookContext } from './types'

/**
 * Hook validation rule
 */
export interface ValidationRule {
  /** Rule ID */
  id: string
  /** Rule name */
  name: string
  /** Rule description */
  description: string
  /** Validation function */
  validate: (hook: HookProtocol, context: HookContext) => Promise<boolean>
  /** Error message if validation fails */
  errorMessage: string
  /** Warning message if validation has issues */
  warningMessage?: string
  /** Rule priority (higher = more important) */
  priority: number
  /** Whether this rule is mandatory */
  mandatory: boolean
}

/**
 * Hook Validator class
 * Validates hook protocols and contexts
 */
export class HookValidator {
  private rules: Map<string, ValidationRule> = new Map()

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Initialize default validation rules
   */
  initializeDefaultRules(): void {
    // Protocol completeness rule
    this.addRule({
      id: 'protocol-completeness',
      name: 'Protocol Completeness',
      description: 'Ensures all required fields are present in the protocol',
      validate: async (hook: HookProtocol) => {
        return !!(
          hook.id &&
          hook.name &&
          hook.level &&
          hook.template &&
          hook.variables !== undefined &&
          hook.priority !== undefined &&
          hook.mandatory !== undefined
        )
      },
      errorMessage: 'Protocol is missing required fields',
      priority: 100,
      mandatory: true,
    })

    // Template syntax rule
    this.addRule({
      id: 'template-syntax',
      name: 'Template Syntax',
      description: 'Validates template syntax and variable references',
      validate: async (hook: HookProtocol) => {
        try {
          // Check for valid template syntax
          const template = hook.template
          const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g
          const matches = template.match(variableRegex)

          if (!matches) return true

          // Validate each variable is in the variables list
          for (const match of matches) {
            const variable = match.slice(2, -2)
            if (!hook.variables.includes(variable)) {
              return false
            }
          }

          return true
        }
        catch {
          return false
        }
      },
      errorMessage: 'Template has invalid syntax or undefined variables',
      priority: 90,
      mandatory: true,
    })

    // Context compatibility rule
    this.addRule({
      id: 'context-compatibility',
      name: 'Context Compatibility',
      description: 'Ensures hook is compatible with the context',
      validate: async (hook: HookProtocol, context: HookContext) => {
        // Check if hook contexts match current context
        if (hook.contexts.length > 0) {
          const contextMatch = hook.contexts.some((c: string) =>
            c === context.taskType ||
            c === context.phase ||
            c === context.agentType
          )
          return contextMatch
        }

        return true
      },
      errorMessage: 'Hook is not compatible with current context',
      priority: 80,
      mandatory: false,
    })

    // Variable availability rule
    this.addRule({
      id: 'variable-availability',
      name: 'Variable Availability',
      description: 'Ensures all required variables are available in context',
      validate: async (hook: HookProtocol, context: HookContext) => {
        // Check if all required variables can be resolved
        for (const variable of hook.variables) {
          const value = this.getVariableValue(variable, context)
          if (value === undefined || value === null) {
            return false
          }
        }
        return true
      },
      warningMessage: 'Some required variables may not be available in context',
      errorMessage: 'Required variables are not available in context',
      priority: 70,
      mandatory: false,
    })

    // Priority conflict rule
    this.addRule({
      id: 'priority-conflict',
      name: 'Priority Conflict',
      description: 'Detects conflicts between hooks with different priorities',
      validate: async (hook: HookProtocol, _context: HookContext) => {
        // This would require access to other active hooks
        // For now, just validate priority is within range
        return hook.priority >= 0 && hook.priority <= 100
      },
      errorMessage: 'Hook priority is out of valid range (0-100)',
      warningMessage: 'Hook priority may conflict with other active hooks',
      priority: 60,
      mandatory: false,
    })
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  /**
   * Get a validation rule
   */
  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId)
  }

  /**
   * Get all validation rules
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Validate a hook protocol
   */
  async validateProtocol(hook: HookProtocol): Promise<HookValidationResult> {
    const result: HookValidationResult = {
      valid: true,
      missing: [],
      violations: [],
      score: 1,
      errors: [],
      warnings: [],
    }

    const rules = this.getAllRules().sort((a, b) => b.priority - a.priority)

    for (const rule of rules) {
      try {
        const passed = await rule.validate(hook, {} as HookContext)

        if (!passed) {
          if (rule.mandatory) {
            result.valid = false
            result.violations.push(rule.id)
            result.errors.push(rule.errorMessage)
          }
          else if (rule.warningMessage) {
            result.warnings.push(rule.warningMessage)
          }
        }
      }
      catch (error) {
        if (rule.mandatory) {
          result.valid = false
          result.violations.push(rule.id)
          result.errors.push(`Validation rule "${rule.id}" failed: ${error}`)
        }
      }
    }

    // Calculate compliance score
    const totalRules = rules.filter(r => r.mandatory).length
    const passedRules = totalRules - result.violations.length
    result.score = totalRules > 0 ? passedRules / totalRules : 1

    return result
  }

  /**
   * Validate hook in context
   */
  async validateInContext(hook: HookProtocol, context: HookContext): Promise<HookValidationResult> {
    const result = await this.validateProtocol(hook)

    // Additional context-specific validation
    const contextRules = this.getAllRules().filter(r => !r.id.includes('completeness') && !r.id.includes('syntax'))

    for (const rule of contextRules) {
      try {
        const passed = await rule.validate(hook, context)

        if (!passed) {
          if (rule.mandatory) {
            result.valid = false
            result.violations.push(rule.id)
            result.errors.push(rule.errorMessage)
          }
          else if (rule.warningMessage) {
            result.warnings.push(rule.warningMessage)
          }
        }
      }
      catch (error) {
        if (rule.mandatory) {
          result.valid = false
          result.violations.push(rule.id)
          result.errors.push(`Validation rule "${rule.id}" failed: ${error}`)
        }
      }
    }

    // Recalculate score
    const totalRules = this.getAllRules().length
    const passedRules = totalRules - result.violations.length
    result.score = totalRules > 0 ? passedRules / totalRules : 1

    return result
  }

  /**
   * Validate multiple hooks
   */
  async validateMultiple(hooks: HookProtocol[]): Promise<Map<string, HookValidationResult>> {
    const results = new Map<string, HookValidationResult>()

    for (const hook of hooks) {
      const result = await this.validateProtocol(hook)
      results.set(hook.id, result)
    }

    return results
  }

  /**
   * Get variable value from context
   */
  private getVariableValue(variable: string, context: HookContext): unknown {
    const keys = variable.split('.')
    let value: unknown = context

    for (const key of keys) {
      if (typeof value === 'object' && value !== null && key in value) {
        value = (value as Record<string, unknown>)[key]
      }
      else {
        return undefined
      }
    }

    return value
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    totalRules: number
    mandatoryRules: number
    optionalRules: number
    averageValidationTime: number
  } {
    const rules = this.getAllRules()
    const mandatoryRules = rules.filter(r => r.mandatory).length

    return {
      totalRules: rules.length,
      mandatoryRules,
      optionalRules: rules.length - mandatoryRules,
      averageValidationTime: 0, // Would need to track this
    }
  }
}

/**
 * Global hook validator instance
 */
export const hookValidator = new HookValidator()

/**
 * Quick validation function
 */
export async function validateHook(hook: HookProtocol, context?: HookContext): Promise<HookValidationResult> {
  if (context) {
    return hookValidator.validateInContext(hook, context)
  }
  return hookValidator.validateProtocol(hook)
}

/**
 * Validate multiple hooks
 */
export async function validateHooks(hooks: HookProtocol[]): Promise<Map<string, HookValidationResult>> {
  return hookValidator.validateMultiple(hooks)
}

/**
 * Add custom validation rule
 */
export function addValidationRule(rule: ValidationRule): void {
  hookValidator.addRule(rule)
}

/**
 * Remove validation rule
 */
export function removeValidationRule(ruleId: string): void {
  hookValidator.removeRule(ruleId)
}

/**
 * Get all validation rules
 */
export function getValidationRules(): ValidationRule[] {
  return hookValidator.getAllRules()
}

/**
 * Get validation statistics
 */
export function getValidationStats(): ReturnType<typeof hookValidator.getStats> {
  return hookValidator.getStats()
}

/**
 * Reset validator to default rules
 */
export function resetValidator(): void {
  // Clear all rules and reinitialize
  const rules = hookValidator.getAllRules()
  for (const rule of rules) {
    hookValidator.removeRule(rule.id)
  }
  hookValidator.initializeDefaultRules()
}