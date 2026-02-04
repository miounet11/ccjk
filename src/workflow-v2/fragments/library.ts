/**
 * Fragment Library for Workflow Generation
 *
 * This module manages reusable workflow fragments that can be
 * combined to create complete workflows.
 */

import type {
  Fragment,
  FragmentCategory,
  FragmentLibraryIndex,
} from '../types.js'
import { deployFragments } from '../fragments/deploy/index.js'
import { developFragments } from '../fragments/develop/index.js'
import { setupFragments } from '../fragments/setup/index.js'
import { testFragments } from '../fragments/test/index.js'

export class FragmentLibrary {
  private index: FragmentLibraryIndex

  constructor() {
    this.index = this.buildIndex()
  }

  /**
   * Get fragment by ID
   */
  getFragment(id: string): Fragment | undefined {
    return this.index.fragments[id]
  }

  /**
   * Get fragments by category
   */
  getFragmentsByCategory(category: FragmentCategory): Fragment[] {
    const ids = this.index.categories[category] || []
    return ids.map(id => this.index.fragments[id]).filter(Boolean) as Fragment[]
  }

  /**
   * Search fragments by tag
   */
  searchByTag(tag: string): Fragment[] {
    const ids = this.index.tags[tag] || []
    return ids.map(id => this.index.fragments[id]).filter(Boolean) as Fragment[]
  }

  /**
   * Search fragments by text
   */
  searchText(query: string): Fragment[] {
    const lowerQuery = query.toLowerCase()

    return Object.values(this.index.fragments).filter(fragment =>
      fragment.name.toLowerCase().includes(lowerQuery)
      || fragment.description.toLowerCase().includes(lowerQuery)
      || fragment.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  /**
   * Get all fragment IDs
   */
  getAllFragmentIds(): string[] {
    return Object.keys(this.index.fragments)
  }

  /**
   * Add a custom fragment
   */
  addFragment(fragment: Fragment): void {
    this.index.fragments[fragment.id] = fragment

    // Update category index
    if (!this.index.categories[fragment.category]) {
      this.index.categories[fragment.category] = []
    }
    this.index.categories[fragment.category].push(fragment.id)

    // Update tag index
    for (const tag of fragment.tags) {
      if (!this.index.tags[tag]) {
        this.index.tags[tag] = []
      }
      if (!this.index.tags[tag].includes(fragment.id)) {
        this.index.tags[tag].push(fragment.id)
      }
    }

    // Update search index
    const words = [
      ...fragment.name.split(/\s+/),
      ...fragment.description.split(/\s+/),
      ...fragment.tags,
    ]
    for (const word of words) {
      const lowerWord = word.toLowerCase()
      if (!this.index.searchIndex[lowerWord]) {
        this.index.searchIndex[lowerWord] = []
      }
      if (!this.index.searchIndex[lowerWord].includes(fragment.id)) {
        this.index.searchIndex[lowerWord].push(fragment.id)
      }
    }
  }

  /**
   * Remove a fragment
   */
  removeFragment(id: string): boolean {
    const fragment = this.index.fragments[id]
    if (!fragment) {
      return false
    }

    // Remove from fragments
    delete this.index.fragments[id]

    // Remove from category index
    this.index.categories[fragment.category] = this.index.categories[fragment.category].filter(fid => fid !== id)

    // Remove from tag index
    for (const tag of fragment.tags) {
      this.index.tags[tag] = this.index.tags[tag].filter(fid => fid !== id)
    }

    // Remove from search index
    for (const key in this.index.searchIndex) {
      this.index.searchIndex[key] = this.index.searchIndex[key].filter(fid => fid !== id)
    }

    return true
  }

  /**
   * Get fragment statistics
   */
  getStats(): {
    totalFragments: number
    fragmentsByCategory: Record<FragmentCategory, number>
    topTags: Array<{ tag: string, count: number }>
  } {
    const fragmentsByCategory: Record<FragmentCategory, number> = {
      setup: 0,
      develop: 0,
      test: 0,
      deploy: 0,
      debug: 0,
      maintenance: 0,
      integration: 0,
      custom: 0,
    }

    for (const category in this.index.categories) {
      fragmentsByCategory[category as FragmentCategory] = this.index.categories[category as FragmentCategory].length
    }

    const topTags = Object.entries(this.index.tags)
      .map(([tag, ids]) => ({ tag, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalFragments: Object.keys(this.index.fragments).length,
      fragmentsByCategory,
      topTags,
    }
  }

  /**
   * Build fragment index
   */
  private buildIndex(): FragmentLibraryIndex {
    const fragments: Record<string, Fragment> = {}
    const categories: Record<FragmentCategory, string[]> = {
      setup: [],
      develop: [],
      test: [],
      deploy: [],
      debug: [],
      maintenance: [],
      integration: [],
      custom: [],
    }
    const tags: Record<string, string[]> = {}
    const searchIndex: Record<string, string[]> = {}

    // Collect all built-in fragments
    const allFragments = [
      ...setupFragments,
      ...developFragments,
      ...testFragments,
      ...deployFragments,
    ]

    // Index fragments
    for (const fragment of allFragments) {
      fragments[fragment.id] = fragment

      // Category index
      if (!categories[fragment.category]) {
        categories[fragment.category] = []
      }
      categories[fragment.category].push(fragment.id)

      // Tag index
      for (const tag of fragment.tags) {
        if (!tags[tag]) {
          tags[tag] = []
        }
        tags[tag].push(fragment.id)
      }

      // Search index
      const words = [
        ...fragment.name.split(/\s+/),
        ...fragment.description.split(/\s+/),
        ...fragment.tags,
      ]
      for (const word of words) {
        const lowerWord = word.toLowerCase()
        if (!searchIndex[lowerWord]) {
          searchIndex[lowerWord] = []
        }
        if (!searchIndex[lowerWord].includes(fragment.id)) {
          searchIndex[lowerWord].push(fragment.id)
        }
      }
    }

    return {
      fragments,
      categories,
      tags,
      searchIndex,
    }
  }

  /**
   * Find compatible fragments for a context
   */
  findCompatible(context: {
    platform?: string
    language?: string
    framework?: string
  }): Fragment[] {
    return Object.values(this.index.fragments).filter((fragment) => {
      if (!fragment.compatibility) {
        return true
      }

      if (
        fragment.compatibility.platforms
        && context.platform
        && !fragment.compatibility.platforms.includes(context.platform)
      ) {
        return false
      }

      if (
        fragment.compatibility.languages
        && context.language
        && !fragment.compatibility.languages.includes(context.language)
      ) {
        return false
      }

      if (
        fragment.compatibility.frameworks
        && context.framework
        && !fragment.compatibility.frameworks.includes(context.framework)
      ) {
        return false
      }

      return true
    })
  }

  /**
   * Export library as JSON
   */
  export(): string {
    return JSON.stringify(this.index, null, 2)
  }

  /**
   * Import library from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json) as FragmentLibraryIndex
      this.index = data
    }
    catch (error) {
      throw new Error(`Failed to import fragment library: ${error}`)
    }
  }
}
