import ansis from 'ansis';
import { maskKey, readProfile } from '../core/profiles.js';
import type { Profile } from '../core/profiles.js';
import { displayWidth, padToWidth } from '../core/term.js';

/** 参与对比的字段。apiKey 单独处理（只比较是否相同，显示用 maskKey） */
const COMPARE_FIELDS = [
  'provider',
  'baseUrl',
  'authType',
  'model',
  'fastModel',
  'sonnetModel',
  'opusModel',
] as const satisfies ReadonlyArray<keyof Profile>;

export interface DiffEntry {
  field: string;
  aValue: string;
  bValue: string;
  equal: boolean;
}

export interface DiffJsonReport {
  a: string;
  b: string;
  diff: DiffEntry[];
  identical: boolean;
}

function fmt(v: string | undefined): string {
  return v === undefined || v === '' ? '-' : v;
}

function buildDiff(a: Profile, b: Profile): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const f of COMPARE_FIELDS) {
    const av = a[f] as string | undefined;
    const bv = b[f] as string | undefined;
    entries.push({
      field: f,
      aValue: fmt(av),
      bValue: fmt(bv),
      equal: (av ?? '') === (bv ?? ''),
    });
  }
  // apiKey：比较原文，显示 mask
  entries.push({
    field: 'apiKey',
    aValue: maskKey(a.apiKey),
    bValue: maskKey(b.apiKey),
    equal: a.apiKey === b.apiKey,
  });
  return entries;
}

/** 渲染彩色表格：3 列 field / a / b，不同字段红色高亮 */
function renderTable(aName: string, bName: string, entries: DiffEntry[]): string {
  const headerField = 'field';
  const headerA = aName;
  const headerB = bName;

  const wField = Math.max(
    displayWidth(headerField),
    ...entries.map(e => displayWidth(e.field)),
  );
  const wA = Math.max(
    displayWidth(headerA),
    ...entries.map(e => displayWidth(e.aValue)),
  );
  const wB = Math.max(
    displayWidth(headerB),
    ...entries.map(e => displayWidth(e.bValue)),
  );

  const sep = `${'-'.repeat(wField)}  ${'-'.repeat(wA)}  ${'-'.repeat(wB)}`;
  const lines: string[] = [];
  lines.push(
    ansis.bold(`${padToWidth(headerField, wField)}  ${padToWidth(headerA, wA)}  ${padToWidth(headerB, wB)}`),
  );
  lines.push(ansis.dim(sep));
  for (const e of entries) {
    const row = `${padToWidth(e.field, wField)}  ${padToWidth(e.aValue, wA)}  ${padToWidth(e.bValue, wB)}`;
    lines.push(e.equal ? ansis.dim(row) : ansis.red(row));
  }
  return lines.join('\n');
}

export async function profileDiffCommand(
  a: string,
  b: string,
  opts: { json?: boolean } = {},
): Promise<void> {
  const [pa, pb] = await Promise.all([readProfile(a), readProfile(b)]);
  if (!pa) throw new Error(`profile "${a}" 不存在`);
  if (!pb) throw new Error(`profile "${b}" 不存在`);

  const entries = buildDiff(pa, pb);
  const identical = entries.every(e => e.equal);

  if (opts.json) {
    const report: DiffJsonReport = { a, b, diff: entries, identical };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  else if (identical) {
    console.log(ansis.green('\n两个 profile 完全相同\n'));
  }
  else {
    console.log();
    console.log(renderTable(a, b, entries));
    console.log();
  }

  process.exitCode = identical ? 0 : 1;
}
