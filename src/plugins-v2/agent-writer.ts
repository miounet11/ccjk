/**
 * Agent Writer
 *
 * Handles writing agent definitions to disk
 */

import type { AgentDefinition } from './types'
import { join } from 'pathe'
import { homedir } from 'node:os'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const AGENTS_DIR = join(homedir(), '.ccjk', 'agents')

/**
 * Write agent definition to file
 */
export async function writeAgentFile(
  agent: AgentDefinition,
  options?: {
    format?: 'json' | 'yaml'
    pretty?: boolean
  }
): Promise<string> {
  const format = options?.format || 'json'
  const agentId = generateAgentId(agent)
  const fileName = `${agentId}.${format}`
  const filePath = join(AGENTS_DIR, fileName)

  // Ensure agents directory exists
  if (!existsSync(AGENTS_DIR)) {
    mkdirSync(AGENTS_DIR, { recursive: true })
  }

  // Convert to appropriate format
  let content: string
  if (format === 'json') {
    content = JSON.stringify(agent, null, options?.pretty ? 2 : 0)
  } else {
    // For YAML, we'll need a YAML library
    // For now, just use JSON
    content = JSON.stringify(agent, null, options?.pretty ? 2 : 0)
  }

  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

/**
 * Write multiple agents
 */
export async function writeMultipleAgents(
  agents: AgentDefinition[],
  options?: {
    format?: 'json' | 'yaml'
    pretty?: boolean
  }
): Promise<string[]> {
  const results: string[] = []

  for (const agent of agents) {
    const path = await writeAgentFile(agent, options)
    results.push(path)
  }

  return results
}

/**
 * Update agent file
 */
export async function updateAgentFile(
  agentId: string,
  updates: Partial<AgentDefinition>
): Promise<boolean> {
  const filePath = join(AGENTS_DIR, `${agentId}.json`)

  if (!existsSync(filePath)) {
    return false
  }

  try {
    const existingContent = require(filePath)
    const updatedAgent = { ...existingContent, ...updates }
    writeFileSync(filePath, JSON.stringify(updatedAgent, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Delete agent file
 */
export async function deleteAgentFile(agentId: string): Promise<boolean> {
  const { unlink } = await import('node:fs/promises')
  const filePath = join(AGENTS_DIR, `${agentId}.json`)
  try {
    await unlink(filePath)
    return true
  } catch {
    return false
  }
}

function generateAgentId(agent: AgentDefinition): string {
  return agent.role.toLowerCase().replace(/\s+/g, '-')
}