/**
 * Claude Code Feature Adapter
 * Adapts CCJK features to different Claude Code versions
 */

import { isVersionAtLeast } from './tracker'

export interface Feature {
  name: string
  introducedIn: string
  description: string
  configKey?: string
  defaultValue?: unknown
}

/**
 * Known Claude Code features by version
 */
export const FEATURES: Record<string, Feature[]> = {
  '2.1.9': [
    {
      name: 'plansDirectory',
      introducedIn: '2.1.9',
      description: 'Custom directory for storing plans',
      configKey: 'plansDirectory',
      defaultValue: '.claude/plans',
    },
    {
      name: 'mcpAutoThreshold',
      introducedIn: '2.1.9',
      description: 'MCP auto-approval threshold syntax (auto:N)',
      configKey: 'mcpServers.*.autoApproveLimit',
    },
    {
      name: 'sessionIdVariable',
      introducedIn: '2.1.9',
      description: 'CLAUDE_SESSION_ID environment variable support',
    },
  ],
  '2.1.0': [
    {
      name: 'skillHotReload',
      introducedIn: '2.1.0',
      description: 'Hot reload skills without restarting',
    },
  ],
  '2.0.0': [
    {
      name: 'mcpServers',
      introducedIn: '2.0.0',
      description: 'Model Context Protocol (MCP) server support',
      configKey: 'mcpServers',
    },
  ],
}

/**
 * Get all features available in a specific version
 */
export function getFeaturesForVersion(version: string): Feature[] {
  const features: Feature[] = []

  for (const [featureVersion, featureList] of Object.entries(FEATURES)) {
    if (isVersionAtLeast(version, featureVersion)) {
      features.push(...featureList)
    }
  }

  return features
}

/**
 * Check if a specific feature is available
 */
export function isFeatureAvailable(version: string, featureName: string): boolean {
  const features = getFeaturesForVersion(version)
  return features.some(f => f.name === featureName)
}

/**
 * Get feature details
 */
export function getFeature(featureName: string): Feature | undefined {
  for (const featureList of Object.values(FEATURES)) {
    const feature = featureList.find(f => f.name === featureName)
    if (feature) {
      return feature
    }
  }
  return undefined
}

/**
 * Adapt MCP configuration based on version
 */
export function adaptMCPConfig(version: string, config: Record<string, unknown>): Record<string, unknown> {
  const adapted = { ...config }

  // Handle auto:N threshold syntax (2.1.9+)
  if (isFeatureAvailable(version, 'mcpAutoThreshold')) {
    // New syntax supported, keep as-is
    return adapted
  }

  // Convert auto:N to numeric value for older versions
  if (adapted.mcpServers && typeof adapted.mcpServers === 'object') {
    const servers = adapted.mcpServers as Record<string, unknown>

    for (const [_serverName, serverConfig] of Object.entries(servers)) {
      if (serverConfig && typeof serverConfig === 'object') {
        const config = serverConfig as Record<string, unknown>

        if (typeof config.autoApproveLimit === 'string' && config.autoApproveLimit.startsWith('auto:')) {
          const threshold = config.autoApproveLimit.replace('auto:', '')
          config.autoApproveLimit = Number.parseInt(threshold, 10)
        }
      }
    }
  }

  return adapted
}

/**
 * Adapt plans directory configuration
 */
export function adaptPlansDirectory(version: string, plansDir?: string): string | undefined {
  if (!plansDir) {
    return undefined
  }

  // plansDirectory only supported in 2.1.9+
  if (isFeatureAvailable(version, 'plansDirectory')) {
    return plansDir
  }

  // Older versions don't support custom plans directory
  return undefined
}

/**
 * Get recommended configuration for version
 */
export function getRecommendedConfig(version: string): Record<string, unknown> {
  const config: Record<string, unknown> = {}

  // Add plansDirectory if supported
  if (isFeatureAvailable(version, 'plansDirectory')) {
    config.plansDirectory = '.claude/plans'
  }

  // Add MCP configuration if supported
  if (isFeatureAvailable(version, 'mcpServers')) {
    config.mcpServers = {}
  }

  return config
}

/**
 * Get new features since a previous version
 */
export function getNewFeatures(fromVersion: string, toVersion: string): Feature[] {
  const oldFeatures = new Set(getFeaturesForVersion(fromVersion).map(f => f.name))
  const newFeatures = getFeaturesForVersion(toVersion)

  return newFeatures.filter(f => !oldFeatures.has(f.name))
}

/**
 * Generate feature migration guide
 */
export function generateMigrationGuide(fromVersion: string, toVersion: string): string {
  const newFeatures = getNewFeatures(fromVersion, toVersion)

  if (newFeatures.length === 0) {
    return 'No new features to migrate.'
  }

  const lines = [
    `Migration Guide: ${fromVersion} → ${toVersion}`,
    '',
    'New Features Available:',
    '',
  ]

  for (const feature of newFeatures) {
    lines.push(`• ${feature.name} (${feature.introducedIn})`)
    lines.push(`  ${feature.description}`)

    if (feature.configKey) {
      lines.push(`  Config: ${feature.configKey}`)
    }

    if (feature.defaultValue !== undefined) {
      lines.push(`  Default: ${JSON.stringify(feature.defaultValue)}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Validate configuration against version
 */
export function validateConfig(version: string, config: Record<string, unknown>): {
  valid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  // Check plansDirectory
  if (config.plansDirectory && !isFeatureAvailable(version, 'plansDirectory')) {
    warnings.push(`plansDirectory is not supported in version ${version} (requires 2.1.9+)`)
  }

  // Check MCP servers
  if (config.mcpServers && !isFeatureAvailable(version, 'mcpServers')) {
    errors.push(`mcpServers is not supported in version ${version} (requires 2.0.0+)`)
  }

  // Check auto:N syntax
  if (config.mcpServers && typeof config.mcpServers === 'object') {
    const servers = config.mcpServers as Record<string, unknown>

    for (const [serverName, serverConfig] of Object.entries(servers)) {
      if (serverConfig && typeof serverConfig === 'object') {
        const cfg = serverConfig as Record<string, unknown>

        if (typeof cfg.autoApproveLimit === 'string' && cfg.autoApproveLimit.startsWith('auto:')) {
          if (!isFeatureAvailable(version, 'mcpAutoThreshold')) {
            warnings.push(
              `MCP server "${serverName}" uses auto:N syntax which is not supported in version ${version} (requires 2.1.9+)`,
            )
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}
