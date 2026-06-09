import { describe, expect, it, vi } from 'vitest'
import { resolveCodeType } from '../../../src/utils/code-type-resolver'

const VALID_OPTIONS = 'cv, cc, cx, gk, clavue, claude-code, codex, grok'

vi.mock('../../../src/utils/ccjk-config', () => ({
  readCcjkConfigAsync: vi.fn().mockResolvedValue({
    codeToolType: 'codex',
  }),
}))

vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key, variables) => {
      if (key === 'errors:invalidCodeType') {
        const template = 'Invalid code type: "{value}". Valid options are: {validOptions}. Using default: {defaultValue}.'
        return template.replace(/\{(\w+)\}/g, (match: string, varName: string) => variables?.[varName] || match)
      }
      return key
    }),
  },
}))

describe('resolveCodeType', () => {
  it('should resolve cc abbreviation to claude-code', async () => {
    const result = await resolveCodeType('cc')
    expect(result).toBe('claude-code')
  })

  it('should resolve cx abbreviation to codex', async () => {
    const result = await resolveCodeType('cx')
    expect(result).toBe('codex')
  })

  it('should resolve cv abbreviation to clavue', async () => {
    const result = await resolveCodeType('cv')
    expect(result).toBe('clavue')
  })

  it('should resolve gk abbreviation to grok', async () => {
    const result = await resolveCodeType('gk')
    expect(result).toBe('grok')
  })

  it('should accept full code type names', async () => {
    expect(await resolveCodeType('claude-code')).toBe('claude-code')
    expect(await resolveCodeType('codex')).toBe('codex')
    expect(await resolveCodeType('clavue')).toBe('clavue')
    expect(await resolveCodeType('grok')).toBe('grok')
  })

  it('should be case insensitive', async () => {
    expect(await resolveCodeType('CC')).toBe('claude-code')
    expect(await resolveCodeType('CX')).toBe('codex')
    expect(await resolveCodeType('CV')).toBe('clavue')
  })

  it('should throw error for invalid code type', async () => {
    await expect(resolveCodeType('invalid')).rejects.toThrow(
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: codex.`,
    )
  })

  it('should return default when no parameter provided', async () => {
    const result = await resolveCodeType()
    expect(result).toBe('codex')
  })

  it('should use DEFAULT_CODE_TOOL_TYPE when config read fails in error path', async () => {
    const { readCcjkConfigAsync } = await import('../../../src/utils/ccjk-config')
    vi.mocked(readCcjkConfigAsync).mockRejectedValueOnce(new Error('Config read failed'))

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: clavue.`,
    )
  })

  it('should use config value as default when available in error path', async () => {
    const { readCcjkConfigAsync } = await import('../../../src/utils/ccjk-config')
    vi.mocked(readCcjkConfigAsync).mockResolvedValueOnce({
      codeToolType: 'codex',
    } as any)

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: codex.`,
    )
  })

  it('should handle invalid config value in error path', async () => {
    const { readCcjkConfigAsync } = await import('../../../src/utils/ccjk-config')
    vi.mocked(readCcjkConfigAsync).mockResolvedValueOnce({
      codeToolType: 'invalid-type',
    } as any)

    await expect(resolveCodeType('wrong')).rejects.toThrow(
      `Invalid code type: "wrong". Valid options are: ${VALID_OPTIONS}. Using default: clavue.`,
    )
  })
})