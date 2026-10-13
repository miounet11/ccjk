import { spawn } from 'node:child_process'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR, CLAUDE_DIR, CODEX_DIR, CODE_TOOL_TYPES, GROK_DIR, type CodeToolType } from '../constants'
import { applySavedRoutes, ensureProxyToken } from '../proxy/apply-saved'
import { defaultTargets, revertProxy, type ApplyTarget } from '../proxy/apply-config'
import { assignModel } from '../proxy/assign'
import { loadProxyConfig, saveProxyConfig, saveProxyProfile, setToolRoute, useProxyProfile } from '../proxy/config-store'
import { clearPid, readPid, startProxyServer, writePid } from '../proxy/server'
import { DEFAULT_PROXY_PORT, PROXY_TOOL_IDS } from '../proxy/types'

export interface ProxyCommandOptions {
  action?: string
  port?: string
  tool?: string
  provider?: string
  model?: string
  name?: string
  detach?: boolean
  open?: boolean
  dir?: string
}

function configDir(options: ProxyCommandOptions): string {
  return options.dir || process.env.CCJK_PROXY_DIR || CCJK_CONFIG_DIR
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  }
  catch {
    return false
  }
}

export function proxyBase(port: number): string {
  return `http://127.0.0.1:${port}`
}

function openBrowser(url: string) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

export async function proxyCommand(options: ProxyCommandOptions = {}): Promise<void> {
  const action = options.action || 'status'
  const dir = configDir(options)
  if (action === 'serve') {
    await serve(options, dir)
    return
  }
  if (action === 'start') {
    start(options, dir)
    return
  }
  if (action === 'stop') {
    stop(dir)
    return
  }
  if (action === 'apply') {
    apply(options, dir)
    return
  }
  if (action === 'revert') {
    revert(options, dir)
    return
  }
  if (action === 'switch') {
    switchProvider(options, dir)
    return
  }
  if (action === 'use') {
    useModel(options, dir)
    return
  }
  if (action === 'save') {
    saveProfile(options, dir)
    return
  }
  if (action === 'load') {
    loadProfile(options, dir)
    return
  }
  status(dir)
  if (options.open)
    openBrowser(`${proxyBase(loadProxyConfig(dir).port)}/ui`)
}

async function serve(options: ProxyCommandOptions, dir: string) {
  const config = loadProxyConfig(dir)
  const port = options.port ? Number(options.port) : config.port || DEFAULT_PROXY_PORT
  const token = ensureProxyToken(dir)
  const started = await startProxyServer({
    dir,
    port,
    proxyToken: token,
    targets: defaultTargets(),
    sessionRoots: [
      { tool: 'claude-code', dir: join(CLAUDE_DIR, 'projects') },
      { tool: 'codex', dir: join(CODEX_DIR, 'sessions') },
      { tool: 'grok', dir: GROK_DIR },
    ],
  })
  if (started.port !== config.port)
    saveProxyConfig(dir, { ...loadProxyConfig(dir), port: started.port })
  writePid(dir)
  console.log(ansis.green(`ccjk proxy 正在监听 ${proxyBase(started.port)}`))
  console.log(ansis.dim('只接受 127.0.0.1。Ctrl+C 停止。'))
  if (options.open)
    openBrowser(`${proxyBase(started.port)}/ui`)
  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => {
      started.server.close(() => resolve())
    })
    process.once('SIGTERM', () => {
      started.server.close(() => resolve())
    })
  })
  clearPid(dir)
}

/** 后台进程要沿用当前 Node 的启动参数。否则 tsx 入口会被当成普通脚本，start 和 ui 打印成功后马上退出。 */
export function proxyServeArgs(port: string, dir: string, entry = process.argv[1] || '', execArgv: readonly string[] = process.execArgv): string[] {
  const kept = execArgv.filter(arg => arg !== '--inspect' && arg !== '--inspect-brk' && !arg.startsWith('--inspect='))
  return [...kept, entry, 'proxy', 'serve', '--port', port, '--dir', dir]
}

function start(options: ProxyCommandOptions, dir: string) {
  const existing = readPid(dir)
  if (existing && alive(existing)) {
    console.log(ansis.yellow(`代理已在运行，pid ${existing}`))
    if (options.open)
      openBrowser(`${proxyBase(loadProxyConfig(dir).port)}/ui`)
    return
  }
  const port = options.port || String(loadProxyConfig(dir).port || DEFAULT_PROXY_PORT)
  const child = spawn(process.execPath, proxyServeArgs(port, dir), {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()
  console.log(ansis.green(`已在后台启动代理：${proxyBase(Number(port))}`))
  if (options.open)
    openBrowser(`${proxyBase(Number(port))}/ui`)
}

function stop(dir: string) {
  const pid = readPid(dir)
  if (!pid || !alive(pid)) {
    clearPid(dir)
    console.log(ansis.yellow('代理没有在运行'))
    return
  }
  process.kill(pid, 'SIGTERM')
  clearPid(dir)
  console.log(ansis.green(`已停止代理 pid ${pid}`))
}

function status(dir: string) {
  const config = loadProxyConfig(dir)
  const pid = readPid(dir)
  const running = pid ? alive(pid) : false
  console.log(running ? ansis.green(`运行中 pid ${pid}`) : ansis.yellow('没有运行'))
  console.log(`地址 ${proxyBase(config.port)}`)
  console.log(`供应商 ${config.providers.length}`)
  for (const tool of PROXY_TOOL_IDS) {
    const route = config.tools[tool]
    const model = route.model ? `  ${route.model}` : ''
    const strategy = route.strategy && route.strategy !== 'order' ? `  ${route.strategy}` : ''
    console.log(`  ${tool}  ${route.mode}  ${route.providerId || '-'}${model}${strategy}`)
  }
}

function selectedTargets(options: ProxyCommandOptions): ApplyTarget[] {
  const all = defaultTargets()
  if (!options.tool)
    return all.filter(target => CODE_TOOL_TYPES.includes(target.tool as CodeToolType) || target.tool === 'opencode' || target.tool === 'claudework')
  return all.filter(target => target.tool === options.tool)
}

export { applySavedRoutes } from '../proxy/apply-saved'

function apply(options: ProxyCommandOptions, dir: string) {
  const targets = selectedTargets(options)
  if (targets.length === 0) {
    console.log(ansis.red(`没有这个工具：${options.tool}`))
    process.exitCode = 1
    return
  }
  const written = applySavedRoutes(dir, targets)
  if (written.length === 0)
    console.log(ansis.yellow('没有写入。直接连接需要先选定一家听得懂的服务商。'))
  for (const path of written)
    console.log(ansis.green(`已写入 ${path}`))
  if (written.length > 0)
    console.log(ansis.dim('第一次写入前的原文件留在 proxy-snapshots，可用 ccjk proxy revert 还原。'))
}

function revert(options: ProxyCommandOptions, dir: string) {
  const tools = options.tool
    ? [options.tool]
    : defaultTargets().map(target => target.tool)
  const restored = revertProxy(join(dir, 'proxy-snapshots'), tools)
  if (restored.length === 0)
    console.log(ansis.yellow('没有可还原的快照'))
  for (const path of restored)
    console.log(ansis.green(`已还原 ${path}`))
}

function useModel(options: ProxyCommandOptions, dir: string) {
  if (!options.tool || !options.model) {
    console.log(ansis.yellow('用法：ccjk proxy use --tool claude-code --model deepseek/deepseek-chat'))
    process.exitCode = 1
    return
  }
  try {
    assignModel(dir, options.tool, options.model)
  }
  catch (error) {
    console.log(ansis.red((error as Error).message))
    process.exitCode = 1
    return
  }
  const targets = selectedTargets(options)
  const written = applySavedRoutes(dir, targets)
  if (written.length === 0)
    console.log(ansis.yellow('已经记住这个模型。没有写入配置文件。'))
  for (const path of written)
    console.log(ansis.green(`已写入 ${path}`))
}

function saveProfile(options: ProxyCommandOptions, dir: string) {
  if (!options.name) {
    console.log(ansis.yellow('用法：ccjk proxy save --name 上班'))
    process.exitCode = 1
    return
  }
  try {
    saveProxyProfile(dir, options.name)
  }
  catch (error) {
    console.log(ansis.red((error as Error).message))
    process.exitCode = 1
    return
  }
  console.log(ansis.green(`已保存配置档 ${options.name.trim()}`))
}

function loadProfile(options: ProxyCommandOptions, dir: string) {
  if (!options.name) {
    console.log(ansis.yellow('用法：ccjk proxy load --name 上班'))
    process.exitCode = 1
    return
  }
  try {
    useProxyProfile(dir, options.name)
  }
  catch (error) {
    console.log(ansis.red((error as Error).message))
    process.exitCode = 1
    return
  }
  const written = applySavedRoutes(dir, selectedTargets(options))
  console.log(ansis.green(`已换成配置档 ${options.name.trim()}`))
  for (const path of written)
    console.log(ansis.green(`已写入 ${path}`))
}

function switchProvider(options: ProxyCommandOptions, dir: string) {
  const tool = options.tool as CodeToolType | undefined
  if (!tool || !options.provider || !CODE_TOOL_TYPES.includes(tool)) {
    console.log(ansis.yellow('用法：ccjk proxy switch --tool clavue --provider deepseek'))
    process.exitCode = 1
    return
  }
  setToolRoute(dir, tool, { mode: 'routing', providerId: options.provider })
  console.log(ansis.green(`${tool} 已切到路由，默认上游 ${options.provider}`))
  console.log(ansis.dim('执行 ccjk proxy apply --tool ' + tool + ' 后，客户端才会改到本机代理。'))
}

export async function uiCommand(options: ProxyCommandOptions = {}): Promise<void> {
  const dir = configDir(options)
  const pid = readPid(dir)
  if (!pid || !alive(pid))
    start({ ...options, open: false }, dir)
  const port = loadProxyConfig(dir).port || DEFAULT_PROXY_PORT
  openBrowser(`${proxyBase(port)}/ui`)
  console.log(ansis.green(`界面 ${proxyBase(port)}/ui`))
}
