import type {
  InstallOptions,
  InstallResult,
  PluginSourceType,
  SearchOptions,
  UnifiedPlugin,
  UninstallResult,
  UpdateResult,
} from '../types'
import { BasePluginAdapter } from './base'
import { skillsMarketplaceApi } from '../../cloud-client/skills-marketplace-api'
import { userSkillsApi } from '../../cloud-client/user-skills-api'
import type { Skill, UserSkill, SkillCategory } from '../../cloud-client/skills-marketplace-types'

/**
 * Adapter for CCJK Skills Marketplace
 * Integrates with the cloud-based skills marketplace API
 */
export class CcjkAdapter extends BasePluginAdapter {
  protected sourceType: PluginSourceType = 'ccjk'

  /**
   * Convert marketplace skill to unified plugin format
   */
  private convertToUnifiedPlugin(skill: Skill, userSkill?: UserSkill): UnifiedPlugin {
    return {
      id: skill.skillId,
      name: skill.name,
      version: '1.0.0', // CCJK skills don't have versions yet
      source: 'ccjk',
      description: skill.descriptionEn,
      author: skill.provider,
      category: skill.category,
      status: userSkill ? (userSkill.isEnabled ? 'installed' : 'disabled') : 'available',
      commands: [skill.trigger, ...skill.aliases],
      skills: [skill.slug],
      features: skill.tags,
      tags: skill.tags,
      homepage: skill.repoUrl,
      repository: skill.repoUrl,
      enabled: userSkill?.isEnabled ?? false,
      verified: skill.isVerified || skill.isOfficial,
      rating: skill.ratingAvg,
      stats: {
        downloads: skill.installCount + skill.localInstallCount,
        rating: skill.ratingAvg,
        reviews: skill.ratingCount,
      },
      installedAt: userSkill?.installedAt,
      updatedAt: skill.updatedAt,
      marketplace: 'ccjk',
      metadata: skill.metadata,
    }
  }

  /**
   * Search for plugins in the CCJK marketplace
   */
  async search(options: SearchOptions): Promise<UnifiedPlugin[]> {
    try {
      const response = await skillsMarketplaceApi.searchSkills({
        q: options.query || '',
        category: options.category as SkillCategory | undefined,
        limit: options.limit,
        offset: options.offset,
      })

      // Get user's installed skills to mark status
      let userSkills: UserSkill[] = []
      try {
        // TODO: Get userId from auth context
        // const userSkillsResponse = await userSkillsApi.getUserSkills(userId, { token })
        // userSkills = userSkillsResponse.skills
      } catch {
        // User might not be authenticated, continue without user skills
      }

      const userSkillsMap = new Map(userSkills.map(s => [s.skillId, s]))

      return response.results.map(skill =>
        this.convertToUnifiedPlugin(skill, userSkillsMap.get(skill.skillId))
      )
    } catch (error) {
      console.error('Failed to search CCJK marketplace:', error)
      return []
    }
  }

  /**
   * Get a specific plugin by ID
   */
  async getPlugin(id: string): Promise<UnifiedPlugin | null> {
    try {
      // Search for the skill by ID (using it as query)
      const response = await skillsMarketplaceApi.searchSkills({
        q: id,
        limit: 1,
      })

      const skill = response.results.find(s => s.skillId === id)
      if (!skill) {
        return null
      }

      // Check if user has this skill installed
      let userSkill: UserSkill | undefined
      try {
        // TODO: Get userId from auth context
        // const userSkillsResponse = await userSkillsApi.getUserSkills(userId, { token })
        // userSkill = userSkillsResponse.skills.find(s => s.skillId === id)
      } catch {
        // User might not be authenticated
      }

      return this.convertToUnifiedPlugin(skill, userSkill)
    } catch (error) {
      console.error(`Failed to get plugin ${id}:`, error)
      return null
    }
  }

  /**
   * Install a plugin from CCJK marketplace
   */
  async install(id: string, options: InstallOptions = {}): Promise<InstallResult> {
    try {
      // Check if already installed
      if (!options.force) {
        const isInstalled = await this.isInstalled(id)
        if (isInstalled) {
          return this.createInstallError('Plugin is already installed. Use force option to reinstall.')
        }
      }

      // TODO: Get userId and token from auth context
      // For now, throw an error indicating authentication is required
      throw new Error('Authentication required. Please configure userId and token.')

      // Install the skill
      // const result = await userSkillsApi.installSkill(
      //   userId,
      //   {
      //     skillId: id,
      //     version: options.version,
      //   },
      //   { token }
      // )

      // const plugin = await this.getPlugin(id)
      // if (!plugin) {
      //   return this.createInstallError('Plugin installed but could not retrieve details')
      // }

      // return {
      //   success: true,
      //   plugin,
      // }
    } catch (error) {
      return this.createInstallError(
        error instanceof Error ? error.message : 'Failed to install plugin'
      )
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(id: string): Promise<UninstallResult> {
    try {
      // TODO: Get userId and token from auth context
      // For now, throw an error indicating authentication is required
      throw new Error('Authentication required. Please configure userId and token.')

      // await userSkillsApi.uninstallSkill(userId, id, { token })
      // return { success: true }
    } catch (error) {
      return this.createUninstallError(
        error instanceof Error ? error.message : 'Failed to uninstall plugin'
      )
    }
  }

  /**
   * Update a plugin to the latest version
   */
  async update(id: string): Promise<UpdateResult> {
    try {
      // Get current version
      const currentPlugin = await this.getPlugin(id)
      if (!currentPlugin) {
        return this.createUpdateError('Plugin not found')
      }

      const previousVersion = currentPlugin.version

      // TODO: Get userId and token from auth context
      // For now, throw an error indicating authentication is required
      throw new Error('Authentication required. Please configure userId and token.')

      // Get latest version from marketplace
      // const searchResponse = await skillsMarketplaceApi.searchSkills({
      //   q: id,
      //   limit: 1,
      // })
      // const latestSkill = searchResponse.results.find(s => s.skillId === id)
      // if (!latestSkill) {
      //   return this.createUpdateError('Plugin not found in marketplace')
      // }
      // const newVersion = latestSkill.version

      // // Check if update is needed
      // if (previousVersion === newVersion) {
      //   return {
      //     success: true,
      //     previousVersion,
      //     newVersion,
      //     plugin: currentPlugin,
      //   }
      // }

      // // Update the skill
      // await userSkillsApi.updateSkill(userId, id, { version: newVersion }, { token })

      // const updatedPlugin = await this.getPlugin(id)

      // return {
      //   success: true,
      //   previousVersion,
      //   newVersion,
      //   plugin: updatedPlugin ?? currentPlugin,
      // }
    } catch (error) {
      return this.createUpdateError(
        error instanceof Error ? error.message : 'Failed to update plugin'
      )
    }
  }

  /**
   * List all installed plugins from CCJK marketplace
   */
  async listInstalled(): Promise<UnifiedPlugin[]> {
    try {
      // TODO: Get userId and token from auth context
      // For now, return empty array
      return []

      // const userSkillsResponse = await userSkillsApi.getUserSkills(userId, { token })

      // // Get full skill details for each installed skill
      // const plugins = await Promise.all(
      //   userSkillsResponse.skills.map(async (userSkill) => {
      //     try {
      //       const searchResponse = await skillsMarketplaceApi.searchSkills({
      //         q: userSkill.skillId,
      //         limit: 1,
      //       })
      //       const skill = searchResponse.results.find(s => s.skillId === userSkill.skillId)
      //       if (skill) {
      //         return this.convertToUnifiedPlugin(skill, userSkill)
      //       }
      //     } catch {
      //       // If we can't get skill details, create a minimal plugin
      //     }
      //     return {
      //       id: userSkill.skillId,
      //       name: userSkill.skillId,
      //       version: userSkill.version,
      //       source: 'ccjk' as const,
      //       status: userSkill.enabled ? 'installed' as const : 'disabled' as const,
      //       enabled: userSkill.enabled,
      //       installedAt: userSkill.installedAt,
      //       marketplace: 'ccjk',
      //     }
      //   })
      // )

      // return plugins
    } catch (error) {
      console.error('Failed to list installed plugins:', error)
      return []
    }
  }

  /**
   * Check if a plugin is installed
   */
  async isInstalled(id: string): Promise<boolean> {
    try {
      // TODO: Get userId and token from auth context
      // For now, return false
      return false

      // const userSkillsResponse = await userSkillsApi.getUserSkills(userId, { token })
      // return userSkillsResponse.skills.some(skill => skill.skillId === id)
    } catch {
      return false
    }
  }
}
