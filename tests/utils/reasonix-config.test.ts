import { describe, expect, it } from 'vitest'
import {
  buildReasonixHints,
  buildReasonixTomlFromProfile,
  getReasonixQuickStatus,
  isReasonixInstalled,
  mapProfileToReasonixEnv,
  suggestReasonixLaunch,
} from '../../src/utils/reasonix-config'

// re-export private helper via public API
function inferMapping(profile: Parameters<typeof mapProfileToReasonixEnv>[0]) {
  const env = mapProfileToReasonixEnv(profile)
  const key = Object.keys(env)[0]
  return { envKey: key, envValue: env[key] }
}

describe('reasonix-config', () => {
  it('isReasonixInstalled 返回布尔且不抛异常', () => {
    expect(typeof isReasonixInstalled()).toBe('boolean')
  })

  it('getReasonixQuickStatus 返回结构化字段', () => {
    const s = getReasonixQuickStatus()
    expect(s).toHaveProperty('installed')
    expect(s).toHaveProperty('hasConfig')
    expect(s).toHaveProperty('hint')
    expect(typeof s.installed).toBe('boolean')
    expect(typeof s.hasConfig).toBe('boolean')
  })

  it('buildReasonixHints 永远返回非空指引且包含 reasonix 命令', () => {
    const text = buildReasonixHints().join('\n')
    expect(text.length).toBeGreaterThan(0)
    expect(text).toContain('reasonix')
    expect(text).not.toContain('--api-key')
  })

  it('suggestReasonixLaunch 默认 chat，带 prompt 时走 run', () => {
    expect(suggestReasonixLaunch()).toBe('reasonix chat')
    expect(suggestReasonixLaunch({ model: 'deepseek-v4-flash' })).toBe('reasonix run --model deepseek-v4-flash')
    expect(suggestReasonixLaunch({ prompt: 'fix tests' })).toContain('reasonix run')
    expect(suggestReasonixLaunch({ prompt: 'fix tests' })).toContain('fix tests')
  })

  it('mapProfileToReasonixEnv：DeepSeek profile 注入 DEEPSEEK_API_KEY', () => {
    const env = mapProfileToReasonixEnv({
      baseUrl: 'https://api.deepseek.com/anthropic',
      apiKey: 'sk-test',
      model: 'deepseek-chat',
    })
    expect(env.DEEPSEEK_API_KEY).toBe('sk-test')
    expect(env.MIMO_API_KEY).toBeUndefined()
  })

  it('buildReasonixTomlFromProfile 不写明文 key，含 api_key_env', () => {
    const toml = buildReasonixTomlFromProfile({
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-secret',
      model: 'deepseek-reasoner',
    })
    expect(toml).toContain('api_key_env = "DEEPSEEK_API_KEY"')
    expect(toml).not.toContain('sk-secret')
    expect(toml).toContain('deepseek-v4-pro')
    expect(toml).toContain('default_model = "deepseek"')
  })

  it('MiMo baseUrl 映射 MIMO_API_KEY', () => {
    const mapped = inferMapping({
      baseUrl: 'https://api.xiaomimimo.com/v1',
      apiKey: 'mimo-key',
    })
    expect(mapped.envKey).toBe('MIMO_API_KEY')
    expect(mapped.envValue).toBe('mimo-key')
  })
})