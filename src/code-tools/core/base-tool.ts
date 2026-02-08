/**
 * Abstract base class for code tools
 * Implements common functionality to reduce code duplication
 */

import type { ICodeTool } from './interfaces'
import type {
  ExecutionResult,
  InstallStatus,
  ToolCapabilities,
  ToolConfig,
  ToolMetadata,
} from './types'
import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Base abstract class that provides common functionality for all code tools
 */
export abstract class BaseCodeTool implements ICodeTool {
  protected config: ToolConfig
  protected configPath: string

  constructor(initialConfig?: Partial<ToolConfig>) {
    this.config = {
      name: this.getMetadata().name,
      ...initialConfig,
    }
    this.configPath = this.getDefaultConfigPath()
  }

  /**
   * Get the default configuration path for this tool
   */
  protected getDefaultConfigPath(): string {
    const homeDir = os.homedir()
    const configDir = path.join(homeDir, '.ccjk', 'tools')
    return path.join(configDir, `${this.getMetadata().name}.json`)
  }

  /**
   * Abstract method to get tool metadata - must be implemented by subclasses
   */
  abstract getMetadata(): ToolMetadata

  /**
   * Abstract method to get the command to check if tool is installed
   */
  protected abstract getInstallCheckCommand(): string

  /**
   * Abstract method to get the installation command
   */
  protected abstract getInstallCommand(): string

  /**
   * Abstract method to get the uninstallation command
   */
  protected abstract getUninstallCommand(): string

  /**
   * Check if the tool is installed
   */
  async isInstalled(): Promise<InstallStatus> {
    try {
      const command = this.getInstallCheckCommand()
      const { stdout, stderr } = await execAsync(command)

      const version = this.parseVersion(stdout || stderr)

      return {
        installed: true,
        version,
        path: await this.findToolPath(),
      }
    }
    catch (error) {
      return {
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Install the tool
   */
  async install(): Promise<ExecutionResult> {
    try {
      const command = this.getInstallCommand()
      const { stdout, stderr } = await execAsync(command)

      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed',
        exitCode: 1,
      }
    }
  }

  /**
   * Uninstall the tool
   */
  async uninstall(): Promise<ExecutionResult> {
    try {
      const command = this.getUninstallCommand()
      const { stdout, stderr } = await execAsync(command)

      // Also remove config file
      await this.removeConfigFile()

      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uninstallation failed',
        exitCode: 1,
      }
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<ToolConfig> {
    try {
      await this.loadConfig()
      return { ...this.config }
    }
    catch (_error) {
      return { ...this.config }
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<ToolConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...updates,
    }
    await this.saveConfig()
  }

  /**
   * Configure the tool with full config
   */
  async configure(config: ToolConfig): Promise<void> {
    const isValid = await this.validateConfig(config)
    if (!isValid) {
      throw new Error('Invalid configuration')
    }
    this.config = { ...config }
    await this.saveConfig()
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: Partial<ToolConfig>): Promise<boolean> {
    // Basic validation - can be overridden by subclasses
    if (!config.name) {
      return false
    }
    return true
  }

  /**
   * Execute a command with the tool
   */
  async execute(command: string, args: string[] = []): Promise<ExecutionResult> {
    try {
      const fullCommand = this.buildCommand(command, args)
      const { stdout, stderr } = await execAsync(fullCommand, {
        env: { ...process.env, ...this.config.env },
      })

      return {
        success: true,
        output: stdout || stderr,
        exitCode: 0,
      }
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message || 'Execution failed',
        exitCode: error.code || 1,
      }
    }
  }

  /**
   * Get tool version
   */
  async getVersion(): Promise<string | undefined> {
    const status = await this.isInstalled()
    return status.version
  }

  /**
   * Reset tool to default configuration
   */
  async reset(): Promise<void> {
    this.config = {
      name: this.getMetadata().name,
    }
    await this.removeConfigFile()
  }

  /**
   * Load configuration from file
   */
  protected async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const loadedConfig = JSON.parse(data)
      this.config = { ...this.config, ...loadedConfig }
    }
    catch (_error) {
      // Config file doesn't exist or is invalid - use current config
    }
  }

  /**
   * Save configuration to file
   */
  protected async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath)
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2))
    }
    catch (error) {
      throw new Error(`Failed to save configuration: ${error}`)
    }
  }

  /**
   * Remove configuration file
   */
  protected async removeConfigFile(): Promise<void> {
    try {
      await fs.unlink(this.configPath)
    }
    catch (_error) {
      // File doesn't exist - that's fine
    }
  }

  /**
   * Build command string from command and arguments
   */
  protected buildCommand(command: string, args: string[]): string {
    const escapedArgs = args.map((arg) => {
      // Simple escaping - wrap in quotes if contains spaces
      return arg.includes(' ') ? `"${arg}"` : arg
    })
    return [command, ...escapedArgs].join(' ')
  }

  /**
   * Parse version from command output
   */
  protected parseVersion(output: string): string | undefined {
    // Common version patterns
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v?(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/,
    ]

    for (const pattern of patterns) {
      const match = output.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return undefined
  }

  /**
   * Find the tool's installation path
   */
  protected async findToolPath(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(`which ${this.getMetadata().name}`)
      return stdout.trim()
    }
    catch (_error) {
      return undefined
    }
  }

  /**
   * Create default capabilities object
   */
  protected createDefaultCapabilities(): ToolCapabilities {
    return {
      supportsChat: false,
      supportsFileEdit: false,
      supportsCodeGen: false,
      supportsReview: false,
      supportsTesting: false,
      supportsDebugging: false,
    }
  }
}
