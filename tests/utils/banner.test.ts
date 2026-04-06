import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '../../src/i18n'
import { displayCommandDiscovery } from '../../src/utils/banner'

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

  it('should only display shipped CCJK commands', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).not.toContain('/clear')
    expect(output).not.toContain('/reset')
    expect(output).toContain('/status')
    expect(output).toContain('/health')

    consoleSpy.mockRestore()
  })

  it('should display bilingual content for Chinese locale', async () => {
    await initI18n('zh-CN')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    displayCommandDiscovery()

    const output = consoleSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('CCJK')
    expect(output).toContain('ccjk 命令')
    expect(output).toContain('大脑仪表盘')
    expect(output).toContain('Brain Dashboard')
    expect(output).not.toContain('Claude Code')

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
