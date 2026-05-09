export type CodeTool = 'clavue' | 'claude-code' | 'codex';

export interface CodeToolMeta {
  id: CodeTool;
  displayName: string;
  homepage: string;
  configDir: string;
  settingsFile: string;
  installHint: string;
}

export const TOOLS: Record<CodeTool, CodeToolMeta> = {
  'clavue': {
    id: 'clavue',
    displayName: 'Clavue',
    homepage: 'https://www.clavue.com',
    configDir: '~/.claude',
    settingsFile: '~/.claude/settings.json',
    installHint: 'npm install -g clavue',
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    homepage: 'https://claude.com/claude-code',
    configDir: '~/.claude',
    settingsFile: '~/.claude/settings.json',
    installHint: 'npm install -g @anthropic-ai/claude-code',
  },
  'codex': {
    id: 'codex',
    displayName: 'Codex',
    homepage: 'https://github.com/openai/codex',
    configDir: '~/.codex',
    settingsFile: '~/.codex/config.toml',
    installHint: 'npm install -g @openai/codex',
  },
};
