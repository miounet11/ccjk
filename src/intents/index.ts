/**
 * Intent Registry
 *
 * Central registry for all Intent IR definitions.
 *
 * @module intents
 */

import type { Intent } from '../types/intent'
import { codeReviewIntent } from './code-review.intent'
import { refactorIntent } from './refactor.intent'

/**
 * Intent Registry
 */
export class IntentRegistry {
  private intents: Map<string, Intent> = new Map()

  constructor() {
    // Register built-in intents
    this.register(codeReviewIntent)
    this.register(refactorIntent)
  }

  /**
   * Register an intent
   */
  register(intent: Intent): void {
    if (this.intents.has(intent.id)) {
      throw new Error(`Intent already registered: ${intent.id}`)
    }
    this.intents.set(intent.id, intent)
  }

  /**
   * Get an intent by id
   */
  get(id: string): Intent | undefined {
    return this.intents.get(id)
  }

  /**
   * List all registered intents
   */
  list(): Intent[] {
    return Array.from(this.intents.values())
  }

  /**
   * Search intents by tag
   */
  findByTag(tag: string): Intent[] {
    return this.list().filter(intent =>
      intent.metadata?.tags?.includes(tag),
    )
  }

  /**
   * Search intents by category
   */
  findByCategory(category: string): Intent[] {
    return this.list().filter(intent =>
      intent.metadata?.category === category,
    )
  }

  /**
   * Unregister an intent
   */
  unregister(id: string): boolean {
    return this.intents.delete(id)
  }

  /**
   * Clear all intents
   */
  clear(): void {
    this.intents.clear()
  }
}

/**
 * Global intent registry instance
 */
export const intentRegistry = new IntentRegistry()

/**
 * Export all intents
 */
export { codeReviewIntent } from './code-review.intent'
export { refactorIntent } from './refactor.intent'
