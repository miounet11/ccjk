/**
 * Memory Store - Core storage and CRUD operations for memory entries
 */

import type {
  MemoryConfig,
  MemoryEntry,
  MemoryExport,
  MemoryImportance,
  MemoryIndex,
  MemoryScope,
  MemoryStats,
  MemoryType,
} from '../types/memory'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { DEFAULT_MEMORY_CONFIG } from '../types/memory'

/**
 * Generate a unique ID for memory entries
 */
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `mem_${timestamp}_${random}`
}

/**
 * Resolve path with home directory expansion
 */
function resolvePath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1))
  }
  return path
}

/**
 * Memory Store class for managing persistent memory storage
 */
export class MemoryStore {
  private config: MemoryConfig
  private memories: Map<string, MemoryEntry>
  private index: MemoryIndex
  private storagePath: string
  private memoriesFile: string
  private indexFile: string
  private configFile: string
  private dirty: boolean = false

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }
    this.storagePath = resolvePath(this.config.storagePath)
    this.memoriesFile = join(this.storagePath, 'memories.json')
    this.indexFile = join(this.storagePath, 'index.json')
    this.configFile = join(this.storagePath, 'config.json')
    this.memories = new Map()
    this.index = this.createEmptyIndex()
    this.ensureStorageDirectory()
    this.load()
  }

  /**
   * Create an empty index structure
   */
  private createEmptyIndex(): MemoryIndex {
    return {
      byType: {
        decision: [],
        pattern: [],
        preference: [],
        context: [],
        learning: [],
        error: [],
        workflow: [],
      },
      byScope: {
        global: [],
        project: [],
        session: [],
      },
      byTag: {},
      byProject: {},
      byImportance: {
        critical: [],
        high: [],
        medium: [],
        low: [],
      },
      updatedAt: Date.now(),
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true })
    }
  }

  /**
   * Load memories from disk
   */
  private load(): void {
    try {
      if (existsSync(this.memoriesFile)) {
        const data = JSON.parse(readFileSync(this.memoriesFile, 'utf-8'))
        if (Array.isArray(data)) {
          for (const entry of data) {
            this.memories.set(entry.id, entry)
          }
        }
      }

      if (existsSync(this.indexFile)) {
        const indexData = JSON.parse(readFileSync(this.indexFile, 'utf-8'))
        this.index = { ...this.createEmptyIndex(), ...indexData }
      }
      else {
        this.rebuildIndex()
      }

      if (existsSync(this.configFile)) {
        const configData = JSON.parse(readFileSync(this.configFile, 'utf-8'))
        this.config = { ...this.config, ...configData }
      }
    }
    catch (error) {
      console.error('Failed to load memory store:', error)
      this.memories = new Map()
      this.index = this.createEmptyIndex()
    }
  }

  /**
   * Save memories to disk
   */
  save(): void {
    if (!this.dirty)
      return

    try {
      this.ensureStorageDirectory()

      const memoriesArray = Array.from(this.memories.values())
      writeFileSync(this.memoriesFile, JSON.stringify(memoriesArray, null, 2))

      this.index.updatedAt = Date.now()
      writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2))

      writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))

      this.dirty = false
    }
    catch (error) {
      console.error('Failed to save memory store:', error)
      throw error
    }
  }

  /**
   * Rebuild the index from memories
   */
  rebuildIndex(): void {
    this.index = this.createEmptyIndex()

    for (const [id, entry] of this.memories) {
      this.addToIndex(id, entry)
    }

    this.dirty = true
  }

  /**
   * Add entry to index
   */
  private addToIndex(id: string, entry: MemoryEntry): void {
    if (!this.index.byType[entry.type].includes(id)) {
      this.index.byType[entry.type].push(id)
    }

    if (!this.index.byScope[entry.scope].includes(id)) {
      this.index.byScope[entry.scope].push(id)
    }

    if (!this.index.byImportance[entry.importance].includes(id)) {
      this.index.byImportance[entry.importance].push(id)
    }

    for (const tag of entry.tags) {
      if (!this.index.byTag[tag]) {
        this.index.byTag[tag] = []
      }
      if (!this.index.byTag[tag].includes(id)) {
        this.index.byTag[tag].push(id)
      }
    }

    if (entry.source.project) {
      if (!this.index.byProject[entry.source.project]) {
        this.index.byProject[entry.source.project] = []
      }
      if (!this.index.byProject[entry.source.project].includes(id)) {
        this.index.byProject[entry.source.project].push(id)
      }
    }
  }

  /**
   * Remove entry from index
   */
  private removeFromIndex(id: string, entry: MemoryEntry): void {
    this.index.byType[entry.type] = this.index.byType[entry.type].filter(i => i !== id)
    this.index.byScope[entry.scope] = this.index.byScope[entry.scope].filter(i => i !== id)
    this.index.byImportance[entry.importance] = this.index.byImportance[entry.importance].filter(i => i !== id)

    for (const tag of entry.tags) {
      if (this.index.byTag[tag]) {
        this.index.byTag[tag] = this.index.byTag[tag].filter(i => i !== id)
        if (this.index.byTag[tag].length === 0) {
          delete this.index.byTag[tag]
        }
      }
    }

    if (entry.source.project && this.index.byProject[entry.source.project]) {
      this.index.byProject[entry.source.project] = this.index.byProject[entry.source.project].filter(i => i !== id)
      if (this.index.byProject[entry.source.project].length === 0) {
        delete this.index.byProject[entry.source.project]
      }
    }
  }

  /**
   * Create a new memory entry
   */
  create(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>): MemoryEntry {
    const now = Date.now()
    const newEntry: MemoryEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
    }

    this.memories.set(newEntry.id, newEntry)
    this.addToIndex(newEntry.id, newEntry)
    this.dirty = true

    this.enforceMaxMemories()

    return newEntry
  }

  /**
   * Get a memory entry by ID
   */
  get(id: string): MemoryEntry | undefined {
    const entry = this.memories.get(id)
    if (entry) {
      entry.accessCount++
      entry.lastAccessed = Date.now()
      this.dirty = true
    }
    return entry
  }

  /**
   * Update a memory entry
   */
  update(id: string, updates: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): MemoryEntry | undefined {
    const entry = this.memories.get(id)
    if (!entry)
      return undefined

    const oldEntry = { ...entry }
    const updatedEntry: MemoryEntry = {
      ...entry,
      ...updates,
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: Date.now(),
    }

    this.removeFromIndex(id, oldEntry)
    this.memories.set(id, updatedEntry)
    this.addToIndex(id, updatedEntry)
    this.dirty = true

    return updatedEntry
  }

  /**
   * Delete a memory entry
   */
  delete(id: string): boolean {
    const entry = this.memories.get(id)
    if (!entry)
      return false

    this.removeFromIndex(id, entry)
    this.memories.delete(id)
    this.dirty = true

    return true
  }

  /**
   * Get all memories
   */
  getAll(includeArchived: boolean = false): MemoryEntry[] {
    const entries = Array.from(this.memories.values())
    if (includeArchived) {
      return entries
    }
    return entries.filter(e => !e.archived)
  }

  /**
   * Get memories by type
   */
  getByType(type: MemoryType, includeArchived: boolean = false): MemoryEntry[] {
    const ids = this.index.byType[type] || []
    return ids
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined && (includeArchived || !e.archived))
  }

  /**
   * Get memories by scope
   */
  getByScope(scope: MemoryScope, includeArchived: boolean = false): MemoryEntry[] {
    const ids = this.index.byScope[scope] || []
    return ids
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined && (includeArchived || !e.archived))
  }

  /**
   * Get memories by tag
   */
  getByTag(tag: string, includeArchived: boolean = false): MemoryEntry[] {
    const ids = this.index.byTag[tag] || []
    return ids
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined && (includeArchived || !e.archived))
  }

  /**
   * Get memories by project
   */
  getByProject(project: string, includeArchived: boolean = false): MemoryEntry[] {
    const ids = this.index.byProject[project] || []
    return ids
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined && (includeArchived || !e.archived))
  }

  /**
   * Get memories by importance
   */
  getByImportance(importance: MemoryImportance, includeArchived: boolean = false): MemoryEntry[] {
    const ids = this.index.byImportance[importance] || []
    return ids
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined && (includeArchived || !e.archived))
  }

  /**
   * Search memories by text (simple substring match)
   */
  search(query: string, includeArchived: boolean = false): MemoryEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll(includeArchived).filter(entry =>
      entry.content.toLowerCase().includes(lowerQuery)
      || entry.summary.toLowerCase().includes(lowerQuery)
      || entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  /**
   * Archive old memories based on config
   */
  archiveOldMemories(): number {
    const now = Date.now()
    const archiveThreshold = now - (this.config.archiveAfterDays * 24 * 60 * 60 * 1000)
    let archivedCount = 0

    for (const entry of this.memories.values()) {
      if (!entry.archived && entry.lastAccessed < archiveThreshold) {
        entry.archived = true
        entry.updatedAt = now
        archivedCount++
        this.dirty = true
      }
    }

    return archivedCount
  }

  /**
   * Delete archived memories based on config
   */
  deleteArchivedMemories(): number {
    const now = Date.now()
    const deleteThreshold = now - (this.config.deleteArchivedAfterDays * 24 * 60 * 60 * 1000)
    let deletedCount = 0

    for (const [id, entry] of this.memories) {
      if (entry.archived && entry.updatedAt < deleteThreshold) {
        this.delete(id)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Enforce maximum memory limit
   */
  private enforceMaxMemories(): void {
    const activeMemories = this.getAll(false)
    if (activeMemories.length <= this.config.maxMemories) {
      return
    }

    const sortedByAccess = activeMemories.sort((a, b) => a.lastAccessed - b.lastAccessed)
    const toArchive = sortedByAccess.slice(0, activeMemories.length - this.config.maxMemories)

    for (const entry of toArchive) {
      entry.archived = true
      entry.updatedAt = Date.now()
      this.dirty = true
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const all = this.getAll(true)
    const archived = all.filter(e => e.archived)

    const byType: Record<MemoryType, number> = {
      decision: 0,
      pattern: 0,
      preference: 0,
      context: 0,
      learning: 0,
      error: 0,
      workflow: 0,
    }

    const byScope: Record<MemoryScope, number> = {
      global: 0,
      project: 0,
      session: 0,
    }

    const byImportance: Record<MemoryImportance, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }

    for (const entry of all) {
      byType[entry.type]++
      byScope[entry.scope]++
      byImportance[entry.importance]++
    }

    let storageSizeBytes = 0
    try {
      if (existsSync(this.memoriesFile)) {
        storageSizeBytes += statSync(this.memoriesFile).size
      }
      if (existsSync(this.indexFile)) {
        storageSizeBytes += statSync(this.indexFile).size
      }
    }
    catch {
      // Ignore errors
    }

    return {
      totalCount: all.length,
      byType,
      byScope,
      byImportance,
      archivedCount: archived.length,
      storageSizeBytes,
      lastUpdated: this.index.updatedAt,
    }
  }

  /**
   * Export memories
   */
  export(): MemoryExport {
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      memories: this.getAll(true),
      index: this.index,
      config: this.config,
    }
  }

  /**
   * Import memories
   */
  import(data: MemoryExport, merge: boolean = false): void {
    if (!merge) {
      this.memories.clear()
      this.index = this.createEmptyIndex()
    }

    for (const entry of data.memories) {
      this.memories.set(entry.id, entry)
      this.addToIndex(entry.id, entry)
    }

    this.dirty = true
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear()
    this.index = this.createEmptyIndex()
    this.dirty = true
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...updates }
    this.dirty = true
  }
}
