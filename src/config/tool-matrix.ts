import type { CodeToolType } from '../constants'
import {
  CLAUDE_DIR,
  CLAVUE_DIR,
  CODEX_DIR,
  CODEX_PROMPTS_DIR,
  settingsFileForTool,
} from '../constants'
import { homedir } from 'node:os'
import { join } from 'pathe'

/** ccjk 对某工具承担的角色：体检 / 快捷配置 / 两者兼有 */
export type CcjkToolRole = 'doctor' | 'operator' | 'both'

export type ToolMcpFormat = 'settings-json' | 'config-toml' | 'none'
export type ToolProfileStorage = 'settings-json' | 'config-toml' | 'ccjk-profile'

export interface ToolCapabilityFlags {
  fullInit: boolean
  updateWorkflow: boolean
  configureApi: boolean
  configureMcp: boolean
  configureModel: boolean
  configureAiMemory: boolean
  configureEnvPermission: boolean
  cleanEnvironment: boolean
  uninstall: boolean
  checkUpdates: boolean
  setupPresets: boolean
}

export interface ToolMatrixEntry {
  id: CodeToolType
  displayName: string
  configRoot: string
  configFile: string
  skillsDirs: string[]
  mcpFormat: ToolMcpFormat
  profileStorage: ToolProfileStorage
  roles: CcjkToolRole[]
  capabilities: ToolCapabilityFlags
  /** 医生：扫描 / 诊断项（`ccjk clean` / 未来 `ccjk doctor`） */
  doctorChecks: readonly string[]
  /** 操作员：一键写入 / 修复项（`ccjk init` / 菜单子项） */
  operatorActions: readonly string[]
}

const GROK_DIR = join(homedir(), '.grok')
const AGENTS_SKILLS_DIR = join(homedir(), '.agents', 'skills')

const CLAUDE_FAMILY_CAPABILITIES: ToolCapabilityFlags = {
  fullInit: true,
  updateWorkflow: true,
  configureApi: true,
  configureMcp: true,
  configureModel: true,
  configureAiMemory: true,
  configureEnvPermission: true,
  cleanEnvironment: true,
  uninstall: true,
  checkUpdates: true,
  setupPresets: false,
}

const CLAUDE_FAMILY_DOCTOR = [
  'mcp-unmanaged',
  'mcp-broken',
  'mcp-bloat',
  'skill-missing-file',
  'skill-empty',
] as const

const CLAUDE_FAMILY_OPERATOR = [
  'init-full',
  'update-workflow',
  'configure-api',
  'configure-mcp',
  'configure-model',
  'configure-ai-memory',
  'configure-env-permission',
  'clean-environment',
] as const

/**
 * 四工具能力矩阵 —— ccjk 作为「医生 + 快捷操作员」的唯一真相源。
 *
 * - **医生**：只读扫描，找出脏 MCP、坏 Skill、冗余 prompt、过时 AGENTS.md
 * - **操作员**：经用户确认后写入配置（备份先行），不碰 agent runtime
 */
export const TOOL_MATRIX: Record<CodeToolType, ToolMatrixEntry> = {
  clavue: {
    id: 'clavue',
    displayName: 'Clavue',
    configRoot: CLAVUE_DIR,
    configFile: settingsFileForTool('clavue'),
    skillsDirs: [join(CLAVUE_DIR, 'skills'), AGENTS_SKILLS_DIR],
    mcpFormat: 'settings-json',
    profileStorage: 'settings-json',
    roles: ['both'],
    capabilities: { ...CLAUDE_FAMILY_CAPABILITIES },
    doctorChecks: [...CLAUDE_FAMILY_DOCTOR],
    operatorActions: [...CLAUDE_FAMILY_OPERATOR],
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    configRoot: CLAUDE_DIR,
    configFile: settingsFileForTool('claude-code'),
    skillsDirs: [join(CLAUDE_DIR, 'skills'), AGENTS_SKILLS_DIR],
    mcpFormat: 'settings-json',
    profileStorage: 'settings-json',
    roles: ['both'],
    capabilities: { ...CLAUDE_FAMILY_CAPABILITIES },
    doctorChecks: [...CLAUDE_FAMILY_DOCTOR],
    operatorActions: [...CLAUDE_FAMILY_OPERATOR],
  },
  codex: {
    id: 'codex',
    displayName: 'Codex (CLI / 桌面 / IDE)',
    configRoot: CODEX_DIR,
    configFile: settingsFileForTool('codex'),
    skillsDirs: [join(CODEX_DIR, 'skills')],
    mcpFormat: 'config-toml',
    profileStorage: 'config-toml',
    roles: ['both'],
    capabilities: {
      fullInit: true,
      updateWorkflow: true,
      configureApi: true,
      configureMcp: true,
      configureModel: true,
      configureAiMemory: true,
      configureEnvPermission: false,
      cleanEnvironment: true,
      uninstall: true,
      checkUpdates: true,
      setupPresets: true,
    },
    doctorChecks: [
      'runtime-status',
      'config-feature-risk',
      'mcp-unmanaged',
      'mcp-broken',
      'mcp-orphan-toml',
      'mcp-bloat',
      'skill-missing-file',
      'skill-empty',
      'prompt-stale',
      'agents-file-stale',
    ],
    operatorActions: [
      'init-preset-clean',
      'init-preset-optimized',
      'init-preset-custom',
      'update-workflow',
      'configure-api',
      'configure-mcp',
      'configure-model',
      'configure-ai-memory',
      'clean-environment',
    ],
  },
  grok: {
    id: 'grok',
    displayName: 'Grok CLI',
    configRoot: GROK_DIR,
    configFile: join(GROK_DIR, 'config.toml'),
    skillsDirs: [
      join(GROK_DIR, 'skills'),
      join(GROK_DIR, 'bundled', 'skills'),
    ],
    mcpFormat: 'config-toml',
    profileStorage: 'ccjk-profile',
    roles: ['both'],
    capabilities: {
      fullInit: true,
      updateWorkflow: false,
      configureApi: true,
      configureMcp: false,
      configureModel: true,
      configureAiMemory: false,
      configureEnvPermission: false,
      cleanEnvironment: true,
      uninstall: false,
      checkUpdates: true,
      setupPresets: false,
    },
    doctorChecks: [
      'mcp-unmanaged',
      'mcp-broken',
      'mcp-bloat',
      'skill-missing-file',
      'skill-empty',
      'skill-purge-all',
      'grok-auth-status',
    ],
    operatorActions: [
      'configure-api',
      'configure-model',
      'launch-status',
      'clean-environment',
    ],
  },
}

export function getToolMatrix(tool: CodeToolType): ToolMatrixEntry {
  return TOOL_MATRIX[tool]
}

export function getToolsWithCapability(flag: keyof ToolCapabilityFlags): CodeToolType[] {
  return (Object.keys(TOOL_MATRIX) as CodeToolType[]).filter(
    tool => TOOL_MATRIX[tool].capabilities[flag],
  )
}

export function getDoctorScopeSummary(): string[] {
  const lines: string[] = []
  for (const entry of Object.values(TOOL_MATRIX)) {
    if (!entry.capabilities.cleanEnvironment && entry.roles.every(r => r !== 'doctor'))
      continue
    lines.push(`${entry.displayName}: ${entry.doctorChecks.join(', ')}`)
  }
  return lines
}

/** Codex prompts 目录（医生扫描用，不写入 matrix 避免循环依赖） */
export const CODEX_DOCTOR_PROMPTS_DIR = CODEX_PROMPTS_DIR