import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import ansis from 'ansis';
import { expandHome } from '../core/paths.js';
import { SLASH_TEMPLATES } from '../core/slash-templates.js';
import type { SlashName } from '../core/slash-templates.js';

export interface GitInstallOptions {
  target?: string;
  scope?: 'user' | 'project';
  yes?: boolean;
}

export async function gitInstallCommand(opts: GitInstallOptions = {}): Promise<void> {
  const scope = opts.scope ?? 'user';
  const baseDir = scope === 'user'
    ? expandHome('~/.claude/commands/ccjk')
    : join(process.cwd(), '.claude/commands/ccjk');

  const target = opts.target ? expandHome(opts.target) : baseDir;
  const names = Object.keys(SLASH_TEMPLATES) as SlashName[];

  console.log(ansis.dim(`\n→ 安装到: ${target}`));
  console.log(ansis.dim(`→ 命令: ${names.map(n => `/ccjk:${n}`).join(', ')}\n`));

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: '确认安装？',
      default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  await mkdir(target, { recursive: true });
  for (const name of names) {
    const path = join(target, `${name}.md`);
    if (existsSync(path) && !opts.yes) {
      const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([{
        type: 'confirm',
        name: 'overwrite',
        message: `${name}.md 已存在，覆盖？`,
        default: false,
      }]);
      if (!overwrite) {
        console.log(ansis.gray(`  跳过 ${name}`));
        continue;
      }
    }
    await writeFile(path, SLASH_TEMPLATES[name], 'utf-8');
    console.log(ansis.green(`  ✔ ${name}.md`));
  }
  console.log(ansis.green('\n✔ 安装完成'));
  console.log(ansis.dim(`  在 Claude Code/Clavue 中输入 /ccjk:git-commit 试一下\n`));
}
