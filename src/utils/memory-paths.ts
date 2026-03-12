import { resolve } from 'node:path'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR, CLAUDE_DIR } from '../constants.js'
import { config } from '../config/unified/index.js'

interface MemoryDirectoryOverrides {
  claudeDir?: string
  ccjkDir?: string
}

function getMemoryDirectoryOverrides(): MemoryDirectoryOverrides {
  const ccjkConfig = config.ccjk.read()
  return {
    claudeDir: ccjkConfig?.storage?.memory?.claudeDir,
    ccjkDir: ccjkConfig?.storage?.memory?.ccjkDir,
  }
}

function resolveClaudeDir(claudeDir?: string): string {
  return normalizeProjectPath(claudeDir || getMemoryDirectoryOverrides().claudeDir || CLAUDE_DIR)
}

function resolveCcjkDir(ccjkDir?: string): string {
  return normalizeProjectPath(ccjkDir || getMemoryDirectoryOverrides().ccjkDir || CCJK_CONFIG_DIR)
}

export function normalizeProjectPath(projectPath: string): string {
  return resolve(projectPath).replace(/\\/g, '/')
}

export function toClaudeProjectDirName(projectPath: string): string {
  const normalizedPath = normalizeProjectPath(projectPath).replace(/^\/+/, '')
  return `-${normalizedPath.replace(/[:/]/g, '-')}`
}

export function fromClaudeProjectDirName(projectDirName: string): string {
  const normalizedName = projectDirName.replace(/^-+/, '')
  if (!normalizedName) {
    return '/'
  }

  return `/${normalizedName.replace(/-/g, '/')}`
}

export function getClaudeMemoryPath(projectPath?: string, claudeDir?: string): string {
  const resolvedClaudeDir = resolveClaudeDir(claudeDir)
  if (projectPath) {
    return join(resolvedClaudeDir, 'projects', toClaudeProjectDirName(projectPath), 'memory', 'MEMORY.md')
  }

  return join(resolvedClaudeDir, 'memory', 'MEMORY.md')
}

export function getCcjkMemoryPath(projectPath?: string, ccjkDir?: string): string {
  const resolvedCcjkDir = resolveCcjkDir(ccjkDir)
  if (projectPath) {
    return join(resolvedCcjkDir, 'memory', 'projects', toClaudeProjectDirName(projectPath), 'MEMORY.md')
  }

  return join(resolvedCcjkDir, 'memory', 'global', 'MEMORY.md')
}

export function getClaudeProjectsDir(claudeDir?: string): string {
  return join(resolveClaudeDir(claudeDir), 'projects')
}

export function getConfiguredMemoryDirectories(): Required<MemoryDirectoryOverrides> {
  return {
    claudeDir: resolveClaudeDir(),
    ccjkDir: resolveCcjkDir(),
  }
}
