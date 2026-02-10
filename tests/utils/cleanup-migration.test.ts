import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanupZcfNamespace } from '../../src/utils/cleanup-migration'

describe('cleanupZcfNamespace', () => {
  const claudeDir = join(homedir(), '.claude')
  const commandsZcfDir = join(claudeDir, 'commands', 'zcf')
  const agentsZcfDir = join(claudeDir, 'agents', 'zcf')

  beforeEach(() => {
    // Ensure clean state before each test
    for (const dir of [commandsZcfDir, agentsZcfDir]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
      }
    }
  })

  afterEach(() => {
    // Clean up after each test
    for (const dir of [commandsZcfDir, agentsZcfDir]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
      }
    }
  })

  it('should return empty removed array when no zcf directories exist', () => {
    const result = cleanupZcfNamespace()
    expect(result).toEqual({ removed: [] })
  })

  it('should remove commands/zcf directory when it exists', () => {
    mkdirSync(commandsZcfDir, { recursive: true })
    writeFileSync(join(commandsZcfDir, 'test-command.md'), '# test command')

    expect(existsSync(commandsZcfDir)).toBe(true)

    const result = cleanupZcfNamespace()

    expect(existsSync(commandsZcfDir)).toBe(false)
    expect(result.removed).toContain(commandsZcfDir)
  })

  it('should remove agents/zcf directory when it exists', () => {
    mkdirSync(agentsZcfDir, { recursive: true })
    writeFileSync(join(agentsZcfDir, 'test-agent.md'), '# test agent')

    expect(existsSync(agentsZcfDir)).toBe(true)

    const result = cleanupZcfNamespace()

    expect(existsSync(agentsZcfDir)).toBe(false)
    expect(result.removed).toContain(agentsZcfDir)
  })

  it('should remove both directories when both exist', () => {
    mkdirSync(commandsZcfDir, { recursive: true })
    mkdirSync(agentsZcfDir, { recursive: true })
    writeFileSync(join(commandsZcfDir, 'cmd.md'), '# cmd')
    writeFileSync(join(agentsZcfDir, 'agent.md'), '# agent')

    const result = cleanupZcfNamespace()

    expect(existsSync(commandsZcfDir)).toBe(false)
    expect(existsSync(agentsZcfDir)).toBe(false)
    expect(result.removed).toHaveLength(2)
    expect(result.removed).toContain(commandsZcfDir)
    expect(result.removed).toContain(agentsZcfDir)
  })

  it('should recursively remove nested files and subdirectories', () => {
    const nestedDir = join(commandsZcfDir, 'subdir')
    mkdirSync(nestedDir, { recursive: true })
    writeFileSync(join(commandsZcfDir, 'top-level.md'), '# top')
    writeFileSync(join(nestedDir, 'nested-file.md'), '# nested')

    const result = cleanupZcfNamespace()

    expect(existsSync(commandsZcfDir)).toBe(false)
    expect(result.removed).toContain(commandsZcfDir)
  })

  it('should only remove zcf directories and not affect other directories', () => {
    // Create a sibling directory that should NOT be removed
    const ccjkCommandsDir = join(claudeDir, 'commands', 'ccjk')
    mkdirSync(ccjkCommandsDir, { recursive: true })
    writeFileSync(join(ccjkCommandsDir, 'keep.md'), '# keep this')

    // Create the zcf directory that SHOULD be removed
    mkdirSync(commandsZcfDir, { recursive: true })
    writeFileSync(join(commandsZcfDir, 'remove.md'), '# remove this')

    cleanupZcfNamespace()

    expect(existsSync(commandsZcfDir)).toBe(false)
    expect(existsSync(ccjkCommandsDir)).toBe(true)
    expect(existsSync(join(ccjkCommandsDir, 'keep.md'))).toBe(true)

    // Clean up the ccjk dir we created for this test
    rmSync(ccjkCommandsDir, { recursive: true, force: true })
  })

  it('should be idempotent - calling multiple times produces same result', () => {
    mkdirSync(commandsZcfDir, { recursive: true })

    const result1 = cleanupZcfNamespace()
    expect(result1.removed).toHaveLength(1)

    const result2 = cleanupZcfNamespace()
    expect(result2.removed).toHaveLength(0)
  })
})
