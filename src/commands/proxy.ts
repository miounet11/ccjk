import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR, CLAUDE_DIR, CODEX_DIR, CODE_TOOL_TYPES, GROK_DIR, type CodeToolType } from '../constants'
import { getProviderSecret, setProviderSecret } from '../proxy/accounts'
import { aggregateModelId } from '../proxy/aggregate'
import { applyProxy, canConnectDirectly, defaultTargets, revertProxy, wireApiFor, type ApplyTarget } from '../proxy/apply-config'
import { loadProxyConfig, saveProxyConfig, setToolRoute } from '../proxy/config-store'
import { clearPid, readPid, startProxyServer, writePid } from '../proxy/server'
import { DEFAULT_PROXY_PORT, isProxyToolId, PROXY_TOOL_IDS } from '../proxy/types'

export interface ProxyCommandOptions {
  action?: string
  port?: string
  tool?: string
  provider?: string
  detach?: boolean
  open?: boolean
  dir?: string
}

function configDir(options: ProxyCommandOptions): string {
  return options.dir || process.env.CCJK_PROXY_DIR || CCJK_CONFIG_DIR
}

function ensureToken(dir: string): string {
  const existing = getProviderSecret(dir, '__proxy_token__')
  if (existing)
    return existing
  const token = randomBytes(18).toString('hex')
  setProviderSecret(dir, '__proxy_token__', token)
  return token
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
  status(dir)
  if (options.open)
    openBrowser(`${proxyBase(loadProxyConfig(dir).port)}/ui`)
}

async function serve(options: ProxyCommandOptions, dir: string) {
  const config = loadProxyConfig(dir)
  const port = options.port ? Number(options.port) : config.port || DEFAULT_PROXY_PORT
  const token = ensureToken(dir)
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

function start(options: ProxyCommandOptions, dir: string) {
  const existing = readPid(dir)
  if (existing && alive(existing)) {
    console.log(ansis.yellow(`代理已在运行，pid ${existing}`))
    if (options.open)
      openBrowser(`${proxyBase(loadProxyConfig(dir).port)}/ui`)
    return
  }
  const port = options.port || String(loadProxyConfig(dir).port || DEFAULT_PROXY_PORT)
  const child = spawn(process.execPath, [process.argv[1] || '', 'proxy', 'serve', '--port', port, '--dir', dir], {
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
    console.log(`  ${tool}  ${route.mode}  ${route.providerId || '-'}`)
  }
}

function selectedTargets(options: ProxyCommandOptions): ApplyTarget[] {
  const all = defaultTargets()
  if (!options.tool)
    return all.filter(target => CODE_TOOL_TYPES.includes(target.tool as CodeToolType) || target.tool === 'opencode' || target.tool === 'claudework')
  return all.filter(target => target.tool === options.tool)
}

/** 按每个工具已经保存的接法写入。直接连接写服务商自己的地址；经过本机和聚合写 /t/<工具>。 */
export function applySavedRoutes(dir: string, targets: ApplyTarget[]): string[] {
  const config = loadProxyConfig(dir)
  const token = ensureToken(dir)
  const written: string[] = []
  for (const target of targets) {
    const route = isProxyToolId(target.tool) ? config.tools[target.tool] : undefined
    const mode = route?.mode ?? 'routing'
    const provider = route?.providerId
      ? config.providers.find(item => item.id === route.providerId)
      : undefined
    if (mode === 'direct' && !provider) {
      console.log(ansis.yellow(`${target.tool} 是直接连接，但还没选定服务商，已跳过`))
      continue
    }
    if (mode === 'direct' && provider && !canConnectDirectly(target.tool, provider.protocol)) {
      console.log(ansis.yellow(`${target.tool} 听不懂 ${provider.name} 的接口，已跳过。请改成经过本机。`))
      continue
    }
    const firstModel = provider?.models[0] || provider?.id
    written.push(...applyProxy({
      targets: [target],
      proxyBaseUrl: proxyBase(config.port),
      proxyToken: token,
      snapshotDir: join(dir, 'proxy-snapshots'),
      mode,
      defaultModel: mode === 'aggregation' && provider && firstModel
        ? aggregateModelId(provider.id, firstModel)
        : firstModel,
      upstreamBaseUrl: provider?.baseUrl,
      upstreamToken: provider ? (getProviderSecret(dir, provider.id) || '') : '',
      wireApi: provider ? wireApiFor(provider.protocol) : undefined,
    }))
  }
  return written
}

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
