/**
 * Git-Backed State Manager
 *
 * Provides crash-safe persistence for agent state using Git as the storage backend.
 * Inspired by Gastown's Hook system that uses Git worktrees for isolated agent contexts.
 *
 * @module brain/persistence/git-backed-state
 */

import type { AgentState } from '../types'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { nanoid } from 'nanoid'
import { join } from 'pathe'
import { x } from 'tinyexec'

/**
 * Git-backed state configuration
 */
export interface GitBackedStateConfig {
  /** Root directory for workspace (default: ~/.ccjk/workspace) */
  workspaceRoot?: string

  /** Use Git worktrees for isolation (default: true) */
  useWorktrees?: boolean

  /** Auto-commit on every state change (default: true) */
  autoCommit?: boolean

  /** Compression level 0-9 (default: 6) */
  compressionLevel?: number

  /** Enable verbose logging (default: false) */
  verbose?: boolean

  /** Commit batch interval in ms (default: 1000) */
  commitBatchInterval?: number
}

/**
 * State snapshot for versioning
 */
export interface StateSnapshot {
  id: string
  agentId: string
  commitId: string
  timestamp: number
  message: string
  state: AgentState
}

/**
 * State history
 */
export interface StateHistory {
  agentId: string
  commits: Array<{
    id: string
    message: string
    timestamp: number
  }>
  totalCommits: number
}

/**
 * Git-backed state manager events
 */
export interface GitBackedStateEvents {
  'initialized': () => void
  'state:saved': (agentId: string, commitId: string) => void
  'state:loaded': (agentId: string) => void
  'state:rolled-back': (agentId: string, commitId: string) => void
  'worktree:created': (agentId: string, path: string) => void
  'worktree:removed': (agentId: string) => void
  'error': (error: Error) => void
}

/**
 * Git-Backed State Manager
 *
 * Uses Git as a persistent storage backend for agent state, providing:
 * - Crash-safe persistence
 * - Version history
 * - Rollback capability
 * - Multi-device sync via Git remotes
 */
export class GitBackedStateManager extends EventEmitter {
  private readonly config: Required<GitBackedStateConfig>
  private readonly worktrees: Map<string, string> = new Map()
  private initialized = false
  private pendingCommits: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: GitBackedStateConfig = {}) {
    super()

    this.config = {
      workspaceRoot: config.workspaceRoot ?? join(homedir(), '.ccjk', 'workspace'),
      useWorktrees: config.useWorktrees ?? true,
      autoCommit: config.autoCommit ?? true,
      compressionLevel: config.compressionLevel ?? 6,
      verbose: config.verbose ?? false,
      commitBatchInterval: config.commitBatchInterval ?? 1000,
    }
  }

  /**
   * Initialize the workspace with Git
   */
  async initialize(): Promise<void> {
    if (this.initialized)
      return

    const { workspaceRoot } = this.config

    try {
      // Create workspace directory
      if (!existsSync(workspaceRoot)) {
        mkdirSync(workspaceRoot, { recursive: true })
        this.log(`Created workspace: ${workspaceRoot}`)
      }

      // Initialize Git repository if not exists
      const gitDir = join(workspaceRoot, '.git')
      if (!existsSync(gitDir)) {
        await this.exec('git', ['init'], workspaceRoot)
        this.log('Initialized Git repository')

        // Create .gitignore
        const gitignore = `
# Sensitive data
*.env
*.key
*.pem
credentials.json

# Temporary files
*.tmp
*.log
*.swp

# OS files
.DS_Store
Thumbs.db
`
        writeFileSync(join(workspaceRoot, '.gitignore'), gitignore.trim())

        // Initial commit
        await this.exec('git', ['add', '.gitignore'], workspaceRoot)
        await this.exec('git', ['commit', '-m', 'Initial commit'], workspaceRoot)
        this.log('Created initial commit')
      }

      // Create agents directory
      const agentsDir = join(workspaceRoot, 'agents')
      if (!existsSync(agentsDir)) {
        mkdirSync(agentsDir, { recursive: true })
      }

      // Load existing worktrees
      await this.loadExistingWorktrees()

      this.initialized = true
      this.emit('initialized')
      this.log('GitBackedStateManager initialized')
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Create isolated worktree for agent
   */
  async createAgentWorktree(agentId: string): Promise<string> {
    await this.ensureInitialized()

    const { workspaceRoot, useWorktrees } = this.config

    // Check if worktree already exists
    if (this.worktrees.has(agentId)) {
      return this.worktrees.get(agentId)!
    }

    const agentPath = join(workspaceRoot, 'agents', agentId)

    if (useWorktrees) {
      // Create Git worktree for isolation
      const branchName = `agent/${agentId}`

      try {
        // Create orphan branch for agent
        await this.exec('git', ['checkout', '--orphan', branchName], workspaceRoot)
        await this.exec('git', ['reset', '--hard'], workspaceRoot)
        await this.exec('git', ['checkout', 'main'], workspaceRoot).catch(() => {
          // main might not exist, try master
          return this.exec('git', ['checkout', 'master'], workspaceRoot)
        })

        // Create worktree
        if (!existsSync(agentPath)) {
          await this.exec('git', ['worktree', 'add', agentPath, branchName], workspaceRoot)
        }
      }
      catch {
        // Fallback: create simple directory if worktree fails
        if (!existsSync(agentPath)) {
          mkdirSync(agentPath, { recursive: true })
        }
      }
    }
    else {
      // Simple directory without worktree
      if (!existsSync(agentPath)) {
        mkdirSync(agentPath, { recursive: true })
      }
    }

    // Initialize state files
    const stateFile = join(agentPath, 'state.json')
    const mailboxFile = join(agentPath, 'mailbox.json')

    if (!existsSync(stateFile)) {
      writeFileSync(stateFile, JSON.stringify({ agentId, createdAt: new Date().toISOString() }, null, 2))
    }

    if (!existsSync(mailboxFile)) {
      writeFileSync(mailboxFile, JSON.stringify({ inbox: [], outbox: [], archive: [] }, null, 2))
    }

    this.worktrees.set(agentId, agentPath)
    this.emit('worktree:created', agentId, agentPath)
    this.log(`Created worktree for agent: ${agentId}`)

    return agentPath
  }

  /**
   * Save agent state to Git
   */
  async saveState(agentId: string, state: Partial<AgentState>): Promise<string> {
    await this.ensureInitialized()

    const agentPath = await this.getOrCreateAgentPath(agentId)
    const stateFile = join(agentPath, 'state.json')

    // Load existing state and merge
    let existingState: Record<string, any> = {}
    if (existsSync(stateFile)) {
      try {
        existingState = JSON.parse(readFileSync(stateFile, 'utf-8'))
      }
      catch {
        // Invalid JSON, start fresh
      }
    }

    const newState = {
      ...existingState,
      ...state,
      updatedAt: new Date().toISOString(),
    }

    // Write state file
    writeFileSync(stateFile, JSON.stringify(newState, null, 2))

    // Commit if auto-commit enabled
    let commitId = ''
    if (this.config.autoCommit) {
      commitId = await this.batchCommit(agentId, `Update state: ${agentId}`)
    }

    this.emit('state:saved', agentId, commitId)
    this.log(`Saved state for agent: ${agentId}`)

    return commitId
  }

  /**
   * Load agent state from Git
   */
  async loadState(agentId: string): Promise<AgentState | null> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      return null
    }

    const stateFile = join(agentPath, 'state.json')
    if (!existsSync(stateFile)) {
      return null
    }

    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'))
      this.emit('state:loaded', agentId)
      this.log(`Loaded state for agent: ${agentId}`)
      return state
    }
    catch {
      return null
    }
  }

  /**
   * Rollback to previous state
   */
  async rollback(agentId: string, commitId: string): Promise<void> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    try {
      // Reset to specific commit
      await this.exec('git', ['reset', '--hard', commitId], agentPath)

      this.emit('state:rolled-back', agentId, commitId)
      this.log(`Rolled back agent ${agentId} to commit ${commitId}`)
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Get state history for agent
   */
  async getHistory(agentId: string, limit = 10): Promise<StateSnapshot[]> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      return []
    }

    try {
      const result = await this.exec(
        'git',
        ['log', `--max-count=${limit}`, '--format=%H|%s|%ct', '--', 'state.json'],
        agentPath,
      )

      const snapshots: StateSnapshot[] = []

      for (const line of result.stdout.split('\n').filter(Boolean)) {
        const [commitId, message, timestamp] = line.split('|')

        // Get state at this commit
        const stateResult = await this.exec(
          'git',
          ['show', `${commitId}:state.json`],
          agentPath,
        ).catch(() => ({ stdout: '{}' }))

        let state: AgentState
        try {
          state = JSON.parse(stateResult.stdout)
        }
        catch {
          state = {} as AgentState
        }

        snapshots.push({
          id: nanoid(),
          agentId,
          commitId,
          timestamp: Number.parseInt(timestamp, 10) * 1000,
          message,
          state,
        })
      }

      return snapshots
    }
    catch {
      return []
    }
  }

  /**
   * Cleanup agent worktree
   */
  async cleanup(agentId: string): Promise<void> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      return
    }

    try {
      if (this.config.useWorktrees) {
        // Remove Git worktree
        await this.exec('git', ['worktree', 'remove', agentPath, '--force'], this.config.workspaceRoot)
      }

      this.worktrees.delete(agentId)
      this.emit('worktree:removed', agentId)
      this.log(`Cleaned up worktree for agent: ${agentId}`)
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Get all agent IDs
   */
  getAgentIds(): string[] {
    return Array.from(this.worktrees.keys())
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.worktrees.has(agentId)
  }

  /**
   * Get workspace root path
   */
  getWorkspaceRoot(): string {
    return this.config.workspaceRoot
  }

  /**
   * Get agent path
   */
  getAgentPath(agentId: string): string | undefined {
    return this.worktrees.get(agentId)
  }

  /**
   * Get state history for agent
   */
  async getStateHistory(agentId: string, limit = 20): Promise<StateHistory> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      return { agentId, commits: [], totalCommits: 0 }
    }

    try {
      const result = await this.exec(
        'git',
        ['log', `--max-count=${limit}`, '--format=%H|%s|%ct', '--', 'state.json'],
        agentPath,
      )

      const commits = result.stdout.split('\n').filter(Boolean).map((line) => {
        const [id, message, timestamp] = line.split('|')
        return {
          id,
          message,
          timestamp: Number.parseInt(timestamp, 10) * 1000,
        }
      })

      // Get total count
      const countResult = await this.exec(
        'git',
        ['rev-list', '--count', 'HEAD', '--', 'state.json'],
        agentPath,
      ).catch(() => ({ stdout: '0' }))

      return {
        agentId,
        commits,
        totalCommits: Number.parseInt(countResult.stdout.trim(), 10) || commits.length,
      }
    }
    catch {
      return { agentId, commits: [], totalCommits: 0 }
    }
  }

  /**
   * Create a named snapshot of current state
   */
  async createSnapshot(agentId: string, description: string): Promise<StateSnapshot> {
    await this.ensureInitialized()

    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // Force commit current state
    const commitId = await this.commit(agentId, `Snapshot: ${description}`)
    if (!commitId) {
      // No changes, get current HEAD
      const result = await this.exec('git', ['rev-parse', 'HEAD'], agentPath)
      const currentCommitId = result.stdout.trim()

      const state = await this.loadState(agentId)
      return {
        id: nanoid(),
        agentId,
        commitId: currentCommitId,
        timestamp: Date.now(),
        message: description,
        state: state ?? ({} as AgentState),
      }
    }

    const state = await this.loadState(agentId)
    return {
      id: nanoid(),
      agentId,
      commitId,
      timestamp: Date.now(),
      message: description,
      state: state ?? ({} as AgentState),
    }
  }

  /**
   * Restore state from a snapshot
   */
  async restoreSnapshot(agentId: string, snapshotId: string): Promise<void> {
    // snapshotId is actually the commitId
    await this.rollback(agentId, snapshotId)
  }

  /**
   * Sync with remote (if configured)
   */
  async syncWithRemote(): Promise<void> {
    await this.ensureInitialized()

    try {
      // Check if remote exists
      const remoteResult = await this.exec('git', ['remote'], this.config.workspaceRoot)
      if (!remoteResult.stdout.trim()) {
        this.log('No remote configured, skipping sync')
        return
      }

      // Pull changes
      await this.exec('git', ['pull', '--rebase'], this.config.workspaceRoot)

      // Push changes
      await this.exec('git', ['push'], this.config.workspaceRoot)

      this.log('Synced with remote')
    }
    catch (error) {
      this.log(`Sync failed: ${error}`)
    }
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private async getOrCreateAgentPath(agentId: string): Promise<string> {
    if (!this.worktrees.has(agentId)) {
      await this.createAgentWorktree(agentId)
    }
    return this.worktrees.get(agentId)!
  }

  private async loadExistingWorktrees(): Promise<void> {
    const agentsDir = join(this.config.workspaceRoot, 'agents')
    if (!existsSync(agentsDir)) {
      return
    }

    try {
      const { readdirSync, statSync } = await import('node:fs')
      const entries = readdirSync(agentsDir)

      for (const entry of entries) {
        const entryPath = join(agentsDir, entry)
        if (statSync(entryPath).isDirectory()) {
          this.worktrees.set(entry, entryPath)
          this.log(`Loaded existing worktree: ${entry}`)
        }
      }
    }
    catch {
      // Ignore errors
    }
  }

  private async batchCommit(agentId: string, message: string): Promise<string> {
    // Cancel existing pending commit for this agent
    const existing = this.pendingCommits.get(agentId)
    if (existing) {
      clearTimeout(existing)
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.pendingCommits.delete(agentId)
        const commitId = await this.commit(agentId, message)
        resolve(commitId)
      }, this.config.commitBatchInterval)

      this.pendingCommits.set(agentId, timeout)
    })
  }

  private async commit(agentId: string, message: string): Promise<string> {
    const agentPath = this.worktrees.get(agentId)
    if (!agentPath) {
      return ''
    }

    try {
      // Stage all changes
      await this.exec('git', ['add', '-A'], agentPath)

      // Check if there are changes to commit
      const statusResult = await this.exec('git', ['status', '--porcelain'], agentPath)
      if (!statusResult.stdout.trim()) {
        return ''
      }

      // Commit
      await this.exec('git', ['commit', '-m', message], agentPath)

      // Get commit ID
      const result = await this.exec('git', ['rev-parse', 'HEAD'], agentPath)
      return result.stdout.trim()
    }
    catch {
      return ''
    }
  }

  private async exec(cmd: string, args: string[], cwd: string): Promise<{ stdout: string, stderr: string }> {
    const result = await x(cmd, args, { nodeOptions: { cwd } })
    return {
      stdout: result.stdout,
      stderr: result.stderr,
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[GitBackedState] ${message}`)
    }
  }
}

// ========================================================================
// Singleton Instance
// ========================================================================

let globalStateManager: GitBackedStateManager | null = null

/**
 * Get global state manager instance
 */
export function getGlobalStateManager(config?: GitBackedStateConfig): GitBackedStateManager {
  if (!globalStateManager) {
    globalStateManager = new GitBackedStateManager(config)
  }
  return globalStateManager
}

/**
 * Reset global state manager (for testing)
 */
export function resetGlobalStateManager(): void {
  globalStateManager = null
}
