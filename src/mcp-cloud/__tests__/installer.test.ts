/**
 * Installer Module Tests
 * Tests for OneClickInstaller, DependencyResolver, VersionManager, and RollbackManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InstallOptions, MCPService } from '../types'
import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// Mock child_process
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
  },
}))

const mockExec = exec as any
const mockFs = fs as any

// Helper to create promisified exec mock
function mockExecAsync(stdout = '', stderr = '') {
  return (_cmd: string, callback: (error: Error | null, result: { stdout: string, stderr: string }) => void) => {
    callback(null, { stdout, stderr })
  }
}

function mockExecAsyncError(errorMessage: string) {
  return (_cmd: string, callback: (error: Error | null, result: { stdout: string, stderr: string }) => void) => {
    callback(new Error(errorMessage), { stdout: '', stderr: '' })
  }
}

// Import after mocking
import { DependencyResolver } from '../installer/dependency-resolver'
import { OneClickInstaller } from '../installer/one-click-installer'
import { RollbackManager } from '../installer/rollback-manager'
import { VersionManager } from '../installer/version-manager'

// Mock service data
const mockService: MCPService = {
  id: 'filesystem',
  name: 'MCP Filesystem',
  package: '@modelcontextprotocol/server-filesystem',
  version: '1.0.0',
  description: 'File system operations for MCP',
  category: ['storage', 'utilities'],
  tags: ['file', 'storage', 'io'],
  author: 'Anthropic',
  homepage: 'https://github.com/modelcontextprotocol/servers',
  repository: 'https://github.com/modelcontextprotocol/servers',
  license: 'MIT',
  downloads: 50000,
  rating: 4.8,
  reviews: 120,
  trending: true,
  featured: true,
  verified: true,
  dependencies: [],
  compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
  installation: { command: 'npm install', config: { allowedPaths: ['/tmp'] } },
  examples: [],
  documentation: 'https://docs.example.com',
  lastUpdated: new Date().toISOString(),
}

const mockServiceWithDeps: MCPService = {
  ...mockService,
  id: 'postgres',
  name: 'MCP PostgreSQL',
  package: '@modelcontextprotocol/server-postgres',
  dependencies: ['pg@8.0.0', 'pg-pool'],
}

describe('oneClickInstaller', () => {
  let installer: OneClickInstaller

  beforeEach(() => {
    vi.clearAllMocks()
    installer = new OneClickInstaller()

    // Default mock implementations
    mockFs.existsSync.mockReturnValue(false)
    mockFs.promises.readFile.mockResolvedValue('{}')
    mockFs.promises.writeFile.mockResolvedValue(undefined)
    mockFs.promises.mkdir.mockResolvedValue(undefined)
    mockExec.mockImplementation(mockExecAsync())
  })

  describe('installService', () => {
    it('should install a service successfully', async () => {
      const result = await installer.installService(mockService)

      expect(result.success).toBe(true)
      expect(result.serviceId).toBe('filesystem')
      expect(result.version).toBe('1.0.0')
      expect(result.installedAt).toBeDefined()
    })

    it('should install with specific version', async () => {
      const options: InstallOptions = { version: '2.0.0' }
      const result = await installer.installService(mockService, options)

      expect(result.success).toBe(true)
      expect(result.version).toBe('2.0.0')
    })

    it('should install globally when specified', async () => {
      const options: InstallOptions = { global: true }
      await installer.installService(mockService, options)

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-g'),
        expect.any(Function),
      )
    })

    it('should handle installation failure', async () => {
      mockExec.mockImplementation(mockExecAsyncError('npm install failed'))

      const result = await installer.installService(mockService)

      expect(result.success).toBe(false)
      expect(result.error).toContain('npm install failed')
    })

    it('should skip dependencies when specified', async () => {
      const options: InstallOptions = { skipDependencies: true }
      await installer.installService(mockServiceWithDeps, options)

      // Should only call exec once for the main package
      expect(mockExec).toHaveBeenCalledTimes(1)
    })
  })

  describe('installBatch', () => {
    it('should install multiple services', async () => {
      const services = [mockService, { ...mockService, id: 'git', package: '@modelcontextprotocol/server-git' }]
      const result = await installer.installBatch(services)

      expect(result.success).toBe(true)
      expect(result.installed).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(result.totalTime).toBeGreaterThanOrEqual(0)
    })

    it('should track failed installations', async () => {
      mockExec
        .mockImplementationOnce(mockExecAsync())
        .mockImplementationOnce(mockExecAsyncError('failed'))

      const services = [mockService, { ...mockService, id: 'git', package: '@modelcontextprotocol/server-git' }]
      const result = await installer.installBatch(services)

      expect(result.success).toBe(false)
      expect(result.installed).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
    })
  })

  describe('isInstalled', () => {
    it('should check if service is installed', async () => {
      const isInstalled = await installer.isInstalled('filesystem')
      expect(typeof isInstalled).toBe('boolean')
    })
  })

  describe('verifyInstallation', () => {
    it('should verify installation', async () => {
      const verified = await installer.verifyInstallation('filesystem')
      expect(typeof verified).toBe('boolean')
    })
  })
})

describe('dependencyResolver', () => {
  let resolver: DependencyResolver

  beforeEach(() => {
    vi.clearAllMocks()
    resolver = new DependencyResolver()
    mockExec.mockImplementation(mockExecAsync())
  })

  describe('resolveDependencies', () => {
    it('should resolve dependencies', async () => {
      mockExec.mockImplementation(mockExecAsyncError('not found'))

      const deps = await resolver.resolveDependencies(['pg@8.0.0', 'pg-pool'])

      expect(deps).toHaveLength(2)
      expect(deps[0].name).toBe('pg')
      expect(deps[0].version).toBe('8.0.0')
      expect(deps[1].name).toBe('pg-pool')
      expect(deps[1].version).toBe('latest')
    })

    it('should detect uninstalled dependencies', async () => {
      mockExec.mockImplementation(mockExecAsyncError('not found'))

      const deps = await resolver.resolveDependencies(['pg@8.0.0'])

      expect(deps[0].installed).toBe(false)
    })
  })

  describe('hasCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const tree = new Map<string, string[]>()
      tree.set('a', ['b'])
      tree.set('b', ['c'])
      tree.set('c', ['a'])

      expect(resolver.hasCircularDependencies(tree)).toBe(true)
    })

    it('should return false for non-circular dependencies', () => {
      const tree = new Map<string, string[]>()
      tree.set('a', ['b'])
      tree.set('b', ['c'])
      tree.set('c', [])

      expect(resolver.hasCircularDependencies(tree)).toBe(false)
    })

    it('should handle empty tree', () => {
      const tree = new Map<string, string[]>()
      expect(resolver.hasCircularDependencies(tree)).toBe(false)
    })
  })

  describe('getInstallationOrder', () => {
    it('should return topological order', () => {
      const tree = new Map<string, string[]>()
      tree.set('a', ['b', 'c'])
      tree.set('b', ['c'])
      tree.set('c', [])

      const order = resolver.getInstallationOrder(tree)

      expect(order.indexOf('c')).toBeLessThan(order.indexOf('b'))
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'))
    })

    it('should handle independent packages', () => {
      const tree = new Map<string, string[]>()
      tree.set('a', [])
      tree.set('b', [])
      tree.set('c', [])

      const order = resolver.getInstallationOrder(tree)

      expect(order).toHaveLength(3)
    })
  })

  describe('checkCompatibility', () => {
    it('should check version compatibility', async () => {
      mockExec.mockImplementation(mockExecAsync('8.5.0'))

      const compatible = await resolver.checkCompatibility('pg', '8.0.0')

      expect(compatible).toBe(true)
    })

    it('should return false for incompatible versions', async () => {
      mockExec.mockImplementation(mockExecAsync('7.0.0'))

      const compatible = await resolver.checkCompatibility('pg', '8.0.0')

      expect(compatible).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockExec.mockImplementation(mockExecAsyncError('not found'))

      const compatible = await resolver.checkCompatibility('nonexistent', '1.0.0')

      expect(compatible).toBe(false)
    })
  })

  describe('resolveConflicts', () => {
    it('should detect version conflicts', async () => {
      const deps = [
        { name: 'pg', version: '8.0.0' },
        { name: 'pg', version: '7.0.0' },
        { name: 'lodash', version: '4.0.0' },
      ]

      const conflicts = await resolver.resolveConflicts(deps)

      expect(conflicts.find(c => c.name === 'pg')?.conflict).toBe(true)
      expect(conflicts.find(c => c.name === 'lodash')?.conflict).toBe(false)
    })

    it('should handle no conflicts', async () => {
      const deps = [
        { name: 'pg', version: '8.0.0' },
        { name: 'lodash', version: '4.0.0' },
      ]

      const conflicts = await resolver.resolveConflicts(deps)

      expect(conflicts.every(c => !c.conflict)).toBe(true)
    })
  })
})

describe('versionManager', () => {
  let manager: VersionManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new VersionManager()
    mockFs.existsSync.mockReturnValue(false)
    mockFs.promises.readFile.mockResolvedValue('[]')
    mockFs.promises.writeFile.mockResolvedValue(undefined)
    mockFs.promises.mkdir.mockResolvedValue(undefined)
    mockExec.mockImplementation(mockExecAsync())
  })

  describe('initialize', () => {
    it('should load existing records', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify([
        { serviceId: 'filesystem', version: '1.0.0', installedAt: new Date().toISOString() },
      ]))

      await manager.initialize()

      const version = await manager.getInstalledVersion('filesystem')
      expect(version).toBe('1.0.0')
    })

    it('should handle missing records file', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await manager.initialize()

      const services = await manager.getInstalledServices()
      expect(services).toEqual([])
    })

    it('should handle corrupted records file', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.promises.readFile.mockResolvedValue('invalid json')

      await manager.initialize()

      const services = await manager.getInstalledServices()
      expect(services).toEqual([])
    })
  })

  describe('registerInstallation', () => {
    it('should register new installation', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')

      const version = await manager.getInstalledVersion('filesystem')
      expect(version).toBe('1.0.0')
    })

    it('should save records to disk', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')

      expect(mockFs.promises.writeFile).toHaveBeenCalled()
    })

    it('should include config path if provided', async () => {
      await manager.registerInstallation('filesystem', '1.0.0', '/path/to/config')

      const record = manager.getInstallationRecord('filesystem')
      expect(record?.configPath).toBe('/path/to/config')
    })
  })

  describe('unregisterInstallation', () => {
    it('should remove installation record', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')
      await manager.unregisterInstallation('filesystem')

      const version = await manager.getInstalledVersion('filesystem')
      expect(version).toBeNull()
    })
  })

  describe('getInstalledVersion', () => {
    it('should return version for installed service', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')

      const version = await manager.getInstalledVersion('filesystem')
      expect(version).toBe('1.0.0')
    })

    it('should return null for uninstalled service', async () => {
      const version = await manager.getInstalledVersion('nonexistent')
      expect(version).toBeNull()
    })
  })

  describe('getInstalledServices', () => {
    it('should return all installed service IDs', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')
      await manager.registerInstallation('git', '2.0.0')

      const services = await manager.getInstalledServices()
      expect(services).toContain('filesystem')
      expect(services).toContain('git')
    })
  })

  describe('isInstalled', () => {
    it('should return true for installed service', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')

      expect(manager.isInstalled('filesystem')).toBe(true)
    })

    it('should return false for uninstalled service', () => {
      expect(manager.isInstalled('nonexistent')).toBe(false)
    })
  })

  describe('getAvailableVersions', () => {
    it('should fetch available versions from npm', async () => {
      mockExec.mockImplementation(mockExecAsync('["1.0.0", "1.1.0", "2.0.0"]'))

      const versions = await manager.getAvailableVersions('@modelcontextprotocol/server-filesystem')

      expect(versions).toContain('1.0.0')
      expect(versions).toContain('2.0.0')
    })

    it('should handle single version response', async () => {
      mockExec.mockImplementation(mockExecAsync('"1.0.0"'))

      const versions = await manager.getAvailableVersions('@modelcontextprotocol/server-filesystem')

      expect(versions).toEqual(['1.0.0'])
    })

    it('should return empty array on error', async () => {
      mockExec.mockImplementation(mockExecAsyncError('not found'))

      const versions = await manager.getAvailableVersions('nonexistent')

      expect(versions).toEqual([])
    })
  })

  describe('getLatestVersion', () => {
    it('should fetch latest version from npm', async () => {
      mockExec.mockImplementation(mockExecAsync('2.0.0\n'))

      const version = await manager.getLatestVersion('@modelcontextprotocol/server-filesystem')

      expect(version).toBe('2.0.0')
    })

    it('should return null on error', async () => {
      mockExec.mockImplementation(mockExecAsyncError('not found'))

      const version = await manager.getLatestVersion('nonexistent')

      expect(version).toBeNull()
    })
  })

  describe('compareVersions', () => {
    it('should compare equal versions', () => {
      expect(manager.compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('should compare greater version', () => {
      expect(manager.compareVersions('2.0.0', '1.0.0')).toBe(1)
    })

    it('should compare lesser version', () => {
      expect(manager.compareVersions('1.0.0', '2.0.0')).toBe(-1)
    })

    it('should compare minor versions', () => {
      expect(manager.compareVersions('1.2.0', '1.1.0')).toBe(1)
    })

    it('should compare patch versions', () => {
      expect(manager.compareVersions('1.0.2', '1.0.1')).toBe(1)
    })

    it('should handle different version lengths', () => {
      expect(manager.compareVersions('1.0', '1.0.0')).toBe(0)
      expect(manager.compareVersions('1.0.1', '1.0')).toBe(1)
    })
  })

  describe('hasUpdate', () => {
    it('should detect available update', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')
      mockExec.mockImplementation(mockExecAsync('2.0.0\n'))

      const hasUpdate = await manager.hasUpdate('filesystem', '@modelcontextprotocol/server-filesystem')

      expect(hasUpdate).toBe(true)
    })

    it('should return false when up to date', async () => {
      await manager.registerInstallation('filesystem', '2.0.0')
      mockExec.mockImplementation(mockExecAsync('2.0.0\n'))

      const hasUpdate = await manager.hasUpdate('filesystem', '@modelcontextprotocol/server-filesystem')

      expect(hasUpdate).toBe(false)
    })

    it('should return false for uninstalled service', async () => {
      const hasUpdate = await manager.hasUpdate('nonexistent', 'nonexistent')

      expect(hasUpdate).toBe(false)
    })
  })

  describe('getUpdateInfo', () => {
    it('should return update information', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')
      mockExec.mockImplementation(mockExecAsync('2.0.0\n'))

      const info = await manager.getUpdateInfo('filesystem', '@modelcontextprotocol/server-filesystem')

      expect(info.hasUpdate).toBe(true)
      expect(info.currentVersion).toBe('1.0.0')
      expect(info.latestVersion).toBe('2.0.0')
    })
  })

  describe('getStatistics', () => {
    it('should return installation statistics', async () => {
      await manager.registerInstallation('filesystem', '1.0.0')
      await manager.registerInstallation('git', '2.0.0')

      const stats = manager.getStatistics()

      expect(stats.totalInstalled).toBe(2)
      expect(stats.oldestInstallation).toBeDefined()
      expect(stats.newestInstallation).toBeDefined()
    })

    it('should handle empty installations', () => {
      const stats = manager.getStatistics()

      expect(stats.totalInstalled).toBe(0)
      expect(stats.oldestInstallation).toBeNull()
      expect(stats.newestInstallation).toBeNull()
    })
  })
})

describe('rollbackManager', () => {
  let manager: RollbackManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new RollbackManager()
    mockFs.existsSync.mockReturnValue(false)
    mockFs.promises.readFile.mockResolvedValue('{}')
    mockFs.promises.writeFile.mockResolvedValue(undefined)
    mockFs.promises.mkdir.mockResolvedValue(undefined)
    mockFs.promises.copyFile.mockResolvedValue(undefined)
    mockFs.promises.unlink.mockResolvedValue(undefined)
    mockExec.mockImplementation(mockExecAsync())
  })

  describe('initialize', () => {
    it('should load existing rollback points', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({
        filesystem: [{ serviceId: 'filesystem', version: '1.0.0', timestamp: new Date().toISOString() }],
      }))

      await manager.initialize()

      expect(manager.hasRollbackPoint('filesystem')).toBe(true)
    })

    it('should handle missing rollback file', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await manager.initialize()

      expect(manager.hasRollbackPoint('filesystem')).toBe(false)
    })
  })

  describe('createRollbackPoint', () => {
    it('should create rollback point', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')

      expect(manager.hasRollbackPoint('filesystem')).toBe(true)
    })

    it('should backup config file if exists', async () => {
      mockFs.existsSync.mockReturnValue(true)

      await manager.createRollbackPoint('filesystem', '1.0.0', '/path/to/config.json')

      expect(mockFs.promises.copyFile).toHaveBeenCalled()
    })

    it('should save rollback points to disk', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')

      expect(mockFs.promises.writeFile).toHaveBeenCalled()
    })

    it('should support multiple rollback points per service', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      await manager.createRollbackPoint('filesystem', '1.1.0')

      const points = manager.getRollbackPoints('filesystem')
      expect(points).toHaveLength(2)
    })
  })

  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')

      const result = await manager.rollback('filesystem')

      expect(result.success).toBe(true)
      expect(result.toVersion).toBe('1.0.0')
    })

    it('should fail if no rollback point exists', async () => {
      const result = await manager.rollback('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No rollback point available')
    })

    it('should handle rollback failure', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      mockExec.mockImplementation(mockExecAsyncError('uninstall failed'))

      const result = await manager.rollback('filesystem')

      expect(result.success).toBe(false)
      expect(result.error).toContain('uninstall failed')
    })

    it('should remove rollback point after successful rollback', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      await manager.createRollbackPoint('filesystem', '1.1.0')

      await manager.rollback('filesystem')

      const points = manager.getRollbackPoints('filesystem')
      expect(points).toHaveLength(1)
    })
  })

  describe('hasRollbackPoint', () => {
    it('should return true if rollback point exists', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')

      expect(manager.hasRollbackPoint('filesystem')).toBe(true)
    })

    it('should return false if no rollback point exists', () => {
      expect(manager.hasRollbackPoint('nonexistent')).toBe(false)
    })
  })

  describe('getRollbackPoints', () => {
    it('should return all rollback points for service', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      await manager.createRollbackPoint('filesystem', '1.1.0')

      const points = manager.getRollbackPoints('filesystem')

      expect(points).toHaveLength(2)
      expect(points[0].version).toBe('1.0.0')
      expect(points[1].version).toBe('1.1.0')
    })

    it('should return empty array for unknown service', () => {
      const points = manager.getRollbackPoints('nonexistent')

      expect(points).toEqual([])
    })
  })

  describe('clearRollbackPoints', () => {
    it('should clear rollback points for service', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      await manager.clearRollbackPoints('filesystem')

      expect(manager.hasRollbackPoint('filesystem')).toBe(false)
    })

    it('should delete backup files', async () => {
      mockFs.existsSync.mockReturnValue(true)
      await manager.createRollbackPoint('filesystem', '1.0.0', '/path/to/config.json')

      await manager.clearRollbackPoints('filesystem')

      expect(mockFs.promises.unlink).toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('should clear all rollback points', async () => {
      await manager.createRollbackPoint('filesystem', '1.0.0')
      await manager.createRollbackPoint('git', '2.0.0')

      await manager.clearAll()

      expect(manager.hasRollbackPoint('filesystem')).toBe(false)
      expect(manager.hasRollbackPoint('git')).toBe(false)
    })
  })
})
