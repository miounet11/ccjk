import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * 工作流：按顺序跑一组步骤。
 *
 * 设计：
 * - 步骤是 ccjk 命令的字符串描述，不直接绑函数 —— 这样未来可以从 JSON 文件加载用户自定义工作流
 *   （现在还没启用文件加载，但 step 数据结构已经支持）。
 * - 每步可标 `optional`：用户可以跳过。
 * - 不做"失败回滚"。每个 ccjk 子命令本身已经写过备份，工作流只是按顺序串起来。
 *   出错时停下来，用户可以 `ccjk rollback` 回到之前。
 */

export type StepAction =
  | { type: 'init' }
  | { type: 'use'; profile?: string }
  | { type: 'perms'; tier: 'safe' | 'standard' | 'yolo' }
  | { type: 'mcp'; services?: string[] }
  | { type: 'statusline-install' }
  | { type: 'statusline-uninstall' }
  | { type: 'doctor-fix' }
  | { type: 'profile-import'; file?: string }
  | { type: 'git-install' }
  | { type: 'mode-use'; mode: string };

export interface WorkflowStep {
  /** 描述给用户看，比如"配置 API"，不是命令本身 */
  label: string;
  action: StepAction;
  optional?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export const BUILTIN_WORKFLOWS: Record<string, Workflow> = {
  'starter': {
    id: 'starter',
    name: '新机首配',
    description: '装机后跑一遍：配 API → 设权限档位 → 装状态栏',
    steps: [
      { label: '配置 API（init）', action: { type: 'init' } },
      { label: '设权限档位 standard', action: { type: 'perms', tier: 'standard' } },
      { label: '安装状态栏', action: { type: 'statusline-install' } },
      { label: '装常用 MCP（可选）', action: { type: 'mcp' }, optional: true },
    ],
  },

  'team-import': {
    id: 'team-import',
    name: '团队配置导入',
    description: '从 profile 包导入 → 切到合适档位 → 体检自动修',
    steps: [
      { label: '导入 profile 包', action: { type: 'profile-import' } },
      { label: '切换到导入的 profile', action: { type: 'use' } },
      { label: '设权限档位 standard', action: { type: 'perms', tier: 'standard' } },
      { label: '体检 + 自动修', action: { type: 'doctor-fix' } },
    ],
  },

  'reset-soft': {
    id: 'reset-soft',
    name: '回到低打扰状态',
    description: '卸状态栏 + 切到 safe 档位 — 适合让步给同事用你的机器',
    steps: [
      { label: '卸载状态栏', action: { type: 'statusline-uninstall' } },
      { label: '切到 safe 权限档位', action: { type: 'perms', tier: 'safe' } },
    ],
  },

  'dev-ready': {
    id: 'dev-ready',
    name: '日常开发就绪',
    description: '切 code 模式 + perms standard + 装 git 模板 + 体检',
    steps: [
      { label: '切到 code 对话模式', action: { type: 'mode-use', mode: 'code' } },
      { label: '设权限档位 standard', action: { type: 'perms', tier: 'standard' } },
      { label: '装 git slash 命令', action: { type: 'git-install' } },
      { label: '体检 + 自动修', action: { type: 'doctor-fix' } },
    ],
  },
};

export const WORKFLOWS_DIR = join(homedir(), '.ccjk', 'workflows');

export async function listWorkflows(dir = WORKFLOWS_DIR): Promise<Workflow[]> {
  const out = new Map<string, Workflow>();
  for (const w of Object.values(BUILTIN_WORKFLOWS)) out.set(w.id, w);
  if (existsSync(dir)) {
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(dir, f), 'utf-8');
        const def = JSON.parse(raw) as Workflow;
        out.set(def.id, def);
      }
      catch { /* 跳过损坏 */ }
    }
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function readWorkflow(id: string, dir = WORKFLOWS_DIR): Promise<Workflow | null> {
  if (existsSync(join(dir, `${id}.json`))) {
    const raw = await readFile(join(dir, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as Workflow;
  }
  return BUILTIN_WORKFLOWS[id] ?? null;
}

export async function writeWorkflow(w: Workflow, dir = WORKFLOWS_DIR): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${w.id}.json`), `${JSON.stringify(w, null, 2)}\n`, 'utf-8');
}
