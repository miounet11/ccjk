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
    --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.06);
    --radius: 14px;
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
  .banner, .warn {
    border-radius: 12px; padding: 12px 14px; margin: 0 0 16px;
  }
  .banner { background: var(--info-bg); color: var(--info); }
  .warn { background: var(--warn-bg); color: var(--warn); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
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
  #toast {
    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(12px);
    background: #1d1d1f; color: white; border-radius: 999px;
    padding: 10px 16px; opacity: 0; pointer-events: none;
    transition: opacity .2s ease, transform .2s ease;
    max-width: min(560px, calc(100% - 32px));
  }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
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
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.35);
    }
    body { background: radial-gradient(1200px 500px at 10% -10%, #1a2a40 0%, transparent 55%), var(--bg); }
    .nav-btn[aria-current="true"], .tool-btn[aria-current="true"], .seg button[aria-selected="true"] { background: #3a3a3c; }
    .chips span, button.quiet { background: #3a3a3c; color: #e5e5ea; }
    .inuse { background: #3a3a3c; color: #c7c7cc; }
    input, select, textarea { background: #1c1c1e; border-color: #3a3a3c; }
    button.primary:disabled { background: #3a3a3c; color: #8e8e93; }
    #toast { background: #f5f5f7; color: #1d1d1f; }
  }
</style>
</head>
<body>
<div class="app">
  <aside>
    <div class="brand"><strong>ccjk</strong><span>这台电脑上的模型开关</span></div>
    <div class="group">快捷切换</div>
    <div id="tools"></div>
    <div class="group">管理</div>
    <div id="more"></div>
    <div class="foot"><span class="dot"></span><span id="foot">本机</span></div>
  </aside>
  <main><div class="wrap" id="wrap"><h1>正在打开…</h1></div></main>
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
  ['accounts', '账号']
]
const MODE_COPY = {
  direct: ['直接连接', '工具自己去找这家服务商，不经过这台电脑。'],
  routing: ['经过本机', '请求先到这台电脑，再转到你选的服务商。接口不一样也能用。这家不通，就按你勾的顺序换下一家。'],
  aggregation: ['一个列表里选', '几家的模型放进同一个列表。点哪个就用哪家。这家不通时不会自动换下一家。']
}
const PROTO = {
  'anthropic-messages': 'Claude 接口',
  'openai-chat': '对话接口',
  'openai-responses': '新版对话接口',
  gemini: 'Gemini 接口',
  xai: 'Grok 接口'
}
const KINDS = { chatgpt: 'ChatGPT', copilot: 'Copilot', xai: 'xAI' }
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
function toast(text) {
  const node = document.getElementById('toast')
  node.textContent = text
  node.classList.add('show')
  clearTimeout(toast._t)
  toast._t = setTimeout(function () { node.classList.remove('show') }, 2800)
}
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
  const label = health.checking ? '正在确认…' : (health.ok ? '本机代理运行中' : '本机代理没在跑')
  const cls = health.checking ? 'checking' : (health.ok ? '' : 'bad')
  const port = state && state.port ? ' · 127.0.0.1:' + state.port : ''
  document.getElementById('foot').innerHTML = '<span class="dot ' + cls + '"></span>' + label + port + '<br><span style="opacity:.7">请求身份 ccjk-proxy</span>'
}
function drawNav() {
  document.getElementById('tools').innerHTML = visibleTools().map(function (row) {
    const route = state.tools[row[0]] || { mode: 'direct' }
    const how = (MODE_COPY[route.mode] || MODE_COPY.direct)[0]
    const unsaved = screen === 'tool' && tool === row[0] && draft !== route.mode
    return '<button type="button" class="tool-btn" data-tool="' + row[0] + '" aria-current="' + (screen === 'tool' && tool === row[0]) + '"><b>' + row[1] + '</b><small>' + how + (unsaved ? ' · 未保存' : '') + '</small></button>'
  }).join('')
  document.getElementById('more').innerHTML = MORE.map(function (row) {
    return '<button type="button" class="nav-btn" data-screen="' + row[0] + '" aria-current="' + (screen === row[0]) + '">' + row[1] + '</button>'
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
      draw()
    }
  })
  document.querySelectorAll('[data-screen]').forEach(function (btn) {
    btn.onclick = function () {
      screen = btn.getAttribute('data-screen')
      confirmRestore = false
      draw()
    }
  })
}
function draw() {
  drawNav()
  const wrap = document.getElementById('wrap')
  if (screen === 'providers') wrap.innerHTML = providersHtml()
  else if (screen === 'sessions') {
    wrap.innerHTML = '<h1>会话</h1><p class="lede">最近用过的对话。这里只看，不删除。</p><div id="sessions"><p class="empty">正在读…</p></div>'
    loadSessions()
    return
  }
  else if (screen === 'usage') wrap.innerHTML = usageHtml()
  else if (screen === 'accounts') wrap.innerHTML = accountsHtml()
  else wrap.innerHTML = toolHtml()
  bind(wrap)
  if (screen === 'tool')
    armTabs(wrap)
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
  return '<div class="list">' + rows.map(function (row) {
    const on = route.providerId === row.provider.id && route.model === row.model
    return '<div class="list-row"><div class="text"><h3>' + esc(row.label) + '</h3><div class="meta">' + esc(PROTO[row.provider.protocol] || '') + '</div></div>'
      + '<button type="button" class="primary" data-pick="' + esc(row.provider.id) + '" data-model="' + esc(row.model) + '"' + (on ? ' disabled' : '') + '>' + (on ? '正在使用' : '用这个') + '</button></div>'
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
  const finder = state.providers.length
    ? '<div class="field" style="margin-bottom:12px"><label for="tq" class="sr-only">找服务商或模型</label><input id="tq" type="search" placeholder="找服务商或模型" value="' + esc(toolQuery) + '"></div>'
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
  return '<h1>' + toolName(tool) + '</h1><p class="lede">' + esc(using) + '</p>'
    + offline + finder + '<div id="model-list">' + modelListHtml() + '</div>'
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
  const usage = state.usage || { requests: 0, errors: 0, inputTokens: 0, outputTokens: 0, byProvider: {} }
  const rows = Object.keys(usage.byProvider || {}).map(function (id) {
    const row = usage.byProvider[id]
    const name = (state.providers.find(function (item) { return item.id === id }) || {}).name || id
    return '<tr><td>' + esc(name) + '</td><td>' + row.requests + '</td><td>' + row.errors + '</td></tr>'
  }).join('')
  const cost = usage.costUsd === undefined ? '' : stat(Number(usage.costUsd).toFixed(4), '参考价')
  const hit = usage.cacheHitRate === undefined ? '' : stat(Math.round(Number(usage.cacheHitRate) * 100) + '%', '缓存命中')
  return '<h1>用量</h1><p class="lede">只统计经过这台电脑的请求。直接连接的不在这里。价钱是参考，不是账单。</p><div class="stats">'
    + stat(usage.requests, '请求') + stat(usage.errors, '没成功') + stat(usage.inputTokens, '读入') + stat(usage.outputTokens, '写出')
    + cost + hit
    + '</div>' + (rows ? '<section class="panel"><table><tr><th>服务商</th><th>次数</th><th>失败</th></tr>' + rows + '</table></section>' : '<p class="empty">还没有请求经过这里。</p>')
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
async function useModel(id, model) {
  if (saving) return
  const provider = state.providers.find(function (item) { return item.id === id })
  if (!provider) return
  if (!provider.hasSecret) {
    toast(provider.name + ' 还没有密钥，先去服务商页补上。')
    screen = 'providers'
    draw()
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
  catch (error) { toast(error.message) }
  finally { saving = false }
}
async function useProvider(id) {
  if (saving) return
  const provider = state.providers.find(function (item) { return item.id === id })
  if (!provider) return
  if (draft === 'direct' && !canDirect(provider.protocol)) {
    toast(toolName(tool) + ' 听不懂这家的接口。请改成「经过本机」。')
    return
  }
  if (!provider.hasSecret) {
    toast(provider.name + ' 还没有密钥，先去服务商页补上。')
    screen = 'providers'
    draw()
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
  catch (error) { toast(error.message) }
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
        toast(result.ok ? '已更新模型列表' : (result.message || '没拉到，仍用原来的列表'))
      }
      catch (error) { toast(error.message) }
    }
  })
  const doImport = document.getElementById('do-import')
  if (doImport) doImport.onclick = async function () {
    try {
      const result = await api('/api/import', {})
      await load({ keepDraft: true })
      toast(result.added && result.added.length ? '已从现有配置导入' : '没有读到本机上的服务商地址')
    }
    catch (error) { toast(error.message) }
  }
  const profileSave = document.getElementById('profile-save')
  if (profileSave) profileSave.onclick = async function () {
    const name = document.getElementById('profile-name').value
    try {
      await api('/api/profiles', { action: 'save', name: name })
      await load({ keepDraft: true })
      toast('已保存这套')
    }
    catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
  }
  wrap.querySelectorAll('[data-go]').forEach(function (btn) {
    btn.onclick = function () { screen = btn.getAttribute('data-go'); draw() }
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
      toast(result.applied === false ? '这次没有连到配置文件' : (result.restored && result.restored.length ? '已经恢复原来的配置' : '没有可恢复的备份'))
    }
    catch (error) { toast(error.message) }
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
    bind(wrap)
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
    catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
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
      catch (error) { toast(error.message) }
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
      catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
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
    catch (error) { toast(error.message) }
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
      catch (error) { toast(error.message) }
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
load().then(function () {
  pollHealth()
  if (healthTimer) clearInterval(healthTimer)
  healthTimer = setInterval(pollHealth, 5000)
}).catch(function (error) { toast(error.message) })
</script>
</body>
</html>`
}
