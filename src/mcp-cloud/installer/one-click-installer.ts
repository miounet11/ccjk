/**
 * One-Click Installer
 * Seamless installation of MCP services
 */

import type {
  BatchInstallResult,
  InstallOptions,
  InstallResult,
  MCPService,
} from '../types'
import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { DependencyResolver } from './dependency-resolver'
import { VersionManager } from './version-manager'

const execAsync = promisify(exec)

export class OneClickInstaller {
  private dependencyResolver: DependencyResolver
  private versionManager: VersionManager
  private configPath: string

  constructor() {
    this.dependencyResolver = new DependencyResolver()
    this.versionManager = new VersionManager()
    this.configPath = path.join(os.homedir(), '.ccjk', 'mcp-config.json')
  }

  /**
   * Install a service with one click
   */
  async installService(
    service: MCPService,
    options: InstallOptions = {},
  ): Promise<InstallResult> {
    const _startTime = Date.now()

    try {
      // Check if already installed
      if (!options.force) {
        const existing = await this.versionManager.getInstalledVersion(service.id)
        if (existing) {
          return {
            success: false,
            serviceId: service.id,
            version: existing,
            installedAt: new Date().toISOString(),
            error: 'Service already installed. Use force=true to reinstall.',
          }
        }
      }

      // Resolve dependencies
      let dependencies: Array<{ name: string, version: string, installed: boolean }> = []
      if (!options.skipDependencies && service.dependencies.length > 0) {
        dependencies = await this.dependencyResolver.resolveDependencies(
          service.dependencies,
        )

        // Install dependencies first
        for (const dep of dependencies) {
          if (!dep.installed) {
            await this.installDependency(dep.name, dep.version)
          }
        }
      }

      // Install the service
      const version = options.version || service.version
      const installCommand = this.buildInstallCommand(service, version, options)

      const { stdout: _stdout, stderr } = await execAsync(installCommand)

      // Save configuration
      if (options.autoConfig) {
        await this.saveConfig(service, options.configPath)
      }

      // Register installation
      await this.versionManager.registerInstallation(service.id, version)

      const result: InstallResult = {
        success: true,
        serviceId: service.id,
        version,
        installedAt: new Date().toISOString(),
        configPath: options.configPath,
        dependencies,
      }

      if (stderr) {
        result.warnings = [stderr]
      }

      return result
    }
    catch (error) {
      return {
        success: false,
        serviceId: service.id,
        version: options.version || service.version,
        installedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Install multiple services
   */
  async installBatch(
    services: MCPService[],
    options: InstallOptions = {},
  ): Promise<BatchInstallResult> {
    const startTime = Date.now()
    const installed: string[] = []
    const failed: Array<{ serviceId: string, error: string }> = []

    for (const service of services) {
      const result = await this.installService(service, options)

      if (result.success) {
        installed.push(service.id)
      }
      else {
        failed.push({
          serviceId: service.id,
          error: result.error || 'Unknown error',
        })
      }
    }

    return {
      success: failed.length === 0,
      installed,
      failed,
      totalTime: Date.now() - startTime,
    }
  }

  /**
   * Install a recommended bundle
   */
  async installBundle(
    services: MCPService[],
    options: InstallOptions = {},
  ): Promise<BatchInstallResult> {
    return await this.installBatch(services, options)
  }

  /**
   * Build install command
   */
  private buildInstallCommand(
    service: MCPService,
    version: string,
    options: InstallOptions,
  ): string {
    const packageName = `${service.package}@${version}`
    const flags: string[] = []

    if (options.global) {
      flags.push('-g')
    }

    if (options.dev) {
      flags.push('--save-dev')
    }

    if (options.force) {
      flags.push('--force')
    }

    return `npm install ${flags.join(' ')} ${packageName}`
  }

  /**
   * Install a dependency
   */
  private async installDependency(name: string, version: string): Promise<void> {
    const command = `npm install -g ${name}@${version}`
    await execAsync(command)
  }

  /**
   * Save service configuration
   */
  private async saveConfig(service: MCPService, configPath?: string): Promise<void> {
    const targetPath = configPath || this.configPath

    // Ensure directory exists
    const dir = path.dirname(targetPath)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }

    // Load existing config
    let config: any = {}
    if (fs.existsSync(targetPath)) {
      const data = await fs.promises.readFile(targetPath, 'utf-8')
      config = JSON.parse(data)
    }

    // Add service config
    config[service.id] = service.installation.config

    // Save
    await fs.promises.writeFile(targetPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  /**
   * Check if service is installed
   */
  async isInstalled(serviceId: string): Promise<boolean> {
    const version = await this.versionManager.getInstalledVersion(serviceId)
    return version !== null
  }

  /**
   * Get installed services
   */
  async getInstalledServices(): Promise<string[]> {
    return await this.versionManager.getInstalledServices()
  }

  /**
   * Verify installation
   */
  async verifyInstallation(serviceId: string): Promise<boolean> {
    try {
      const version = await this.versionManager.getInstalledVersion(serviceId)
      if (!version) {
        return false
      }

      // Try to require the package
      const packageName = `@modelcontextprotocol/server-${serviceId}`
      require.resolve(packageName)

      return true
    }
    catch (_error) {
      return false
    }
  }
}
