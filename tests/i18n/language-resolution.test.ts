import { describe, expect, it } from 'vitest'
import { getCurrentLanguage, i18n, resolveSupportedLanguage } from '../../src/i18n'

describe('language resolution', () => {
  it('normalizes Chinese locale variants to zh-CN', () => {
    expect(resolveSupportedLanguage('zh-Hans')).toBe('zh-CN')
    expect(resolveSupportedLanguage('zh_CN')).toBe('zh-CN')
  })

  it('defaults non-Chinese locales to en', () => {
    expect(resolveSupportedLanguage('en-US')).toBe('en')
    expect(resolveSupportedLanguage('ja-JP')).toBe('en')
  })

  it('uses the active i18n language when no explicit language is provided', () => {
    i18n.language = 'zh-Hans'
    expect(resolveSupportedLanguage()).toBe('zh-CN')
    expect(getCurrentLanguage()).toBe('zh-CN')

    i18n.language = 'en-US'
    expect(resolveSupportedLanguage()).toBe('en')
    expect(getCurrentLanguage()).toBe('en')
  })
})
