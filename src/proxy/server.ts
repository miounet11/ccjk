import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import type { ApplyTarget } from './apply-config'
import { CircuitBreaker } from './circuit'
import { handleProxyHttp } from './handler'
import type { ProxyRuntime } from './handler'
import { DEFAULT_PROXY_PORT } from './types'

export interface ListenOptions {
  dir: string
  port?: number
  usageFile?: string
  sessionRoots?: { tool: string, dir: string }[]
  fetchImpl?: typeof fetch
  proxyToken?: string
  targets?: ApplyTarget[]
}

export function startProxyServer(options: ListenOptions): Promise<{ server: Server, port: number, runtime: ProxyRuntime }> {
  const runtime: ProxyRuntime = {
    dir: options.dir,
    usageFile: options.usageFile ?? join(options.dir, 'proxy-usage.jsonl'),
    sessionRoots: options.sessionRoots ?? [],
    fetchImpl: options.fetchImpl,
    breaker: new CircuitBreaker(),
    proxyToken: options.proxyToken ?? 'ccjk-local',
    port: options.port ?? DEFAULT_PROXY_PORT,
    targets: options.targets,
    memory: { cursor: {}, sticky: {} },
  }
  const server = createServer((req, res) => {
    void handleProxyHttp(req, res, runtime)
  })
  const port = options.port ?? DEFAULT_PROXY_PORT
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const actual = address && typeof address === 'object' ? address.port : port
      runtime.port = actual
      resolve({ server, port: actual, runtime })
    })
  })
}

export function pidFile(dir: string): string {
  return join(dir, 'proxy.pid')
}

export function writePid(dir: string, pid = process.pid) {
  writeFileSync(pidFile(dir), String(pid))
}

export function readPid(dir: string): number | null {
  const path = pidFile(dir)
  if (!existsSync(path))
    return null
  const pid = Number(readFileSync(path, 'utf-8'))
  return Number.isFinite(pid) ? pid : null
}

export function clearPid(dir: string) {
  const path = pidFile(dir)
  if (existsSync(path))
    unlinkSync(path)
}
