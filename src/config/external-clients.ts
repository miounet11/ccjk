/**
 * 外部客户端注册表 —— ccjk 以「轻量客户端」模式支持的更多 coding agent。
 *
 * 与 TOOL_MATRIX 四工具（clavue / claude-code / codex / grok）不同，外部客户端：
 * - 不进入 CODE_TOOL_TYPES / TOOL_MATRIX（不参与主菜单四工具分页、doctor 矩阵、uninstall）
 * - 走 grok / reasonix 同款路径：状态探测 + ~/.ccjk profile 注入启动
 * - envStrategy 决定 profile → 环境变量的映射方式
 *
 * 新客户端只需在此追加条目，命令与菜单子项自动生成。
 */

import { homedir } from 'node:os'
import { join } from 'pathe'

/** profile 注入客户端的环境变量策略 */
export type ExternalClientEnvStrategy = 'anthropic' | 'openai' | 'none'

export interface ExternalClientEntry {
  id: string
  displayName: string
  /** PATH 上的可执行文件名 */
  bin: string
  configDir: string
  configFiles: string[]
  envStrategy: ExternalClientEnvStrategy
  installHint: string
  /** 已知 provider 配置文件格式时，ccjk 可直接写入（目前仅 opencode-json） */
  providerConfigWriter?: 'opencode-json'
  notes?: string
}

function xdgConfigHome(): string {
  const fromEnv = process.env?.XDG_CONFIG_HOME?.trim()
  if (fromEnv)
    return fromEnv
  return join(homedir(), '.config')
}

const OPENCODE_CONFIG_DIR = join(xdgConfigHome(), 'opencode')

export const EXTERNAL_CLIENTS: readonly ExternalClientEntry[] = [
  {
    id: 'pi',
    displayName: 'Pi',
    bin: 'pi',
    configDir: join(homedir(), '.pi'),
    configFiles: ['models.json', 'settings.json'],
    envStrategy: 'openai',
    installHint: 'npm i -g @mariozechner/pi',
    notes: 'pi 支持自定义 provider（models.json）；ccjk 先以 OPENAI_* env 注入启动',
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    bin: 'opencode',
    configDir: OPENCODE_CONFIG_DIR,
    configFiles: ['opencode.json', 'opencode.jsonc'],
    envStrategy: 'openai',
    installHint: 'npm i -g opencode-ai',
    providerConfigWriter: 'opencode-json',
    notes: 'ccjk 直接把 ccjk profile 写入 opencode.json 的 provider 段并设默认模型',
  },
  {
    id: 'zcode',
    displayName: 'ZCode',
    bin: 'zcode',
    configDir: join(homedir(), '.zcode'),
    configFiles: ['config.json', 'config.toml'],
    envStrategy: 'openai',
    installHint: '参考 ZCode 官方文档安装',
    notes: '配置格式未完全确认，先以 OPENAI_* env 注入启动（OpenAI 兼容端点通用）',
  },
  {
    id: 'grokbuild',
    displayName: 'Grok Build',
    bin: 'grokbuild',
    configDir: join(homedir(), '.grokbuild'),
    configFiles: ['config.toml', 'config.json'],
    envStrategy: 'openai',
    installHint: '参考 Grok Build 官方文档安装',
    notes: 'xAI 端点 OpenAI 兼容；如需持久配置请用官方 CLI 自身能力',
  },
  {
    id: 'claudework',
    displayName: 'ClaudeWork',
    bin: 'claudework',
    configDir: join(homedir(), '.claudework'),
    configFiles: ['settings.json'],
    envStrategy: 'anthropic',
    installHint: '参考 ClaudeWork 官方文档安装',
    notes: 'Claude 家族兼容客户端，走 ANTHROPIC_* env 注入',
  },
]

export function getExternalClient(id: string): ExternalClientEntry | null {
  return EXTERNAL_CLIENTS.find(client => client.id === id) ?? null
}

/** opencode 配置文件路径（provider 写入用） */
export function opencodeConfigFile(): string {
  return join(OPENCODE_CONFIG_DIR, 'opencode.json')
}
