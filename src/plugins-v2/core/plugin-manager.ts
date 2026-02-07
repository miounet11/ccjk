/**
 * Plugin Manager 2.0
 *
 * Unified plugin management with support for:
 * - Cloud plugins (existing)
 * - GitHub skills (Vercel Agent Skills format)
 * - Local plugins
 * - NPM packages
 *
 * Features:
 * - Intent-based auto-activation
 * - Script execution
 * - SKILL.md parsing
 * - Multi-source installation
 *
 * @module plugins-v2/core/plugin-manager
 */

import type {
  AgentDefinition,
  InstallOptions,
  InstallResult,
  IntentMatch,
  Permission,
  PluginEvent,
  PluginEventHandler,
  PluginManifest,
  PluginPackage,
  PluginSource,
  ScriptDefinition,
  ScriptResult,
  SkillDocument,
  UpdateInfo,
} from '../types'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { x } from 'tinyexec'
import { CCJK_CONFIG_DIR, CCJK_PLUGINS_DIR, CCJK_SKILLS_DIR, CLAUDE_AGENTS_DIR } from '../../constants'
import { getAgentsDir, writeAgentFile } from '../agent-writer'
import { getIntentEngine } from '../intent/intent-engine'
import { getScriptRunner } from '../scripts/script-runner'

// ============================================================================
// Constants
// ============================================================================

import { getSkillParser } from '../skills/skill-parser'

const PLUGINS_DIR = CCJK_PLUGINS_DIR
const SKILLS_DIR = CCJK_SKILLS_DIR
/** Agents directory - uses ~/.claude/agents for Claude Code compatibility */
const AGENTS_DIR = CLAUDE_AGENTS_DIR
const CONFIG_FILE = join(CCJK_CONFIG_DIR, 'plugins.json')

// ============================================================================
// Plugin Manager Class
// ============================================================================

/**
 * Plugin Manager 2.0
 *
 * Manages plugins, skills, and agents with unified interface
 */
export class PluginManager {
  private plugins: Map<string, PluginPackage> = new Map()
  private agents: Map<string, AgentDefinition> = new Map()
  private eventHandlers: Set<PluginEventHandler> = new Set()
  private initialized = false

  constructor() {
    this.ensureDirectories()
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized)
      return

    // Load installed plugins
    await this.loadInstalledPlugins()

    // Load installed agents
    await this.loadInstalledAgents()

    // Register intents from all plugins
    this.registerAllIntents()

    this.initialized = true
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    for (const dir of [PLUGINS_DIR, SKILLS_DIR, AGENTS_DIR]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  // ==========================================================================
  // Plugin Installation
  // ==========================================================================

  /**
   * Install a plugin from various sources
   *
   * @param source - Plugin source (cloud, github, local, npm)
   * @param options - Installation options
   */
  async install(source: string | PluginSource, options: InstallOptions = {}): Promise<InstallResult> {
    const resolvedSource = typeof source === 'string' ? this.resolveSource(source) : source

    try {
      let result: InstallResult

      switch (resolvedSource.type) {
        case 'cloud':
          result = await this.installFromCloud(resolvedSource.url, options)
          break
        case 'github':
          result = await this.installFromGitHub(resolvedSource.repo, resolvedSource.ref, options)
          break
        case 'local':
          result = await this.installFromLocal(resolvedSource.path, options)
          break
        case 'npm':
          result = await this.installFromNpm(resolvedSource.package, options)
          break
        default:
          return { success: false, pluginId: '', error: 'Unknown source type' }
      }

      if (result.success) {
        this.emit({ type: 'plugin:installed', pluginId: result.pluginId, version: result.version! })
      }

      return result
    }
    catch (error) {
      return {
        success: false,
        pluginId: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Install from GitHub (supports Vercel Agent Skills format)
   */
  private async installFromGitHub(
    repo: string,
    ref?: string,
    options: InstallOptions = {},
  ): Promise<InstallResult> {
    // Parse repo format: owner/repo or owner/repo/path
    const parts = repo.split('/')
    if (parts.length < 2) {
      return { success: false, pluginId: '', error: 'Invalid GitHub repo format' }
    }

    const owner = parts[0]
    const repoName = parts[1]
    const subPath = parts.slice(2).join('/')

    // Clone or download
    const targetDir = join(SKILLS_DIR, `${owner}-${repoName}${subPath ? `-${subPath.replace(/\//g, '-')}` : ''}`)

    if (existsSync(targetDir)) {
      if (options.force) {
        rmSync(targetDir, { recursive: true })
      }
      else {
        return { success: false, pluginId: '', error: 'Plugin already installed. Use --force to reinstall.' }
      }
    }

    try {
      // Clone the repo
      const cloneUrl = `https://github.com/${owner}/${repoName}.git`
      await x('git', ['clone', '--depth', '1', ...(ref ? ['--branch', ref] : []), cloneUrl, targetDir])

      // If subPath specified, move to correct location
      if (subPath) {
        const subDir = join(targetDir, subPath)
        if (!existsSync(subDir)) {
          rmSync(targetDir, { recursive: true })
          return { success: false, pluginId: '', error: `Path ${subPath} not found in repo` }
        }
        // Move subdir content to targetDir
        const tempDir = `${targetDir}-temp`
        await x('mv', [subDir, tempDir])
        rmSync(targetDir, { recursive: true })
        await x('mv', [tempDir, targetDir])
      }

      // Load the plugin
      const plugin = await this.loadPluginFromDirectory(targetDir)
      if (!plugin) {
        rmSync(targetDir, { recursive: true })
        return { success: false, pluginId: '', error: 'Invalid plugin format' }
      }

      // Register plugin
      this.plugins.set(plugin.manifest.id, plugin)
      this.registerPluginIntents(plugin)
      this.saveConfig()

      return {
        success: true,
        pluginId: plugin.manifest.id,
        version: plugin.manifest.version,
        path: targetDir,
      }
    }
    catch (error) {
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true })
      }
      return {
        success: false,
        pluginId: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Install from local directory
   */
  private async installFromLocal(path: string, options: InstallOptions = {}): Promise<InstallResult> {
    if (!existsSync(path)) {
      return { success: false, pluginId: '', error: `Path not found: ${path}` }
    }

    const plugin = await this.loadPluginFromDirectory(path)
    if (!plugin) {
      return { success: false, pluginId: '', error: 'Invalid plugin format' }
    }

    // Copy to plugins directory
    const targetDir = join(PLUGINS_DIR, plugin.manifest.id)
    if (existsSync(targetDir) && !options.force) {
      return { success: false, pluginId: '', error: 'Plugin already installed. Use --force to reinstall.' }
    }

    await x('cp', ['-r', path, targetDir])

    // Register plugin
    this.plugins.set(plugin.manifest.id, { ...plugin, source: { type: 'local', path: targetDir } })
    this.registerPluginIntents(plugin)
    this.saveConfig()

    return {
      success: true,
      pluginId: plugin.manifest.id,
      version: plugin.manifest.version,
      path: targetDir,
    }
  }

  /**
   * Install from cloud registry
   */
  private async installFromCloud(url: string, options: InstallOptions = {}): Promise<InstallResult> {
    // TODO: Implement cloud installation
    // This will integrate with existing cloud-plugins system
    return { success: false, pluginId: '', error: 'Cloud installation not yet implemented in v2' }
  }

  /**
   * Install from NPM
   */
  private async installFromNpm(packageName: string, options: InstallOptions = {}): Promise<InstallResult> {
    const targetDir = join(PLUGINS_DIR, packageName.replace(/\//g, '-'))

    try {
      // Install package
      await x('npm', ['pack', packageName, '--pack-destination', targetDir])

      // Extract and load
      // TODO: Implement NPM package extraction

      return { success: false, pluginId: '', error: 'NPM installation not yet fully implemented' }
    }
    catch (error) {
      return {
        success: false,
        pluginId: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Resolve source string to PluginSource
   */
  private resolveSource(source: string): PluginSource {
    // GitHub format: github:owner/repo or owner/repo
    if (source.startsWith('github:') || source.match(/^[\w-]+\/[\w-]+/)) {
      const repo = source.replace('github:', '')
      return { type: 'github', repo }
    }

    // NPM format: npm:package or @scope/package
    if (source.startsWith('npm:') || source.startsWith('@')) {
      const pkg = source.replace('npm:', '')
      return { type: 'npm', package: pkg }
    }

    // Local path
    if (source.startsWith('/') || source.startsWith('./') || source.startsWith('~')) {
      const path = source.startsWith('~') ? source.replace('~', homedir()) : source
      return { type: 'local', path }
    }

    // Default to cloud
    return { type: 'cloud', url: source }
  }

  // ==========================================================================
  // Plugin Loading
  // ==========================================================================

  /**
   * Load plugin from directory
   */
  private async loadPluginFromDirectory(dirPath: string): Promise<PluginPackage | null> {
    const parser = getSkillParser()

    // Check for plugin.json (v2 format)
    const manifestPath = join(dirPath, 'plugin.json')
    const skillPath = join(dirPath, 'SKILL.md')

    let manifest: PluginManifest

    if (existsSync(manifestPath)) {
      // Load manifest
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    }
    else if (existsSync(skillPath)) {
      // Generate manifest from SKILL.md
      const skill = parser.parse(skillPath)
      manifest = this.generateManifestFromSkill(skill, dirPath)
    }
    else {
      return null
    }

    // Load SKILL.md if exists
    const skill = existsSync(skillPath) ? await Promise.resolve(parser.parse(skillPath)) : undefined

    // Load scripts
    const scripts = this.loadScripts(dirPath)

    // Load intents
    const intents = this.loadIntents(dirPath, manifest.id)

    return {
      manifest,
      skill,
      scripts,
      intents,
      source: { type: 'local', path: dirPath },
    }
  }

  /**
   * Generate manifest from SKILL.md
   */
  private generateManifestFromSkill(skill: SkillDocument, dirPath: string): PluginManifest {
    const dirName = dirPath.split('/').pop() || 'unknown'

    return {
      id: dirName,
      name: { 'en': skill.title, 'zh-CN': skill.title },
      description: { 'en': skill.description, 'zh-CN': skill.description },
      version: '1.0.0',
      author: { name: 'Unknown' },
      category: 'other',
      tags: [],
      permissions: ['file:read'],
      formatVersion: '2.0',
    }
  }

  /**
   * Load scripts from directory
   */
  private loadScripts(dirPath: string): ScriptDefinition[] {
    const scripts: ScriptDefinition[] = []
    const scriptsDir = join(dirPath, 'scripts')

    if (!existsSync(scriptsDir))
      return scripts

    const entries = readdirSync(scriptsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.'))
        let type: ScriptDefinition['type'] | null = null

        if (['.sh', '.bash'].includes(ext))
          type = 'bash'
        else if (['.js', '.mjs'].includes(ext))
          type = 'node'
        else if (ext === '.py')
          type = 'python'

        if (type) {
          scripts.push({
            name: entry.name.replace(/\.[^.]+$/, ''),
            path: `scripts/${entry.name}`,
            type,
            permissions: ['shell:execute'],
          })
        }
      }
    }

    return scripts
  }

  /**
   * Load intents from directory
   */
  private loadIntents(dirPath: string, pluginId: string): PluginPackage['intents'] {
    const intentsPath = join(dirPath, 'intents', 'intents.yaml')

    if (!existsSync(intentsPath))
      return undefined

    // TODO: Parse YAML intents file
    return undefined
  }

  /**
   * Load all installed plugins
   */
  private async loadInstalledPlugins(): Promise<void> {
    // Load from plugins directory
    if (existsSync(PLUGINS_DIR)) {
      const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const plugin = await this.loadPluginFromDirectory(join(PLUGINS_DIR, entry.name))
          if (plugin) {
            this.plugins.set(plugin.manifest.id, plugin)
          }
        }
      }
    }

    // Load from skills directory
    if (existsSync(SKILLS_DIR)) {
      const entries = readdirSync(SKILLS_DIR, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const plugin = await this.loadPluginFromDirectory(join(SKILLS_DIR, entry.name))
          if (plugin) {
            this.plugins.set(plugin.manifest.id, plugin)
          }
        }
      }
    }
  }

  // ==========================================================================
  // Intent Management
  // ==========================================================================

  /**
   * Register intents from all plugins
   */
  private registerAllIntents(): void {
    const engine = getIntentEngine()

    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.intents) {
        engine.registerRules(plugin.intents)
      }
    }
  }

  /**
   * Register intents from a single plugin
   */
  private registerPluginIntents(plugin: PluginPackage): void {
    if (plugin.intents) {
      const engine = getIntentEngine()
      engine.registerRules(plugin.intents)
    }
  }

  /**
   * Detect intent and get matching plugins
   */
  async detectIntent(userInput: string, cwd: string): Promise<IntentMatch[]> {
    const engine = getIntentEngine()
    return engine.detect(userInput, cwd)
  }

  /**
   * Execute based on detected intent
   */
  async executeIntent(match: IntentMatch, cwd: string): Promise<unknown> {
    const plugin = this.plugins.get(match.pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${match.pluginId}`)
    }

    this.emit({ type: 'plugin:activated', pluginId: match.pluginId, trigger: 'intent' })

    // If plugin has scripts, execute the main one
    if (plugin.scripts && plugin.scripts.length > 0) {
      const mainScript = plugin.scripts.find(s => s.name === 'main') || plugin.scripts[0]
      const runner = getScriptRunner()

      const pluginPath = plugin.source.type === 'local' ? plugin.source.path : ''
      const result = await runner.execute(mainScript, pluginPath, { cwd })

      this.emit({ type: 'intent:executed', match, result })
      return result
    }

    // Return skill content for AI to use
    if (plugin.skill) {
      this.emit({ type: 'intent:executed', match, result: plugin.skill })
      return plugin.skill
    }

    return null
  }

  // ==========================================================================
  // Agent Management
  // ==========================================================================

  /**
   * Create an agent from skills and MCP servers
   *
   * Writes agent to project-local `.claude-code/agents/` in Markdown format
   * for Claude Code compatibility.
   */
  async createAgent(definition: AgentDefinition, options?: { projectDir?: string, global?: boolean }): Promise<void> {
    // Validate skills exist
    for (const skillRef of definition.skills) {
      if (!this.plugins.has(skillRef.pluginId)) {
        throw new Error(`Skill not found: ${skillRef.pluginId}`)
      }
    }

    // Save agent definition using agent-writer (Markdown format for Claude Code)
    await writeAgentFile(definition, {
      format: 'markdown',
      projectDir: options?.projectDir,
      global: options?.global || false,
    })

    this.agents.set(definition.id, definition)
    this.emit({ type: 'agent:created', agentId: definition.id })
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId)
  }

  /**
   * List all agents
   */
  listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }

  /**
   * Load installed agents from both project-local and global directories
   *
   * Supports:
   * - Project-local `.claude-code/agents/*.md` (Claude Code format)
   * - Global `~/.claude/agents/*.md` (Claude Code compatible)
   */
  private async loadInstalledAgents(): Promise<void> {
    // Load from project-local directory (Claude Code format)
    const projectAgentsDir = getAgentsDir()
    if (existsSync(projectAgentsDir)) {
      const entries = readdirSync(projectAgentsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = readFileSync(join(projectAgentsDir, entry.name), 'utf-8')
            const agent = this.parseMarkdownAgent(content, entry.name)
            if (agent) {
              this.agents.set(agent.id, agent)
            }
          }
          catch {
            // Skip invalid agent files
          }
        }
      }
    }

    // Load from global directory (legacy JSON format) for backward compatibility
    if (existsSync(AGENTS_DIR)) {
      const entries = readdirSync(AGENTS_DIR, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = readFileSync(join(AGENTS_DIR, entry.name), 'utf-8')
            const agent = JSON.parse(content) as AgentDefinition
            // Don't override project-local agents
            if (!this.agents.has(agent.id)) {
              this.agents.set(agent.id, agent)
            }
          }
          catch {
            // Skip invalid agent files
          }
        }
      }
    }
  }

  /**
   * Parse a Markdown agent file to AgentDefinition
   */
  private parseMarkdownAgent(content: string, filename: string): AgentDefinition | null {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch)
      return null

    const frontmatter = frontmatterMatch[1]
    const lines = frontmatter.split('\n')

    let id = filename.replace(/\.md$/, '')
    let name = id
    let description = ''
    const tools: string[] = []

    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1)
        continue

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      if (key === 'name') {
        id = value
        name = value
      }
      else if (key === 'description') {
        description = value
      }
      else if (key === 'tools') {
        tools.push(...value.split(',').map(t => t.trim()).filter(Boolean))
      }
    }

    // Extract body as persona/instructions
    const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
    const persona = bodyMatch ? bodyMatch[1].trim() : ''

    return {
      id,
      name: { 'en': name, 'zh-CN': name },
      description: { 'en': description, 'zh-CN': description },
      persona,
      instructions: persona, // Use persona as instructions
      skills: [],
      mcpServers: [],
      capabilities: [],
    }
  }

  // ==========================================================================
  // Plugin Management
  // ==========================================================================

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin)
      return false

    // Remove from disk
    if (plugin.source.type === 'local') {
      rmSync(plugin.source.path, { recursive: true })
    }

    // Unregister intents
    const engine = getIntentEngine()
    engine.unregisterPluginRules(pluginId)

    // Remove from memory
    this.plugins.delete(pluginId)
    this.saveConfig()

    this.emit({ type: 'plugin:uninstalled', pluginId })
    return true
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): PluginPackage | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * List all installed plugins
   */
  listPlugins(): PluginPackage[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Check for updates
   */
  async checkUpdates(): Promise<UpdateInfo[]> {
    // TODO: Implement update checking
    return []
  }

  // ==========================================================================
  // Script Execution
  // ==========================================================================

  /**
   * Execute a plugin script
   */
  async executeScript(
    pluginId: string,
    scriptName: string,
    options: { args?: string[], cwd?: string } = {},
  ): Promise<ScriptResult> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    const script = plugin.scripts?.find(s => s.name === scriptName)
    if (!script) {
      throw new Error(`Script not found: ${scriptName}`)
    }

    const runner = getScriptRunner()
    const pluginPath = plugin.source.type === 'local' ? plugin.source.path : ''

    this.emit({ type: 'script:started', pluginId, scriptName })
    const result = await runner.execute(script, pluginPath, options)
    this.emit({ type: 'script:completed', pluginId, scriptName, result })

    return result
  }

  /**
   * Grant permission to script runner
   */
  grantPermission(permission: Permission): void {
    const runner = getScriptRunner()
    runner.grantPermission(permission)
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to plugin events
   */
  on(handler: PluginEventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  /**
   * Emit an event
   */
  private emit(event: PluginEvent): void {
    for (const handler of Array.from(this.eventHandlers)) {
      try {
        handler(event)
      }
      catch (error) {
        console.error('Event handler error:', error)
      }
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Save configuration
   */
  private saveConfig(): void {
    const config = {
      plugins: Array.from(this.plugins.entries()).map(([id, p]) => ({
        id,
        source: p.source,
        version: p.manifest.version,
      })),
      agents: Array.from(this.agents.keys()),
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: PluginManager | null = null

/**
 * Get the singleton PluginManager instance
 */
export async function getPluginManager(): Promise<PluginManager> {
  if (!managerInstance) {
    managerInstance = new PluginManager()
    await managerInstance.initialize()
  }
  return managerInstance
}

/**
 * Reset the manager instance (for testing)
 */
export function resetPluginManager(): void {
  managerInstance = null
}
