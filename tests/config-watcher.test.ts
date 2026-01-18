/**
 * Configuration Watcher Tests
 *
 * Tests for the configuration file watching and hot-reload functionality.
 */

import type { ConfigChangeEvent } from '../src/config-watcher'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigWatcher } from '../src/config-watcher'

describe('configWatcher', () => {
  let testDir: string
  let configFile: string
  let watcher: ConfigWatcher

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    configFile = join(testDir, 'config.json')

    // Create initial config file
    writeFileSync(configFile, JSON.stringify({ test: 'initial' }))

    // Create watcher instance
    watcher = new ConfigWatcher({
      debounceMs: 100,
      ignoreInitial: true,
    })
  })

  afterEach(async () => {
    // Stop watcher
    await watcher.stopWatching()

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  it('should create a ConfigWatcher instance', () => {
    expect(watcher).toBeInstanceOf(ConfigWatcher)
  })

  it('should watch a configuration file', () => {
    expect(() => watcher.watch(configFile)).not.toThrow()
    expect(watcher.isWatching(configFile)).toBe(true)
  })

  it('should detect file changes', async () => {
    const changePromise = new Promise<ConfigChangeEvent>((resolve) => {
      watcher.once('config-changed', resolve)
    })

    watcher.watch(configFile)

    // Wait for watcher to be ready
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    // Modify the file
    writeFileSync(configFile, JSON.stringify({ test: 'modified' }))

    // Wait for change event
    const event = await changePromise

    expect(event.type).toBe('changed')
    expect(event.filePath).toBe(configFile)
    expect(event.content).toEqual({ test: 'modified' })
  }, 10000)

  it('should debounce rapid changes', async () => {
    const changes: ConfigChangeEvent[] = []

    watcher.on('config-changed', (event) => {
      changes.push(event)
    })

    watcher.watch(configFile)
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    // Make multiple rapid changes
    writeFileSync(configFile, JSON.stringify({ test: 'change1' }))
    writeFileSync(configFile, JSON.stringify({ test: 'change2' }))
    writeFileSync(configFile, JSON.stringify({ test: 'change3' }))

    // Wait for debounce to settle (debounce is 100ms + awaitWriteFinish 100ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Should only receive one event due to debouncing
    expect(changes.length).toBe(1)
    expect(changes[0].content).toEqual({ test: 'change3' })
  }, 10000)

  it('should handle file removal', async () => {
    const removePromise = new Promise<ConfigChangeEvent>((resolve) => {
      watcher.once('config-removed', resolve)
    })

    watcher.watch(configFile)
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    // Remove the file
    rmSync(configFile)

    // Wait for removal event
    const event = await removePromise

    expect(event.type).toBe('removed')
    expect(event.filePath).toBe(configFile)
    expect(event.content).toBeUndefined()
  }, 10000)

  it('should support custom parser', async () => {
    const customParser = vi.fn(async () => ({ custom: 'parsed' }))

    const customWatcher = new ConfigWatcher({
      parser: customParser,
      debounceMs: 100,
      ignoreInitial: true,
    })

    const changePromise = new Promise<ConfigChangeEvent>((resolve) => {
      customWatcher.once('config-changed', resolve)
    })

    customWatcher.watch(configFile)
    await new Promise(resolve => customWatcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    writeFileSync(configFile, JSON.stringify({ test: 'data' }))

    const event = await changePromise

    expect(customParser).toHaveBeenCalledWith(configFile)
    expect(event.content).toEqual({ custom: 'parsed' })

    await customWatcher.stopWatching()
  }, 10000)

  it('should handle multiple files', async () => {
    const configFile2 = join(testDir, 'config2.json')
    writeFileSync(configFile2, JSON.stringify({ test: 'file2' }))

    const changes: ConfigChangeEvent[] = []

    watcher.on('config-changed', (event) => {
      changes.push(event)
    })

    watcher.watch([configFile, configFile2])
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    // Modify both files
    writeFileSync(configFile, JSON.stringify({ test: 'modified1' }))
    writeFileSync(configFile2, JSON.stringify({ test: 'modified2' }))

    // Wait for changes (debounce + awaitWriteFinish + buffer)
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(changes.length).toBe(2)
    expect(changes.some(c => c.filePath === configFile)).toBe(true)
    expect(changes.some(c => c.filePath === configFile2)).toBe(true)
  }, 10000)

  it('should support onConfigChange callback', async () => {
    const callback = vi.fn()
    const unsubscribe = watcher.onConfigChange(callback)

    watcher.watch(configFile)
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    writeFileSync(configFile, JSON.stringify({ test: 'callback' }))

    await new Promise(resolve => setTimeout(resolve, 500))

    expect(callback).toHaveBeenCalled()

    // Unsubscribe and verify no more calls
    unsubscribe()
    callback.mockClear()

    writeFileSync(configFile, JSON.stringify({ test: 'after-unsubscribe' }))
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(callback).not.toHaveBeenCalled()
  }, 10000)

  it('should emit error on invalid JSON', async () => {
    const errorPromise = new Promise<Error>((resolve) => {
      watcher.once('error', resolve)
    })

    watcher.watch(configFile)
    await new Promise(resolve => watcher.once('ready', resolve))

    // Wait a bit for watcher to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))

    // Write invalid JSON
    writeFileSync(configFile, 'invalid json {')

    const error = await errorPromise

    expect(error).toBeInstanceOf(Error)
  }, 10000)

  it('should return watched paths', () => {
    watcher.watch(configFile)

    const paths = watcher.getWatchedPaths()

    expect(paths).toContain(configFile)
    expect(paths.length).toBe(1)
  })

  it('should stop watching cleanly', async () => {
    watcher.watch(configFile)
    await new Promise(resolve => watcher.once('ready', resolve))

    await watcher.stopWatching()

    expect(watcher.isWatching(configFile)).toBe(false)
    expect(watcher.getWatchedPaths().length).toBe(0)
  })
})
