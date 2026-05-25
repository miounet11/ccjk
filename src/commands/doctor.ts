import { confirm } from '@inquirer/prompts';
import ansis from 'ansis';
import { autoFix, lintSettings } from '../core/lint.js';
import type { Finding, Severity } from '../core/lint.js';
import { autoFixCodex, lintCodexConfig } from '../core/codex-config.js';
import type { CodexFinding } from '../core/codex-config.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
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
  json?: boolean;
}

interface JsonFinding {
  rule: string;
  severity: Severity;
  message: string;
  fixHint?: string;
  fixable: boolean;
}

interface JsonTarget {
  tool: CodeTool;
  path: string;
  ok: boolean;
  findings: JsonFinding[];
}

interface JsonReport {
  schemaVersion: 1;
  targets: JsonTarget[];
  summary: { errors: number; warnings: number; infos: number; fixable: number };
}

function toJsonFinding(f: Finding | CodexFinding): JsonFinding {
  const out: JsonFinding = {
    rule: f.rule,
    severity: f.severity,
    message: f.message,
    fixable: typeof f.fix === 'function',
  };
  if (f.fixHint) out.fixHint = f.fixHint;
  return out;
}

export async function doctorCommand(opts: DoctorOptions = {}): Promise<void> {
  // --json 与 --fix 互斥
  if (opts.json && opts.fix) {
    const msg = '--json 与 --fix 互斥：JSON 输出模式下不执行修复。';
    process.stderr.write(`${msg}\n`);
    process.exit(1);
  }

  if (opts.json) {
    await runJson();
    return;
  }

  await runHuman(opts);
}

async function runJson(): Promise<void> {
  const detected = detectAll();
  const claudeTargets: CodeTool[] = detected
    .filter(d => d.configExists && d.tool !== 'codex')
    .map(d => d.tool);
  const codexDetected = detected.find(d => d.tool === 'codex' && d.configExists);

  const targets: JsonTarget[] = [];
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let fixable = 0;

  for (const tool of claudeTargets) {
    const meta = TOOLS[tool];
    const target: JsonTarget = {
      tool,
      path: meta.settingsFile,
      ok: true,
      findings: [],
    };
    try {
      const settings = await readSettings(meta.settingsFile);
      const findings = lintSettings(settings);
      for (const f of findings) {
        target.findings.push(toJsonFinding(f));
        if (f.severity === 'error') errors++;
        else if (f.severity === 'warn') warnings++;
        else infos++;
        if (f.fix) fixable++;
      }
    }
    catch (e) {
      target.findings.push({
        rule: 'read-failed',
        severity: 'error',
        message: `读取失败: ${(e as Error).message}`,
        fixable: false,
      });
      errors++;
    }
    target.ok = target.findings.every(f => f.severity === 'info');
    targets.push(target);
  }

  if (codexDetected) {
    const meta = TOOLS.codex;
    const target: JsonTarget = {
      tool: 'codex',
      path: meta.settingsFile,
      ok: true,
      findings: [],
    };
    try {
      const doc = await readTomlFile(meta.settingsFile);
      const findings = lintCodexConfig(doc);
      for (const f of findings) {
        target.findings.push(toJsonFinding(f));
        if (f.severity === 'error') errors++;
        else if (f.severity === 'warn') warnings++;
        else infos++;
        if (f.fix) fixable++;
      }
    }
    catch (e) {
      target.findings.push({
        rule: 'read-failed',
        severity: 'error',
        message: `读取失败: ${(e as Error).message}`,
        fixable: false,
      });
      errors++;
    }
    target.ok = target.findings.every(f => f.severity === 'info');
    targets.push(target);
  }

  const report: JsonReport = {
    schemaVersion: 1,
    targets,
    summary: { errors, warnings, infos, fixable },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (errors > 0) process.exitCode = 2;
  else if (warnings > 0) process.exitCode = 1;
  else process.exitCode = 0;
}

async function runHuman(opts: DoctorOptions): Promise<void> {
  const detected = detectAll();
  // claude-family（clavue / claude-code）走 settings.json lint
  const claudeTargets: CodeTool[] = detected
    .filter(d => d.configExists && d.tool !== 'codex')
    .map(d => d.tool);
  // codex 走 toml lint
  const codexDetected = detected.find(d => d.tool === 'codex' && d.configExists);

  if (claudeTargets.length === 0 && !codexDetected) {
    console.log(ansis.gray('\n未发现已配置的实例（~/.claude/、~/.clavue/、~/.codex/ 都不存在）。\n'));
    return;
  }

  let totalErrors = 0;
  let totalWarns = 0;
  let totalFixable = 0;

  for (const tool of claudeTargets) {
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

  // codex toml lint
  if (codexDetected) {
    const meta = TOOLS.codex;
    console.log(ansis.bold(`\n[${meta.displayName}] ${meta.settingsFile}`));
    try {
      const doc = await readTomlFile(meta.settingsFile);
      const findings = lintCodexConfig(doc);
      if (findings.length === 0) {
        console.log(`  ${ansis.green('✓')} 无问题`);
      }
      else {
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
    }
    catch (e) {
      console.log(`  ${ansis.red('✗')} 读取失败: ${(e as Error).message}`);
      totalErrors++;
    }
  }

  console.log('');
  if (totalErrors > 0) {
    console.log(ansis.red(`✗ ${totalErrors} error${totalErrors > 1 ? 's' : ''}`) + (totalWarns > 0 ? `, ${ansis.yellow(`${totalWarns} warning${totalWarns > 1 ? 's' : ''}`)}` : ''));
    if (!opts.fix) process.exitCode = 2;
  }
  else if (totalWarns > 0) {
    console.log(ansis.yellow(`! ${totalWarns} warning${totalWarns > 1 ? 's' : ''}`));
    if (!opts.fix) process.exitCode = 1;
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
      const ok = await confirm({
        message: `自动修复 ${totalFixable} 项？（修改前会备份）`,
        default: true,
      });
      if (!ok) {
        console.log(ansis.gray('已跳过 fix。\n'));
        return;
      }
    }
    await runFix(claudeTargets);
    if (codexDetected) {
      await runFixCodex();
    }
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

async function runFixCodex(): Promise<void> {
  const meta = TOOLS.codex;
  const doc = await readTomlFile(meta.settingsFile);
  const { fixed, unfixable } = autoFixCodex(doc);
  if (fixed.length === 0 && unfixable.length === 0) return;
  if (fixed.length > 0) {
    const backup = await writeTomlFile(meta.settingsFile, doc);
    console.log(ansis.green(`\n  ✔ [${meta.displayName}] 修复 ${fixed.length} 项: ${fixed.join(', ')}`));
    if (backup) console.log(ansis.dim(`    备份: ${backup}`));
  }
  if (unfixable.length > 0) {
    console.log(ansis.yellow(`  ! [${meta.displayName}] ${unfixable.length} 项需人工: ${unfixable.join(', ')}`));
    process.exitCode = 1;
  }
}
