/**
 * Agent Manager
 *
 * Manages agent registration, lifecycle, and execution
 */

import type { AgentDefinition, CloudAgent } from '../types/agent'
import { join } from 'pathe'
import { homedir } from 'node:os'
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'

const AGENTS_DIR = join(homedir(), '.ccjk', 'agents')

/**
 * Register an agent
 */
export async function registerAgent(agent: Partial<CloudAgent> | AgentDefinition | any): Promise<void> {
  const agentId = 'id' in agent ? agent.id! : generateAgentId(agent)
  const agentPath = join(AGENTS_DIR, `${agentId}.json`)

  // Ensure agents directory exists
  if (!existsSync(AGENTS_DIR)) {
    // Directory will be created by agent-writer
  }

  // Agent is already written by writeAgentFile
  // This function just tracks it in the registry
  const registryPath = join(AGENTS_DIR, 'registry.json')
  let registry: Record<string, any> = {}

  if (existsSync(registryPath)) {
    try {
      registry = JSON.parse(readFileSync(registryPath, 'utf-8'))
    } catch {
      // Invalid registry, start fresh
    }
  }

  registry[agentId] = {
    registeredAt: new Date().toISOString(),
    version: 'version' in agent ? agent.version : '1.0.0',
  }

  writeFileSync(registryPath, JSON.stringify(registry, null, 2))
}

/**
 * List all registered agents
 */
export function listAgents(): string[] {
  const registryPath = join(AGENTS_DIR, 'registry.json')

  if (!existsSync(registryPath)) {
    return []
  }

  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8'))
    return Object.keys(registry)
  } catch {
    return []
  }
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): Partial<CloudAgent> | null {
  const agentPath = join(AGENTS_DIR, `${agentId}.json`)

  if (!existsSync(agentPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(agentPath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Unregister an agent
 */
export async function unregisterAgent(agentId: string): Promise<void> {
  const registryPath = join(AGENTS_DIR, 'registry.json')

  if (!existsSync(registryPath)) {
    return
  }

  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8'))
    delete registry[agentId]
    writeFileSync(registryPath, JSON.stringify(registry, null, 2))
  } catch {
    // Ignore errors
  }
}

function generateAgentId(agent: any): string {
  const name = agent.name || agent.role || 'agent'
  return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
}