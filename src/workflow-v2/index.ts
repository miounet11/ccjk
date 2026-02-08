/**
 * CCJK Workflow v2.0 - AI-Powered Workflow Generation
 *
 * This module provides intelligent workflow generation capabilities
 * using AI to create, optimize, and manage workflows.
 */

import type {
  Fragment,
  GeneratorConfig,
  OptimizationResult,
  ProjectContext,
  ValidationResult,
  Workflow,
  WorkflowGenerationRequest,
  WorkflowGenerationResult,
} from './types.js'
import { FragmentLibrary } from './fragments/library.js'
import { WorkflowGenerator } from './generator/generator.js'
import { WorkflowOptimizer } from './optimizer.js'
import { WorkflowValidator } from './validator.js'

export * from './fragments/deploy/index.js'
export * from './fragments/develop/index.js'
export * from './fragments/library.js'
export * from './fragments/setup/index.js'
export * from './fragments/test/index.js'
export * from './generator/context-builder.js'
export * from './generator/generator.js'
export * from './generator/post-processor.js'
export * from './generator/prompt-templates.js'
export * from './optimizer.js'
export * from './types.js'
export * from './validator.js'

/**
 * Main Workflow Manager class that orchestrates all workflow operations
 */
export class WorkflowManager {
  private generator: WorkflowGenerator
  private fragmentLibrary: FragmentLibrary
  private validator: WorkflowValidator
  private optimizer: WorkflowOptimizer

  constructor(config?: GeneratorConfig) {
    this.generator = new WorkflowGenerator(config)
    this.fragmentLibrary = new FragmentLibrary()
    this.validator = new WorkflowValidator()
    this.optimizer = new WorkflowOptimizer()
  }

  /**
   * Generate a workflow from a natural language task description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResult> {
    // Generate workflow using AI
    const result = await this.generator.generate(request)

    // Validate the generated workflow
    const validation = this.validator.validate(result.workflow, request.context)
    if (!validation.isValid) {
      console.warn('Generated workflow has validation issues:', validation.errors)
    }

    // Optimize the workflow
    const optimization = this.optimizer.optimize(result.workflow, request.context)

    return {
      ...result,
      workflow: optimization.optimizedWorkflow,
      metadata: {
        ...result.metadata,
        optimized: true,
        optimizationImprovements: optimization.improvements.length,
      },
    }
  }

  /**
   * Generate workflow from fragments
   */
  async generateFromFragments(
    fragmentIds: string[],
    context: ProjectContext,
    _config?: GeneratorConfig,
  ): Promise<WorkflowGenerationResult> {
    // Get fragments from library
    const fragments: Fragment[] = []
    for (const id of fragmentIds) {
      const fragment = this.fragmentLibrary.getFragment(id)
      if (fragment) {
        fragments.push(fragment)
      }
    }

    if (fragments.length === 0) {
      throw new Error('No valid fragments found')
    }

    // Generate workflow by composing fragments
    const result = await this.generator.generateFromFragments(fragmentIds, context)

    // Validate and optimize
    const validation = this.validator.validate(result.workflow, context)
    const optimization = this.optimizer.optimize(result.workflow, context)

    return {
      ...result,
      workflow: optimization.optimizedWorkflow,
      validation,
      metadata: {
        ...result.metadata,
        fragmentCount: fragments.length,
        optimized: true,
      },
    }
  }

  /**
   * Validate a workflow
   */
  validateWorkflow(workflow: Workflow, context: ProjectContext): ValidationResult {
    return this.validator.validate(workflow, context)
  }

  /**
   * Optimize a workflow
   */
  optimizeWorkflow(workflow: Workflow, context: ProjectContext): OptimizationResult {
    return this.optimizer.optimize(workflow, context)
  }

  /**
   * Search fragments
   */
  searchFragments(query: string): Fragment[] {
    return this.fragmentLibrary.searchText(query)
  }

  /**
   * Get fragments by category
   */
  getFragmentsByCategory(category: string): Fragment[] {
    return this.fragmentLibrary.getFragmentsByCategory(category as any)
  }

  /**
   * Get all fragment IDs
   */
  getAllFragmentIds(): string[] {
    return this.fragmentLibrary.getAllFragmentIds()
  }

  /**
   * Add custom fragment
   */
  addFragment(fragment: Fragment): void {
    this.fragmentLibrary.addFragment(fragment)
  }

  /**
   * Remove fragment
   */
  removeFragment(id: string): boolean {
    return this.fragmentLibrary.removeFragment(id)
  }

  /**
   * Get fragment library statistics
   */
  getFragmentStats() {
    return this.fragmentLibrary.getStats()
  }

  /**
   * Clear generator cache
   */
  clearCache(): void {
    this.generator.clearCache()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.generator.getCacheStats()
  }

  /**
   * Export fragment library
   */
  exportFragmentLibrary(): string {
    return this.fragmentLibrary.export()
  }

  /**
   * Import fragment library
   */
  importFragmentLibrary(json: string): void {
    this.fragmentLibrary.import(json)
  }
}

/**
 * Quick workflow generation helper
 */
export async function quickGenerate(
  task: string,
  context: ProjectContext,
  config?: GeneratorConfig,
): Promise<Workflow> {
  const manager = new WorkflowManager(config)
  const result = await manager.generateWorkflow({
    task,
    context,
  })
  return result.workflow
}

/**
 * Validate workflow helper
 */
export function quickValidate(workflow: Workflow, context: ProjectContext): ValidationResult {
  const validator = new WorkflowValidator()
  return validator.validate(workflow, context)
}

/**
 * Optimize workflow helper
 */
export function quickOptimize(workflow: Workflow, context: ProjectContext): OptimizationResult {
  const optimizer = new WorkflowOptimizer()
  return optimizer.optimize(workflow, context)
}
