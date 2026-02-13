import type { ProjectContext } from './project-scanner'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { getPlatform } from '../utils/platform'
import { scanProject } from './project-scanner'

export interface SmartDefaults {
  // Environment detection
  platform: string
  homeDir: string

  // API configuration
  apiProvider?: string
  apiKey?: string

  // Core services and tools
  mcpServices: string[]
  skills: string[]
  agents: string[]
  codeToolType?: string

  // Workflow preferences
  workflows: {
    outputStyle: string
    gitWorkflow: string
    sixStepWorkflow: boolean
  }

  // Tool integrations
  tools: {
    ccr: boolean
    cometix: boolean
    ccusage: boolean
  }

  // Claude Code native features (version-dependent)
  nativeFeatures: {
    hooks: boolean
    plansDirectory: boolean
    memory: boolean
    subagents: boolean
    toolSearch: boolean
    statusLine: boolean
  }

  // Detected Claude Code version
  claudeCodeVersion?: string

  // Project context (detected from CWD)
  projectContext?: ProjectContext

  // Recommended hook template IDs based on project
  recommendedHooks: string[]

  /** True when an SSH session is detected — can be used by quick-setup to show a notice */
  sshDetected?: boolean
}

/**
 * Smart defaults detection for one-click CCJK installation
 * Detects environment and provides intelligent defaults
 */
export class SmartDefaultsDetector {
  /**
   * Detect environment and generate smart defaults
   */
  async detect(cwd?: string): Promise<SmartDefaults> {
    const platform = getPlatform()
    const apiKey = this.detectApiKey()
    const apiProvider = this.detectApiProvider(apiKey)
    const ccVersion = this.detectClaudeCodeVersion()
    const projectContext = scanProject(cwd)

    return {
      // Environment detection
      platform,
      homeDir: homedir(),

      // API configuration
      apiKey,
      apiProvider,

      // Recommended MCP services based on platform + project
      mcpServices: this.getRecommendedMcpServices(platform, projectContext),

      // Essential skills — reduced in CI/container (non-interactive)
      skills: (projectContext.runtime.isCI || projectContext.runtime.isContainer)
        ? ['ccjk:git-commit']
        : [
            'ccjk:git-commit',
            'ccjk:feat',
            'ccjk:workflow',
            'ccjk:init-project',
            'ccjk:git-worktree',
          ],

      // Core agents — skip in CI/container (non-interactive)
      agents: (projectContext.runtime.isCI || projectContext.runtime.isContainer)
        ? []
        : [
            'typescript-cli-architect',
            'ccjk-testing-specialist',
          ],

      // Code tool detection
      codeToolType: this.detectCodeToolType(),

      // Workflow preferences
      workflows: {
        outputStyle: 'engineer-professional',
        gitWorkflow: projectContext.usesConventionalCommits ? 'conventional-commits' : 'conventional-commits',
        sixStepWorkflow: true,
      },

      // Tool integrations
      tools: {
        ccr: this.shouldEnableCCR(),
        cometix: this.shouldEnableCometix(),
        ccusage: this.shouldEnableCCUsage(),
      },

      // Claude Code native features
      claudeCodeVersion: ccVersion,
      nativeFeatures: this.detectNativeFeatures(ccVersion),

      // Project context
      projectContext,

      // Recommended hooks based on project toolchain
      recommendedHooks: this.getRecommendedHooks(projectContext),

      // SSH session flag for quick-setup notice
      sshDetected: projectContext.runtime.isSSH || undefined,
    }
  }

  /**
   * Detect installed Claude Code version
   */
  private detectClaudeCodeVersion(): string | undefined {
    try {
      const output = execSync('claude --version 2>/dev/null || echo ""', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim()

      // Parse version from output (e.g., "claude 1.0.16" or "1.0.16")
      const match = output.match(/(\d+\.\d+\.\d+)/)
      return match ? match[1] : undefined
    }
    catch {
      return undefined
    }
  }

  /**
   * Detect which Claude Code native features are available
   * based on installed version
   */
  private detectNativeFeatures(version?: string): SmartDefaults['nativeFeatures'] {
    return {
      hooks: this.versionSupports(version, '1.0.6'),
      plansDirectory: this.versionSupports(version, '1.0.10'),
      memory: this.versionSupports(version, '1.0.12'),
      subagents: this.versionSupports(version, '1.0.3'),
      toolSearch: this.versionSupports(version, '1.0.10'),
      statusLine: this.versionSupports(version, '1.0.8'),
    }
  }

  /**
   * Check if a version meets the minimum requirement
   */
  private versionSupports(version: string | undefined, minVersion: string): boolean {
    if (!version)
      return false
    const parts = version.split('.').map(Number)
    const minParts = minVersion.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if ((parts[i] || 0) > (minParts[i] || 0))
        return true
      if ((parts[i] || 0) < (minParts[i] || 0))
        return false
    }
    return true // equal
  }

  /**
   * Detect API key from environment variables
   */
  private detectApiKey(): string | undefined {
    // Check common environment variables (in priority order)
    const envVars = [
      'ANTHROPIC_API_KEY',
      'CLAUDE_API_KEY',
      'API_KEY',
    ]

    for (const envVar of envVars) {
      const value = process.env[envVar]
      if (value && value.length >= 10) {
        return value
      }
    }

    // Check existing Claude Code config
    const claudeConfigPath = join(homedir(), '.config', 'claude', 'config.json')
    if (existsSync(claudeConfigPath)) {
      try {
        const configContent = readFileSync(claudeConfigPath, 'utf-8')
        const config = JSON.parse(configContent)
        if (config.apiKey && config.apiKey.length >= 10) {
          return config.apiKey
        }
      }
      catch {
        // Ignore parsing errors
      }
    }

    return undefined
  }

  /**
   * Detect API provider based on API key pattern
   */
  private detectApiProvider(apiKey?: string): string | undefined {
    if (!apiKey) {
      return undefined // No key, no provider detected
    }

    // Anthropic official API key pattern
    if (apiKey.startsWith('sk-ant-')) {
      return 'anthropic'
    }

    // Other providers use various key formats - cannot auto-detect
    return undefined
  }

  /**
   * Detect installed code tool type (instance method delegates to static)
   */
  private detectCodeToolType(): string {
    return SmartDefaultsDetector.detectCodeToolType()
  }

  /**
   * Detect installed code tool type by checking filesystem markers.
   * This is a static method so it can be called without instantiating the full detector.
   */
  static detectCodeToolType(): string {
    // Check for Claude Code installation (~/.claude on macOS/Linux, ~/.config/claude on some systems)
    const claudeCodePaths = [
      join(homedir(), '.claude'),
      join(homedir(), '.config', 'claude'),
    ]
    if (claudeCodePaths.some(p => existsSync(p))) {
      return 'claude-code'
    }

    // Check for Codex installation
    const codexPath = join(homedir(), '.codex')
    if (existsSync(codexPath)) {
      return 'codex'
    }

    // Default to Claude Code
    return 'claude-code'
  }

  /**
   * Check if CCR (Claude Code Router) should be enabled
   */
  private shouldEnableCCR(): boolean {
    // Check if CCR is already installed
    const ccrPaths = [
      join(homedir(), '.local', 'bin', 'ccr'),
      join(homedir(), '.cargo', 'bin', 'ccr'),
      '/usr/local/bin/ccr',
    ]

    return ccrPaths.some(path => existsSync(path))
  }

  /**
   * Check if Cometix should be enabled
   */
  private shouldEnableCometix(): boolean {
    // Check if Cometix is available
    const cometixPaths = [
      join(homedir(), '.local', 'bin', 'cometix'),
      join(homedir(), '.cargo', 'bin', 'cometix'),
      '/usr/local/bin/cometix',
    ]

    return cometixPaths.some(path => existsSync(path))
  }

  /**
   * Check if CCUsage should be enabled
   */
  private shouldEnableCCUsage(): boolean {
    // Check if ccusage is available
    const ccusagePaths = [
      join(homedir(), '.local', 'bin', 'ccusage'),
      join(homedir(), '.cargo', 'bin', 'ccusage'),
      '/usr/local/bin/ccusage',
    ]

    return ccusagePaths.some(path => existsSync(path))
  }

  /**
   * Get recommended MCP services based on environment + project context
   */
  getRecommendedMcpServices(platform: string, project?: ProjectContext): string[] {
    const runtime = project?.runtime

    // CI: only core documentation MCPs — no browser, no DB, no heavy services
    if (runtime?.isCI) {
      return ['context7', 'mcp-deepwiki']
    }

    // Container: core only — ephemeral environments, skip heavy MCPs
    if (runtime?.isContainer) {
      return ['context7', 'mcp-deepwiki']
    }

    const core = ['context7', 'mcp-deepwiki', 'open-websearch']
    const extras: string[] = []

    // Browser-based MCP: only if runtime has a browser
    const hasBrowser = runtime?.hasBrowser ?? (platform === 'darwin' || platform === 'win32')
    if (hasBrowser) {
      extras.push('Playwright')
    }

    // SQLite: useful for most projects
    extras.push('sqlite')

    // Serena: useful for large codebases with LSP needs (TypeScript, Java, C#)
    // Skip on headless servers (needs interactive git workflows)
    if (project && ['typescript', 'java', 'csharp'].includes(project.language)) {
      if (!(runtime?.isHeadless)) {
        extras.push('serena')
      }
    }

    return [...core, ...extras]
  }

  /**
   * Get recommended hook template IDs based on project toolchain
   */
  getRecommendedHooks(project: ProjectContext): string[] {
    const runtime = project.runtime

    // CI: only linting and test hooks — skip interactive/dev-server hooks
    if (runtime.isCI) {
      const hooks: string[] = []
      if (project.linter !== 'none') hooks.push('pre-commit-lint-check')
      if (project.testRunner !== 'none') hooks.push('test-before-commit')
      return hooks
    }

    // Container: minimal hooks for ephemeral environments
    if (runtime.isContainer) {
      const hooks: string[] = []
      if (project.linter !== 'none') hooks.push('pre-commit-lint-check')
      if (project.testRunner !== 'none') hooks.push('test-before-commit')
      return hooks
    }

    const hooks: string[] = []

    // Block dev servers — skip on headless (no dev server on headless)
    if (!runtime.isHeadless) {
      hooks.push('block-dev-server')
    }

    // Git push confirmation — always useful
    hooks.push('git-push-confirm')

    // Console.log / print warning — language-aware
    const jsLangs: string[] = ['typescript', 'javascript']
    if (jsLangs.includes(project.language)) {
      hooks.push('warn-console-log')
    }

    // Block unwanted doc files — useful when AI tends to create random .md files
    hooks.push('block-unwanted-docs')

    // Test-before-commit: only if project has a test runner
    if (project.testRunner !== 'none') {
      hooks.push('test-before-commit')
    }

    // Format-on-save: only if project has a formatter
    if (project.formatter !== 'none') {
      hooks.push('auto-format-on-save')
    }

    // Lint check: only if project has a linter
    if (project.linter !== 'none') {
      hooks.push('pre-commit-lint-check')
    }

    return hooks
  }

  /**
   * Get recommended skills based on user type
   */
  getRecommendedSkills(userType: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'): string[] {
    const core = [
      'ccjk:git-commit',
      'ccjk:init-project',
    ]

    if (userType === 'beginner') {
      return [...core, 'ccjk:workflow']
    }

    if (userType === 'intermediate') {
      return [...core, 'ccjk:feat', 'ccjk:workflow', 'ccjk:git-worktree']
    }

    if (userType === 'advanced') {
      return [
        ...core,
        'ccjk:feat',
        'ccjk:workflow',
        'ccjk:git-worktree',
        'ccjk:git-rollback',
        'ccjk:git-cleanBranches',
      ]
    }

    return core
  }

  /**
   * Validate detected defaults
   */
  validateDefaults(defaults: SmartDefaults): { valid: boolean, issues: string[] } {
    const issues: string[] = []

    // Check API key format
    if (defaults.apiKey) {
      if (defaults.apiKey.length < 10) {
        issues.push('API key appears too short to be valid')
      }
      else if (defaults.apiProvider === 'anthropic' && !defaults.apiKey.startsWith('sk-ant-')) {
        issues.push('API key format appears invalid (should start with sk-ant-)')
      }
    }

    // Check platform support
    if (!['darwin', 'linux', 'win32'].includes(defaults.platform)) {
      issues.push(`Platform ${defaults.platform} may not be fully supported`)
    }

    // Check home directory access
    if (!existsSync(defaults.homeDir)) {
      issues.push('Home directory is not accessible')
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }
}

/**
 * Detect smart defaults from environment and existing configurations
 * @returns SmartDefaults object with detected values
 */
export async function detectSmartDefaults(): Promise<SmartDefaults> {
  const detector = new SmartDefaultsDetector()
  return detector.detect()
}

/**
 * Check if API key prompt is needed
 * @param defaults - Smart defaults object
 * @returns true if API key prompt is needed
 */
export function needsApiKeyPrompt(defaults: SmartDefaults): boolean {
  return !defaults.apiProvider || !defaults.apiKey
}

/**
 * Detect the code tool type by checking filesystem markers.
 * Standalone function that does not require instantiating SmartDefaultsDetector.
 * @returns Detected code tool type string (e.g., 'claude-code' or 'codex')
 */
export function detectCodeToolType(): string {
  return SmartDefaultsDetector.detectCodeToolType()
}

// Export singleton instance
export const smartDefaults = new SmartDefaultsDetector()
