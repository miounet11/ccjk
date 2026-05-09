export type CodeTool = 'clavue' | 'claude-code' | 'codex';

export interface CodeToolMeta {
  id: CodeTool;
  displayName: string;
  homepage: string;
  configDir: string;
  settingsFile: string;
  /** 本地 PATH 上的 CLI 二进制名（用于 `which` 探测和 `<bin> --version`） */
  binName: string;
  /** npm 包名（用于 `npm install -g` / `npm view` 查 latest） */
  npmPackage: string;
  installHint: string;
}

export const TOOLS: Record<CodeTool, CodeToolMeta> = {
  'clavue': {
    id: 'clavue',
    displayName: 'Clavue',
    homepage: 'https://www.clavue.com',
    configDir: '~/.claude',
    settingsFile: '~/.claude/settings.json',
    binName: 'clavue',
    npmPackage: 'clavue',
    installHint: 'npm install -g clavue',
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    homepage: 'https://claude.com/claude-code',
    configDir: '~/.claude',
    settingsFile: '~/.claude/settings.json',
    binName: 'claude',
    npmPackage: '@anthropic-ai/claude-code',
    installHint: 'npm install -g @anthropic-ai/claude-code',
  },
  'codex': {
    id: 'codex',
    displayName: 'Codex',
    homepage: 'https://github.com/openai/codex',
    configDir: '~/.codex',
    settingsFile: '~/.codex/config.toml',
    binName: 'codex',
    npmPackage: '@openai/codex',
    installHint: 'npm install -g @openai/codex',
  },
};
