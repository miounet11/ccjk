import { confirm, input, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { listWorkflows, readWorkflow } from '../core/workflows.js';
import type { StepAction, Workflow } from '../core/workflows.js';
import { initCommand } from './init.js';
import { profileUseCommand } from './profile.js';
import { permsCommand } from './perms.js';
import { mcpCommand } from './mcp.js';
import { statusLineInstallCommand, statusLineUninstallCommand } from './statusline.js';
import { doctorCommand } from './doctor.js';
import { profileImportCommand } from './profile-pack.js';
import { gitInstallCommand } from './git-install.js';
import { modeUseCommand } from './mode.js';

export async function workflowListCommand(): Promise<void> {
  const wfs = await listWorkflows();
  console.log(ansis.bold(`\n可用工作流（${wfs.length}）：\n`));
  for (const w of wfs) {
    console.log(`  ${ansis.cyan(w.id.padEnd(14))} ${w.name}`);
    console.log(`     ${ansis.dim(w.description)}`);
    console.log(`     ${ansis.dim('步骤：')}${w.steps.map(s => s.label).join(' → ')}`);
    console.log();
  }
  console.log(ansis.dim('  运行：ccjk workflow run <id>\n'));
}

export interface RunOptions {
  yes?: boolean;
}

export async function workflowRunCommand(id: string | undefined, opts: RunOptions = {}): Promise<void> {
  const target = id ? await resolveOrFail(id) : await pickWorkflow();
  if (!target) return;

  console.log(ansis.bold(`\n工作流: ${target.id}（${target.name}）`));
  console.log(ansis.dim(`  ${target.description}\n`));
  console.log(ansis.bold('步骤：'));
  for (let i = 0; i < target.steps.length; i++) {
    const s = target.steps[i];
    const opt = s.optional ? ansis.dim(' (可选)') : '';
    console.log(`  ${i + 1}. ${s.label}${opt}`);
  }
  console.log();

  if (!opts.yes) {
    const ok = await confirm({
      message: '开始执行？（每步会单独确认）',
      default: true,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  let executed = 0;
  let skipped = 0;
  for (let i = 0; i < target.steps.length; i++) {
    const step = target.steps[i];
    const total = target.steps.length;
    console.log(ansis.bold.cyan(`\n━━━ [${i + 1}/${total}] ${step.label} ━━━`));

    if (step.optional) {
      const run = await confirm({ message: '执行这一步？', default: false });
      if (!run) {
        console.log(ansis.gray('  跳过'));
        skipped++;
        continue;
      }
    }

    try {
      await runStep(step.action);
      executed++;
    }
    catch (e) {
      console.log(ansis.red(`\n✗ 步骤失败: ${(e as Error).message}`));
      const cont = await select<boolean>({
        message: '继续后续步骤？',
        choices: [
          { name: '继续（跳过这一步）', value: true },
          { name: '中止工作流', value: false },
        ],
      });
      if (!cont) {
        console.log(ansis.gray('\n工作流已中止。已执行 ' + executed + ' 步。\n'));
        return;
      }
      skipped++;
    }
  }

  console.log();
  console.log(ansis.green(`✔ 工作流 "${target.id}" 完成`));
  console.log(ansis.dim(`  执行 ${executed} 步，跳过 ${skipped} 步\n`));
}

async function runStep(action: StepAction): Promise<void> {
  switch (action.type) {
    case 'init':
      return initCommand();
    case 'use':
      return profileUseCommand(action.profile);
    case 'perms':
      return permsCommand(action.tier);
    case 'mcp':
      return mcpCommand({ ...(action.services ? { services: action.services } : {}) });
    case 'statusline-install':
      return statusLineInstallCommand();
    case 'statusline-uninstall':
      return statusLineUninstallCommand();
    case 'doctor-fix':
      return doctorCommand({ fix: true });
    case 'profile-import': {
      if (!action.file) {
        const f = await input({
          message: 'profile 包文件路径',
          validate: (s: string) => s.trim().length > 0 || '不能为空',
        });
        return profileImportCommand(f.trim());
      }
      return profileImportCommand(action.file);
    }
    case 'git-install':
      return gitInstallCommand({});
    case 'mode-use':
      return modeUseCommand(action.mode);
  }
}

async function resolveOrFail(id: string): Promise<Workflow> {
  const w = await readWorkflow(id);
  if (!w) {
    const all = await listWorkflows();
    throw new Error(`workflow "${id}" 不存在。可选: ${all.map(x => x.id).join(', ')}`);
  }
  return w;
}

async function pickWorkflow(): Promise<Workflow | undefined> {
  const wfs = await listWorkflows();
  const id = await select<string>({
    message: '选择要运行的工作流',
    pageSize: Math.min(15, wfs.length + 2),
    choices: wfs.map((w: Workflow) => ({
      name: `${w.id.padEnd(14)} ${ansis.dim(w.description)}`,
      value: w.id,
    })),
  });
  return wfs.find((w: Workflow) => w.id === id);
}
