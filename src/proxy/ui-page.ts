import { ACCOUNT_TOS_WARNING } from './types'

/** 本机界面。由代理进程直接返回，不另起前端工程。 */
export function renderUiPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ccjk</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f5f5f7;
    --sidebar: rgba(255,255,255,.78);
    --card: #fff;
    --text: #1d1d1f;
    --muted: #6e6e73;
    --line: #e4e4e8;
    --accent: #0071e3;
    --accent-press: #0062c7;
    --ok: #1f7a3a;
    --ok-bg: #eaf7ee;
    --warn: #8a5a00;
    --warn-bg: #fff6df;
    --info: #0b3d73;
    --info-bg: #e8f2ff;
    --danger: #c41e16;
    --danger-bg: #fdeceb;
    --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.06);
    --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
    --radius: 14px;
    --radius-sm: 8px;
    --radius-md: 10px;
    --radius-lg: 18px;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 24px;
    --space-6: 32px;
    --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    --surface-2: #f2f2f4;
  }
  * { box-sizing: border-box; }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  html, body { margin: 0; min-height: 100%; }
  body {
    font: 16px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
    color: var(--text);
    background:
      radial-gradient(1200px 500px at 10% -10%, #e7f1ff 0%, transparent 55%),
      var(--bg);
  }
  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; }
  .app { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
  aside {
    position: sticky; top: 0; height: 100vh; overflow: auto;
    padding: 22px 14px 16px;
    background: var(--sidebar);
    border-right: 1px solid var(--line);
    backdrop-filter: blur(18px);
    display: flex; flex-direction: column; gap: 4px;
  }
  .brand { padding: 4px 10px 14px; }
  .brand strong { display: block; font-size: 20px; letter-spacing: -0.03em; }
  .brand span { color: var(--muted); font-size: 13px; }
  .group {
    margin: 14px 10px 6px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .nav-btn, .tool-btn {
    width: 100%; text-align: left;
    border: 0; background: transparent;
    border-radius: 10px;
    padding: 8px 10px;
    color: var(--text);
  }
  .nav-btn[aria-current="true"], .tool-btn[aria-current="true"] {
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.06);
  }
  .tool-btn b { font-weight: 600; }
  .tool-btn small { display: block; color: var(--muted); font-size: 12px; font-weight: 400; }
  .foot { margin-top: auto; padding: 12px 10px 4px; color: var(--muted); font-size: 12px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; background: var(--ok); margin-right: 6px; }
  main { padding: 32px 36px 72px; }
  .wrap { max-width: 880px; }
  h1 { margin: 0; font-size: 32px; letter-spacing: -0.03em; font-weight: 650; }
  h2 { margin: 22px 0 8px; font-size: 15px; }
  .lede { margin: 6px 0 0; color: var(--muted); max-width: 40em; }
  .seg {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 4px; padding: 4px; margin: 22px 0 8px;
    background: rgba(0,0,0,.05); border-radius: 12px;
  }
  .seg button {
    border: 0; background: transparent; border-radius: 9px;
    padding: 8px 10px; color: var(--text);
  }
  .seg button[aria-selected="true"] { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 600; }
  .hint { color: var(--muted); margin: 0 0 14px; min-height: 1.45em; }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .wrap.enter > * { animation: rise .18s ease both; }
  @media (prefers-reduced-motion: reduce) { .wrap.enter > * { animation: none; } }
  .hero {
    background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
    padding: 18px 20px; margin: 18px 0 20px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .hero .hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .hero .hero-name { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; word-break: break-all; }
  .hero .hero-sub { color: var(--muted); font-size: 13px; }
  .hero.empty-state { border: 1px dashed var(--line); box-shadow: none; background: transparent; }
  .finder { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .finder input { flex: 1; }
  .finder .count { color: var(--muted); font-size: 12px; white-space: nowrap; }
  .kbd {
    font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px;
    padding: 2px 5px; color: var(--muted); background: var(--card);
  }
  .banner, .warn {
    border-radius: 12px; padding: 12px 14px; margin: 0 0 16px;
  }
  .banner { background: var(--info-bg); color: var(--info); }
  .warn { background: var(--warn-bg); color: var(--warn); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
  .picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .model-card {
    display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
    text-align: left; padding: 14px 16px; border: none; cursor: pointer;
    background: var(--card); color: var(--text); border-radius: var(--radius);
    box-shadow: var(--shadow); font: inherit;
  }
  .model-card:hover:not(:disabled) { box-shadow: 0 0 0 2px var(--accent), var(--shadow); }
  .model-card.on { box-shadow: 0 0 0 2px var(--accent), var(--shadow); background: var(--card); }
  .model-card:disabled { cursor: default; opacity: .65; }
  .model-card .model-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; word-break: break-all; }
  .model-card .model-provider { font-size: 12px; color: var(--muted); }
  .model-card .model-state { font-size: 12px; color: var(--muted); }
  .model-card.on .model-state { color: var(--ok); font-weight: 600; }
  .card {
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 16px;
    display: flex; flex-direction: column; gap: 8px;
    min-height: 156px;
  }
  .card.on { box-shadow: 0 0 0 2px var(--accent), var(--shadow); }
  .card header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  .card h3 { margin: 0; font-size: 17px; letter-spacing: -0.02em; }
  .badge { font-size: 12px; font-weight: 600; color: var(--ok); background: var(--ok-bg); border-radius: 99px; padding: 2px 8px; white-space: nowrap; }
  .meta { color: var(--muted); font-size: 13px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips span { background: #f2f2f4; border-radius: 99px; padding: 2px 8px; font-size: 12px; color: #3a3a3c; }
  .actions { margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  button.primary, button.quiet, button.danger, button.plain {
    border-radius: 999px; padding: 7px 14px; border: 0;
  }
  button.primary { background: var(--accent); color: white; }
  button.primary:hover { background: var(--accent-press); }
  button.primary:disabled { background: #d2d2d7; color: white; cursor: default; }
  button.quiet { background: #f2f2f4; }
  button.danger { background: transparent; color: var(--danger); }
  button.plain { background: transparent; color: var(--accent); padding-left: 0; }
  .panel, .list {
    background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
    padding: 16px 18px; margin-top: 16px;
  }
  .list { padding: 0; overflow: hidden; }
  .panel h3 { margin: 0 0 8px; font-size: 15px; }
  .check { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
  .field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .field.wide { grid-column: 1 / -1; }
  .field > span { font-size: 12px; font-weight: 600; color: var(--muted); }
  input, select, textarea {
    background: #fff; border: 1px solid var(--line); border-radius: 10px;
    padding: 8px 10px; min-width: 0; width: 100%;
  }
  textarea { min-height: 72px; resize: vertical; }
  details.advanced { margin: 8px 0 16px; }
  details.advanced > summary { cursor: pointer; color: var(--muted); font-weight: 600; }
  input[type="search"] { width: 100%; }
  .list-row {
    display: flex; gap: 12px; align-items: center;
    padding: 12px 14px; border-top: 1px solid var(--line);
  }
  .list-row:first-child { border-top: 0; }
  .list-row .text { flex: 1; min-width: 0; }
  .list-row h3 { margin: 0; font-size: 15px; }
  .list-row .meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty { padding: 28px 8px; color: var(--muted); }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 18px; }
  .stat { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 16px; }
  .stat b { display: block; font-size: 28px; letter-spacing: -0.03em; font-weight: 650; }
  .stat span { color: var(--muted); font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 10px 4px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { color: var(--muted); font-size: 12px; font-weight: 600; }
  tbody tr:hover { background: var(--surface-2); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); font-size: 12px; }
  .toolbar {
    display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
    margin: 0 0 var(--space-4);
  }
  .toolbar .spacer { flex: 1; }
  .panel-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: var(--space-3); margin: 0 0 var(--space-2);
  }
  .panel-head h2 { margin: 0; }
  .panel-head .meta { margin: 0; }
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12px; font-weight: 600; border-radius: 99px;
    padding: 2px 9px; background: var(--surface-2); color: var(--muted);
    white-space: nowrap;
  }
  .pill.ok { background: var(--ok-bg); color: var(--ok); }
  .pill.bad { background: var(--danger-bg); color: var(--danger); }
  .pill.warn { background: var(--warn-bg); color: var(--warn); }
  .pill.info { background: var(--info-bg); color: var(--info); }
  .skeleton {
    background: linear-gradient(90deg, var(--surface-2) 25%, var(--line) 37%, var(--surface-2) 63%);
    background-size: 400% 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: var(--radius-sm);
    height: 14px;
  }
  @keyframes shimmer { from { background-position: 100% 50%; } to { background-position: 0 50%; } }
  @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
  .skeleton-card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 56px 24px; text-align: center; color: var(--muted);
    border: 1px dashed var(--line); border-radius: var(--radius);
    background: var(--card);
  }
  @supports (background: color-mix(in srgb, red 50%, transparent)) {
    .empty-state { background: color-mix(in srgb, var(--card) 55%, transparent); }
  }
  .empty-state .empty-title { color: var(--text); font-weight: 600; font-size: 15px; }
  .empty-state .empty-desc { max-width: 42ch; line-height: 1.6; }
  .empty-state .empty-icon {
    width: 34px; height: 34px; margin-bottom: 4px; opacity: 0.5;
  }
  .empty-state .quiet { margin-top: 6px; }
  .stack { display: flex; flex-direction: column; gap: var(--space-2); }
  .timeline { display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0; list-style: none; }
  .timeline li { display: grid; grid-template-columns: 96px 1fr; gap: var(--space-3); padding: 10px 0; border-top: 1px solid var(--line); }
  .timeline li:first-child { border-top: 0; }
  .timeline .when { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  .spark { display: block; width: 100%; height: 56px; overflow: visible; }
  .spark polyline { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .spark .area { fill: var(--accent); opacity: .1; stroke: none; }
  .nav-btn, .tool-btn { position: relative; }
  .palette {
    position: fixed; inset: 0; z-index: 60; display: none;
    background: rgba(0,0,0,.28); backdrop-filter: blur(3px);
    align-items: flex-start; justify-content: center; padding-top: 12vh;
  }
  .palette.open { display: flex; }
  .palette-box {
    width: min(560px, calc(100vw - 32px)); max-height: 62vh; overflow: hidden;
    background: var(--card); border-radius: var(--radius-lg); box-shadow: 0 24px 64px rgba(0,0,0,.28);
    display: flex; flex-direction: column;
  }
  .palette-box input {
    border: 0; border-bottom: 1px solid var(--line); border-radius: 0;
    padding: 14px 18px; font-size: 15px; background: transparent;
  }
  .palette-box input:focus { outline: none; }
  .palette-list { overflow-y: auto; padding: 6px; }
  .palette-group { color: var(--muted); font-size: 11px; font-weight: 600; padding: 8px 12px 4px; letter-spacing: .04em; }
  .palette-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    border: 0; background: transparent; text-align: left; cursor: pointer;
    padding: 9px 12px; border-radius: var(--radius-sm); font-size: 13px; color: var(--text);
  }
  .palette-item .sub { color: var(--muted); font-size: 12px; margin-left: auto; }
  .palette-item.active, .palette-item:hover { background: var(--surface-2); }
  .palette-empty { color: var(--muted); font-size: 13px; padding: 18px 14px; text-align: center; }
  .nav-icon {
    width: 14px; height: 14px; margin-right: 8px; vertical-align: -2px;
    fill: none; stroke: currentColor; stroke-width: 1.5;
    stroke-linecap: round; stroke-linejoin: round; opacity: .75;
  }
  .nav-btn[aria-current="true"] .nav-icon { opacity: 1; color: var(--accent); }
  .nav-btn[aria-current="true"]::before, .tool-btn[aria-current="true"]::before {
    content: ''; position: absolute; left: -10px; top: 50%; transform: translateY(-50%);
    width: 3px; height: 18px; border-radius: 99px; background: var(--accent);
  }
  #toast {
    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(12px);
    background: #1d1d1f; color: white; border-radius: 999px;
    padding: 10px 16px; opacity: 0; pointer-events: none;
    transition: opacity .2s ease, transform .2s ease;
    max-width: min(560px, calc(100% - 32px));
  }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  #toast.error { background: #c9403c; cursor: pointer; pointer-events: auto; }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .link {
    background: transparent; border: 0; padding: 0; color: var(--accent);
    text-decoration: underline; text-underline-offset: 2px;
  }
  .dot.warn { background: var(--warn); }
  .dot.bad { background: var(--danger); }
  .dot.checking { background: var(--muted); }
  .inuse {
    display: inline-block; margin-left: 6px; font-size: 12px;
    color: var(--muted); background: #f2f2f4; border-radius: 99px; padding: 1px 8px;
  }
  .kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 6px 0 0; }
  .kv span { color: var(--muted); font-size: 13px; }
  .kv b { font-weight: 500; font-size: 13px; overflow-wrap: anywhere; }
  .row.edit { margin-top: 10px; }
  .row.edit .field { flex: 1; }
  @media (max-width: 800px) {
    .app { grid-template-columns: 1fr; }
    aside { position: relative; height: auto; border-right: 0; border-bottom: 1px solid var(--line); }
    #tools, #more { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .tool-btn, .nav-btn { width: auto; white-space: nowrap; }
    .stats, .fields, .seg { grid-template-columns: 1fr 1fr; }
    .seg { grid-template-columns: 1fr; }
    main { padding: 20px 16px 80px; }
    h1 { font-size: 26px; }
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --bg: #1c1c1e;
      --sidebar: rgba(28,28,30,.9);
      --card: #2c2c2e;
      --text: #f5f5f7;
      --muted: #a1a1a6;
      --line: #3a3a3c;
      --accent: #0a84ff;
      --accent-press: #409cff;
      --ok: #30d158;
      --ok-bg: #14301c;
      --warn: #ffd60a;
      --warn-bg: #3a3008;
      --info: #d6e8ff;
      --info-bg: #1c3a5c;
      --danger: #ff453a;
      --danger-bg: #3a1a18;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.35);
      --surface-2: #3a3a3c;
    }
    body { background: radial-gradient(1200px 500px at 10% -10%, #1a2a40 0%, transparent 55%), var(--bg); }
    .nav-btn[aria-current="true"], .tool-btn[aria-current="true"], .seg button[aria-selected="true"] { background: #3a3a3c; }
    .chips span, button.quiet { background: #3a3a3c; color: #e5e5ea; }
    .model-card { background: #2c2c2e; }
    .inuse { background: #3a3a3c; color: #c7c7cc; }
    input, select, textarea { background: #1c1c1e; border-color: #3a3a3c; }
    button.primary:disabled { background: #3a3a3c; color: #8e8e93; }
    #toast { background: #f5f5f7; color: #1d1d1f; }
    #toast.error { background: #ff6961; color: #1d1d1f; }
  }
</style>
</head>
<body>
<div class="app">
  <aside>
    <div class="brand"><strong>ccjk</strong><span id="brand-sub">这台电脑上的模型开关</span></div>
    <div class="group" id="nav-switch">快捷切换</div>
    <div id="tools"></div>
    <div class="group" id="nav-manage">管理</div>
    <div id="more"></div>
    <div class="foot"><span class="dot"></span><span id="foot">本机</span></div>
    <button type="button" class="quiet" id="lang-btn" style="margin-top:10px;width:100%">English</button>
  </aside>
  <main><div class="wrap" id="wrap"><h1 id="boot">正在打开…</h1><div class="stack" style="margin-top:24px"><div class="skeleton-card"><div class="skeleton" style="width:45%"></div><div class="skeleton" style="width:70%"></div></div><div class="skeleton-card"><div class="skeleton" style="width:35%"></div><div class="skeleton" style="width:60%"></div></div><div class="skeleton-card"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="width:80%"></div></div></div></div></main>
</div>
<div class="palette" id="palette" role="dialog" aria-modal="true" aria-label="快速跳转">
  <div class="palette-box">
    <input id="palette-input" type="text" placeholder="跳到页面、选模型…  ↑↓ 选，回车确认" autocomplete="off" aria-label="搜索">
    <div class="palette-list" id="palette-list"></div>
  </div>
</div>
<div id="toast" role="status"></div>
<script>
const WARNING = ${JSON.stringify(ACCOUNT_TOS_WARNING)}
const TOOLS = [
  ['clavue', 'Clavue'],
  ['claude-code', 'Claude Code'],
  ['codex', 'Codex'],
  ['grok', 'Grok'],
  ['opencode', 'OpenCode'],
  ['claudework', 'ClaudeWork']
]
const MORE = [
  ['providers', '服务商'],
  ['sessions', '会话'],
  ['usage', '用量'],
  ['logs', '日志'],
  ['routing', '选路'],
  ['accounts', '账号']
]
const NAV_ICON = {
  providers: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z"/><path d="M2 6.5h12"/></svg>',
  sessions: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6l-4 3V3.5Z"/></svg>',
  usage: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13V8M8 13V3M13 13v-3"/></svg>',
  accounts: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.5"/><path d="M3 13c0-2.5 2.2-4 5-4s5 1.5 5 4"/></svg>',
  logs: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h6"/></svg>',
  routing: '<svg class="nav-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 8h2l3-3M8 8l3 3"/></svg>',
}
const MODE_COPY_ZH = {
  direct: ['直接连接', '工具自己去找这家服务商，不经过这台电脑。'],
  routing: ['经过本机', '请求先到这台电脑，再转到你选的服务商。接口不一样也能用。这家不通，就按你勾的顺序换下一家。'],
  aggregation: ['一个列表里选', '几家的模型放进同一个列表。点哪个就用哪家。这家不通时不会自动换下一家。']
}
const MODE_COPY_EN = {
  direct: ['Direct', 'The tool talks to the provider itself. This machine stays out of the way.'],
  routing: ['Through this machine', 'Requests hit this machine first, then go to the provider you picked. Works even when the API shape differs. If one fails, the next in your order is tried.'],
  aggregation: ['One merged list', 'Models from several providers in a single list. Pick one and it is used. No automatic failover.']
}
const PROTO_ZH = {
  'anthropic-messages': 'Claude 接口',
  'openai-chat': '对话接口',
  'openai-responses': '新版对话接口',
  gemini: 'Gemini 接口',
  xai: 'Grok 接口'
}
const PROTO_EN = {
  'anthropic-messages': 'Claude API',
  'openai-chat': 'Chat API',
  'openai-responses': 'Responses API',
  gemini: 'Gemini API',
  xai: 'Grok API'
}
const KINDS = { chatgpt: 'ChatGPT', copilot: 'Copilot', xai: 'xAI' }
const EN = {
  '这台电脑上的模型开关': 'Model switchboard on this machine',
  '快捷切换': 'Switch',
  '管理': 'Manage',
  '正在打开…': 'Opening…',
  '服务商': 'Providers',
  '会话': 'Sessions',
  '用量': 'Usage',
  '账号': 'Accounts',
  '没做成，再试一次': 'That did not work. Try again.',
  '正在确认…': 'Checking…',
  '本机代理运行中': 'Local proxy is running',
  '本机代理没在跑': 'Local proxy is not running',
  '请求身份 ccjk-proxy': 'identity ccjk-proxy',
  ' · 未保存': ' · unsaved',
  '最近用过的对话。这里只看，不删除。': 'Recent conversations. Read-only, nothing is deleted here.',
  '正在读…': 'Reading…',
  '还没有服务商。': 'No providers yet.',
  '去添加一家': 'Add one',
  '没有叫这个的服务商。': 'No provider by that name.',
  '没有叫这个的模型。': 'No model by that name.',
  '正在使用': 'In use',
  '缺密钥': 'No key',
  '点一下就用': 'Click to use',
  '整套接法': 'Saved setups',
  '把现在每个工具的选择存成一套，以后可以整套换回来。': 'Save the current choice for every tool as one set, and switch back to it later.',
  '配置档名字': 'Setup name',
  '例如 上班': 'e.g. work',
  '保存这套': 'Save set',
  '换成这套': 'Switch to it',
  '还没有保存过。': 'Nothing saved yet.',
  '发给每家的补充说明': 'Extra note sent to every provider',
  '写在每次请求前面。别名一行一个，例如 fast=deepseek/deepseek-chat。': 'Prepended to every request. One alias per line, e.g. fast=deepseek/deepseek-chat.',
  '补充说明': 'Extra note',
  '模型别名': 'Model aliases',
  '保存说明': 'Save note',
  '还没有选定服务商。先在下面点「用这个」，或展开高级接法再点「使用这家」。': 'No provider picked yet. Click “Use this” below, or open Advanced and click “Use this one”.',
  '这次打开没有连到配置文件。选择会记住，但还不会写进工具。': 'This session is not connected to config files. Choices are remembered but not written into tools yet.',
  '找服务商或模型': 'Find provider or model',
  '恢复': 'Restore',
  '取消': 'Cancel',
  '恢复原来的配置': 'Restore previous config',
  '连接方式': 'Connection mode',
  '高级：接法': 'Advanced: connection',
  '这种接法用不了': 'Not supported',
  '保存这个接法': 'Save this mode',
  '使用这家': 'Use this one',
  '直接连接时，这个工具听不懂这家。请改成「经过本机」。': 'In direct mode this tool cannot talk to this provider. Switch to “Through this machine”.',
  '这家不通就换下一家': 'Fail over to the next provider',
  '勾上的会按你选的方式试。点「使用这家」时一起保存。': 'Checked providers are tried in the order you choose. Saved when you click “Use this one”.',
  '怎么换': 'How to switch',
  '按顺序': 'In order',
  '轮流': 'Rotate',
  '先用得少的': 'Least used first',
  '放进同一个列表': 'Put into one list',
  '模型名字会变成 ccjk-服务商--模型名。请求里没写模型名时，走你点的那家。': 'Model names become ccjk-provider--model. If a request omits the model, the provider you picked is used.',
  '选一家常用的，或自己填地址。密钥只留在这台电脑上。': 'Pick a common one, or enter your own URL. Keys stay on this machine.',
  '从现有配置导入': 'Import from existing config',
  '搜名称或地址': 'Search name or URL',
  '自己填一家': 'Add your own',
  '短名字': 'Short name',
  '显示名称': 'Display name',
  '接口': 'API',
  '地址': 'URL',
  '密钥，可稍后再填': 'Key, can be filled later',
  '出站代理，可以不填': 'Outbound proxy, optional',
  '模型，用逗号分开': 'Models, comma separated',
  '添加这家': 'Add this provider',
  '已经添加': 'Added',
  '密钥': 'Key',
  '粘贴密钥': 'Paste key',
  '确认添加': 'Confirm',
  '已添加': 'Added',
  '添加': 'Add',
  '常用服务商': 'Common providers',
  '没有叫这个的。': 'Nothing by that name.',
  '列表还是空的。': 'The list is still empty.',
  '名称': 'Name',
  ' 正在用': ' in use',
  '没有密钥': 'No key',
  '确认移除': 'Confirm remove',
  '拉取模型': 'Fetch models',
  '改': 'Edit',
  '移除': 'Remove',
  '新密钥，留空不改': 'New key, leave blank to keep',
  '保存': 'Save',
  '清除密钥': 'Clear key',
  '短名字和地址是各家软件的锚点，不能改。要换地址请移除后重新添加。': 'The short name and URL are anchors used by each tool and cannot be changed. To change the URL, remove and re-add the provider.',
  '出站代理': 'outbound proxy',
  '参考价': 'est. cost',
  '缓存命中': 'cache hit',
  '只统计经过这台电脑的请求。直接连接的不在这里。价钱是参考，不是账单。': 'Only requests through this machine are counted. Direct connections are not included. Prices are estimates, not a bill.',
  '请求': 'Requests',
  '没成功': 'Failed',
  '读入': 'In',
  '写出': 'Out',
  '次数': 'Count',
  '失败': 'Failed',
  '还没有请求经过这里。': 'No requests have gone through here yet.',
  '贴上你自己已经有的令牌。这里不会打开官方软件去登录。': 'Paste a token you already have. Nothing here opens official apps to sign in.',
  '类型': 'Kind',
  '备注': 'Label',
  '令牌': 'Token',
  '余额地址，可以不填': 'Balance URL, optional',
  '还没有账号。': 'No accounts yet.',
  '查看余额': 'Check balance',
  '没有余额地址': 'No balance URL',
  '对话': 'Conversation',
  '时间': 'When',
  ' · 已压缩，这里不展开': ' · compacted, not expanded here',
  '复制路径': 'Copy path',
  '还没读到会话。用过 Claude Code 或 Codex 之后，标题会出现在这里。': 'No sessions found yet. Titles appear here after you use Claude Code or Codex.',
  '已复制路径': 'Path copied',
  '正在查…': 'Checking…',
  '已取到余额': 'Balance fetched',
  '先写短名字和地址': 'Fill in short name and URL first',
  '短名字只能用小写字母、数字和短横线': 'Short name allows lowercase letters, digits and dashes only',
  '已移除': 'Removed',
  '已保存': 'Saved',
  '没有改动': 'No changes',
  '已清除密钥。这家暂时不能用，除非重新填。': 'Key cleared. This provider cannot be used until you add one.',
  '写个短名字，再贴上令牌': 'Enter a short name and paste a token',
  '已保存。令牌没有显示在页面上。': 'Saved. The token is not shown on the page.',
  '改账号需要重新贴一次令牌': 'Editing an account requires pasting the token again',
  '已保存这套': 'Set saved',
  '已保存说明': 'Note saved',
  '已更新模型列表': 'Model list updated',
  '没拉到，仍用原来的列表': 'Fetch failed, keeping the old list',
  '已从现有配置导入': 'Imported from existing config',
  '没有读到本机上的服务商地址': 'No provider URLs found on this machine',
  '已换成这套': 'Switched to that set',
  '已经恢复原来的配置': 'Previous config restored',
  '没有可恢复的备份': 'No backup to restore',
  '这次没有连到配置文件': 'Not connected to config files this time',
  '已经记住': 'Remembered',
  '日志': 'Logs',
  '选路': 'Routing',
  '刷新': 'Refresh',
  '全部服务商': 'All providers',
  '只看失败的': 'Failures only',
  '经过这台电脑的每一次请求。旧记录没有试过哪几家。': 'Every request that passed through this machine. Older records do not say which providers were tried.',
  '还没有请求经过这里': 'No requests yet',
  '用一会儿工具，这里会按时间倒序列出每一次请求，包括试了哪几家。': 'Use your tools for a while. Each request shows up here newest first, including which providers were tried.',
  '没读到日志': 'Could not read logs',
  '再试一次': 'Try again',
  '每次请求先试了谁、为什么换下一家。只有开了「经过本机」并失败切过的请求才有这段记录。': 'Who was tried first and why the request moved on. Only requests routed "through this machine" that failed over are recorded here.',
  '还没有选路记录': 'No routing records yet',
  '把某个工具切到「经过本机」，请求失败切换一次之后，这里会显示完整经过。': 'Switch a tool to "Through this machine". After one request fails over, the full path shows up here.',
  '没读到选路记录': 'Could not read routing records',
  '未指定模型': 'No model specified',
  '最终用': 'Finally used',
  '试了 {n} 家': 'tried {n} providers'
}
function t(text, vars) {
  let out = lang === 'en' && EN[text] !== undefined ? EN[text] : text
  if (vars) Object.keys(vars).forEach(function (key) {
    out = out.split('{' + key + '}').join(vars[key])
  })
  return out
}
const EN_KEYS = Object.keys(EN).sort(function (a, b) { return b.length - a.length })
function localizeText(raw) {
  if (lang !== 'en' || !raw) return raw
  const trimmed = String(raw).trim()
  if (EN[trimmed] !== undefined) return String(raw).replace(trimmed, EN[trimmed])
  let out = String(raw)
  EN_KEYS.forEach(function (key) {
    if (key.length < 2) return
    if (out.indexOf(key) >= 0) out = out.split(key).join(EN[key])
  })
  return out
}
const LOCAL_ATTRS = ['placeholder', 'title', 'aria-label']
function localizeTree(root) {
  if (lang !== 'en' || !root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach(function (node) { node.nodeValue = localizeText(node.nodeValue) })
  root.querySelectorAll('*').forEach(function (el) {
    LOCAL_ATTRS.forEach(function (name) {
      const value = el.getAttribute(name)
      if (value && EN[value] !== undefined) el.setAttribute(name, EN[value])
    })
  })
}
let lang = (function () {
  try {
    const saved = localStorage.getItem('ccjk-lang')
    if (saved === 'en' || saved === 'zh') return saved
  }
  catch (error) { /* private mode */ }
  return 'zh'
})()
let MODE_COPY = MODE_COPY_ZH
let PROTO = PROTO_ZH
function applyLang() {
  MODE_COPY = lang === 'en' ? MODE_COPY_EN : MODE_COPY_ZH
  PROTO = lang === 'en' ? PROTO_EN : PROTO_ZH
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  const swap = {
    'brand-sub': '这台电脑上的模型开关',
    'nav-switch': '快捷切换',
    'nav-manage': '管理',
    'boot': '正在打开…'
  }
  Object.keys(swap).forEach(function (id) {
    const node = document.getElementById(id)
    if (node) node.textContent = t(swap[id])
  })
  const btn = document.getElementById('lang-btn')
  if (btn) btn.textContent = lang === 'en' ? '中文' : 'English'
}
let state = null
let screen = 'tool'
let tool = 'claude-code'
let draft = 'direct'
let query = ''
let toolQuery = ''
let confirmRestore = false
let pendingPreset = ''
let pendingRemove = ''
let pendingDrop = ''
let editingProvider = ''
let pendingAccount = ''
let saving = false
let health = { ok: false, checking: true }
let healthTimer = null

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  })
}
function toolName(id) {
  const found = TOOLS.find(function (row) { return row[0] === id })
  return found ? found[1] : id
}
function kindName(id) { return KINDS[id] || id }
function canDirect(protocol) {
  if (tool === 'claude-code' || tool === 'clavue' || tool === 'claudework')
    return protocol === 'anthropic-messages'
  return protocol === 'openai-chat' || protocol === 'openai-responses' || protocol === 'xai'
}
function validId(id) {
  return /^[a-z0-9][a-z0-9-]{0,40}$/.test(id) && id.indexOf('--') < 0
}
function when(value) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value || ''
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function toast(text, isError) {
  const node = document.getElementById('toast')
  node.textContent = localizeText(text)
  node.classList.toggle('error', !!isError)
  node.classList.add('show')
  clearTimeout(toast._t)
  const delay = isError ? 12000 : 2800
  toast._t = setTimeout(function () { node.classList.remove('show') }, delay)
}
document.getElementById('toast').addEventListener('click', function () {
  clearTimeout(toast._t)
  this.classList.remove('show')
})
async function api(path, body) {
  const res = await fetch(path, body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  } : undefined)
  const data = await res.json().catch(function () { return {} })
  if (!res.ok) {
    const message = data.error && data.error.message ? data.error.message : '没做成，再试一次'
    throw new Error(message)
  }
  return data
}
function annotate() {
  const tools = state.tools || {}
  state.providers.forEach(function (provider) {
    provider.inUse = Object.keys(tools).filter(function (id) {
      const route = tools[id] || {}
      return route.providerId === provider.id || (route.members || []).indexOf(provider.id) >= 0
    })
  })
}
function visibleTools() {
  const installed = state && state.installed
  if (!installed || !installed.length) return TOOLS
  const rows = TOOLS.filter(function (row) { return installed.indexOf(row[0]) >= 0 })
  return rows.length ? rows : TOOLS
}
async function load(options) {
  state = await api('/api/state')
  const installed = state.installed || []
  if (installed.length && installed.indexOf(tool) < 0)
    tool = installed[0]
  if (!state.tools[tool]) tool = 'claude-code'
  if (!options || !options.keepDraft)
    draft = (state.tools[tool] && state.tools[tool].mode) || 'direct'
  annotate()
  applyRoute()
  draw()
}
function refreshPresets() {
  const area = document.getElementById('preset-area')
  if (area) area.innerHTML = presetListHtml()
  const wrap = document.getElementById('wrap')
  if (wrap) bind(wrap)
}
function refreshAdded() {
  annotate()
  const area = document.getElementById('added-area')
  if (area) area.innerHTML = addedTable()
  const wrap = document.getElementById('wrap')
  if (wrap) bind(wrap)
}
async function pollHealth() {
  try {
      const data = await api('/api/health')
      health = { ok: Boolean(data.ok), checking: false, port: data.port, canWrite: data.canWrite }
  }
  catch (error) {
    health = { ok: false, checking: false }
  }
  drawFoot()
}
function drawFoot() {
  const label = health.checking ? t('正在确认…') : (health.ok ? t('本机代理运行中') : t('本机代理没在跑'))
  const cls = health.checking ? 'checking' : (health.ok ? '' : 'bad')
  const port = state && state.port ? ' · 127.0.0.1:' + state.port : ''
  document.getElementById('foot').innerHTML = '<span class="dot ' + cls + '"></span>' + label + port + '<br><span style="opacity:.7">' + t('请求身份 ccjk-proxy') + '</span>'
}
function drawNav() {
  document.getElementById('tools').innerHTML = visibleTools().map(function (row) {
    const route = state.tools[row[0]] || { mode: 'direct' }
    const how = (MODE_COPY[route.mode] || MODE_COPY.direct)[0]
    const unsaved = screen === 'tool' && tool === row[0] && draft !== route.mode
    return '<button type="button" class="tool-btn" data-tool="' + row[0] + '" aria-current="' + (screen === 'tool' && tool === row[0]) + '"><b>' + row[1] + '</b><small>' + how + (unsaved ? t(' · 未保存') : '') + '</small></button>'
  }).join('')
  document.getElementById('more').innerHTML = MORE.map(function (row) {
    const icon = NAV_ICON[row[0]] || ''
    return '<button type="button" class="nav-btn" data-screen="' + row[0] + '" aria-current="' + (screen === row[0]) + '">' + icon + t(row[1]) + '</button>'
  }).join('')
  document.getElementById('foot').textContent = ''
  drawFoot()
  document.querySelectorAll('[data-tool]').forEach(function (btn) {
    btn.onclick = function () {
      const next = btn.getAttribute('data-tool')
      if (next !== tool) {
        tool = next
        draft = (state.tools[tool] && state.tools[tool].mode) || 'direct'
        confirmRestore = false
        toolQuery = ''
      }
      screen = 'tool'
      navigate()
    }
  })
  document.querySelectorAll('[data-screen]').forEach(function (btn) {
    btn.onclick = function () {
      screen = btn.getAttribute('data-screen')
      confirmRestore = false
      navigate()
    }
  })
}
let appliedRoute = ''
function routeHash() {
  return screen === 'tool' ? '#/tool/' + encodeURIComponent(tool) : '#/' + screen
}
function parseRoute(raw) {
  let body = String(raw || '')
  if (body.slice(0, 1) === '#') body = body.slice(1)
  if (body.slice(0, 1) === '/') body = body.slice(1)
  if (!body) return null
  const parts = body.split('/')
  if (parts[0] === 'tool') {
    let id = ''
    try { id = decodeURIComponent(parts[1] || '') } catch (_) { return null }
    return id ? { screen: 'tool', tool: id } : null
  }
  return MORE.some(function (row) { return row[0] === parts[0] }) ? { screen: parts[0] } : null
}
function routeHashOf(parsed) {
  return parsed.screen === 'tool' ? '#/tool/' + encodeURIComponent(parsed.tool) : '#/' + parsed.screen
}
function syncRoute() {
  const next = routeHash()
  appliedRoute = next
  if (String(location.hash || '') === next) return
  history.replaceState(null, '', next)
}
function navigate() {
  const next = routeHash()
  if (String(location.hash || '') !== next) history.pushState(null, '', next)
  appliedRoute = next
  renderScreen()
}
function applyRoute() {
  const parsed = parseRoute(location.hash)
  if (!parsed) { appliedRoute = ''; return false }
  const next = routeHashOf(parsed)
  if (next === appliedRoute) {
    if (String(location.hash || '') !== next) history.replaceState(null, '', next)
    return false
  }
  if (parsed.screen === 'tool') {
    tool = parsed.tool
    screen = 'tool'
    draft = (state && state.tools && state.tools[tool] && state.tools[tool].mode) || 'direct'
  } else {
    screen = parsed.screen
  }
  confirmRestore = false
  appliedRoute = next
  if (String(location.hash || '') !== next) history.replaceState(null, '', next)
  return true
}
function draw() {
  renderScreen()
  syncRoute()
}
function renderScreen() {
  drawNav()
  const wrap = document.getElementById('wrap')
  if (screen === 'providers') wrap.innerHTML = providersHtml()
  else if (screen === 'sessions') {
    wrap.innerHTML = '<h1>会话</h1><p class="lede">最近用过的对话。这里只看，不删除。</p><div id="sessions"><p class="empty">正在读…</p></div>'
    loadSessions()
    return
  }
  else if (screen === 'usage') {
    wrap.innerHTML = usageHtml()
    bind(wrap)
    wrap.querySelectorAll('[data-range]').forEach(function (btn) {
      btn.onclick = function () {
        usageRange = btn.getAttribute('data-range') || '7d'
        wrap.querySelectorAll('[data-range]').forEach(function (item) {
          item.setAttribute('aria-selected', String(item === btn))
        })
        void loadUsage()
      }
    })
    const refresh = document.getElementById('usage-refresh')
    if (refresh) refresh.onclick = function () { void loadUsage() }
    void loadUsage()
    localizeTree(wrap)
    wrap.classList.remove('enter')
    void wrap.offsetWidth
    wrap.classList.add('enter')
    return
  }
  else if (screen === 'logs') {
    wrap.innerHTML = logsHtml()
    bind(wrap)
    if (screen === 'logs')
      armLogs(wrap)
    loadLogs()
    localizeTree(wrap)
    wrap.classList.remove('enter')
    void wrap.offsetWidth
    wrap.classList.add('enter')
    return
  }
  else if (screen === 'routing') {
    wrap.innerHTML = routingHtml()
    bind(wrap)
    const refresh = document.getElementById('route-refresh')
    if (refresh) refresh.onclick = function () { loadDecisions() }
    void loadDecisions()
    localizeTree(wrap)
    wrap.classList.remove('enter')
    void wrap.offsetWidth
    wrap.classList.add('enter')
    return
  }
  else if (screen === 'accounts') wrap.innerHTML = accountsHtml()
  else wrap.innerHTML = toolHtml()
  bind(wrap)
  if (screen === 'tool')
    armTabs(wrap)
  localizeTree(wrap)
  wrap.classList.remove('enter')
  void wrap.offsetWidth
  wrap.classList.add('enter')
}
function armTabs(wrap) {
  const tabs = Array.prototype.slice.call(wrap.querySelectorAll('[data-mode]'))
  tabs.forEach(function (btn, i) {
    btn.onkeydown = function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
        return
      event.preventDefault()
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1
      const next = tabs[(i + dir + tabs.length) % tabs.length]
      next.focus()
      draft = next.getAttribute('data-mode')
      drawToolSoft()
      const moved = document.querySelector('[data-mode="' + draft + '"]')
      if (moved) moved.focus()
    }
  })
}
function routeOf() { return state.tools[tool] || { mode: 'direct', failover: [], members: [] } }
function toolCardsHtml() {
  const needle = toolQuery.trim().toLowerCase()
  const shown = state.providers.filter(function (provider) {
    if (!needle) return true
    return (provider.name + ' ' + provider.id).toLowerCase().indexOf(needle) >= 0
  })
  if (!state.providers.length)
    return '<div class="empty"><p>还没有服务商。</p><button type="button" class="primary" data-go="providers">去添加一家</button></div>'
  if (!shown.length)
    return '<p class="empty">没有叫这个的服务商。</p>'
  return '<div class="grid">' + shown.map(cardHtml).join('') + '</div>'
}
function modelRows() {
  const needle = toolQuery.trim().toLowerCase()
  const rows = []
  state.providers.forEach(function (provider) {
    const models = provider.models && provider.models.length ? provider.models : [provider.id]
    models.forEach(function (model) {
      const label = provider.name + ' / ' + model
      if (needle && (label + ' ' + provider.id).toLowerCase().indexOf(needle) < 0) return
      rows.push({ provider: provider, model: model, label: label })
    })
  })
  return rows
}
function modelListHtml() {
  if (!state.providers.length)
    return '<div class="empty"><p>还没有服务商。</p><button type="button" class="primary" data-go="providers">去添加一家</button></div>'
  const rows = modelRows()
  if (!rows.length) return '<p class="empty">没有叫这个的模型。</p>'
  const route = routeOf()
  return '<div class="picker-grid">' + rows.map(function (row) {
    const on = route.providerId === row.provider.id && route.model === row.model
    const noSecret = !row.provider.hasSecret
    return '<button type="button" class="model-card' + (on ? ' on' : '') + '"' +
      ' data-pick="' + esc(row.provider.id) + '" data-model="' + esc(row.model) + '"' +
      (on || noSecret ? ' disabled' : '') +
      ' aria-pressed="' + on + '">'
      + '<span class="model-name">' + esc(row.model) + '</span>'
      + '<span class="model-provider">' + esc(row.provider.name) + ' · ' + esc(PROTO[row.provider.protocol] || '') + '</span>'
      + '<span class="model-state">' + (on ? '正在使用' : (noSecret ? '缺密钥' : '点一下就用')) + '</span>'
      + '</button>'
  }).join('') + '</div>'
}
function aliasText() {
  const aliases = state.aliases || {}
  return Object.keys(aliases).map(function (key) { return key + '=' + aliases[key] }).join('\\n')
}
function profileHtml() {
  const names = state.profiles || []
  const options = names.map(function (name) {
    return '<option value="' + esc(name) + '">' + esc(name) + '</option>'
  }).join('')
  return '<section class="panel"><h3>整套接法</h3><p class="meta">把现在每个工具的选择存成一套，以后可以整套换回来。</p><div class="row">'
    + '<label class="field"><span class="sr-only">配置档名字</span><input id="profile-name" placeholder="例如 上班"></label>'
    + '<button type="button" class="primary" id="profile-save">保存这套</button></div>'
    + (options
      ? '<div class="row" style="margin-top:10px"><select id="profile-pick">' + options + '</select><button type="button" class="quiet" id="profile-use">换成这套</button></div>'
      : '<p class="meta">还没有保存过。</p>')
    + '</section><section class="panel"><h3>发给每家的补充说明</h3><p class="meta">写在每次请求前面。别名一行一个，例如 fast=deepseek/deepseek-chat。</p>'
    + '<label class="field"><span>补充说明</span><textarea id="sysprompt">' + esc(state.systemPrompt || '') + '</textarea></label>'
    + '<label class="field" style="margin-top:10px"><span>模型别名</span><textarea id="aliases">' + esc(aliasText()) + '</textarea></label>'
    + '<div class="actions" style="margin-top:14px"><button type="button" class="primary" id="save-settings">保存说明</button></div></section>'
}
function toolHtml() {
  const route = routeOf()
  const copy = MODE_COPY[draft] || MODE_COPY.direct
  const dirty = draft !== route.mode
  const current = state.providers.find(function (item) { return item.id === route.providerId })
  const modeName = (MODE_COPY[route.mode] || MODE_COPY.direct)[0]
  const using = current
    ? '现在是「' + modeName + '」，用 ' + current.name + (route.model ? ' / ' + route.model : '') + '。'
    : '还没选定服务商。先在下面点「用这个」，或展开高级接法再点「使用这家」。'
  const offline = state.canWrite ? '' : '<div class="warn">这次打开没有连到配置文件。选择会记住，但还不会写进工具。</div>'
  const banner = dirty ? '<div class="banner">这个选法还没写进 ' + toolName(tool) + '。点一家上的按钮才会生效。</div>' : ''
  const found = modelRows().length
  const finder = state.providers.length
    ? '<div class="finder"><label for="tq" class="sr-only">找服务商或模型</label><input id="tq" type="search" placeholder="找服务商或模型 · 按 / 聚焦" value="' + esc(toolQuery) + '"><span class="count" id="tq-count">' + found + '</span></div>'
    : ''
  const extra = state.providers.length && draft === 'routing'
    ? failoverHtml(route)
    : state.providers.length && draft === 'aggregation' ? membersHtml(route) : ''
  const restore = confirmRestore
    ? '<div class="panel"><p>会把 ' + toolName(tool) + ' 改回上次写入之前的配置。</p><div class="row"><button type="button" class="danger" id="do-restore">恢复</button><button type="button" class="quiet" id="cancel-restore">取消</button></div></div>'
    : '<button type="button" class="plain" id="ask-restore">恢复原来的配置</button>'
  const modes = '<div class="seg" role="tablist" aria-label="连接方式">' + Object.keys(MODE_COPY).map(function (key) {
    return '<button type="button" role="tab" data-mode="' + key + '" aria-selected="' + (draft === key) + '" tabindex="' + (draft === key ? '0' : '-1') + '">' + MODE_COPY[key][0] + '</button>'
  }).join('') + '</div><p class="hint" id="mode-hint">' + copy[1] + '</p>'
  const hero = current
    ? '<section class="hero"><div class="hero-top"><div><div class="hero-name">' + esc(route.model || current.name) + '</div>'
      + '<div class="hero-sub">' + esc(current.name) + ' · ' + esc(PROTO[current.protocol] || '') + ' · ' + esc(modeName) + '</div></div>'
      + '<span class="badge">正在使用</span></div>'
      + '<div class="actions"><button type="button" class="quiet" id="copy-model">复制模型名</button>'
      + (route.model ? '' : '<span class="meta">这家没指定模型，用它的默认模型。</span>') + '</div></section>'
    : '<section class="hero empty-state"><div class="hero-name">还没有选服务商</div>'
      + '<div class="hero-sub">在下面点一个模型卡片，或展开「高级：接法」挑一家。</div></section>'
  return '<h1>' + toolName(tool) + '</h1><p class="lede">' + esc(using) + '</p>'
    + offline + hero + finder + '<div id="model-list">' + modelListHtml() + '</div>'
    + '<details class="advanced"><summary>高级：接法</summary>' + modes + banner
    + '<div id="tool-extra">' + extra + '</div><div id="tool-cards">' + toolCardsHtml() + '</div></details>'
    + '<div style="margin-top:18px">' + restore + '</div>' + profileHtml()
}
function cardHtml(provider) {
  const route = routeOf()
  const saved = route.providerId === provider.id && draft === route.mode
  const blocked = draft === 'direct' && !canDirect(provider.protocol)
  const label = blocked ? '这种接法用不了' : (saved ? '正在使用' : (route.providerId === provider.id ? '保存这个接法' : '使用这家'))
  const models = (provider.models || []).slice(0, 3).map(function (model) {
    return '<span>' + esc(model) + '</span>'
  }).join('')
  const why = blocked ? '<div class="meta">直接连接时，这个工具听不懂这家。请改成「经过本机」。</div>' : ''
  return '<article class="card' + (saved ? ' on' : '') + '"><header><h3>' + esc(provider.name) + '</h3>'
    + (saved ? '<span class="badge">正在使用</span>' : '')
    + '</header><div class="meta">' + esc(PROTO[provider.protocol] || provider.protocol) + '</div>'
    + (models ? '<div class="chips">' + models + '</div>' : '')
    + why
    + '<div class="actions"><button type="button" class="primary" data-use="' + esc(provider.id) + '"' + (saved || blocked ? ' disabled' : '') + '>' + label + '</button></div></article>'
}
function failoverHtml(route) {
  const ids = route.failover && route.failover.length ? route.failover : state.providers.map(function (item) { return item.id })
  const strategy = route.strategy || 'order'
  const choice = function (value, label) {
    return '<option value="' + value + '"' + (strategy === value ? ' selected' : '') + '>' + label + '</option>'
  }
  return '<section class="panel"><h3>这家不通就换下一家</h3><p class="meta">勾上的会按你选的方式试。点「使用这家」时一起保存。</p>'
    + '<label class="field"><span>怎么换</span><select id="strategy">'
    + choice('order', '按顺序') + choice('rotate', '轮流') + choice('usage', '先用得少的')
    + '</select></label>'
    + state.providers.map(function (provider) {
      const on = ids.indexOf(provider.id) >= 0
      return '<label class="check"><input type="checkbox" data-fail="' + esc(provider.id) + '"' + (on ? ' checked' : '') + '> ' + esc(provider.name) + '</label>'
    }).join('') + '</section>'
}
function membersHtml(route) {
  return '<section class="panel"><h3>放进同一个列表</h3><p class="meta">模型名字会变成 ccjk-服务商--模型名。请求里没写模型名时，走你点的那家。</p>'
    + state.providers.map(function (provider) {
      const on = (route.members || []).indexOf(provider.id) >= 0 || provider.id === route.providerId
      return '<label class="check"><input type="checkbox" data-member="' + esc(provider.id) + '"' + (on ? ' checked' : '') + '> ' + esc(provider.name) + '</label>'
    }).join('') + '</section>'
}
function providersHtml() {
  return '<h1>服务商</h1><p class="lede">选一家常用的，或自己填地址。密钥只留在这台电脑上。</p>'
    + '<div class="actions"><button type="button" class="quiet" id="do-import">从现有配置导入</button></div>'
    + '<div class="field" style="margin-top:16px"><label for="q" class="sr-only">搜名称或地址</label><input id="q" type="search" placeholder="搜名称或地址" value="' + esc(query) + '"></div>'
    + '<div id="preset-area">' + presetListHtml() + '</div>'
    + '<section class="panel"><h3>自己填一家</h3><div class="fields">'
    + '<label class="field"><span>短名字</span><input id="pid" autocomplete="off" placeholder="例如 my-api"></label>'
    + '<label class="field"><span>显示名称</span><input id="pname" placeholder="你自己认得的名字"></label>'
    + '<label class="field"><span>接口</span><select id="pproto">' + Object.keys(PROTO).map(function (key) {
      return '<option value="' + key + '">' + PROTO[key] + '</option>'
    }).join('') + '</select></label>'
    + '<label class="field"><span>地址</span><input id="purl" placeholder="https://"></label>'
    + '<label class="field"><span>密钥，可稍后再填</span><input id="pkey" type="password" autocomplete="new-password"></label>'
    + '<label class="field"><span>出站代理，可以不填</span><input id="pproxy" placeholder="http://127.0.0.1:7890"></label>'
    + '<label class="field"><span>模型，用逗号分开</span><input id="pmodels" placeholder="model-a, model-b"></label>'
    + '</div><div class="actions" style="margin-top:14px"><button type="button" class="primary" id="padd">添加这家</button></div></section>'
    + '<section class="panel"><h3>已经添加</h3><div id="added-area">' + addedTable() + '</div></section>'
}
function presetListHtml() {
  const q = query.trim().toLowerCase()
  const presets = state.presets.filter(function (preset) {
    return !q || (preset.name + ' ' + preset.baseUrl + ' ' + preset.id).toLowerCase().indexOf(q) >= 0
  })
  const rows = presets.map(function (preset) {
    const known = state.providers.find(function (item) { return item.id === preset.id })
    const open = pendingPreset === preset.id
    const key = open
      ? '<div class="list-row"><div class="field wide" style="flex:1"><label class="sr-only" for="preset-key">密钥</label><input id="preset-key" type="password" autocomplete="new-password" placeholder="粘贴密钥"></div><button type="button" class="primary" id="preset-save">确认添加</button><button type="button" class="quiet" id="preset-cancel">取消</button></div>'
      : ''
    const action = known
      ? '<span class="badge">已添加</span>'
      : '<button type="button" class="quiet" data-preset="' + esc(preset.id) + '">添加</button>'
    return '<div class="list-row"><div class="text"><h3>' + esc(preset.name) + '</h3><div class="meta">' + esc(PROTO[preset.protocol] || '') + ' · ' + esc(preset.baseUrl) + '</div></div>' + action + '</div>' + key
  }).join('')
  return '<h2>常用服务商</h2>' + (rows ? '<div class="list">' + rows + '</div>' : '<p class="empty">没有叫这个的。</p>')
}
function addedTable() {
  if (!state.providers.length) return '<p class="empty">列表还是空的。</p>'
  return '<table><tr><th>名称</th><th>地址</th><th></th></tr>' + state.providers.map(function (provider) {
    const usedBy = provider.inUse || []
    const inUse = usedBy.length
      ? '<span class="inuse">' + usedBy.map(function (id) { return toolName(id) }).join('、') + ' 正在用</span>'
      : ''
    const key = provider.hasSecret ? '' : '<span class="inuse">没有密钥</span>'
    const editing = editingProvider === provider.id
    const action = pendingRemove === provider.id
      ? '<button type="button" class="danger" id="do-remove" data-id="' + esc(provider.id) + '">确认移除</button> <button type="button" class="quiet" id="cancel-remove">取消</button>'
      : '<button type="button" class="quiet" data-models="' + esc(provider.id) + '">拉取模型</button> <button type="button" class="quiet" data-edit="' + esc(provider.id) + '">改</button> <button type="button" class="danger" data-remove="' + esc(provider.id) + '">移除</button>'
    const editRow = editing
      ? '<tr><td colspan="3"><div class="row edit">'
        + '<label class="field"><span>显示名称</span><input class="edit-name" value="' + esc(provider.name) + '"></label>'
        + '<label class="field"><span>新密钥，留空不改</span><input class="edit-key" type="password" autocomplete="new-password" placeholder="粘贴新的密钥"></label>'
        + '<button type="button" class="primary" data-save="' + esc(provider.id) + '">保存</button>'
        + '<button type="button" class="quiet" data-cancel-edit="1">取消</button>'
        + '<button type="button" class="danger" data-forget="' + esc(provider.id) + '">清除密钥</button>'
        + '</div><div class="meta">短名字和地址是各家软件的锚点，不能改。要换地址请移除后重新添加。</div></td></tr>'
      : ''
    const via = provider.proxyUrl ? '<div class="meta">出站代理 ' + esc(provider.proxyUrl) + '</div>' : ''
    return '<tr><td>' + esc(provider.name) + inUse + '<div class="meta">' + esc(PROTO[provider.protocol] || '') + '</div>' + via + '</td><td>' + esc(provider.baseUrl) + key + '</td><td>' + action + '</td></tr>' + editRow
  }).join('') + '</table>'
}
function usageHtml() {
  const ranges = [['today', '今天'], ['7d', '7 天'], ['30d', '30 天'], ['all', '全部']]
  const tabs = '<div class="toolbar"><div class="seg" role="tablist" aria-label="时间范围" style="margin:0;max-width:420px">'
    + ranges.map(function (row) {
      return '<button type="button" role="tab" data-range="' + row[0] + '" aria-selected="' + (usageRange === row[0]) + '">' + row[1] + '</button>'
    }).join('') + '</div><span class="spacer"></span><button type="button" class="quiet" id="usage-refresh">刷新</button></div>'
  return '<h1>用量</h1><p class="lede">只统计经过这台电脑的请求。直接连接的不在这里。价钱是参考，不是账单。</p>'
    + tabs + '<div id="usage-body"><p class="empty">正在读…</p></div>'
}
function usageRangeStart(range) {
  const now = Date.now()
  if (range === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  if (range === '7d') return now - 7 * 86400000
  if (range === '30d') return now - 30 * 86400000
  return 0
}
function usageSummaryOf(events, prices) {
  const out = { requests: 0, errors: 0, inputTokens: 0, outputTokens: 0, byProvider: {}, byModel: {}, byAccount: {} }
  events.forEach(function (event) {
    out.requests += 1
    if (event.status >= 400) out.errors += 1
    out.inputTokens += event.inputTokens || 0
    out.outputTokens += event.outputTokens || 0
    const p = out.byProvider[event.providerId] || (out.byProvider[event.providerId] = { requests: 0, errors: 0 })
    p.requests += 1
    if (event.status >= 400) p.errors += 1
    const m = out.byModel[event.model || ''] || (out.byModel[event.model || ''] = { requests: 0, outputTokens: 0 })
    m.requests += 1
    m.outputTokens += event.outputTokens || 0
    const provider = state.providers.find(function (item) { return item.id === event.providerId })
    const accountId = provider && provider.accountId ? provider.accountId : ''
    const account = state.accounts.find(function (item) { return item.id === accountId })
    const key = account ? account.label : (accountId || '未关联账号')
    const a = out.byAccount[key] || (out.byAccount[key] = { requests: 0, outputTokens: 0 })
    a.requests += 1
    a.outputTokens += event.outputTokens || 0
  })
  void prices
  return out
}
function sparkline(events) {
  if (!events.length) return ''
  const buckets = {}
  events.forEach(function (event) {
    const day = String(event.at || '').slice(0, 10)
    if (!day) return
    buckets[day] = (buckets[day] || 0) + 1
  })
  const days = Object.keys(buckets).sort().slice(-14)
  if (days.length < 2) return ''
  const values = days.map(function (day) { return buckets[day] })
  const max = Math.max.apply(null, values.concat([1]))
  const width = 100
  const points = values.map(function (value, index) {
    const x = (index / (values.length - 1)) * width
    const y = 100 - (value / max) * 100
    return x.toFixed(1) + ',' + y.toFixed(1)
  })
  const area = '0,100 ' + points.join(' ') + ' ' + width + ',100'
  return '<section class="panel"><div class="panel-head"><h2>每天请求数</h2><span class="meta">' + days[0] + ' → ' + days[days.length - 1] + '</span></div>'
    + '<svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="每天请求数趋势">'
    + '<polygon class="area" points="' + area + '"></polygon>'
    + '<polyline points="' + points.join(' ') + '"></polyline></svg></section>'
}
function usageBodyHtml(events) {
  const summary = usageSummaryOf(events, state.prices)
  const providerRows = Object.keys(summary.byProvider).map(function (id) {
    const row = summary.byProvider[id]
    const name = (state.providers.find(function (item) { return item.id === id }) || {}).name || id
    return '<tr><td>' + esc(name) + '</td><td class="num">' + row.requests + '</td><td class="num">' + row.errors + '</td></tr>'
  }).join('')
  const modelRowsOut = Object.keys(summary.byModel).sort(function (a, b) {
    return summary.byModel[b].requests - summary.byModel[a].requests
  }).map(function (model) {
    const row = summary.byModel[model]
    return '<tr><td class="mono">' + esc(model || '（默认模型）') + '</td><td class="num">' + row.requests + '</td><td class="num">' + Number(row.outputTokens || 0).toLocaleString('zh-CN') + '</td></tr>'
  }).join('')
  const accountRowsOut = Object.keys(summary.byAccount).map(function (label) {
    const row = summary.byAccount[label]
    return '<tr><td>' + esc(label) + '</td><td class="num">' + row.requests + '</td><td class="num">' + Number(row.outputTokens || 0).toLocaleString('zh-CN') + '</td></tr>'
  }).join('')
  if (!summary.requests) {
    return '<div class="empty-state"><div class="empty-title">这段时间还没有请求</div><div>换个时间范围看看，或者先用一次模型。</div></div>'
  }
  return '<div class="stats">'
    + stat(summary.requests, '请求') + stat(summary.errors, '没成功') + stat(summary.inputTokens, '读入') + stat(summary.outputTokens, '写出')
    + '</div>'
    + sparkline(events)
    + '<section class="panel"><div class="panel-head"><h2>按服务商</h2></div><table><thead><tr><th>服务商</th><th class="num">次数</th><th class="num">失败</th></tr></thead><tbody>' + providerRows + '</tbody></table></section>'
    + '<section class="panel"><div class="panel-head"><h2>按模型</h2></div><table><thead><tr><th>模型</th><th class="num">次数</th><th class="num">写出 token</th></tr></thead><tbody>' + modelRowsOut + '</tbody></table></section>'
    + '<section class="panel"><div class="panel-head"><h2>按账号</h2></div>' + (accountRowsOut
      ? '<table><thead><tr><th>账号</th><th class="num">次数</th><th class="num">写出 token</th></tr></thead><tbody>' + accountRowsOut + '</tbody></table>'
      : '<p class="empty">还没有关联账号的请求。</p>') + '</section>'
}
async function loadUsage() {
  const node = document.getElementById('usage-body')
  if (!node) return
  try {
    const data = await api('/api/logs?limit=1000')
    const events = (data.events || []).slice().reverse()
    const start = usageRangeStart(usageRange)
    const filtered = start ? events.filter(function (event) { return Date.parse(event.at || '') >= start }) : events
    node.innerHTML = usageBodyHtml(filtered)
  }
  catch (error) {
    node.innerHTML = '<div class="empty-state"><div class="empty-title">读不到用量</div><div>' + esc(error.message) + '</div></div>'
  }
}
function stat(n, label) {
  const text = typeof n === 'number' ? Number(n || 0).toLocaleString('zh-CN') : String(n)
  return '<div class="stat"><b>' + text + '</b><span>' + label + '</span></div>'
}
function accountsHtml() {
  return '<h1>账号</h1><p class="lede">贴上你自己已经有的令牌。这里不会打开官方软件去登录。</p><div class="warn">' + esc(WARNING) + '</div>'
    + '<section class="panel"><div class="fields">'
    + '<label class="field"><span>短名字</span><input id="aid" autocomplete="off" placeholder="例如 work"></label>'
    + '<label class="field"><span>类型</span><select id="akind"><option value="chatgpt">ChatGPT</option><option value="copilot">Copilot</option><option value="xai">xAI</option></select></label>'
    + '<label class="field"><span>备注</span><input id="alabel" placeholder="你自己认得的名字"></label>'
    + '<label class="field wide"><span>令牌</span><input id="atoken" type="password" autocomplete="new-password" placeholder="粘贴令牌"></label>'
    + '<label class="field wide"><span>余额地址，可以不填</span><input id="aquota" placeholder="https://"></label>'
    + '</div><div class="actions" style="margin-top:14px"><button type="button" class="primary" id="asave">保存</button></div></section>'
    + '<div id="account-list">' + accountRows() + '</div>'
}
function accountRows() {
  if (!state.accounts.length) return '<p class="empty">还没有账号。</p>'
  return state.accounts.map(function (account) {
    const action = pendingDrop === account.id
      ? '<button type="button" class="danger" id="do-drop" data-id="' + esc(account.id) + '">确认移除</button><button type="button" class="quiet" id="cancel-drop">取消</button>'
      : '<button type="button" class="quiet" data-quota="' + esc(account.id) + '">查看余额</button><button type="button" class="quiet" data-edit-account="' + esc(account.id) + '">改</button><button type="button" class="danger" data-drop="' + esc(account.id) + '">移除</button>'
    const editing = pendingAccount === account.id
    const editRow = editing
      ? '<div class="row edit">'
        + '<label class="field"><span>备注</span><input class="acc-label" value="' + esc(account.label) + '"></label>'
        + '<label class="field"><span>余额地址，留空不改</span><input class="acc-quota" placeholder="https://" value="' + esc(account.quotaUrl || '') + '"></label>'
        + '<label class="field"><span>新令牌，留空不改</span><input class="acc-token" type="password" autocomplete="new-password"></label>'
        + '<button type="button" class="primary" data-save-account="' + esc(account.id) + '">保存</button>'
        + '<button type="button" class="quiet" data-cancel-account="1">取消</button>'
        + '</div>'
      : ''
    const quota = account.quotaUrl ? '' : '<span class="inuse">没有余额地址</span>'
    return '<section class="panel"><div class="row"><strong>' + esc(account.label) + '</strong><span class="meta">' + esc(kindName(account.kind)) + '</span>' + quota + '</div><div class="actions">' + action + '</div>' + editRow + '<p class="meta" id="bal-' + esc(account.id) + '"></p></section>'
  }).join('')
}
function refreshAccounts() {
  const area = document.getElementById('account-list')
  if (area) area.innerHTML = accountRows()
  const wrap = document.getElementById('wrap')
  if (wrap) bind(wrap)
}
async function loadSessions() {
  try {
    const data = await api('/api/sessions')
    const rows = data.sessions || []
    const node = document.getElementById('sessions')
    if (!node) return
    node.innerHTML = rows.length
      ? '<div class="list"><div class="list-row"><div class="text"><h3>对话</h3></div><div class="meta">时间</div></div>' + rows.map(function (row) {
        return '<div class="list-row"><div class="text"><h3>' + esc(row.title) + '</h3><div class="meta">' + esc(toolName(row.tool)) + (row.compressed ? ' · 已压缩，这里不展开' : '') + '</div></div><div class="meta">' + esc(when(row.updatedAt)) + '</div><button type="button" class="quiet" data-path="' + esc(row.path || '') + '">复制路径</button></div>'
      }).join('') + '</div>'
      : '<p class="empty">还没读到会话。用过 Claude Code 或 Codex 之后，标题会出现在这里。</p>'
    node.querySelectorAll('[data-path]').forEach(function (btn) {
      btn.onclick = function () {
        const path = btn.getAttribute('data-path') || ''
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(path).then(function () { toast('已复制路径') }).catch(function () { toast(path) })
        }
        else toast(path)
      }
    })
  }
  catch (error) {
    const node = document.getElementById('sessions')
    if (node) node.innerHTML = '<p class="empty">' + esc(error.message) + '</p>'
  }
}
let logFilter = { provider: '', failed: false }
let usageRange = '7d'
let logsCache = []
function emptyIcon() {
  return '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'
    + '<path d="M4 6h16M4 12h10M4 18h7" stroke-linecap="round"/></svg>'
}
function logsHtml() {
  const providers = state.providers.map(function (item) {
    return '<option value="' + esc(item.id) + '">' + esc(item.name) + '</option>'
  }).join('')
  return '<h1>日志</h1><p class="lede">经过这台电脑的每一次请求。旧记录没有试过哪几家。</p>'
    + '<div class="toolbar"><label class="sr-only" for="log-provider">服务商</label>'
    + '<select id="log-provider"><option value="">全部服务商</option>' + providers + '</select>'
    + '<label class="pill" style="cursor:pointer"><input type="checkbox" id="log-failed"> 只看失败的</label>'
    + '<span class="spacer"></span>'
    + '<button type="button" class="quiet" id="log-refresh">刷新</button></div>'
    + '<div id="logs"><div class="stack"><div class="skeleton-card"><div class="skeleton" style="width:40%"></div></div><div class="skeleton-card"><div class="skeleton" style="width:65%"></div></div></div></div>'
}
async function loadLogs() {
  const node = document.getElementById('logs')
  if (!node) return
  try {
    const params = new URLSearchParams()
    if (logFilter.provider) params.set('provider', logFilter.provider)
    if (logFilter.failed) params.set('failed', '1')
    params.set('limit', '200')
    const data = await api('/api/logs?' + params.toString())
    logsCache = data.events || []
    node.innerHTML = logsTableHtml()
  }
  catch (error) {
    node.innerHTML = '<div class="empty-state"><div class="empty-title">没读到日志</div><div>' + esc(error.message) + '</div>'
      + '<button type="button" class="quiet" id="log-retry">再试一次</button></div>'
    const retry = document.getElementById('log-retry')
    if (retry) retry.onclick = function () { loadLogs() }
  }
}
function logsTableHtml() {
  if (!logsCache.length) {
    return '<div class="empty-state">' + emptyIcon()
      + '<div class="empty-title">还没有请求经过这里</div>'
      + '<div class="empty-desc">用一会儿工具，这里会按时间倒序列出每一次请求，包括试了哪几家。</div></div>'
  }
  const rows = logsCache.map(function (event) {
    const ok = event.status < 400
    const name = (state.providers.find(function (item) { return item.id === event.providerId }) || {}).name || event.providerId
    const tried = Array.isArray(event.attempts) && event.attempts.length > 1 ? ' · ' + t('试了 {n} 家', { n: event.attempts.length }) : ''
    return '<tr><td class="mono">' + esc(when(event.at)) + '</td>'
      + '<td>' + esc(name) + tried + '</td>'
      + '<td class="mono">' + esc(event.model || '—') + '</td>'
      + '<td class="num">' + esc(String(event.status)) + '</td>'
      + '<td class="num">' + esc(String(event.latencyMs)) + ' ms</td>'
      + '<td class="num">' + (event.inputTokens || 0) + ' / ' + (event.outputTokens || 0) + '</td>'
      + '<td><span class="pill ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '成功' : '失败') + '</span></td></tr>'
  }).join('')
  return '<section class="panel"><table><thead><tr><th>时间</th><th>服务商</th><th>模型</th><th class="num">状态</th><th class="num">耗时</th><th class="num">读 / 写</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></section>'
}
function routingHtml() {
  return '<h1>选路</h1><p class="lede">每次请求先试了谁、为什么换下一家。只有开了「经过本机」并失败切过的请求才有这段记录。</p>'
    + '<div class="toolbar"><span class="spacer"></span><button type="button" class="quiet" id="route-refresh">刷新</button></div>'
    + '<div id="decisions"><div class="skeleton-card"><div class="skeleton" style="width:55%"></div></div></div>'
}
async function loadDecisions() {
  const node = document.getElementById('decisions')
  if (!node) return
  try {
    const data = await api('/api/decisions?limit=100')
    const rows = data.decisions || []
    if (!rows.length) {
      node.innerHTML = '<div class="empty-state">' + emptyIcon()
        + '<div class="empty-title">还没有选路记录</div>'
        + '<div class="empty-desc">把某个工具切到「经过本机」，请求失败切换一次之后，这里会显示完整经过。</div></div>'
      return
    }
    node.innerHTML = rows.map(function (event) {
      const steps = (event.attempts || []).map(function (attempt) {
        const name = (state.providers.find(function (item) { return item.id === attempt.providerId }) || {}).name || attempt.providerId
        const ok = attempt.status < 400
        return '<li><span class="when">' + esc(when(event.at)) + '</span><div>'
          + '<span class="pill ' + (ok ? 'ok' : 'bad') + '">' + esc(String(attempt.status)) + '</span> '
          + esc(name) + ' · ' + esc(String(attempt.latencyMs)) + ' ms'
          + (attempt.reason ? ' · <span class="meta">' + esc(attempt.reason) + '</span>' : '') + '</div></li>'
      }).join('')
      const finalName = (state.providers.find(function (item) { return item.id === event.providerId }) || {}).name || event.providerId
      return '<section class="panel"><div class="panel-head"><h2>' + esc(event.model || '未指定模型') + '</h2>'
        + '<span class="meta">最终用 ' + esc(finalName) + '</span></div>'
        + '<ul class="timeline">' + steps + '</ul></section>'
    }).join('')
  }
  catch (error) {
    node.innerHTML = '<div class="empty-state"><div class="empty-title">没读到选路记录</div><div>' + esc(error.message) + '</div>'
      + '<button type="button" class="quiet" id="route-retry">再试一次</button></div>'
    const retry = document.getElementById('route-retry')
    if (retry) retry.onclick = function () { loadDecisions() }
  }
}
function armLogs(wrap) {
  const provider = document.getElementById('log-provider')
  if (provider) {
    provider.value = logFilter.provider
    provider.onchange = function () {
      logFilter.provider = provider.value
      loadLogs()
    }
  }
  const failed = document.getElementById('log-failed')
  if (failed) {
    failed.checked = logFilter.failed
    failed.onchange = function () {
      logFilter.failed = failed.checked
      loadLogs()
    }
  }
  const refresh = document.getElementById('log-refresh')
  if (refresh) refresh.onclick = function () { loadLogs() }
  void wrap
}
async function useModel(id, model) {
  if (saving) return
  const provider = state.providers.find(function (item) { return item.id === id })
  if (!provider) return
  if (!provider.hasSecret) {
    toast(provider.name + ' 还没有密钥，先去服务商页补上。')
    screen = 'providers'
    navigate()
    return
  }
  const mode = canDirect(provider.protocol) ? 'direct' : 'routing'
  saving = true
  try {
    const result = await api('/api/use', {
      tool: tool,
      providerId: id,
      mode: mode,
      model: model,
      failover: [id],
      strategy: 'order'
    })
    await load()
    toast(result.applied ? '已经改用 ' + provider.name + ' / ' + model : (result.message || '已经记住'))
  }
  catch (error) { toast(error.message, true) }
  finally { saving = false }
}
async function useProvider(id) {
  if (saving) return
  const provider = state.providers.find(function (item) { return item.id === id })
  if (!provider) return
  if (draft === 'direct' && !canDirect(provider.protocol)) {
    toast(toolName(tool) + ' 听不懂这家的接口。请改成「经过本机」。', true)
    return
  }
  if (!provider.hasSecret) {
    toast(provider.name + ' 还没有密钥，先去服务商页补上。')
    screen = 'providers'
    navigate()
    return
  }
  const failover = Array.prototype.map.call(document.querySelectorAll('[data-fail]:checked'), function (node) { return node.getAttribute('data-fail') })
  const members = Array.prototype.map.call(document.querySelectorAll('[data-member]:checked'), function (node) { return node.getAttribute('data-member') })
  saving = true
  const buttons = document.querySelectorAll('[data-use]')
  Array.prototype.forEach.call(buttons, function (node) { node.disabled = true })
  try {
    const strategyNode = document.getElementById('strategy')
    const result = await api('/api/use', {
      tool: tool,
      providerId: id,
      mode: draft,
      failover: failover.length ? failover : [id],
      members: members,
      strategy: strategyNode ? strategyNode.value : 'order'
    })
    await load()
    toast(result.applied ? '已经写进 ' + toolName(tool) + '。原来的配置还在，可以恢复。' : (result.message || '已经记住'))
  }
  catch (error) { toast(error.message, true) }
  finally {
    saving = false
    const again = document.querySelectorAll('[data-use]')
    Array.prototype.forEach.call(again, function (node) { node.disabled = false })
  }
}
function drawToolSoft() {
  const wrap = document.getElementById('wrap')
  if (!wrap || screen !== 'tool') return
  const copy = MODE_COPY[draft] || MODE_COPY.direct
  const hint = document.getElementById('mode-hint')
  if (hint) hint.textContent = copy[1]
  const cards = document.getElementById('tool-cards')
  if (cards) cards.innerHTML = toolCardsHtml()
  const extra = document.getElementById('tool-extra')
  if (extra) {
    const route = routeOf()
    extra.innerHTML = draft === 'routing'
      ? failoverHtml(route)
      : (draft === 'aggregation' ? membersHtml(route) : '')
  }
  wrap.querySelectorAll('[data-mode]').forEach(function (btn) {
    const on = btn.getAttribute('data-mode') === draft
    btn.setAttribute('aria-selected', String(on))
    btn.setAttribute('tabindex', on ? '0' : '-1')
  })
  bind(wrap)
  drawNav()
}
function bind(wrap) {
  wrap.querySelectorAll('[data-mode]').forEach(function (btn) {
    btn.onclick = function () {
      draft = btn.getAttribute('data-mode')
      confirmRestore = false
      drawToolSoft()
      armTabs(document.getElementById('wrap'))
    }
  })
  wrap.querySelectorAll('[data-use]').forEach(function (btn) {
    btn.onclick = function () { useProvider(btn.getAttribute('data-use')) }
  })
  wrap.querySelectorAll('[data-pick]').forEach(function (btn) {
    btn.onclick = function () { useModel(btn.getAttribute('data-pick'), btn.getAttribute('data-model')) }
  })
  wrap.querySelectorAll('[data-models]').forEach(function (btn) {
    btn.onclick = async function () {
      try {
        const result = await api('/api/models', { id: btn.getAttribute('data-models') })
        await load({ keepDraft: true })
        toast(result.ok ? '已更新模型列表' : (result.message || '没拉到，仍用原来的列表'), !result.ok)
      }
      catch (error) { toast(error.message, true) }
    }
  })
  const doImport = document.getElementById('do-import')
  if (doImport) doImport.onclick = async function () {
    try {
      const result = await api('/api/import', {})
      await load({ keepDraft: true })
      toast(result.added && result.added.length ? '已从现有配置导入' : '没有读到本机上的服务商地址')
    }
    catch (error) { toast(error.message, true) }
  }
  const profileSave = document.getElementById('profile-save')
  if (profileSave) profileSave.onclick = async function () {
    const name = document.getElementById('profile-name').value
    try {
      await api('/api/profiles', { action: 'save', name: name })
      await load({ keepDraft: true })
      toast('已保存这套')
    }
    catch (error) { toast(error.message, true) }
  }
  const profileUse = document.getElementById('profile-use')
  if (profileUse) profileUse.onclick = async function () {
    const pick = document.getElementById('profile-pick')
    if (!pick) return
    try {
      const result = await api('/api/profiles', { action: 'use', name: pick.value })
      await load()
      toast(result.applied ? '已换成这套，并写进工具' : (result.message || '已换成这套'))
    }
    catch (error) { toast(error.message, true) }
  }
  const saveSettings = document.getElementById('save-settings')
  if (saveSettings) saveSettings.onclick = async function () {
    const aliases = {}
    document.getElementById('aliases').value.split('\\n').forEach(function (line) {
      const trimmed = line.trim()
      if (!trimmed) return
      const eq = trimmed.indexOf('=')
      if (eq <= 0) return
      aliases[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    })
    try {
      await api('/api/settings', {
        systemPrompt: document.getElementById('sysprompt').value,
        aliases: aliases
      })
      await load({ keepDraft: true })
      toast('已保存说明')
    }
    catch (error) { toast(error.message, true) }
  }
  wrap.querySelectorAll('[data-go]').forEach(function (btn) {
    btn.onclick = function () { screen = btn.getAttribute('data-go'); navigate() }
  })
  const ask = document.getElementById('ask-restore')
  if (ask) ask.onclick = function () { confirmRestore = true; draw() }
  const cancel = document.getElementById('cancel-restore')
  if (cancel) cancel.onclick = function () { confirmRestore = false; draw() }
  const restore = document.getElementById('do-restore')
  if (restore) restore.onclick = async function () {
    try {
      const result = await api('/api/revert', { tool: tool })
      confirmRestore = false
      await load()
      toast(result.applied === false ? '这次没有连到配置文件' : (result.restored && result.restored.length ? '已经恢复原来的配置' : '没有可恢复的备份'), result.applied === false)
    }
    catch (error) { toast(error.message, true) }
  }
  const q = document.getElementById('q')
  if (q) q.oninput = function () {
    query = q.value
    refreshPresets()
  }
  const tq = document.getElementById('tq')
  if (tq) tq.oninput = function () {
    toolQuery = tq.value
    const list = document.getElementById('model-list')
    if (list) list.innerHTML = modelListHtml()
    const cards = document.getElementById('tool-cards')
    if (cards) cards.innerHTML = toolCardsHtml()
    const count = document.getElementById('tq-count')
    if (count) count.textContent = String(modelRows().length)
    bind(wrap)
  }
  const copyModel = document.getElementById('copy-model')
  if (copyModel) copyModel.onclick = async function () {
    const current = state.providers.find(function (item) { return item.id === routeOf().providerId })
    const value = routeOf().model || (current ? current.name : '')
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast('已复制 ' + value)
    }
    catch (error) {
      const box = document.createElement('textarea')
      box.value = value
      box.setAttribute('readonly', '')
      box.style.position = 'fixed'
      box.style.opacity = '0'
      document.body.appendChild(box)
      box.select()
      let copied = false
      try { copied = document.execCommand('copy') } catch (copyError) { copied = false }
      document.body.removeChild(box)
      toast(copied ? '已复制 ' + value : '复制不了，手动记一下：' + value, !copied)
    }
  }
  const add = document.getElementById('padd')
  if (add) add.onclick = async function () {
    const id = document.getElementById('pid').value.trim().toLowerCase()
    const baseUrl = document.getElementById('purl').value.trim()
    if (!id || !baseUrl) { toast('先写短名字和地址'); return }
    if (!validId(id)) { toast('短名字只能用小写字母、数字和短横线'); return }
    try {
      await api('/api/providers', {
        provider: {
          id: id,
          name: document.getElementById('pname').value.trim() || id,
          protocol: document.getElementById('pproto').value,
          baseUrl: baseUrl,
          models: document.getElementById('pmodels').value.split(',').map(function (part) { return part.trim() }).filter(Boolean),
          proxyUrl: document.getElementById('pproxy').value.trim()
        },
        apiKey: document.getElementById('pkey').value
      })
      await load({ keepDraft: true })
      refreshPresets()
      toast('已添加')
    }
    catch (error) { toast(error.message, true) }
  }
  wrap.querySelectorAll('[data-preset]').forEach(function (btn) {
    btn.onclick = function () {
      pendingPreset = btn.getAttribute('data-preset')
      draw()
      const input = document.getElementById('preset-key')
      if (input) input.focus()
    }
  })
  const presetSave = document.getElementById('preset-save')
  if (presetSave) presetSave.onclick = async function () {
    const preset = state.presets.find(function (item) { return item.id === pendingPreset })
    const keyBox = document.getElementById('preset-key')
    if (!preset || !keyBox) return
    try {
      await api('/api/providers', {
        provider: { id: preset.id, name: preset.name, protocol: preset.protocol, baseUrl: preset.baseUrl, models: preset.models },
        apiKey: keyBox.value
      })
      pendingPreset = ''
      await load({ keepDraft: true })
      toast('已添加 ' + preset.name)
    }
    catch (error) { toast(error.message, true) }
  }
  const presetCancel = document.getElementById('preset-cancel')
  if (presetCancel) presetCancel.onclick = function () { pendingPreset = ''; draw() }
  wrap.querySelectorAll('[data-remove]').forEach(function (btn) {
    btn.onclick = function () { pendingRemove = btn.getAttribute('data-remove'); editingProvider = ''; refreshAdded() }
  })
  const doRemove = document.getElementById('do-remove')
  if (doRemove) doRemove.onclick = async function () {
    const id = doRemove.getAttribute('data-id') || pendingRemove
    try {
      const result = await api('/api/providers', { action: 'remove', id: id })
      pendingRemove = ''
      await load({ keepDraft: true })
      const affected = (result && result.affected) || []
      toast(affected.length
        ? '已移除。' + affected.map(function (t) { return toolName(t) }).join('、') + ' 还指向这家，请重新选一家。'
        : '已移除')
    }
    catch (error) { toast(error.message, true) }
  }
  const cancelRemove = document.getElementById('cancel-remove')
  if (cancelRemove) cancelRemove.onclick = function () { pendingRemove = ''; refreshAdded() }
  wrap.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.onclick = function () { editingProvider = btn.getAttribute('data-edit'); pendingRemove = ''; refreshAdded() }
  })
  const cancelEdit = wrap.querySelector('[data-cancel-edit]')
  if (cancelEdit) cancelEdit.onclick = function () { editingProvider = ''; refreshAdded() }
  wrap.querySelectorAll('[data-save]').forEach(function (btn) {
    btn.onclick = async function () {
      const id = btn.getAttribute('data-save')
      const nameBox = document.querySelector('.edit-name')
      const keyBox = document.querySelector('.edit-key')
      const name = nameBox ? nameBox.value.trim() : ''
      const key = keyBox ? keyBox.value : ''
      try {
        if (name)
          await api('/api/providers', { action: 'rename', id: id, name: name })
        if (key)
          await api('/api/providers', { action: 'secret', id: id, apiKey: key })
        editingProvider = ''
        await load({ keepDraft: true })
        toast(name || key ? '已保存' : '没有改动')
      }
      catch (error) { toast(error.message, true) }
    }
  })
  wrap.querySelectorAll('[data-forget]').forEach(function (btn) {
    btn.onclick = async function () {
      try {
        await api('/api/providers', { action: 'forget', id: btn.getAttribute('data-forget') })
        editingProvider = ''
        await load({ keepDraft: true })
        toast('已清除密钥。这家暂时不能用，除非重新填。')
      }
      catch (error) { toast(error.message, true) }
    }
  })
  const saveAccount = document.getElementById('asave')
  if (saveAccount) saveAccount.onclick = async function () {
    const id = document.getElementById('aid').value.trim().toLowerCase()
    const token = document.getElementById('atoken').value
    if (!id || !token) { toast('写个短名字，再贴上令牌'); return }
    if (!validId(id)) { toast('短名字只能用小写字母、数字和短横线'); return }
    try {
      await api('/api/accounts', {
        id: id,
        kind: document.getElementById('akind').value,
        label: document.getElementById('alabel').value.trim() || id,
        token: token,
        quotaUrl: document.getElementById('aquota').value.trim() || undefined
      })
      await load({ keepDraft: true })
      toast('已保存。令牌没有显示在页面上。')
    }
    catch (error) { toast(error.message, true) }
  }
  wrap.querySelectorAll('[data-drop]').forEach(function (btn) {
    btn.onclick = function () { pendingDrop = btn.getAttribute('data-drop'); pendingAccount = ''; refreshAccounts() }
  })
  const doDrop = document.getElementById('do-drop')
  if (doDrop) doDrop.onclick = async function () {
    const id = doDrop.getAttribute('data-id') || pendingDrop
    try {
      await api('/api/accounts', { action: 'remove', id: id })
      pendingDrop = ''
      await load({ keepDraft: true })
      toast('已移除')
    }
    catch (error) { toast(error.message, true) }
  }
  const cancelDrop = document.getElementById('cancel-drop')
  if (cancelDrop) cancelDrop.onclick = function () { pendingDrop = ''; refreshAccounts() }
  wrap.querySelectorAll('[data-edit-account]').forEach(function (btn) {
    btn.onclick = function () { pendingAccount = btn.getAttribute('data-edit-account'); pendingDrop = ''; refreshAccounts() }
  })
  const cancelAccount = wrap.querySelector('[data-cancel-account]')
  if (cancelAccount) cancelAccount.onclick = function () { pendingAccount = ''; refreshAccounts() }
  wrap.querySelectorAll('[data-save-account]').forEach(function (btn) {
    btn.onclick = async function () {
      const id = btn.getAttribute('data-save-account')
      const account = (state.accounts || []).find(function (row) { return row.id === id })
      if (!account) return
      const label = (document.querySelector('.acc-label') || {}).value
      const quotaUrl = (document.querySelector('.acc-quota') || {}).value
      const token = (document.querySelector('.acc-token') || {}).value
      if (!token) { toast('改账号需要重新贴一次令牌'); return }
      try {
        await api('/api/accounts', {
          id: id,
          kind: account.kind,
          label: (label || account.label).trim() || account.label,
          token: token,
          quotaUrl: (quotaUrl || '').trim() || undefined
        })
        pendingAccount = ''
        await load({ keepDraft: true })
        toast('已保存')
      }
      catch (error) { toast(error.message, true) }
    }
  })
  wrap.querySelectorAll('[data-quota]').forEach(function (btn) {
    btn.onclick = async function () {
      const id = btn.getAttribute('data-quota')
      const slot = document.getElementById('bal-' + id)
      if (slot) slot.textContent = '正在查…'
      try {
        const result = await api('/api/quota', { id: id })
        if (!slot) return
        if (!result.available) { slot.textContent = result.reason || '没有余额地址'; return }
        const detail = typeof result.body === 'string' ? result.body : ''
        slot.textContent = detail ? ('已取到：' + detail.slice(0, 120)) : '已取到余额'
      }
      catch (error) { if (slot) slot.textContent = error.message }
    }
  })
}
document.getElementById('lang-btn').addEventListener('click', function () {
  lang = lang === 'en' ? 'zh' : 'en'
  try { localStorage.setItem('ccjk-lang', lang) } catch (error) { /* private mode */ }
  applyLang()
  if (state) draw()
})
const palette = { open: false, items: [], active: 0 }
function paletteEntries(query) {
  const needle = String(query || '').trim().toLowerCase()
  const hits = []
  MORE.forEach(function (row) {
    if (!needle || row[1].toLowerCase().indexOf(needle) >= 0 || row[0].indexOf(needle) >= 0)
      hits.push({ group: '页面', label: row[1], sub: '', run: function () { screen = row[0]; navigate() } })
  })
  modelRows().forEach(function (row) {
    if (needle && row.label.toLowerCase().indexOf(needle) < 0) return
    hits.push({
      group: '模型',
      label: row.label,
      sub: row.provider.hasSecret ? '' : '缺密钥',
      run: function () { screen = 'tool'; tool = row.provider.id; void useModel(row.provider.id, row.model) },
    })
  })
  return hits.slice(0, 40)
}
function paletteRender() {
  const list = document.getElementById('palette-list')
  if (!list) return
  if (!palette.items.length) {
    list.innerHTML = '<div class="palette-empty">没有匹配项</div>'
    return
  }
  let html = ''
  let lastGroup = ''
  palette.items.forEach(function (item, index) {
    if (item.group !== lastGroup) {
      html += '<div class="palette-group">' + esc(item.group) + '</div>'
      lastGroup = item.group
    }
    html += '<button type="button" class="palette-item' + (index === palette.active ? ' active' : '') + '" data-palette-index="' + index + '">'
      + esc(item.label) + (item.sub ? '<span class="sub">' + esc(item.sub) + '</span>' : '') + '</button>'
  })
  list.innerHTML = html
  list.querySelectorAll('[data-palette-index]').forEach(function (btn) {
    btn.onclick = function () { paletteRun(Number(btn.getAttribute('data-palette-index'))) }
  })
  const active = list.querySelector('.palette-item.active')
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' })
}
function paletteSearch(value) {
  palette.items = paletteEntries(value)
  palette.active = 0
  paletteRender()
}
function paletteRun(index) {
  const item = palette.items[index]
  paletteClose()
  if (item) void item.run()
}
function paletteOpen() {
  const root = document.getElementById('palette')
  const input = document.getElementById('palette-input')
  if (!root || !input) return
  palette.open = true
  root.classList.add('open')
  input.value = ''
  paletteSearch('')
  input.focus()
}
function paletteClose() {
  const root = document.getElementById('palette')
  if (!root) return
  palette.open = false
  root.classList.remove('open')
}
document.addEventListener('click', function (event) {
  if (event.target && event.target.id === 'palette') paletteClose()
})
document.addEventListener('keydown', function (event) {
  if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
    event.preventDefault()
    if (palette.open) paletteClose()
    else paletteOpen()
    return
  }
  if (!palette.open) return
  if (event.key === 'Escape') { event.preventDefault(); paletteClose(); return }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!palette.items.length) return
    const step = event.key === 'ArrowDown' ? 1 : -1
    palette.active = (palette.active + step + palette.items.length) % palette.items.length
    paletteRender()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    paletteRun(palette.active)
  }
})
document.addEventListener('input', function (event) {
  if (event.target && event.target.id === 'palette-input') paletteSearch(event.target.value)
})
document.addEventListener('keydown', function (event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const tag = (event.target && event.target.tagName) || ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (event.key === 'Escape') event.target.blur()
    return
  }
  if (event.key === '/') {
    const box = document.getElementById('tq') || document.getElementById('q')
    if (box) { event.preventDefault(); box.focus(); box.select(); }
  }
})
applyLang()
// 列表与空状态是异步渲染的，晚于 draw() 里的 localizeTree，这里补一次。
// 只监听 childList：localizeTree 改的是文本值（characterData），不会自触发。
let lateNodes = []
let lateFrame = 0
function flushLateNodes() {
  lateFrame = 0
  const nodes = lateNodes
  lateNodes = []
  nodes.forEach(function (node) {
    if (node.nodeType === 1) localizeTree(node)
    else if (node.nodeType === 3 && node.nodeValue) node.nodeValue = localizeText(node.nodeValue)
  })
}
new MutationObserver(function (records) {
  if (lang !== 'en') return
  records.forEach(function (record) {
    record.addedNodes.forEach(function (node) { lateNodes.push(node) })
  })
  // 合并到下一帧处理，避免日志/选路页批量插入时逐节点重复扫描
  if (lateNodes.length && !lateFrame) lateFrame = requestAnimationFrame(flushLateNodes)
}).observe(document.body, { childList: true, subtree: true })
function onLocationChange() {
  if (!applyRoute()) return
  renderScreen()
}
window.addEventListener('hashchange', onLocationChange)
window.addEventListener('popstate', onLocationChange)
load().then(function () {
  applyRoute()
  draw()
  pollHealth()
  if (healthTimer) clearInterval(healthTimer)
  healthTimer = setInterval(pollHealth, 5000)
}).catch(function (error) { toast(error.message) })
</script>
</body>
</html>`
}
