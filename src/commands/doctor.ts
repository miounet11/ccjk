import inquirer from 'inquirer';
import ansis from 'ansis';
import { autoFix, lintSettings } from '../core/lint.js';
import type { Severity } from '../core/lint.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { detectAll } from '../core/detect.js';

const COLOR: Record<Severity, (s: string) => string> = {
  error: (s) => ansis.red(s),
  warn: (s) => ansis.yellow(s),
  info: (s) => ansis.cyan(s),
};

const ICON: Record<Severity, string> = {
  error: '✗',
  warn: '!',
  info: 'i',
};

export interface DoctorOptions {
  fix?: boolean;
  yes?: boolean;
}

export async function doctorCommand(opts: DoctorOptions = {}): Promise<void> {
  const detected = detectAll();
  const targets: CodeTool[] = detected
    .filter(d => d.configExists && d.tool !== 'codex')
    .map(d => d.tool);

  if (targets.length === 0) {
    console.log(ansis.gray('\n未发现已配置的 Claude/Clavue 实例（~/.claude/ 或 ~/.codex/ 不存在）。\n'));
    return;
  }

  let totalErrors = 0;
  let totalWarns = 0;
  let totalFixable = 0;

  for (const tool of targets) {
    const meta = TOOLS[tool];
    console.log(ansis.bold(`\n[${meta.displayName}] ${meta.settingsFile}`));
    let settings;
    try {
      settings = await readSettings(meta.settingsFile);
    }
    catch (e) {
      console.log(`  ${ansis.red('✗')} 读取失败: ${(e as Error).message}`);
      totalErrors++;
      continue;
    }
    const findings = lintSettings(settings);
    if (findings.length === 0) {
      console.log(`  ${ansis.green('✓')} 无问题`);
      continue;
    }
    for (const f of findings) {
      const fixable = f.fix ? ansis.dim(' [可自动修]') : '';
      const tag = COLOR[f.severity](`${ICON[f.severity]} [${f.rule}]`);
      console.log(`  ${tag} ${f.message}${fixable}`);
      if (f.fixHint) console.log(`    ${ansis.dim('→')} ${ansis.dim(f.fixHint)}`);
      if (f.severity === 'error') totalErrors++;
      else if (f.severity === 'warn') totalWarns++;
      if (f.fix) totalFixable++;
    }
  }

  console.log('');
  if (totalErrors > 0) {
    console.log(ansis.red(`✗ ${totalErrors} error${totalErrors > 1 ? 's' : ''}`) + (totalWarns > 0 ? `, ${ansis.yellow(`${totalWarns} warning${totalWarns > 1 ? 's' : ''}`)}` : ''));
    if (!opts.fix) process.exitCode = 1;
  }
  else if (totalWarns > 0) {
    console.log(ansis.yellow(`! ${totalWarns} warning${totalWarns > 1 ? 's' : ''}`));
  }
  else {
    console.log(ansis.green('✓ 全部通过'));
    console.log('');
    return;
  }

  if (totalFixable > 0 && !opts.fix) {
    console.log(ansis.dim(`  ${totalFixable} 项可自动修复 — 运行 \`ccjk doctor --fix\``));
  }

  if (opts.fix && totalFixable > 0) {
    if (!opts.yes) {
      const { ok } = await inquirer.prompt<{ ok: boolean }>([{
        type: 'confirm',
        name: 'ok',
        message: `自动修复 ${totalFixable} 项？（修改前会备份）`,
        default: true,
      }]);
      if (!ok) {
        console.log(ansis.gray('已跳过 fix。\n'));
        return;
      }
    }
    await runFix(targets);
  }

  console.log('');
}

async function runFix(targets: CodeTool[]): Promise<void> {
  let fixedCount = 0;
  process.exitCode = 0;
  for (const tool of targets) {
    const meta = TOOLS[tool];
    const settings = await readSettings(meta.settingsFile);
    const { fixed, unfixable } = autoFix(settings);
    if (fixed.length === 0 && unfixable.length === 0) continue;
    if (fixed.length > 0) {
      const backup = await writeSettings(meta.settingsFile, settings);
      console.log(ansis.green(`\n  ✔ [${meta.displayName}] 修复 ${fixed.length} 项: ${fixed.join(', ')}`));
      if (backup) console.log(ansis.dim(`    备份: ${backup}`));
      fixedCount += fixed.length;
    }
    if (unfixable.length > 0) {
      console.log(ansis.yellow(`  ! [${meta.displayName}] ${unfixable.length} 项需人工: ${unfixable.join(', ')}`));
      process.exitCode = 1;
    }
  }
  if (fixedCount > 0) console.log(ansis.green(`\n✔ 共修复 ${fixedCount} 项`));
}
