/**
 * 极简 TOML 读写器，仅支持本工具需要的字段：
 * - 顶层标量（string/number/bool）
 * - 顶层数组 of string
 * - [section] / [section.subsection] 表
 *
 * 设计取舍：
 * - 不引入第三方 TOML 库（codex 配置很简单，自己写够用）
 * - 写出时**最大限度保留原文件**：未识别的行原样保留，已知字段就地替换
 * - 仅在末尾追加新字段
 *
 * 不支持的特性（codex 当前配置不会用到）：
 * - 多行字符串、复杂内联表、数字数组、日期等
 * 如果碰到无法解析的内容，readCodexConfig 会原样保留它，set/get 只操作能识别的部分。
 */

import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expandHome } from './paths.js';

export type TomlValue = string | number | boolean;

export interface TomlDoc {
  raw: string;
  /** 顶层 + 子表的扁平视图：'a' 或 'a.b' 作 key */
  values: Map<string, TomlValue>;
}

export async function readTomlFile(path: string): Promise<TomlDoc> {
  const real = expandHome(path);
  if (!existsSync(real)) return { raw: '', values: new Map() };
  const raw = await readFile(real, 'utf-8');
  return parseToml(raw);
}

export async function writeTomlFile(path: string, doc: TomlDoc): Promise<string> {
  const real = expandHome(path);
  await mkdir(dirname(real), { recursive: true });
  let backup = '';
  if (existsSync(real)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backup = `${real}.bak-${ts}`;
    await copyFile(real, backup);
  }
  await writeFile(real, doc.raw, 'utf-8');
  return backup;
}

export function parseToml(raw: string): TomlDoc {
  const values = new Map<string, TomlValue>();
  let section = '';
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const sec = /^\[([^\]]+)\]$/.exec(t);
    if (sec) {
      section = sec[1].trim();
      continue;
    }
    const kv = /^([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*(?:#.*)?$/.exec(t);
    if (!kv) continue;
    const key = section ? `${section}.${kv[1]}` : kv[1];
    const v = parseScalar(kv[2]);
    if (v !== undefined) values.set(key, v);
  }
  return { raw, values };
}

function parseScalar(s: string): TomlValue | undefined {
  s = s.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return Number.parseFloat(s);
  const dq = /^"((?:[^"\\]|\\.)*)"$/.exec(s);
  if (dq) return dq[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const sq = /^'([^']*)'$/.exec(s);
  if (sq) return sq[1];
  return undefined;
}

function formatScalar(v: TomlValue): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * 设置一个 key（'foo.bar' 表示 [foo] section 下的 bar）。
 * - 若已存在：原地替换
 * - 若不存在：追加（保持原 section，没有则建一个）
 */
export function setTomlValue(doc: TomlDoc, key: string, value: TomlValue): void {
  doc.values.set(key, value);
  doc.raw = rewriteToml(doc.raw, key, value);
}

function rewriteToml(raw: string, key: string, value: TomlValue): string {
  const dot = key.lastIndexOf('.');
  const section = dot >= 0 ? key.slice(0, dot) : '';
  const localKey = dot >= 0 ? key.slice(dot + 1) : key;
  const formatted = `${localKey} = ${formatScalar(value)}`;

  const lines = raw.split('\n');
  let curSection = '';
  let replaced = false;
  let sectionLineIdx = -1;
  let sectionLastIdx = -1;
  let firstSectionIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const sec = /^\[([^\]]+)\]$/.exec(t);
    if (sec) {
      curSection = sec[1].trim();
      if (firstSectionIdx < 0) firstSectionIdx = i;
      if (curSection === section) sectionLineIdx = i;
      continue;
    }
    if (curSection === section) sectionLastIdx = i;
    const kv = /^([A-Za-z0-9_.-]+)\s*=/.exec(t);
    if (!kv) continue;
    if (curSection === section && kv[1] === localKey) {
      lines[i] = formatted;
      replaced = true;
      break;
    }
  }

  if (replaced) return lines.join('\n');

  if (!section) {
    // 顶层 key：必须插在第一个 section 之前，否则会落进那个 section
    if (firstSectionIdx >= 0) {
      // 找到第一个 section 前最后一个非空行的位置
      let insertAt = firstSectionIdx;
      while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt--;
      lines.splice(insertAt, 0, formatted);
      return ensureTrailingNewline(lines.join('\n'));
    }
    const out = lines.slice();
    if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
    out.push(formatted);
    return ensureTrailingNewline(out.join('\n'));
  }

  if (sectionLineIdx >= 0) {
    const insertAt = sectionLastIdx >= 0 ? sectionLastIdx + 1 : sectionLineIdx + 1;
    lines.splice(insertAt, 0, formatted);
    return lines.join('\n');
  }

  const out = lines.slice();
  if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
  out.push(`[${section}]`, formatted);
  return ensureTrailingNewline(out.join('\n'));
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : `${s}\n`;
}
