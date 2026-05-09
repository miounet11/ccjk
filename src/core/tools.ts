export type CodeTool = 'clavue' | 'claude-code' | 'codex';

/**
 * 工具的安装方式。
 *
 * - `script`：跑官方一行脚本（推荐方式）。Claude Code 走这条 —— 它的 native 安装器会自动后台升级。
 * - `npm`：传统的 `npm install -g <pkg>`。Clavue / Codex 当前是这种。
 */
export type Installer =
  | { kind: 'script'; install: string; update: string; latestVersionUrl?: string }
  | { kind: 'npm'; package: string };

export interface CodeToolMeta {
  id: CodeTool;
  displayName: string;
  homepage: string;
  configDir: string;
  settingsFile: string;
  /** 本地 PATH 上的 CLI 二进制名 */
  binName: string;
  /** 安装器配置 */
  installer: Installer;
  /** 友好的"如何安装"提示文案 */
  installHint: string;
}

export const TOOLS: Record<CodeTool, CodeToolMeta> = {
  'clavue': {
    id: 'clavue',
    displayName: 'Clavue',
    homepage: 'https://www.clavue.com',
    configDir: '~/.clavue',
    settingsFile: '~/.clavue/settings.json',
    binName: 'clavue',
    installer: { kind: 'npm', package: 'clavue' },
    installHint: 'npm install -g clavue',
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    homepage: 'https://claude.com/claude-code',
    configDir: '~/.claude',
    settingsFile: '~/.claude/settings.json',
    binName: 'claude',
    installer: {
      kind: 'script',
      // 官方推荐安装方式：https://code.claude.com/docs/en/setup
      // Native 安装器会自动后台升级，但保留命令以支持手动升级和首次安装。
      install: 'curl -fsSL https://claude.ai/install.sh | bash',
      update: 'claude update',
    },
    installHint: 'curl -fsSL https://claude.ai/install.sh | bash',
  },
  'codex': {
    id: 'codex',
    displayName: 'Codex',
    homepage: 'https://github.com/openai/codex',
    configDir: '~/.codex',
    settingsFile: '~/.codex/config.toml',
    binName: 'codex',
    installer: { kind: 'npm', package: '@openai/codex' },
    installHint: 'npm install -g @openai/codex',
  },
};
