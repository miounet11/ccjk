const PROTOCOL_CACHE_TTL_MS = 10 * 60 * 1000
const HEALTH_PATH = '/health'

const API_CANDIDATES = [
  'https://remote-api.claudehome.cn',
  'http://remote-api.claudehome.cn',
]

let protocolCache: {
  baseUrl: string
  expiresAt: number
} | null = null

export async function resolveRemoteApiBaseUrl(timeoutMs = 5000): Promise<string> {
  const now = Date.now()

  if (protocolCache && protocolCache.expiresAt > now) {
    return protocolCache.baseUrl
  }

  for (const baseUrl of API_CANDIDATES) {
    const ok = await probeHealth(baseUrl, timeoutMs)
    if (ok) {
      protocolCache = {
        baseUrl,
        expiresAt: now + PROTOCOL_CACHE_TTL_MS,
      }
      return baseUrl
    }
  }

  throw new Error('Remote API unavailable')
}

export function resolveRemoteApiSocketBaseUrl(baseUrl: string): string {
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace('https://', 'wss://')
  }
  if (baseUrl.startsWith('http://')) {
    return baseUrl.replace('http://', 'ws://')
  }
  return baseUrl
}

async function probeHealth(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}${HEALTH_PATH}`, {
      method: 'GET',
      signal: controller.signal,
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json().catch(() => null) as { status?: string } | null
    return data?.status === 'ok'
  }
  catch {
    return false
  }
  finally {
    clearTimeout(timeoutId)
  }
}
