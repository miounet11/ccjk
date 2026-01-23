/**
 * Workflow Validator
 *
 * This module provides comprehensive validation for workflows
 * including dependency checking, circular dependency detection,
 * and resource availability checks.
 */

import type {
  Workflow,
  WorkflowStep,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProjectContext,
} from '../types.js'

export class WorkflowValidator {
  /**
   * Validate a complete workflow
   */
  validate(workflow: Workflow, context: ProjectContext): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Basic structure validation
    errors.push(...this.validateStructure(workflow))

    // Step validation
    errors.push(...this.validateSteps(workflow, context))

    // Dependency validation
    errors.push(...this.validateDependencies(workflow))

    // Circular dependency detection
    errors.push(...this.validateCircularDependencies(workflow))

    // Platform compatibility
    warnings.push(...this.validatePlatformCompatibility(workflow, context))

    // Resource availability
    warnings.push(...this.validateResourceAvailability(workflow, context))

    // Security validation
    warnings.push(...this.validateSecurity(workflow))

    // Performance validation
    warnings.push(...this.validatePerformance(workflow))

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(workflow, errors, warnings),
    }
  }

  /**
   * Validate basic workflow structure
   */
  private validateStructure(workflow: Workflow): ValidationError[] {
    const errors: ValidationError[] = []

    if (!workflow.id) {
      errors.push({
        type: 'syntax_error',
        message: 'Workflow missing required field: id',
        severity: 'critical',
      })
    }

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push({
        type: 'syntax_error',
        message: 'Workflow missing required field: name',
        severity: 'critical',
      })
    }

    if (!workflow.description || workflow.description.trim().length === 0) {
      errors.push({
        type: 'syntax_error',
        message: 'Workflow missing required field: description',
        severity: 'high',
      })
    }

    if (!workflow.version || !/^\d+\.\d+\.\d+$/.test(workflow.version)) {
      errors.push({
        type: 'syntax_error',
        message: 'Workflow version must follow semver format (e.g., 1.0.0)',
        severity: 'high',
      })
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push({
        type: 'syntax_error',
        message: 'Workflow must have at least one step',
        severity: 'critical',
      })
    }

    return errors
  }

  /**
   * Validate workflow steps
   */
  private validateSteps(workflow: Workflow, context: ProjectContext): ValidationError[] {
    const errors: ValidationError[] = []
    const stepIds = new Set<string>()

    for (const step of workflow.steps) {
      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push({
          type: 'syntax_error',
          stepId: step.id,
          message: `Duplicate step ID: ${step.id}`,
          severity: 'critical',
        })
      }
      stepIds.add(step.id)

      // Validate step fields
      if (!step.name || step.name.trim().length === 0) {
        errors.push({
          type: 'syntax_error',
          stepId: step.id,
          message: 'Step missing required field: name',
          severity: 'high',
        })
      }

      if (!step.description || step.description.trim().length < 10) {
        errors.push({
          type: 'syntax_error',
          stepId: step.id,
          message: 'Step description must be at least 10 characters',
          severity: 'medium',
        })
      }

      if (!step.command && !step.script) {
        errors.push({
          type: 'syntax_error',
          stepId: step.id,
          message: 'Step must have either a command or script',
          severity: 'high',
        })
      }

      // Validate command
      if (step.command) {
        errors.push(...this.validateCommand(step, context))
      }

      // Validate timeout
      if (step.timeout && step.timeout > 3600) {
        errors.push({
          type: 'timeout_exceeded',
          stepId: step.id,
          message: `Step timeout (${step.timeout}s) exceeds maximum recommended duration (3600s)`,
          severity: 'medium',
        })
      }

      // Validate retry configuration
      if (step.retry && step.retry.maxAttempts > 10) {
        errors.push({
          type: 'syntax_error',
          stepId: step.id,
          message: 'Retry maxAttempts exceeds recommended maximum of 10',
          severity: 'medium',
        })
      }
    }

    return errors
  }

  /**
   * Validate a step command
   */
  private validateCommand(step: WorkflowStep, context: ProjectContext): ValidationError[] {
    const errors: ValidationError[] = []

    if (!step.command) {
      return errors
    }

    // Check for dangerous commands
    const dangerousCommands = [
      'rm -rf /',
      'rm -rf /*',
      'mkfs',
      ':(){ :|:& };:',
      'dd if=/dev/zero',
      'chmod 000 /',
    ]

    for (const dangerous of dangerousCommands) {
      if (step.command.includes(dangerous)) {
        errors.push({
          type: 'security_risk',
          stepId: step.id,
          message: `Step contains potentially dangerous command: ${dangerous}`,
          severity: 'critical',
        })
      }
    }

    // Validate command syntax
    const commandParts = step.command.trim().split(/\s+/)
    const cmd = commandParts[0]

    if (cmd.startsWith('$') && !context.environmentVariables?.[cmd.slice(1)]) {
      errors.push({
        type: 'invalid_command',
        stepId: step.id,
        message: `Environment variable not defined: ${cmd}`,
        severity: 'high',
      })
    }

    return errors
  }

  /**
   * Validate step dependencies
   */
  private validateDependencies(workflow: Workflow): ValidationError[] {
    const errors: ValidationError[] = []
    const stepIds = new Set(workflow.steps.map(s => s.id))

    for (const step of workflow.steps) {
      if (!step.dependencies) {
        continue
      }

      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          errors.push({
            type: 'missing_dependency',
            stepId: step.id,
            message: `Step references non-existent dependency: ${depId}`,
            severity: 'high',
          })
        }
      }
    }

    return errors
  }

  /**
   * Detect circular dependencies
   */
  private validateCircularDependencies(workflow: Workflow): ValidationError[] {
    const errors: ValidationError[] = []

    const stepMap = new Map(workflow.steps.map(s => [s.id, s]))
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const dfs = (stepId: string, path: string[]): void => {
      if (recursionStack.has(stepId)) {
        const cycleStart = path.indexOf(stepId)
        cycles.push([...path.slice(cycleStart), stepId])
        return
      }

      if (visited.has(stepId)) {
        return
      }

      visited.add(stepId)
      recursionStack.add(stepId)

      const step = stepMap.get(stepId)
      if (step?.dependencies) {
        for (const dep of step.dependencies) {
          dfs(dep, [...path, stepId])
        }
      }

      recursionStack.delete(stepId)
    }

    for (const step of workflow.steps) {
      dfs(step.id, [])
    }

    for (const cycle of cycles) {
      errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        severity: 'critical',
      })
    }

    return errors
  }

  /**
   * Validate platform compatibility
   */
  private validatePlatformCompatibility(workflow: Workflow, context: ProjectContext): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    if (!workflow.requirements?.platforms) {
      return warnings
    }

    const targetPlatform = context.platform.toLowerCase()
    const supportedPlatforms = workflow.requirements.platforms.map(p => p.toLowerCase())

    if (!supportedPlatforms.includes(targetPlatform)) {
      warnings.push({
        type: 'platform_specific',
        message: `Workflow may not be compatible with platform: ${context.platform}`,
        suggestion: `Ensure all commands are available on ${context.platform}`,
      })
    }

    // Check for platform-specific commands
    const platformCommands: Record<string, string[]> = {
      linux: ['apt', 'yum', 'dnf', 'systemctl'],
      macos: ['brew'],
      windows: ['choco', 'powershell'],
    }

    for (const step of workflow.steps) {
      if (!step.command) {
        continue
      }

      for (const [platform, cmds] of Object.entries(platformCommands)) {
        if (platform !== targetPlatform && cmds.some(cmd => step.command.includes(cmd))) {
          warnings.push({
            type: 'platform_specific',
            stepId: step.id,
            message: `Command may not work on ${context.platform}: ${step.command}`,
            suggestion: `Consider using ${targetPlatform}-specific alternatives`,
          })
        }
      }
    }

    return warnings
  }

  /**
   * Validate resource availability
   */
  private validateResourceAvailability(workflow: Workflow, context: ProjectContext): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Check for required tools
    if (workflow.requirements?.tools) {
      for (const tool of workflow.requirements.tools) {
        const isAvailable = this.checkToolAvailability(tool)
        if (!isAvailable) {
          warnings.push({
            type: 'invalid_command',
            message: `Required tool may not be available: ${tool}`,
            suggestion: `Install ${tool} before running this workflow`,
          })
        }
      }
    }

    return warnings
  }

  /**
   * Check if a tool is available
   */
  private checkToolAvailability(tool: string): boolean {
    try {
      const { execSync } = require('child_process')
      execSync(`which ${tool}`, { stdio: 'ignore' })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Validate security issues
   */
  private validateSecurity(workflow: Workflow): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    for (const step of workflow.steps) {
      if (!step.command) {
        continue
      }

      // Check for commands that expose secrets
      if (step.command.includes('echo') && /password|secret|token|key/i.test(step.command)) {
        warnings.push({
          type: 'security_risk',
          stepId: step.id,
          message: 'Command may expose sensitive information in logs',
          suggestion: 'Use environment variables instead of hardcoded secrets',
        })
      }

      // Check for insecure file permissions
      if (step.command.includes('chmod 777')) {
        warnings.push({
          type: 'security_risk',
          stepId: step.id,
          message: 'Command sets insecure file permissions (777)',
          suggestion: 'Use more restrictive permissions (e.g., 755 or 644)',
        })
      }

      // Check for unencrypted data transfer
      if (step.command.includes('http://') && !step.command.includes('localhost')) {
        warnings.push({
          type: 'security_risk',
          stepId: step.id,
          message: 'Command uses unencrypted HTTP connection',
          suggestion: 'Use HTTPS instead of HTTP',
        })
      }
    }

    return warnings
  }

  /**
   * Validate performance issues
   */
  private validatePerformance(workflow: Workflow): ValidationWarning[] = []
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    workflow: Workflow,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): string[] {
    const suggestions: string[] = []

    // Suggest parallelization
    const parallelizable = this.findParallelizableSteps(workflow)
    if (parallelizable.length > 1) {
      suggestions.push(
        `Steps ${parallelizable.join(', ')} can be executed in parallel to reduce execution time`,
      )
    }

    // Suggest caching
    const hasBuildSteps = workflow.steps.some(s => s.command?.includes('build'))
    if (hasBuildSteps) {
      suggestions.push('Consider adding build artifact caching to speed up rebuilds')
    }

    // Suggest error handling
    const stepsWithoutErrorHandling = workflow.steps.filter(s => !s.errorHandling).length
    if (stepsWithoutErrorHandling > workflow.steps.length / 2) {
      suggestions.push('Add error handling to more steps to improve reliability')
    }

    // Suggest validation
    const stepsWithoutValidation = workflow.steps.filter(s => !s.validation).length
    if (stepsWithoutValidation > workflow.steps.length / 2) {
      suggestions.push('Add validation rules to more steps to ensure correctness')
    }

    // Suggest monitoring
    if (!workflow.steps.some(s => s.command?.includes('health') || s.command?.includes('monitor'))) {
      suggestions.push('Consider adding health checks and monitoring to production deployments')
    }

    return suggestions
  }

  /**
   * Find steps that can be executed in parallel
   */
  private findParallelizableSteps(workflow: Workflow): string[] {
    const dependencyGraph = new Map<string, string[]>()
    const stepIds = new Set(workflow.steps.map(s => s.id))

    // Build dependency graph
    for (const step of workflow.steps) {
      dependencyGraph.set(step.id, step.dependencies || [])
    }

    // Find steps with no dependencies (can be parallelized)
    const parallelizable: string[] = []
    for (const step of workflow.steps) {
      if (!step.dependencies || step.dependencies.length === 0) {
        parallelizable.push(step.id)
      }
    }

    return parallelizable
  }
}
