import type { Socket } from 'node:net'
import { connect as netConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'

/**
 * 访问上游。测试传入 fetchImpl，或没有 proxyUrl 时，直接用那个 fetch。
 * 否则用 HTTP CONNECT 隧道。不依赖 undici，也不支持 SOCKS。
 */
export async function fetchUpstream(
  url: string,
  init: RequestInit,
  proxyUrl?: string,
  fetchImpl?: typeof fetch,
): Promise<Response> {
  if (fetchImpl || !proxyUrl?.trim())
    return (fetchImpl ?? fetch)(url, init)
  return tunnel(url, init, proxyUrl.trim())
}

function headerRecord(headers: RequestInit['headers']): Record<string, string> {
  const out: Record<string, string> = {}
  if (!headers)
    return out
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers)
      out[key] = value
    return out
  }
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string')
      out[key] = value
    else if (Array.isArray(value))
      out[key] = value.join(', ')
  }
  return out
}

function tunnel(targetUrl: string, init: RequestInit, proxyUrl: string): Promise<Response> {
  const target = new URL(targetUrl)
  const proxy = new URL(proxyUrl)
  const httpsTarget = target.protocol === 'https:'
  const targetPort = Number(target.port || (httpsTarget ? 443 : 80))
  const proxyPort = Number(proxy.port || (proxy.protocol === 'https:' ? 443 : 80))
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host: proxy.hostname, port: proxyPort })
    let settled = false
    const fail = (error: Error) => {
      if (settled)
        return
      settled = true
      socket.destroy()
      reject(error)
    }
    const ok = (response: Response) => {
      if (settled)
        return
      settled = true
      resolve(response)
    }
    socket.setTimeout(20_000, () => fail(new Error('出站代理超时')))
    socket.once('error', fail)
    let auth = ''
    if (proxy.username) {
      const user = decodeURIComponent(proxy.username)
      const pass = decodeURIComponent(proxy.password)
      auth = `Proxy-Authorization: Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}\r\n`
    }
    const handshake = `CONNECT ${target.hostname}:${targetPort} HTTP/1.1\r\nHost: ${target.hostname}:${targetPort}\r\n${auth}\r\n`
    let buf = Buffer.alloc(0)
    const onHandshake = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])
      const split = buf.indexOf('\r\n\r\n')
      if (split < 0)
        return
      socket.off('data', onHandshake)
      const head = buf.subarray(0, split).toString('utf8')
      const status = Number(/^HTTP\/\d(?:\.\d)?\s+(\d+)/.exec(head)?.[1] ?? 0)
      if (status !== 200) {
        fail(new Error(`出站代理拒绝连接：${status || head.slice(0, 80)}`))
        return
      }
      const channel: Socket = httpsTarget
        ? tlsConnect({ socket, servername: target.hostname })
        : socket
      const send = () => writeHttp(channel, target, init, ok, fail)
      if (httpsTarget)
        channel.once('secureConnect', send)
      else
        send()
    }
    socket.on('data', onHandshake)
    socket.once('connect', () => {
      socket.write(handshake)
    })
  })
}

function writeHttp(
  socket: Socket,
  target: URL,
  init: RequestInit,
  ok: (response: Response) => void,
  fail: (error: Error) => void,
) {
  const headers = headerRecord(init.headers)
  const method = init.method || 'GET'
  const path = `${target.pathname || '/'}${target.search}`
  const body = typeof init.body === 'string' ? init.body : ''
  if (!headers.host && !headers.Host)
    headers.host = target.host
  headers.connection = 'close'
  if (body && !headers['content-length'] && !headers['Content-Length'])
    headers['content-length'] = String(Buffer.byteLength(body))
  let raw = `${method} ${path} HTTP/1.1\r\n`
  for (const [key, value] of Object.entries(headers))
    raw += `${key}: ${value}\r\n`
  raw += '\r\n'
  if (body)
    raw += body
  socket.write(raw)
  readHttp(socket, ok, fail)
}

function readHttp(socket: Socket, ok: (response: Response) => void, fail: (error: Error) => void) {
  let buf = Buffer.alloc(0)
  const finish = (status: number, headers: Headers, body: Buffer) => {
    socket.end()
    ok(new Response(body.toString('utf8'), { status, headers }))
  }
  const tryParse = (ended: boolean) => {
    const split = buf.indexOf('\r\n\r\n')
    if (split < 0)
      return
    const head = buf.subarray(0, split).toString('utf8')
    const lines = head.split('\r\n')
    const status = Number(/^HTTP\/\d(?:\.\d)?\s+(\d+)/.exec(lines[0] || '')?.[1] ?? 502)
    const headers = new Headers()
    let length: number | undefined
    let chunked = false
    for (const line of lines.slice(1)) {
      const colon = line.indexOf(':')
      if (colon <= 0)
        continue
      const key = line.slice(0, colon).trim()
      const value = line.slice(colon + 1).trim()
      headers.append(key, value)
      if (key.toLowerCase() === 'content-length')
        length = Number(value)
      if (key.toLowerCase() === 'transfer-encoding' && value.toLowerCase().includes('chunked'))
        chunked = true
    }
    const rest = buf.subarray(split + 4)
    if (chunked) {
      const decoded = decodeChunks(rest)
      if (decoded)
        finish(status, headers, decoded)
      else if (ended)
        finish(status, headers, rest)
      return
    }
    if (length !== undefined && rest.length >= length)
      finish(status, headers, rest.subarray(0, length))
    else if (ended)
      finish(status, headers, rest)
  }
  socket.on('data', (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk])
    tryParse(false)
  })
  socket.on('error', fail)
  socket.on('end', () => tryParse(true))
}

function decodeChunks(buffer: Buffer): Buffer | undefined {
  const parts: Buffer[] = []
  let offset = 0
  while (offset < buffer.length) {
    const lineEnd = buffer.indexOf('\r\n', offset)
    if (lineEnd < 0)
      return undefined
    const size = Number.parseInt(buffer.subarray(offset, lineEnd).toString('utf8'), 16)
    if (!Number.isFinite(size))
      return undefined
    if (size === 0)
      return Buffer.concat(parts)
    const start = lineEnd + 2
    const end = start + size
    if (buffer.length < end + 2)
      return undefined
    parts.push(buffer.subarray(start, end))
    offset = end + 2
  }
  return undefined
}
