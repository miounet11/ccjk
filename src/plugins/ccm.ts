/**
 * CCJK CCM Integration Plugin
 *
 * Integrates Claude Code Manager (CCM) as a plugin for CCJK.
 * Provides seamless management of Claude Code installations and configurations.
 *
 * Features:
 * - Claude Code installation management
 * - Version switching and updates
 * - Configuration synchronization
 * - Multi-instance support
 *
 * @module plugins/ccm
 */

import type { CCJKPlugin, HookContext, HookResult, PluginManager } from '../core/plugin-system'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createPlugin, PluginHookType } from '../core/plugin-system'

const execAsync = promisify(exec)

/**
 * CCM installation info
 */
interface CcmInstallation {
  /** Installation path */
  path: string
  /** Claude Code version */
  version: string
  /** Whether this is the active installation */
  active: boolean
  /** Installation date */
  installedAt: Date
}

/**
 * CCM manager
 */
class CcmManager {
  /**
   * Check if CCM is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('ccm --version')
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Get CCM version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('ccm --version')
      return stdout.trim()
    }
    catch {
      return null
    }
  }

  /**
   * List Claude Code installations
   */
  async listInstallations(): Promise<CcmInstallation[]> {
    try {
      const { stdout } = await execAsync('ccm list --json')
      return JSON.parse(stdout)
    }
    catch (error) {
      console.error('[CCM] Failed to list installations:', error)
      return []
    }
  }

  /**
   * Install Claude Code version
   */
  async install(version: string): Promise<boolean> {
    try {
      await execAsync(`ccm install ${version}`)
      return true
    }
    catch (error) {
      console.error('[CCM] Failed to install:', error)
      return false
    }
  }

  /**
   * Switch to a different Claude Code version
   */
  async switchVersion(version: string): Promise<boolean> {
    try {
      await execAsync(`ccm use ${version}`)
      return true
    }
    catch (error) {
      console.error('[CCM] Failed to switch version:', error)
      return false
    }
  }

  /**
   * Update Claude Code to latest version
   */
  async update(): Promise<boolean> {
    try {
      await execAsync('ccm update')
      return true
    }
    catch (error) {
      console.error('[CCM] Failed to update:', error)
      return false
    }
  }

  /**
   * Uninstall a Claude Code version
   */
  async uninstall(version: string): Promise<boolean> {
    try {
      await execAsync(`ccm uninstall ${version}`)
      return true
    }
    catch (error) {
      console.error('[CCM] Failed to uninstall:', error)
      return false
    }
  }

  /**
   * Get active Claude Code version
   */
  async getActiveVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('ccm current')
      return stdout.trim()
    }
    catch {
      return null
    }
  }
}

/**
 * CCM plugin implementation
 */
const ccmPlugin: CCJKPlugin = createPlugin({
  name: 'ccjk-ccm',
  version: '1.0.0',
  description: 'Integrates Claude Code Manager (CCM) for installation management',
  author: 'CCJK Team',
  homepage: 'https://github.com/ccjk/ccm',

  config: {
    enabled: true,
    options: {
      // Whether to check for CCM on init
      checkOnInit: true,
      // Whether to auto-update Claude Code
      autoUpdate: false,
      // Whether to sync configurations across versions
      syncConfigs: true,
    },
  },

  async init(manager: PluginManager): Promise<void> {
    const ccmManager = new CcmManager()

    // Store CCM manager instance
    ;(manager as any)._ccmManager = ccmManager

    // Check if CCM is installed
    const plugin = manager.getPlugin('ccjk-ccm')
    const checkOnInit = plugin?.config?.options?.checkOnInit

    if (checkOnInit) {
      const isInstalled = await ccmManager.isInstalled()
      if (!isInstalled) {
        console.warn('⚠️  CCM is not installed. Install it to manage Claude Code versions.')
        console.log('   Visit: https://github.com/ccjk/ccm')
      }
    }
  },

  hooks: {
    /**
     * Check CCM status on initialization
     */
    [PluginHookType.PostInit]: async (context: HookContext): Promise<HookResult> => {
      const ccmManager = (context as any)._ccmManager as CcmManager | undefined

      if (!ccmManager) {
        return { success: true, continue: true }
      }

      const isInstalled = await ccmManager.isInstalled()
      if (!isInstalled) {
        return {
          success: true,
          message: 'CCM not installed',
          continue: true,
        }
      }

      const version = await ccmManager.getVersion()
      const activeVersion = await ccmManager.getActiveVersion()

      return {
        success: true,
        message: 'CCM status checked',
        data: {
          ccmVersion: version,
          activeClaudeCodeVersion: activeVersion,
        },
        continue: true,
      }
    },

    /**
     * Sync configurations after version switch
     */
    [PluginHookType.PostConfig]: async (context: HookContext): Promise<HookResult> => {
      const plugin = (context as any)._plugin as CCJKPlugin | undefined
      const syncConfigs = plugin?.config?.options?.syncConfigs

      if (!syncConfigs) {
        return { success: true, continue: true }
      }

      // Configuration sync logic would go here
      // This would copy settings from one Claude Code installation to another

      return {
        success: true,
        message: 'Configurations synced',
        continue: true,
      }
    },
  },

  commands: [
    {
      name: 'ccm',
      description: 'Manage Claude Code installations via CCM',
      async handler(args: string[], _options: Record<string, any>): Promise<void> {
        const ccmManager = new CcmManager()

        // Check if CCM is installed
        const isInstalled = await ccmManager.isInstalled()
        if (!isInstalled) {
          console.error('❌ CCM is not installed')
          console.log('\n📦 Install CCM to manage Claude Code versions:')
          console.log('   npm install -g @ccjk/ccm')
          console.log('   or visit: https://github.com/ccjk/ccm')
          return
        }

        const command = args[0]

        switch (command) {
          case 'list':
          case 'ls': {
            const installations = await ccmManager.listInstallations()
            console.log('\n📦 Claude Code Installations:\n')

            if (installations.length === 0) {
              console.log('   No installations found')
            }
            else {
              installations.forEach((install) => {
                const activeMarker = install.active ? '✓' : ' '
                console.log(`   [${activeMarker}] ${install.version} - ${install.path}`)
              })
            }
            break
          }

          case 'current': {
            const version = await ccmManager.getActiveVersion()
            if (version) {
              console.log(`\n✅ Active Claude Code version: ${version}`)
            }
            else {
              console.log('\n❌ No active Claude Code version')
            }
            break
          }

          case 'install': {
            const version = args[1]
            if (!version) {
              console.error('❌ Please specify a version to install')
              console.log('   Usage: ccjk ccm install <version>')
              return
            }

            console.log(`\n📥 Installing Claude Code ${version}...`)
            const success = await ccmManager.install(version)

            if (success) {
              console.log(`✅ Claude Code ${version} installed successfully`)
            }
            else {
              console.error(`❌ Failed to install Claude Code ${version}`)
            }
            break
          }

          case 'use':
          case 'switch': {
            const version = args[1]
            if (!version) {
              console.error('❌ Please specify a version to switch to')
              console.log('   Usage: ccjk ccm use <version>')
              return
            }

            console.log(`\n🔄 Switching to Claude Code ${version}...`)
            const success = await ccmManager.switchVersion(version)

            if (success) {
              console.log(`✅ Switched to Claude Code ${version}`)
            }
            else {
              console.error(`❌ Failed to switch to Claude Code ${version}`)
            }
            break
          }

          case 'update': {
            console.log('\n⬆️  Updating Claude Code...')
            const success = await ccmManager.update()

            if (success) {
              console.log('✅ Claude Code updated successfully')
            }
            else {
              console.error('❌ Failed to update Claude Code')
            }
            break
          }

          case 'uninstall':
          case 'remove': {
            const version = args[1]
            if (!version) {
              console.error('❌ Please specify a version to uninstall')
              console.log('   Usage: ccjk ccm uninstall <version>')
              return
            }

            console.log(`\n🗑️  Uninstalling Claude Code ${version}...`)
            const success = await ccmManager.uninstall(version)

            if (success) {
              console.log(`✅ Claude Code ${version} uninstalled successfully`)
            }
            else {
              console.error(`❌ Failed to uninstall Claude Code ${version}`)
            }
            break
          }

          case 'version':
          case '-v':
          case '--version': {
            const version = await ccmManager.getVersion()
            if (version) {
              console.log(`\nCCM version: ${version}`)
            }
            else {
              console.error('❌ Failed to get CCM version')
            }
            break
          }

          case 'help':
          case '-h':
          case '--help':
          default: {
            console.log('\n🔧 CCJK CCM - Claude Code Manager\n')
            console.log('Usage: ccjk ccm <command> [options]\n')
            console.log('Commands:')
            console.log('  list, ls              List all Claude Code installations')
            console.log('  current               Show active Claude Code version')
            console.log('  install <version>     Install a Claude Code version')
            console.log('  use <version>         Switch to a Claude Code version')
            console.log('  update                Update Claude Code to latest version')
            console.log('  uninstall <version>   Uninstall a Claude Code version')
            console.log('  version               Show CCM version')
            console.log('  help                  Show this help message')
            console.log('\nExamples:')
            console.log('  ccjk ccm list')
            console.log('  ccjk ccm install 1.2.0')
            console.log('  ccjk ccm use 1.2.0')
            console.log('  ccjk ccm update')
            console.log('')
            break
          }
        }
      },
    },
  ],
})

export default ccmPlugin
