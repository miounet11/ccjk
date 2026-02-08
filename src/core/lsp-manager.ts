/**
 * LSP Manager - Manages multiple LSP server instances
 *
 * Handles detection, starting, stopping, and communication with
 * language servers based on file types and project configuration.
 */

import type {
  LspDiagnosticReport,
  LspFeatureRequest,
  LspFeatureResponse,
  LspManagerConfig,
  LspServerCapabilities,
  LspServerConfig,
  LspServerId,
  LspServerState,
  LspStatusInfo,
} from '../types/lsp'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'pathe'
import { commandExists } from '../utils/platform'
import { LspClient } from './lsp-client'

/**
 * File extension to LSP server mapping
 */
const EXTENSION_TO_SERVER: Record<string, LspServerId> = {
  // TypeScript/JavaScript
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // Python
  '.py': 'python',
  '.pyi': 'python',
  '.pyw': 'python',

  // Rust
  '.rs': 'rust',

  // Go
  '.go': 'go',

  // C/C++
  '.c': 'cpp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',

  // C#
  '.cs': 'csharp',

  // Java
  '.java': 'java',

  // PHP
  '.php': 'php',

  // Ruby
  '.rb': 'ruby',
  '.gemspec': 'ruby',

  // Lua
  '.lua': 'lua',

  // Vim
  '.vim': 'vim',
  '.v': 'vim',

  // YAML
  '.yaml': 'yaml',
  '.yml': 'yaml',

  // JSON
  '.json': 'json',
  '.jsonc': 'json',

  // CSS
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',

  // HTML
  '.html': 'html',
  '.htm': 'html',

  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',

  // GraphQL
  '.graphql': 'graphql',
  '.gql': 'graphql',

  // Terraform
  '.tf': 'terraform',
  '.tfvars': 'terraform',

  // Docker
  'Dockerfile': 'dockerfile',
  '.dockerfile': 'dockerfile',

  // Tailwind
  '.tailwindcss': 'tailwindcss',
}

/**
 * LSP Manager class for managing multiple LSP servers
 */
export class LspManager {
  private servers = new Map<LspServerId, LspServerState>()
  private clients = new Map<LspServerId, LspClient>()
  private fileToServer = new Map<string, LspServerId>()
  private config: Required<LspManagerConfig>

  constructor(
    private serverConfigs: LspServerConfig[],
    config: LspManagerConfig = {},
  ) {
    this.config = {
      maxServers: config.maxServers ?? 10,
      defaultStartupTimeout: config.defaultStartupTimeout ?? 10000,
      defaultRequestTimeout: config.defaultRequestTimeout ?? 5000,
      enableLogging: config.enableLogging ?? false,
      logDir: config.logDir ?? join(process.cwd(), '.ccjk', 'lsp-logs'),
      autoRestart: config.autoRestart ?? true,
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      restartDelay: config.restartDelay ?? 1000,
    }

    // Initialize server states
    for (const serverConfig of serverConfigs) {
      this.servers.set(serverConfig.id, {
        id: serverConfig.id,
        status: 'stopped',
        restartCount: 0,
        files: new Set(),
      })
    }
  }

  /**
   * Get the LSP server ID for a file
   */
  getServerForFile(filePath: string): LspServerId | null {
    const ext = extname(filePath)
    const fileName = filePath.split('/').pop() ?? filePath

    // Check exact filename match first (for Dockerfile, etc.)
    if (EXTENSION_TO_SERVER[fileName]) {
      return EXTENSION_TO_SERVER[fileName]
    }

    return EXTENSION_TO_SERVER[ext] ?? null
  }

  /**
   * Check if a server is available (installed and ready)
   */
  async isServerAvailable(serverId: LspServerId): Promise<boolean> {
    const config = this.serverConfigs.find(c => c.id === serverId)
    if (!config) {
      return false
    }

    // Check command availability
    const command = config.command
    const hasCommand = await commandExists(command)
    if (!hasCommand) {
      return false
    }

    // Check required files
    if (config.requires?.files) {
      for (const file of config.requires.files) {
        if (!existsSync(file)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Detect available LSP servers from project configuration
   */
  async detectAvailableServers(projectPath: string = process.cwd()): Promise<LspServerId[]> {
    const available: LspServerId[] = []

    for (const config of this.serverConfigs) {
      // Check if server is available
      const isAvailable = await this.isServerAvailable(config.id)
      if (!isAvailable) {
        this.updateServerState(config.id, { status: 'not-installed' })
        continue
      }

      // Check project-specific files
      let shouldEnable = config.enabled ?? false

      // Auto-detect based on project files
      if (config.autoStart) {
        const hasProjectFiles = await this.hasProjectFiles(projectPath, config)
        shouldEnable = shouldEnable || hasProjectFiles
      }

      if (shouldEnable) {
        available.push(config.id)
      }
    }

    return available
  }

  /**
   * Check if project has files relevant to the LSP server
   */
  private async hasProjectFiles(projectPath: string, config: LspServerConfig): Promise<boolean> {
    if (!config.extensions || config.extensions.length === 0) {
      return false
    }

    const { readdirSync } = await import('node:fs')
    const { existsSync } = await import('node:fs')

    if (!existsSync(projectPath)) {
      return false
    }

    try {
      const files = readdirSync(projectPath, { recursive: true, withFileTypes: true })
      for (const file of files) {
        if (file.isFile()) {
          const ext = extname(file.name)
          if (config.extensions.includes(ext)) {
            return true
          }
        }
      }
    }
    catch {
      return false
    }

    return false
  }

  /**
   * Start an LSP server
   */
  async startServer(serverId: LspServerId): Promise<void> {
    const state = this.servers.get(serverId)
    if (!state) {
      throw new Error(`Unknown LSP server: ${serverId}`)
    }

    if (state.status === 'running' || state.status === 'starting') {
      return
    }

    const config = this.serverConfigs.find(c => c.id === serverId)
    if (!config) {
      throw new Error(`No configuration for server: ${serverId}`)
    }

    this.updateServerState(serverId, { status: 'starting' })

    try {
      const client = new LspClient(config, {
        requestTimeout: this.config.defaultRequestTimeout,
        debug: this.config.enableLogging,
        logger: this.log.bind(this),
      })

      // Set up client event handlers
      client.on('error', (error) => {
        this.log(`LSP server ${serverId} error:`, error)
        this.handleServerError(serverId, error)
      })

      client.on('exit', () => {
        this.log(`LSP server ${serverId} exited`)
        this.handleServerExit(serverId)
      })

      client.on('diagnostics', (params) => {
        this.emit('diagnostics', {
          uri: params.uri,
          diagnostics: params.diagnostics,
          serverId,
        } as LspDiagnosticReport)
      })

      await client.start()

      this.clients.set(serverId, client)
      this.updateServerState(serverId, {
        status: 'running',
        pid: client.getPid(),
        startTime: new Date(),
        capabilities: client.getCapabilities() ?? undefined,
      })
    }
    catch (error) {
      this.updateServerState(serverId, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Stop an LSP server
   */
  async stopServer(serverId: LspServerId): Promise<void> {
    const client = this.clients.get(serverId)
    if (!client) {
      return
    }

    await client.stop()
    this.clients.delete(serverId)
    this.updateServerState(serverId, { status: 'stopped' })
  }

  /**
   * Start all available LSP servers
   */
  async startAll(): Promise<void> {
    const available = await this.detectAvailableServers()

    for (const serverId of available) {
      try {
        await this.startServer(serverId)
      }
      catch (error) {
        this.log(`Failed to start LSP server ${serverId}:`, error)
      }
    }
  }

  /**
   * Stop all running LSP servers
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = []

    for (const serverId of this.clients.keys()) {
      stopPromises.push(this.stopServer(serverId))
    }

    await Promise.all(stopPromises)
  }

  /**
   * Restart an LSP server
   */
  async restartServer(serverId: LspServerId): Promise<void> {
    await this.stopServer(serverId)
    await this.startServer(serverId)
  }

  /**
   * Get server state
   */
  getServerState(serverId: LspServerId): LspServerState | undefined {
    return this.servers.get(serverId)
  }

  /**
   * Get all server states
   */
  getAllServerStates(): Record<LspServerId, LspServerState> {
    const result: Record<string, LspServerState> = {}
    for (const [id, state] of this.servers) {
      result[id] = {
        ...state,
        files: new Set(state.files), // Clone the Set
      }
    }
    return result as Record<LspServerId, LspServerState>
  }

  /**
   * Get status information
   */
  getStatus(): LspStatusInfo {
    let runningCount = 0
    let stoppedCount = 0
    let errorCount = 0
    let notInstalledCount = 0

    for (const state of this.servers.values()) {
      switch (state.status) {
        case 'running':
          runningCount++
          break
        case 'stopped':
          stoppedCount++
          break
        case 'error':
          errorCount++
          break
        case 'not-installed':
          notInstalledCount++
          break
      }
    }

    return {
      servers: this.getAllServerStates(),
      runningCount,
      stoppedCount,
      errorCount,
      notInstalledCount,
    }
  }

  /**
   * Enable/disable a server
   */
  async setServerEnabled(serverId: LspServerId, enabled: boolean): Promise<void> {
    const config = this.serverConfigs.find(c => c.id === serverId)
    if (!config) {
      throw new Error(`Unknown LSP server: ${serverId}`)
    }

    config.enabled = enabled

    if (enabled) {
      await this.startServer(serverId)
    }
    else {
      await this.stopServer(serverId)
    }
  }

  /**
   * Execute a feature request on the appropriate server
   */
  async executeFeature<T = any>(request: LspFeatureRequest): Promise<LspFeatureResponse<T>> {
    const client = this.clients.get(request.serverId)

    if (!client) {
      return {
        error: `LSP server not running: ${request.serverId}`,
        code: -1,
      }
    }

    try {
      const data = await client.sendRequest<T>(request.method, request.params, request.timeout)
      return { data }
    }
    catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        code: -2,
      }
    }
  }

  /**
   * Go to definition
   */
  async goToDefinition(serverId: LspServerId, uri: string, line: number, character: number): Promise<LspFeatureResponse> {
    return this.executeFeature({
      serverId,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri },
        position: { line, character },
      },
    })
  }

  /**
   * Find references
   */
  async findReferences(serverId: LspServerId, uri: string, line: number, character: number): Promise<LspFeatureResponse> {
    return this.executeFeature({
      serverId,
      method: 'textDocument/references',
      params: {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration: true },
      },
    })
  }

  /**
   * Get hover documentation
   */
  async hover(serverId: LspServerId, uri: string, line: number, character: number): Promise<LspFeatureResponse> {
    return this.executeFeature({
      serverId,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line, character },
      },
    })
  }

  /**
   * Get completions
   */
  async completions(serverId: LspServerId, uri: string, line: number, character: number): Promise<LspFeatureResponse> {
    return this.executeFeature({
      serverId,
      method: 'textDocument/completion',
      params: {
        textDocument: { uri },
        position: { line, character },
      },
    })
  }

  /**
   * Get document symbols
   */
  async documentSymbols(serverId: LspServerId, uri: string): Promise<LspFeatureResponse> {
    return this.executeFeature({
      serverId,
      method: 'textDocument/documentSymbol',
      params: { textDocument: { uri } },
    })
  }

  /**
   * Open a document in the appropriate LSP server
   */
  async openDocument(filePath: string): Promise<void> {
    const serverId = this.getServerForFile(filePath)
    if (!serverId) {
      return
    }

    const client = this.clients.get(serverId)
    if (!client) {
      return
    }

    const content = await readFile(filePath, 'utf-8')
    const ext = extname(filePath)

    // Map extension to language ID
    const languageId = this.getLanguageId(ext)

    client.openDocument({
      textDocument: {
        uri: filePath,
        languageId,
        version: 1,
        text: content,
      },
    })

    this.fileToServer.set(filePath, serverId)
    const state = this.servers.get(serverId)
    if (state) {
      state.files.add(filePath)
    }
  }

  /**
   * Close a document
   */
  async closeDocument(filePath: string): Promise<void> {
    const serverId = this.fileToServer.get(filePath)
    if (!serverId) {
      return
    }

    const client = this.clients.get(serverId)
    if (!client) {
      return
    }

    client.closeDocument({ textDocument: { uri: filePath } })

    this.fileToServer.delete(filePath)
    const state = this.servers.get(serverId)
    if (state) {
      state.files.delete(filePath)
    }
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(serverId: LspServerId): LspServerCapabilities | null {
    return this.servers.get(serverId)?.capabilities ?? null
  }

  /**
   * Handle server error
   */
  private handleServerError(serverId: LspServerId, error: Error): void {
    this.updateServerState(serverId, {
      status: 'error',
      error: error.message,
    })

    if (this.config.autoRestart) {
      const state = this.servers.get(serverId)
      if (state && state.restartCount < this.config.maxRestartAttempts) {
        setTimeout(() => {
          this.restartServer(serverId)
        }, this.config.restartDelay)
      }
    }
  }

  /**
   * Handle server exit
   */
  private handleServerExit(serverId: LspServerId): void {
    this.clients.delete(serverId)
    this.updateServerState(serverId, { status: 'stopped' })
  }

  /**
   * Update server state
   */
  private updateServerState(serverId: LspServerId, updates: Partial<LspServerState>): void {
    const state = this.servers.get(serverId)
    if (state) {
      Object.assign(state, updates)
      this.emit('serverStateChanged', { serverId, state })
    }
  }

  /**
   * Map file extension to LSP language ID
   */
  private getLanguageId(ext: string): string {
    const mapping: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.java': 'java',
      '.php': 'php',
      '.rb': 'ruby',
      '.lua': 'lua',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.html': 'html',
      '.md': 'markdown',
      '.graphql': 'graphql',
      '.tf': 'terraform',
    }

    return mapping[ext] ?? ext.substring(1)
  }

  /**
   * Log a message
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[LspManager] ${message}`, ...args)
    }
  }

  /**
   * Emit an event
   */
  private emit(_event: string, ..._args: any[]): void {
    // TODO: Implement event emitter if needed
  }
}

/**
 * LSP Manager singleton instance
 */
let lspManagerInstance: LspManager | null = null

/**
 * Get or create the LSP Manager singleton
 */
export async function getLspManager(configs?: LspServerConfig[], managerConfig?: LspManagerConfig): Promise<LspManager> {
  if (!lspManagerInstance) {
    const serverConfigs = configs ?? (await import('../config/lsp-servers')).LSP_SERVER_CONFIGS
    lspManagerInstance = new LspManager(serverConfigs, managerConfig)
  }
  return lspManagerInstance
}

/**
 * Reset the LSP Manager singleton (useful for testing)
 */
export function resetLspManager(): void {
  lspManagerInstance = null
}
