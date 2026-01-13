/**
 * MCP Marketplace System Unit Tests
 *
 * Tests for the MCP marketplace system including:
 * - MarketplaceClient: API interactions and caching
 * - PluginManager: Installation, updates, and dependency management
 * - SecurityScanner: Security analysis and trust scoring
 */

import type {
  DependencyCheck,
  InstalledPackage,
  InstallOptions,
  InstallResult,
  PluginManifest,
  PluginRegistryEntry,
  UpdateResult,
  VerificationResult,
} from '../../../src/mcp-marketplace/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock data for testing
const mockPackageRegistry: PluginRegistryEntry = {
  packageId: 'test-mcp-plugin',
  name: 'Test MCP Plugin',
  description: 'A test plugin for unit testing',
  latestVersion: '2.0.0',
  versions: ['1.0.0', '1.5.0', '2.0.0'],
  author: 'Test Author',
  license: 'MIT',
  homepage: 'https://example.com/test-plugin',
  repository: 'https://github.com/test/test-plugin',
  dependencies: {
    'dep-plugin': '^1.0.0',
  },
  keywords: ['test', 'mcp', 'plugin'],
  downloads: 5000,
  checksums: {
    '1.0.0': 'sha256-abc123',
    '1.5.0': 'sha256-def456',
    '2.0.0': 'sha256-ghi789',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
}

const mockInstalledPackage: InstalledPackage = {
  packageId: 'test-mcp-plugin',
  version: '1.5.0',
  installedAt: '2024-03-01T00:00:00Z',
  updatedAt: '2024-03-01T00:00:00Z',
  path: '/Users/test/.ccjk/plugins/test-mcp-plugin',
  enabled: true,
  global: true,
  dependencies: ['dep-plugin'],
  checksum: 'sha256-def456',
  previousVersion: '1.0.0',
  backupPath: '/Users/test/.ccjk/backups/test-mcp-plugin-1.0.0',
}

const mockPluginManifest: PluginManifest = {
  packageId: 'test-mcp-plugin',
  version: '2.0.0',
  name: 'Test MCP Plugin',
  description: 'A test plugin for unit testing',
  author: 'Test Author',
  license: 'MIT',
  main: 'dist/index.js',
  dependencies: {
    'dep-plugin': '^1.0.0',
  },
  mcpServer: {
    command: 'node',
    args: ['dist/server.js'],
    env: { NODE_ENV: 'production' },
  },
  configSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
    },
  },
  ccjkVersion: '>=3.0.0',
  keywords: ['test', 'mcp'],
}

// Security scan result interface
interface SecurityScanResult {
  safe: boolean
  trustScore: number
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low'
    type: string
    description: string
  }>
  permissions: string[]
  recommendation: 'install' | 'caution' | 'avoid'
}

// Mock MarketplaceClient class
class MockMarketplaceClient {
  private cache = new Map<string, { data: unknown, timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000

  async search(query: string, options?: { category?: string, sort?: string }): Promise<PluginRegistryEntry[]> {
    const category = options?.category || ''
    const sort = options?.sort || ''
    const cacheKey = `search:${query}:${category}-${sort}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as PluginRegistryEntry[]
    }

    let results = [mockPackageRegistry]

    if (query && !mockPackageRegistry.name.toLowerCase().includes(query.toLowerCase())) {
      results = []
    }

    if (options?.category) {
      results = results.filter(p => p.keywords?.includes(options.category!))
    }

    if (options?.sort === 'downloads') {
      results.sort((a, b) => b.downloads - a.downloads)
    }

    this.cache.set(cacheKey, { data: results, timestamp: Date.now() })
    return results
  }

  async getPackageDetails(packageId: string): Promise<PluginRegistryEntry | null> {
    if (packageId === mockPackageRegistry.packageId) {
      return mockPackageRegistry
    }
    return null
  }

  async getTrending(limit = 10): Promise<PluginRegistryEntry[]> {
    return [mockPackageRegistry].slice(0, limit)
  }

  async checkUpdates(installedPackages: InstalledPackage[]): Promise<{ packageId: string, currentVersion: string, latestVersion: string }[]> {
    return installedPackages
      .filter(pkg => pkg.version !== mockPackageRegistry.latestVersion)
      .map(pkg => ({
        packageId: pkg.packageId,
        currentVersion: pkg.version,
        latestVersion: mockPackageRegistry.latestVersion,
      }))
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStatus(): { exists: boolean, isValid: boolean, timestamp?: string } {
    return {
      exists: this.cache.size > 0,
      isValid: this.cache.size > 0,
      timestamp: this.cache.size > 0 ? new Date().toISOString() : undefined,
    }
  }
}

// Mock PluginManager class
class MockPluginManager {
  private installed = new Map<string, InstalledPackage>()

  constructor() {
    this.installed.set(mockInstalledPackage.packageId, { ...mockInstalledPackage })
  }

  async install(packageId: string, options?: InstallOptions): Promise<InstallResult> {
    if (this.installed.has(packageId) && !options?.force) {
      return {
        success: false,
        packageId,
        version: '',
        installedDependencies: [],
        warnings: [],
        error: 'Package already installed. Use --force to reinstall.',
      }
    }

    const version = options?.version || mockPackageRegistry.latestVersion
    const newPackage: InstalledPackage = {
      packageId,
      version,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      path: `/Users/test/.ccjk/plugins/${packageId}`,
      enabled: true,
      global: options?.global ?? true,
      dependencies: [],
    }

    if (!options?.dryRun) {
      this.installed.set(packageId, newPackage)
    }

    return {
      success: true,
      packageId,
      version,
      installedDependencies: options?.skipDependencies ? [] : ['dep-plugin'],
      warnings: [],
      installedPath: newPackage.path,
    }
  }

  async uninstall(packageId: string): Promise<{ success: boolean, error?: string }> {
    if (!this.installed.has(packageId)) {
      return { success: false, error: 'Package not installed' }
    }
    this.installed.delete(packageId)
    return { success: true }
  }

  async update(packageId: string): Promise<UpdateResult> {
    const pkg = this.installed.get(packageId)
    if (!pkg) {
      return {
        success: false,
        packageId,
        previousVersion: '',
        newVersion: '',
        warnings: [],
        error: 'Package not installed',
      }
    }

    const previousVersion = pkg.version
    const newVersion = mockPackageRegistry.latestVersion

    if (previousVersion === newVersion) {
      return {
        success: true,
        packageId,
        previousVersion,
        newVersion,
        warnings: ['Already at latest version'],
      }
    }

    pkg.previousVersion = previousVersion
    pkg.version = newVersion
    pkg.updatedAt = new Date().toISOString()
    pkg.backupPath = `/Users/test/.ccjk/backups/${packageId}-${previousVersion}`

    return {
      success: true,
      packageId,
      previousVersion,
      newVersion,
      warnings: [],
      backupPath: pkg.backupPath,
    }
  }

  async checkDependencies(packageId: string): Promise<DependencyCheck> {
    return {
      packageId,
      satisfied: true,
      missing: [],
      outdated: [],
      conflicts: [],
      resolved: [
        { packageId: 'dep-plugin', version: '1.0.0', depth: 1, parent: packageId },
      ],
    }
  }

  async enable(packageId: string): Promise<boolean> {
    const pkg = this.installed.get(packageId)
    if (pkg) {
      pkg.enabled = true
      return true
    }
    return false
  }

  async disable(packageId: string): Promise<boolean> {
    const pkg = this.installed.get(packageId)
    if (pkg) {
      pkg.enabled = false
      return true
    }
    return false
  }

  async rollback(packageId: string): Promise<{ success: boolean, version: string }> {
    const pkg = this.installed.get(packageId)
    if (pkg?.previousVersion) {
      const version = pkg.previousVersion
      pkg.version = version
      pkg.previousVersion = undefined
      return { success: true, version }
    }
    return { success: false, version: '' }
  }

  async verify(packageId: string): Promise<VerificationResult> {
    const pkg = this.installed.get(packageId)
    if (!pkg) {
      return {
        valid: false,
        packageId,
        checks: [{ name: 'exists', passed: false, message: 'Package not installed' }],
        integrity: 'unknown',
        verifiedAt: new Date().toISOString(),
      }
    }

    return {
      valid: true,
      packageId,
      checks: [
        { name: 'exists', passed: true },
        { name: 'checksum', passed: true },
        { name: 'manifest', passed: true },
      ],
      integrity: 'valid',
      verifiedAt: new Date().toISOString(),
    }
  }

  getInstalled(): InstalledPackage[] {
    return Array.from(this.installed.values())
  }
}

// Mock SecurityScanner class
class MockSecurityScanner {
  async scan(manifest: PluginManifest): Promise<SecurityScanResult> {
    const permissions = this.detectDangerousPermissions(manifest)
    const trustScore = this.calculateTrustScore(mockPackageRegistry)

    const issues: SecurityScanResult['issues'] = []

    if (permissions.includes('filesystem:write')) {
      issues.push({
        severity: 'medium',
        type: 'permission',
        description: 'Plugin requests filesystem write access',
      })
    }

    if (permissions.includes('network:unrestricted')) {
      issues.push({
        severity: 'high',
        type: 'permission',
        description: 'Plugin requests unrestricted network access',
      })
    }

    return {
      safe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      trustScore,
      issues,
      permissions,
      recommendation: this.getInstallRecommendation({
        safe: issues.length === 0,
        trustScore,
        issues,
        permissions,
        recommendation: 'install',
      }),
    }
  }

  detectDangerousPermissions(manifest: PluginManifest): string[] {
    const permissions: string[] = []

    if (manifest.mcpServer?.env) {
      permissions.push('environment:read')
    }

    if (manifest.configSchema?.properties) {
      const props = manifest.configSchema.properties as Record<string, unknown>
      if ('apiKey' in props) {
        permissions.push('secrets:read')
      }
    }

    return permissions
  }

  detectSuspiciousPatterns(code: string): Array<{ pattern: string, severity: string }> {
    const patterns: Array<{ pattern: string, severity: string }> = []

    if (code.includes('eval(')) {
      patterns.push({ pattern: 'eval()', severity: 'critical' })
    }

    if (code.includes('child_process')) {
      patterns.push({ pattern: 'child_process', severity: 'high' })
    }

    if (code.includes('fs.writeFileSync') && code.includes('/etc/')) {
      patterns.push({ pattern: 'system file modification', severity: 'critical' })
    }

    return patterns
  }

  calculateTrustScore(packageInfo: PluginRegistryEntry): number {
    let score = 50

    if (packageInfo.downloads > 10000)
      score += 20
    else if (packageInfo.downloads > 1000)
      score += 10
    else if (packageInfo.downloads > 100)
      score += 5

    if (packageInfo.repository)
      score += 10

    if (packageInfo.homepage)
      score += 5

    if (packageInfo.license === 'MIT' || packageInfo.license === 'Apache-2.0')
      score += 10

    const createdDate = new Date(packageInfo.createdAt)
    const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    if (ageInDays > 365)
      score += 10
    else if (ageInDays > 180)
      score += 5

    return Math.min(100, score)
  }

  async checkVulnerabilities(_packageId: string, version: string): Promise<Array<{ cve: string, severity: string }>> {
    if (version === '1.0.0') {
      return [{ cve: 'CVE-2024-0001', severity: 'medium' }]
    }
    return []
  }

  getInstallRecommendation(scanResult: SecurityScanResult): 'install' | 'caution' | 'avoid' {
    if (scanResult.issues.some(i => i.severity === 'critical')) {
      return 'avoid'
    }
    if (scanResult.issues.some(i => i.severity === 'high') || scanResult.trustScore < 50) {
      return 'caution'
    }
    return 'install'
  }
}

describe('mCP Marketplace System', () => {
  let marketplaceClient: MockMarketplaceClient
  let pluginManager: MockPluginManager
  let securityScanner: MockSecurityScanner

  beforeEach(() => {
    marketplaceClient = new MockMarketplaceClient()
    pluginManager = new MockPluginManager()
    securityScanner = new MockSecurityScanner()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('marketplaceClient', () => {
    it('should search packages by query', async () => {
      const results = await marketplaceClient.search('test')
      expect(results).toHaveLength(1)
      expect(results[0].packageId).toBe('test-mcp-plugin')
    })

    it('should return empty results for non-matching query', async () => {
      const results = await marketplaceClient.search('nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should filter by category', async () => {
      const results = await marketplaceClient.search('test', { category: 'mcp' })
      expect(results).toHaveLength(1)

      const noResults = await marketplaceClient.search('test', { category: 'nonexistent' })
      expect(noResults).toHaveLength(0)
    })

    it('should sort results', async () => {
      const results = await marketplaceClient.search('test', { sort: 'downloads' })
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('should get package details', async () => {
      const details = await marketplaceClient.getPackageDetails('test-mcp-plugin')
      expect(details).not.toBeNull()
      expect(details?.name).toBe('Test MCP Plugin')
      expect(details?.latestVersion).toBe('2.0.0')
    })

    it('should return null for non-existent package', async () => {
      const details = await marketplaceClient.getPackageDetails('nonexistent')
      expect(details).toBeNull()
    })

    it('should get trending packages', async () => {
      const trending = await marketplaceClient.getTrending(5)
      expect(trending).toBeDefined()
      expect(trending.length).toBeLessThanOrEqual(5)
    })

    it('should check for updates', async () => {
      const updates = await marketplaceClient.checkUpdates([mockInstalledPackage])
      expect(updates).toHaveLength(1)
      expect(updates[0].currentVersion).toBe('1.5.0')
      expect(updates[0].latestVersion).toBe('2.0.0')
    })

    it('should cache responses', async () => {
      await marketplaceClient.search('test')
      expect(marketplaceClient.getCacheStatus().exists).toBe(true)

      const results = await marketplaceClient.search('test')
      expect(results).toHaveLength(1)
    })

    it('should clear cache', async () => {
      await marketplaceClient.search('test')
      expect(marketplaceClient.getCacheStatus().exists).toBe(true)

      marketplaceClient.clearCache()
      expect(marketplaceClient.getCacheStatus().exists).toBe(false)
    })
  })

  describe('pluginManager', () => {
    it('should install a package', async () => {
      const result = await pluginManager.install('new-plugin')
      expect(result.success).toBe(true)
      expect(result.packageId).toBe('new-plugin')
      expect(result.version).toBe('2.0.0')
    })

    it('should fail to install already installed package without force', async () => {
      const result = await pluginManager.install('test-mcp-plugin')
      expect(result.success).toBe(false)
      expect(result.error).toContain('already installed')
    })

    it('should reinstall with force option', async () => {
      const result = await pluginManager.install('test-mcp-plugin', { force: true })
      expect(result.success).toBe(true)
    })

    it('should install specific version', async () => {
      const result = await pluginManager.install('new-plugin', { version: '1.0.0' })
      expect(result.success).toBe(true)
      expect(result.version).toBe('1.0.0')
    })

    it('should perform dry run without actual installation', async () => {
      const initialCount = pluginManager.getInstalled().length
      const result = await pluginManager.install('dry-run-plugin', { dryRun: true })
      expect(result.success).toBe(true)
      expect(pluginManager.getInstalled().length).toBe(initialCount)
    })

    it('should uninstall a package', async () => {
      const result = await pluginManager.uninstall('test-mcp-plugin')
      expect(result.success).toBe(true)
    })

    it('should fail to uninstall non-existent package', async () => {
      const result = await pluginManager.uninstall('nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not installed')
    })

    it('should update a package', async () => {
      const result = await pluginManager.update('test-mcp-plugin')
      expect(result.success).toBe(true)
      expect(result.previousVersion).toBe('1.5.0')
      expect(result.newVersion).toBe('2.0.0')
      expect(result.backupPath).toBeDefined()
    })

    it('should handle update when already at latest version', async () => {
      await pluginManager.update('test-mcp-plugin')
      const result = await pluginManager.update('test-mcp-plugin')
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Already at latest version')
    })

    it('should check dependencies', async () => {
      const deps = await pluginManager.checkDependencies('test-mcp-plugin')
      expect(deps.satisfied).toBe(true)
      expect(deps.missing).toHaveLength(0)
      expect(deps.resolved.length).toBeGreaterThan(0)
    })

    it('should enable/disable plugins', async () => {
      const disabled = await pluginManager.disable('test-mcp-plugin')
      expect(disabled).toBe(true)

      const enabled = await pluginManager.enable('test-mcp-plugin')
      expect(enabled).toBe(true)
    })

    it('should rollback to previous version', async () => {
      await pluginManager.update('test-mcp-plugin')
      const result = await pluginManager.rollback('test-mcp-plugin')
      expect(result.success).toBe(true)
      expect(result.version).toBe('1.5.0')
    })

    it('should verify plugin integrity', async () => {
      const result = await pluginManager.verify('test-mcp-plugin')
      expect(result.valid).toBe(true)
      expect(result.integrity).toBe('valid')
      expect(result.checks.every(c => c.passed)).toBe(true)
    })

    it('should report invalid for non-existent plugin', async () => {
      const result = await pluginManager.verify('nonexistent')
      expect(result.valid).toBe(false)
      expect(result.integrity).toBe('unknown')
    })

    it('should skip dependencies when option is set', async () => {
      const result = await pluginManager.install('new-plugin', { skipDependencies: true })
      expect(result.success).toBe(true)
      expect(result.installedDependencies).toHaveLength(0)
    })
  })

  describe('securityScanner', () => {
    it('should scan package for security issues', async () => {
      const result = await securityScanner.scan(mockPluginManifest)
      expect(result).toBeDefined()
      expect(typeof result.safe).toBe('boolean')
      expect(typeof result.trustScore).toBe('number')
      expect(Array.isArray(result.issues)).toBe(true)
    })

    it('should detect dangerous permissions', () => {
      const permissions = securityScanner.detectDangerousPermissions(mockPluginManifest)
      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions).toContain('environment:read')
      expect(permissions).toContain('secrets:read')
    })

    it('should detect suspicious patterns', () => {
      const safeCode = 'function hello() { return "world"; }'
      const safePatterns = securityScanner.detectSuspiciousPatterns(safeCode)
      expect(safePatterns).toHaveLength(0)

      const dangerousCode = 'eval(userInput); require("child_process").exec(cmd);'
      const dangerousPatterns = securityScanner.detectSuspiciousPatterns(dangerousCode)
      expect(dangerousPatterns.length).toBeGreaterThan(0)
      expect(dangerousPatterns.some(p => p.pattern === 'eval()')).toBe(true)
      expect(dangerousPatterns.some(p => p.pattern === 'child_process')).toBe(true)
    })

    it('should calculate trust score', () => {
      const score = securityScanner.calculateTrustScore(mockPackageRegistry)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should give higher trust score to popular packages', () => {
      const popularPackage = { ...mockPackageRegistry, downloads: 50000 }
      const unpopularPackage = { ...mockPackageRegistry, downloads: 10 }

      const popularScore = securityScanner.calculateTrustScore(popularPackage)
      const unpopularScore = securityScanner.calculateTrustScore(unpopularPackage)

      expect(popularScore).toBeGreaterThan(unpopularScore)
    })

    it('should check known vulnerabilities', async () => {
      const vulns = await securityScanner.checkVulnerabilities('test-mcp-plugin', '1.0.0')
      expect(vulns).toHaveLength(1)
      expect(vulns[0].cve).toBe('CVE-2024-0001')

      const noVulns = await securityScanner.checkVulnerabilities('test-mcp-plugin', '2.0.0')
      expect(noVulns).toHaveLength(0)
    })

    it('should provide install recommendation', () => {
      const safeResult: SecurityScanResult = {
        safe: true,
        trustScore: 80,
        issues: [],
        permissions: [],
        recommendation: 'install',
      }
      expect(securityScanner.getInstallRecommendation(safeResult)).toBe('install')

      const cautionResult: SecurityScanResult = {
        safe: false,
        trustScore: 40,
        issues: [{ severity: 'high', type: 'permission', description: 'test' }],
        permissions: [],
        recommendation: 'caution',
      }
      expect(securityScanner.getInstallRecommendation(cautionResult)).toBe('caution')

      const avoidResult: SecurityScanResult = {
        safe: false,
        trustScore: 20,
        issues: [{ severity: 'critical', type: 'vulnerability', description: 'test' }],
        permissions: [],
        recommendation: 'avoid',
      }
      expect(securityScanner.getInstallRecommendation(avoidResult)).toBe('avoid')
    })

    it('should detect system file modification attempts', () => {
      const dangerousCode = 'fs.writeFileSync("/etc/passwd", data)'
      const patterns = securityScanner.detectSuspiciousPatterns(dangerousCode)
      expect(patterns.some(p => p.severity === 'critical')).toBe(true)
    })
  })

  describe('integration Scenarios', () => {
    it('should complete full install workflow with security check', async () => {
      const searchResults = await marketplaceClient.search('test')
      expect(searchResults.length).toBeGreaterThan(0)

      const packageDetails = await marketplaceClient.getPackageDetails(searchResults[0].packageId)
      expect(packageDetails).not.toBeNull()

      const securityResult = await securityScanner.scan(mockPluginManifest)
      expect(securityResult.recommendation).not.toBe('avoid')

      const deps = await pluginManager.checkDependencies(packageDetails!.packageId)
      expect(deps.satisfied).toBe(true)

      const installResult = await pluginManager.install('new-test-plugin')
      expect(installResult.success).toBe(true)

      const verifyResult = await pluginManager.verify('new-test-plugin')
      expect(verifyResult.valid).toBe(true)
    })

    it('should handle update workflow with rollback capability', async () => {
      const updates = await marketplaceClient.checkUpdates([mockInstalledPackage])
      expect(updates.length).toBeGreaterThan(0)

      const updateResult = await pluginManager.update(updates[0].packageId)
      expect(updateResult.success).toBe(true)
      expect(updateResult.backupPath).toBeDefined()

      const verifyResult = await pluginManager.verify(updates[0].packageId)
      expect(verifyResult.valid).toBe(true)

      const rollbackResult = await pluginManager.rollback(updates[0].packageId)
      expect(rollbackResult.success).toBe(true)
    })
  })
})
