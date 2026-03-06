/**
 * Doctor Command JSON Output Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { doctor } from '../../src/commands/doctor'

describe('doctor --json', () => {
  let consoleLogSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  it('should output valid JSON', async () => {
    await doctor({ json: true })

    expect(consoleLogSpy).toHaveBeenCalled()
    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(parsed).toHaveProperty('timestamp')
    expect(parsed).toHaveProperty('summary')
    expect(parsed).toHaveProperty('checks')
  })

  it('should include summary statistics', async () => {
    await doctor({ json: true })

    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(parsed.summary).toHaveProperty('total')
    expect(parsed.summary).toHaveProperty('ok')
    expect(parsed.summary).toHaveProperty('warning')
    expect(parsed.summary).toHaveProperty('error')
    expect(typeof parsed.summary.total).toBe('number')
    expect(parsed.summary.total).toBeGreaterThan(0)
  })

  it('should include all check results', async () => {
    await doctor({ json: true })

    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(Array.isArray(parsed.checks)).toBe(true)
    expect(parsed.checks.length).toBeGreaterThan(0)

    parsed.checks.forEach((check: any) => {
      expect(check).toHaveProperty('name')
      expect(check).toHaveProperty('status')
      expect(check).toHaveProperty('message')
      expect(['ok', 'warning', 'error']).toContain(check.status)
    })
  })

  it('should include fix suggestions when available', async () => {
    await doctor({ json: true })

    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)

    // At least some checks should have fix suggestions
    const checksWithFix = parsed.checks.filter((c: any) => c.fix)
    // We can't guarantee there will be issues, but the structure should be correct
    checksWithFix.forEach((check: any) => {
      expect(typeof check.fix).toBe('string')
    })
  })

  it('should not output text formatting in JSON mode', async () => {
    await doctor({ json: true })

    const output = consoleLogSpy.mock.calls[0][0]

    // Should not contain ANSI color codes
    expect(output).not.toMatch(/\x1B\[/)
    // Should not contain emoji or box drawing characters in the JSON structure
    const parsed = JSON.parse(output)
    expect(JSON.stringify(parsed)).not.toMatch(/[\u2705\u274C\u26A0\uFE0F\u2500]/)
  })

  it('should have valid timestamp format', async () => {
    await doctor({ json: true })

    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(parsed.timestamp).toString()).not.toBe('Invalid Date')
  })
})
