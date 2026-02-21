import { beforeEach, describe, expect, it, vi } from 'vitest'
import { displayCommandDiscovery } from '../../src/utils/banner'
import { i18n, initI18n } from '../../src/i18n'

describe('displayCommandDiscovery', () => {
  beforeEach(async () => {
    // Initialize i18n before each test
    await initI18n('en')
  })

  it('should display command discovery banner without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    expect(consoleSpy).toHaveBeenCalled()
    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('CCJK')
    expect(output).toContain('Commands')

    consoleSpy.mockRestore()
  })

  it('should display CCJK commands section', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('/status')
    expect(output).toContain('/health')
    expect(output).toContain('/search')
    expect(output).toContain('/compress')
    expect(output).toContain('/tasks')
    expect(output).toContain('/backup')
    expect(output).toContain('/optimize')

    consoleSpy.mockRestore()
  })

  it('should display Claude Code commands section', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('/help')
    expect(output).toContain('/clear')
    expect(output).toContain('/reset')

    consoleSpy.mockRestore()
  })

  it('should display bilingual content for Chinese locale', async () => {
    await initI18n('zh-CN')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('CCJK')
    expect(output).toContain('Claude Code')
    expect(output).toContain('大脑仪表盘')
    expect(output).toContain('Brain Dashboard')

    consoleSpy.mockRestore()
  })

  it('should display footer with help command', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('ccjk --help')

    consoleSpy.mockRestore()
  })
})
