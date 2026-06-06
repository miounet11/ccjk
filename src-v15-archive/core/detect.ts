import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { CodeTool } from './tools.js';
import { TOOLS } from './tools.js';
import { expandHome } from './paths.js';

export interface ToolStatus {
  tool: CodeTool;
  cliInstalled: boolean;
  configExists: boolean;
}

function which(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  }
  catch {
    return false;
  }
}

export function detectAll(): ToolStatus[] {
  return (Object.keys(TOOLS) as CodeTool[]).map((id) => {
    const meta = TOOLS[id];
    return {
      tool: id,
      cliInstalled: which(id === 'claude-code' ? 'claude' : id),
      configExists: existsSync(expandHome(meta.configDir)),
    };
  });
}
