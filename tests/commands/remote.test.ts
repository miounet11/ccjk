import { beforeEach, describe, expect, it, vi } from 'vitest'

const daemonConfigPath = '/tmp/ccjk-test-home/.ccjk/daemon.json'
const fileStore = new Map<string, string>()

const cloudState = {
  bound: false,
  bindSuccess: true,
}

vi.mock('os', () => ({
  homedir: () => '/tmp/ccjk-test-home',
}))

vi.mock('fs', () => ({
  existsSync: (path: string) => fileStore.has(path),
  mkdirSync: vi.fn(),
  readFileSync: (path: string) => {
    const data = fileStore.get(path)
    if (!data)
      throw new Error(`File not found: ${path}`)
    return data
  },
  writeFileSync: (path: string, content: string) => {
    fileStore.set(path, content)
  },
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => ({
      serverUrl: 'https://remote.example.com',
      authToken: 'token-from-prompt',
      bindingCode: 'BIND1234',
    })),
  },
}))

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
  })),
}))

vi.mock('../../src/services/cloud-notification', () => ({
  isDeviceBound: () => cloudState.bound,
  bindDevice: vi.fn(async () => {
    if (!cloudState.bindSuccess) {
      return { success: false, error: 'bind failed' }
    }
    cloudState.bound = true
    return { success: true, deviceId: 'dev-1' }
  }),
  getBindingStatus: vi.fn(async () => ({ bound: cloudState.bound })),
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    t: (key: string) => key,
  },
}))

describe('remote command json contracts', () => {
  function getLastJsonLog(): any {
    const lines = (console.log as any).mock.calls.map((c: any[]) => c[0]) as string[]
    const jsonLine = [...lines].reverse().find(line => typeof line === 'string' && line.trim().startsWith('{'))
    if (!jsonLine) {
      throw new Error('No JSON output found in console logs')
    }
    return JSON.parse(jsonLine)
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fileStore.clear()
    cloudState.bound = false
    cloudState.bindSuccess = true
    process.exitCode = undefined

    vi.spyOn(console, 'log').mockImplementation(() => {})

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const value = typeof url === 'string' ? url : String(url)
      if (value.includes('/health')) {
        return { ok: true }
      }
      return { ok: true }
    }))
  })

  it('setupRemote returns json failure in non-interactive mode when required args are missing', async () => {
    const { setupRemote } = await import('../../src/commands/remote')

    await setupRemote({
      nonInteractive: true,
      json: true,
    })

    const parsed = getLastJsonLog()

    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('remote:setup.failed_enable')
    expect(process.exitCode).toBe(1)
  })

  it('setupRemote returns json success with required non-interactive inputs', async () => {
    const { setupRemote } = await import('../../src/commands/remote')

    await setupRemote({
      nonInteractive: true,
      json: true,
      serverUrl: 'https://remote.example.com',
      authToken: 'token-123',
      bindingCode: 'BIND1234',
    })

    const parsed = getLastJsonLog()

    expect(parsed.success).toBe(true)
    expect(parsed.daemonRunning).toBe(true)
    expect(parsed.bound).toBe(true)
    expect(parsed.serverUrl).toBe('https://remote.example.com')
    expect(parsed.machineId).toMatch(/^machine-/)
    expect(process.exitCode).toBeUndefined()

    const persistedConfig = JSON.parse(fileStore.get(daemonConfigPath) || '{}')
    expect(persistedConfig.serverUrl).toBe('https://remote.example.com')
    expect(persistedConfig.authToken).toBe('token-123')
    expect(persistedConfig.enabled).toBe(true)
  })

  it('setupRemote returns json failure when non-interactive server URL is invalid', async () => {
    const { setupRemote } = await import('../../src/commands/remote')

    await setupRemote({
      nonInteractive: true,
      json: true,
      serverUrl: 'not-a-url',
      authToken: 'token-123',
      bindingCode: 'BIND1234',
    })

    const parsed = getLastJsonLog()

    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('remote:setup.failed_enable')
    expect(process.exitCode).toBe(1)
    expect(fileStore.has(daemonConfigPath)).toBe(false)
  })

  it('doctorRemote returns json diagnostics and failure exit code when checks fail', async () => {
    const { doctorRemote } = await import('../../src/commands/remote')

    await doctorRemote({ json: true })

    const parsed = getLastJsonLog()

    expect(parsed.success).toBe(false)
    expect(Array.isArray(parsed.checks)).toBe(true)
    expect(parsed.checks.length).toBeGreaterThan(0)
    expect(process.exitCode).toBe(1)
  })
})
