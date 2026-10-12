export type CodeTool = 'clavue' | 'claude-code' | 'codex' | 'grok';

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
  /**
   * 可选能力声明（v15.28+ 引入，用于减少未来加工具时的硬编码 if）。
   * 目前为可选，后续命令会逐步从硬编码列表迁移到这里。
   */
  capabilities?: {
    /** 是否有持久化配置文件可被 ccjk 直接管理 */
    hasPersistentConfig?: boolean;
    /** 是否参与 ccjk use / profile 同步 */
    participatesInProfiles?: boolean;
    supportsPerms?: boolean;
    supportsModes?: boolean;
    /** 是否为 launcher 类型（grok 这种启动代理而非直接写配置的工具） */
    isLauncher?: boolean;
  };
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
  'grok': {
    id: 'grok',
    displayName: 'Grok CLI',
    homepage: 'https://x.ai',
    configDir: '~/.grok',
    settingsFile: '',           // 认证走 OAuth，存于 ~/.grok/auth.json，无 ccjk 可写的 settings
    binName: 'grok',
    installer: {
      kind: 'script',
      // xAI 官方一行脚本安装（与本机实际安装方式一致）
      install: 'curl -fsSL https://x.ai/cli/install.sh | bash',
      update: 'grok update',
    },
    installHint: 'curl -fsSL https://x.ai/cli/install.sh | bash',
    capabilities: {
      // Grok CLI 是完整的 agent TUI（非代理 launcher）：自带 login/models/agent/mcp。
      // 认证走 OAuth（grok login），不是 ccjk 写文件的模式，所以不参与 profile 同步。
      hasPersistentConfig: false,
      participatesInProfiles: false,
      supportsPerms: false,
      supportsModes: false,
      isLauncher: false,
    },
  },
};
