/**
 * Capability Scanner
 * Scans and discovers all available CCJK capabilities
 */

import type { Capability, CapabilityScanResult, CapabilityStatus } from './types'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'

const CLAUDE_DIR = join(homedir(), '.claude')
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands', 'ccjk')
const SKILLS_DIR = join(CLAUDE_DIR, 'skills')
const SUPERPOWERS_DIR = join(CLAUDE_DIR, 'superpowers')

/**
 * Scan CCJK commands directory
 */
function scanCommands(): Capability[] {
  const capabilities: Capability[] = []

  if (!existsSync(COMMANDS_DIR)) {
    return capabilities
  }

  try {
    const files = readdirSync(COMMANDS_DIR)

    for (const file of files) {
      if (!file.endsWith('.md'))
        continue

      const filePath = join(COMMANDS_DIR, file)
      const commandId = file.replace('.md', '')

      try {
        const content = readFileSync(filePath, 'utf-8')
        const nameMatch = content.match(/^#\s([^\n]+)$/m)
        const descMatch = content.match(/^>\s([^\n]+)$/m)

        capabilities.push({
          id: commandId,
          name: nameMatch?.[1] || commandId,
          type: 'command',
          status: 'active',
          priority: 10,
          description: descMatch?.[1] || 'CCJK command',
          triggers: [`/ccjk:${commandId}`],
          path: filePath,
        })
      }
      catch (error) {
        capabilities.push({
          id: commandId,
          name: commandId,
          type: 'command',
          status: 'error',
          priority: 0,
          description: 'Failed to load command',
          error: error instanceof Error ? error.message : 'Unknown error',
          path: filePath,
        })
      }
    }
  }
  catch {
    // Directory read error - return empty array
  }

  return capabilities
}

/**
 * Scan skills directory
 */
function scanSkills(): Capability[] {
  const capabilities: Capability[] = []

  if (!existsSync(SKILLS_DIR)) {
    return capabilities
  }

  try {
    const files = readdirSync(SKILLS_DIR)

    for (const file of files) {
      if (!file.endsWith('.md'))
        continue

      const filePath = join(SKILLS_DIR, file)
      const skillId = file.replace('.md', '')

      try {
        const content = readFileSync(filePath, 'utf-8')
        const nameMatch = content.match(/^#\s([^\n]+)$/m)
        const descMatch = content.match(/^>\s([^\n]+)$/m)

        capabilities.push({
          id: skillId,
          name: nameMatch?.[1] || skillId,
          type: 'skill',
          status: 'active',
          priority: 8,
          description: descMatch?.[1] || 'Custom skill',
          triggers: [`/${skillId}`],
          path: filePath,
        })
      }
      catch (error) {
        capabilities.push({
          id: skillId,
          name: skillId,
          type: 'skill',
          status: 'error',
          priority: 0,
          description: 'Failed to load skill',
          error: error instanceof Error ? error.message : 'Unknown error',
          path: filePath,
        })
      }
    }
  }
  catch {
    // Directory read error - return empty array
  }

  return capabilities
}

/**
 * Scan Superpowers
 */
function scanSuperpowers(): Capability[] {
  const capabilities: Capability[] = []

  if (!existsSync(SUPERPOWERS_DIR)) {
    return capabilities
  }

  try {
    const entries = readdirSync(SUPERPOWERS_DIR)

    for (const entry of entries) {
      const entryPath = join(SUPERPOWERS_DIR, entry)

      try {
        const stat = statSync(entryPath)
        if (!stat.isDirectory())
          continue

        // Check if it's a valid superpower (has .md files)
        const files = readdirSync(entryPath)
        const mdFiles = files.filter(f => f.endsWith('.md'))

        if (mdFiles.length === 0)
          continue

        const status: CapabilityStatus = mdFiles.length > 0 ? 'active' : 'inactive'

        capabilities.push({
          id: entry,
          name: entry,
          type: 'superpower',
          status,
          priority: 9,
          description: `Superpower with ${mdFiles.length} skill(s)`,
          path: entryPath,
        })
      }
      catch (error) {
        capabilities.push({
          id: entry,
          name: entry,
          type: 'superpower',
          status: 'error',
          priority: 0,
          description: 'Failed to load superpower',
          error: error instanceof Error ? error.message : 'Unknown error',
          path: entryPath,
        })
      }
    }
  }
  catch {
    // Directory read error - return empty array
  }

  return capabilities
}

/**
 * Scan MCP services from Claude config
 */
function scanMCPServices(): Capability[] {
  const capabilities: Capability[] = []
  const configPath = join(CLAUDE_DIR, 'claude_desktop_config.json')

  if (!existsSync(configPath)) {
    return capabilities
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content)

    if (config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [serviceName, serviceConfig] of Object.entries(config.mcpServers)) {
        const status: CapabilityStatus = serviceConfig && typeof serviceConfig === 'object' ? 'active' : 'inactive'

        capabilities.push({
          id: serviceName,
          name: serviceName,
          type: 'mcp',
          status,
          priority: 7,
          description: 'MCP service',
          path: configPath,
        })
      }
    }
  }
  catch {
    // Config parse error - return empty array
  }

  return capabilities
}

/**
 * Detect special agents (Agent Browser, etc.)
 */
function scanAgents(): Capability[] {
  const capabilities: Capability[] = []

  // Check for Agent Browser
  try {
    execSync('which agent-browser', { stdio: 'ignore' })

    capabilities.push({
      id: 'agent-browser',
      name: 'Agent Browser',
      type: 'agent',
      status: 'active',
      priority: 10,
      description: 'Zero-config browser automation',
      triggers: ['agent-browser'],
    })
  }
  catch {
    // Agent Browser not installed
  }

  return capabilities
}

/**
 * Main scan function - discovers all capabilities
 */
export function scanCapabilities(): CapabilityScanResult {
  const commands = scanCommands()
  const skills = scanSkills()
  const agents = scanAgents()
  const mcpServices = scanMCPServices()
  const superpowers = scanSuperpowers()

  const allCapabilities = [
    ...commands,
    ...skills,
    ...agents,
    ...mcpServices,
    ...superpowers,
  ]

  const activeCount = allCapabilities.filter(c => c.status === 'active').length
  const errorCount = allCapabilities.filter(c => c.status === 'error').length

  return {
    commands,
    skills,
    agents,
    mcpServices,
    superpowers,
    total: allCapabilities.length,
    activeCount,
    errorCount,
  }
}

/**
 * Get capability by ID
 */
export function getCapability(id: string): Capability | undefined {
  const result = scanCapabilities()
  const allCapabilities = [
    ...result.commands,
    ...result.skills,
    ...result.agents,
    ...result.mcpServices,
    ...result.superpowers,
  ]

  return allCapabilities.find(c => c.id === id)
}

/**
 * Get capabilities by type
 */
export function getCapabilitiesByType(type: string): Capability[] {
  const result = scanCapabilities()

  switch (type) {
    case 'command':
      return result.commands
    case 'skill':
      return result.skills
    case 'agent':
      return result.agents
    case 'mcp':
      return result.mcpServices
    case 'superpower':
      return result.superpowers
    default:
      return []
  }
}
