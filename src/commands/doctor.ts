import ansis from 'ansis';
import { lintSettings } from '../core/lint.js';
import type { Severity } from '../core/lint.js';
import { readSettings } from '../core/settings.js';
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

export async function doctorCommand(): Promise<void> {
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
      const tag = COLOR[f.severity](`${ICON[f.severity]} [${f.rule}]`);
      console.log(`  ${tag} ${f.message}`);
      if (f.fixHint) console.log(`    ${ansis.dim('→')} ${ansis.dim(f.fixHint)}`);
      if (f.severity === 'error') totalErrors++;
      else if (f.severity === 'warn') totalWarns++;
    }
  }

  console.log('');
  if (totalErrors > 0) {
    console.log(ansis.red(`✗ ${totalErrors} error${totalErrors > 1 ? 's' : ''}`) + (totalWarns > 0 ? `, ${ansis.yellow(`${totalWarns} warning${totalWarns > 1 ? 's' : ''}`)}` : ''));
    process.exitCode = 1;
  }
  else if (totalWarns > 0) {
    console.log(ansis.yellow(`! ${totalWarns} warning${totalWarns > 1 ? 's' : ''}`));
  }
  else {
    console.log(ansis.green('✓ 全部通过'));
  }
  console.log('');
}
