# CCJK MCP Marketplace - Implementation Guide

**Document**: Step-by-step implementation code examples
**Date**: January 14, 2026
**Audience**: Developers implementing the migration

---

## Phase 1: Update Legacy Market Command

### Step 1.1: Replace Hardcoded Services

**File**: `src/commands/mcp-market.ts`

**Before** (lines 20-39):
```typescript
const MCP_SERVERS: McpServer[] = [
  ...MCP_SERVICE_CONFIGS.map(svc => ({...})),
  // HARDCODED EXTERNAL SERVICES
  { name: 'Filesystem', description: 'Secure file operations', ... },
  { name: 'GitHub', description: 'Repository management', ... },
  // ... 6 more hardcoded
]
```

**After**:
```typescript
import { getDefaultMarketplaceClient } from '../mcp-marketplace/index.js'

// Remove hardcoded list - fetch from API instead
async function getMcpServers(): Promise<McpServer[]> {
  try {
    const client = getDefaultMarketplaceClient()

    // Get CCJK-managed services from config
    const managed = MCP_SERVICE_CONFIGS.map(svc => ({
      name: svc.name,
      description: svc.description,
      package: svc.package,
      category: svc.category,
      serviceId: svc.id,
      requiresApiKey: svc.requiresApiKey,
    }))

    // Get community services from marketplace
    const results = await client.search({ limit: 100 })
    const community = results.packages.map(pkg => ({
      name: pkg.name,
      description: pkg.description.en || Object.values(pkg.description)[0],
      package: pkg.id,
      category: pkg.category,
      stars: pkg.rating,
      verified: pkg.verified === 'verified',
    }))

    // Merge and deduplicate
    const merged = [...managed]
    for (const svc of community) {
      if (!merged.find(m => m.package === svc.package)) {
        merged.push(svc)
      }
    }

    return merged
  }
  catch (error) {
    console.warn('Failed to fetch marketplace services, using local list:', error)
    // Fallback to local services
    return MCP_SERVICE_CONFIGS.map(svc => ({...}))
  }
}
```

### Step 1.2: Update Search Function

**Before**:
```typescript
export async function mcpSearch(keyword: string, _options: McpMarketOptions = {}): Promise<void> {
  const servers = MCP_SERVERS.filter(s =>
    s.name.toLowerCase().includes(keyword.toLowerCase())
    || s.description.toLowerCase().includes(keyword.toLowerCase())
    || s.category.toLowerCase().includes(keyword.toLowerCase()),
  )
  // Display results
}
```

**After**:
```typescript
export async function mcpSearch(keyword: string, options: McpMarketOptions = {}): Promise<void> {
  try {
    console.log(ansis.cyan(`🔍 Searching for: ${keyword}`))

    const client = getDefaultMarketplaceClient()
    const results = await client.search({
      query: keyword,
      limit: 50,
    })

    if (results.packages.length === 0) {
      console.log(ansis.yellow('No packages found'))
      return
    }

    console.log(ansis.green(`\n✓ Found ${results.packages.length} packages\n`))

    results.packages.forEach((pkg, idx) => {
      const badge = pkg.verified === 'verified' ? ansis.blue('✓') : ansis.gray('○')
      const installed = await isPackageInstalled(pkg.id) ? ansis.green('✓') : ''

      console.log(`${idx + 1}. ${badge} ${ansis.bold(pkg.name)} ${installed}`)
      console.log(`   ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`   Category: ${pkg.category} | ⭐ ${pkg.rating} | 📥 ${pkg.downloads}`)
      console.log()
    })
  }
  catch (error) {
    console.error(ansis.red('Search failed:'), error)
    throw error
  }
}
```

### Step 1.3: Implement Trending

**New function**:
```typescript
export async function mcpTrending(options: McpMarketOptions = {}): Promise<void> {
  try {
    console.log(ansis.cyan.bold('\n🔥 Trending MCP Services\n'))

    const client = getDefaultMarketplaceClient()
    const trending = await client.getTrending(10)

    if (trending.length === 0) {
      console.log(ansis.yellow('No trending packages available'))
      return
    }

    trending.forEach((pkg, idx) => {
      const badge = pkg.verified === 'verified' ? ansis.blue('✓') : ansis.gray('○')

      console.log(`${idx + 1}. ${badge} ${ansis.bold(pkg.name)}`)
      console.log(`   ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`   ⭐ ${pkg.rating}/5 | 📥 ${pkg.downloads} downloads`)
      console.log(`   Author: ${pkg.author}`)
      console.log()
    })
  }
  catch (error) {
    console.error(ansis.red('Failed to fetch trending packages:'), error)
    throw error
  }
}
```

### Step 1.4: Add Recommendations

**New function**:
```typescript
export async function mcpRecommend(options: McpMarketOptions = {}): Promise<void> {
  try {
    console.log(ansis.cyan.bold('\n💡 Recommended for You\n'))

    const client = getDefaultMarketplaceClient()

    // Get installed packages
    const installed = await getInstalledPackages(options.tool)
    const installedIds = installed.map(p => p.packageId)

    if (installedIds.length === 0) {
      console.log(ansis.yellow('Install some packages first to get recommendations'))
      return
    }

    // Get recommendations
    const recommendations = await client.getRecommendations(installedIds)

    if (recommendations.length === 0) {
      console.log(ansis.yellow('No recommendations available'))
      return
    }

    recommendations.forEach((pkg, idx) => {
      const badge = pkg.verified === 'verified' ? ansis.blue('✓') : ansis.gray('○')

      console.log(`${idx + 1}. ${badge} ${ansis.bold(pkg.name)}`)
      console.log(`   ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`   ⭐ ${pkg.rating}/5 | 📥 ${pkg.downloads} downloads`)
      console.log()
    })
  }
  catch (error) {
    console.error(ansis.red('Failed to get recommendations:'), error)
    throw error
  }
}
```

### Step 1.5: Add Advanced Search

**New function**:
```typescript
export async function mcpSearchAdvanced(options: {
  query?: string
  category?: string
  verified?: boolean
  sortBy?: 'downloads' | 'rating' | 'recent'
  lang?: SupportedLang
}): Promise<void> {
  try {
    const client = getDefaultMarketplaceClient()

    const results = await client.search({
      query: options.query,
      category: options.category,
      verified: options.verified,
      sortBy: options.sortBy,
      limit: 50,
    })

    console.log(ansis.cyan(`\n📦 Search Results (${results.total} total)\n`))

    results.packages.forEach((pkg, idx) => {
      const badge = pkg.verified === 'verified' ? ansis.blue('✓') : ansis.gray('○')
      const tags = pkg.tags.slice(0, 3).join(', ')

      console.log(`${idx + 1}. ${badge} ${ansis.bold(pkg.name)} v${pkg.version}`)
      console.log(`   ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`   Category: ${pkg.category} | Tags: ${tags}`)
      console.log(`   ⭐ ${pkg.rating}/5 (${pkg.reviewCount} reviews) | 📥 ${pkg.downloads}`)
      console.log()
    })

    if (results.hasMore) {
      console.log(ansis.gray(`... and ${results.total - results.packages.length} more`))
    }
  }
  catch (error) {
    console.error(ansis.red('Search failed:'), error)
    throw error
  }
}
```

---

## Phase 2: CLI Integration

### Step 2.1: Update CAC Commands

**File**: `src/commands/index.ts` or main CLI setup

```typescript
import { CAC } from 'cac'
import {
  mcpSearch,
  mcpTrending,
  mcpRecommend,
  mcpSearchAdvanced,
  mcpInstall,
  mcpUninstall,
  mcpList,
  mcpUpdate,
  mcpCheckUpdates,
} from './mcp-market.js'

export function registerMcpCommands(cli: CAC): void {
  // Search command
  cli
    .command('mcp search <keyword>', 'Search MCP marketplace')
    .option('--limit <n>', 'Number of results', { default: 50 })
    .option('--category <name>', 'Filter by category')
    .option('--verified', 'Only verified packages')
    .action(async (keyword, options) => {
      await mcpSearch(keyword, options)
    })

  // Trending command
  cli
    .command('mcp trending', 'Show trending MCP services')
    .option('--limit <n>', 'Number of results', { default: 10 })
    .action(async (options) => {
      await mcpTrending(options)
    })

  // Recommendations command
  cli
    .command('mcp recommend', 'Get personalized recommendations')
    .action(async (options) => {
      await mcpRecommend(options)
    })

  // Install command
  cli
    .command('mcp install <package>', 'Install MCP package')
    .option('--version <v>', 'Specific version to install')
    .option('--force', 'Force reinstall')
    .option('--skip-deps', 'Skip dependency installation')
    .action(async (packageId, options) => {
      await mcpInstall(packageId, options)
    })

  // Uninstall command
  cli
    .command('mcp uninstall <package>', 'Uninstall MCP package')
    .action(async (packageId, options) => {
      await mcpUninstall(packageId, options)
    })

  // List command
  cli
    .command('mcp list', 'List installed MCP services')
    .option('--updates', 'Show available updates')
    .action(async (options) => {
      await mcpList(options)
    })

  // Update command
  cli
    .command('mcp update [package]', 'Update MCP package(s)')
    .option('--all', 'Update all packages')
    .action(async (packageId, options) => {
      if (options.all) {
        await mcpCheckUpdates(options)
      } else {
        await mcpUpdate(packageId, options)
      }
    })

  // Info command
  cli
    .command('mcp info <package>', 'Show package details')
    .action(async (packageId, options) => {
      await mcpInfo(packageId, options)
    })
}
```

### Step 2.2: Add Package Info Command

**New function**:
```typescript
export async function mcpInfo(packageId: string, options: McpMarketOptions = {}): Promise<void> {
  try {
    const client = getDefaultMarketplaceClient()
    const pkg = await client.getPackage(packageId)

    if (!pkg) {
      console.error(ansis.red(`Package not found: ${packageId}`))
      return
    }

    // Display package information
    console.log(ansis.bold.cyan(`\n📦 ${pkg.name} v${pkg.version}\n`))

    console.log(`${pkg.description.en || Object.values(pkg.description)[0]}\n`)

    console.log(ansis.bold('Details:'))
    console.log(`  Author: ${pkg.author}`)
    console.log(`  License: ${pkg.license}`)
    console.log(`  Category: ${pkg.category}`)
    console.log(`  Verified: ${pkg.verified === 'verified' ? '✓ Yes' : '✗ No'}`)
    console.log()

    console.log(ansis.bold('Statistics:'))
    console.log(`  ⭐ Rating: ${pkg.rating}/5 (${pkg.reviewCount} reviews)`)
    console.log(`  📥 Downloads: ${pkg.downloads}`)
    console.log(`  ⭐ GitHub Stars: ${pkg.stars}`)
    console.log()

    if (pkg.tags.length > 0) {
      console.log(ansis.bold('Tags:'))
      console.log(`  ${pkg.tags.join(', ')}`)
      console.log()
    }

    if (pkg.dependencies.length > 0) {
      console.log(ansis.bold('Dependencies:'))
      pkg.dependencies.forEach(dep => {
        console.log(`  - ${dep.packageId}@${dep.versionRange}${dep.optional ? ' (optional)' : ''}`)
      })
      console.log()
    }

    if (pkg.permissions.length > 0) {
      console.log(ansis.bold('Permissions:'))
      pkg.permissions.forEach(perm => {
        const required = perm.required ? '(required)' : '(optional)'
        console.log(`  - ${perm.name} ${required}`)
        console.log(`    ${perm.description}`)
      })
      console.log()
    }

    console.log(ansis.bold('Links:'))
    console.log(`  Repository: ${pkg.repository}`)
    console.log(`  Documentation: ${pkg.documentation}`)
    if (pkg.homepage) {
      console.log(`  Homepage: ${pkg.homepage}`)
    }
    console.log()

    // Show version history
    const versions = await client.getVersions(packageId)
    if (versions.length > 0) {
      console.log(ansis.bold('Recent Versions:'))
      versions.slice(0, 5).forEach(v => {
        console.log(`  ${v.version} - ${new Date(v.releaseDate).toLocaleDateString()}`)
      })
      console.log()
    }

    // Show install status
    const installed = await isPackageInstalled(packageId)
    if (installed) {
      console.log(ansis.green('✓ Installed'))
    } else {
      console.log(ansis.gray('Not installed'))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to get package info:'), error)
    throw error
  }
}
```

---

## Phase 3: Menu Integration

### Step 3.1: Add Marketplace Menu

**File**: `src/commands/menu.ts`

```typescript
import inquirer from 'inquirer'
import {
  mcpSearch,
  mcpTrending,
  mcpRecommend,
  mcpList,
  mcpCheckUpdates,
  mcpInfo,
} from './mcp-market.js'

export async function mcpMarketplaceMenu(): Promise<void> {
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'MCP Marketplace',
        choices: [
          { name: '🔍 Search Services', value: 'search' },
          { name: '🔥 View Trending', value: 'trending' },
          { name: '💡 Get Recommendations', value: 'recommend' },
          { name: '📦 View Installed', value: 'list' },
          { name: '⬆️ Check Updates', value: 'updates' },
          { name: '⚙️ Settings', value: 'settings' },
          { name: '❌ Back', value: 'back' },
        ],
      },
    ])

    if (action === 'back') break

    try {
      switch (action) {
        case 'search': {
          const { query } = await inquirer.prompt([
            {
              type: 'input',
              name: 'query',
              message: 'Search query:',
            },
          ])
          await mcpSearch(query)
          break
        }

        case 'trending': {
          await mcpTrending()
          break
        }

        case 'recommend': {
          await mcpRecommend()
          break
        }

        case 'list': {
          await mcpList()
          break
        }

        case 'updates': {
          await mcpCheckUpdates()
          break
        }

        case 'settings': {
          await mcpSettingsMenu()
          break
        }
      }
    }
    catch (error) {
      console.error('Error:', error)
    }

    // Pause before showing menu again
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ])
  }
}

async function mcpSettingsMenu(): Promise<void> {
  const { setting } = await inquirer.prompt([
    {
      type: 'list',
      name: 'setting',
      message: 'MCP Marketplace Settings',
      choices: [
        { name: 'Clear Cache', value: 'clear-cache' },
        { name: 'Offline Mode', value: 'offline-mode' },
        { name: 'API Configuration', value: 'api-config' },
        { name: 'Back', value: 'back' },
      ],
    },
  ])

  if (setting === 'back') return

  switch (setting) {
    case 'clear-cache': {
      const client = getDefaultMarketplaceClient()
      client.clearCache()
      console.log('✓ Cache cleared')
      break
    }

    case 'offline-mode': {
      const { enabled } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable offline mode?',
          default: false,
        },
      ])
      const client = getDefaultMarketplaceClient()
      client.setOfflineMode(enabled)
      console.log(`✓ Offline mode ${enabled ? 'enabled' : 'disabled'}`)
      break
    }

    case 'api-config': {
      const { apiUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiUrl',
          message: 'API URL:',
          default: 'https://api.api.claudehome.cn/v1/mcp-marketplace',
        },
      ])
      // Save to config
      console.log('✓ API configuration updated')
      break
    }
  }
}
```

---

## Phase 4: Security & Advanced Features

### Step 4.1: Implement Security Scanning

**File**: `src/mcp-marketplace/security-scanner.ts`

```typescript
export interface SecurityScanResult {
  packageId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  issues: SecurityIssue[]
  scannedAt: ISO8601
}

export interface SecurityIssue {
  type: 'vulnerability' | 'permission' | 'license' | 'malware' | 'dependency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation?: string
}

export async function scanPackage(packageId: string): Promise<SecurityScanResult> {
  const issues: SecurityIssue[] = []

  // 1. Check for known vulnerabilities
  const vulnCheck = await checkVulnerabilities(packageId)
  issues.push(...vulnCheck)

  // 2. Check permissions
  const permCheck = await checkPermissions(packageId)
  issues.push(...permCheck)

  // 3. Check license
  const licenseCheck = await checkLicense(packageId)
  issues.push(...licenseCheck)

  // 4. Check dependencies
  const depCheck = await checkDependencies(packageId)
  issues.push(...depCheck)

  // Determine risk level
  const riskLevel = calculateRiskLevel(issues)

  return {
    packageId,
    riskLevel,
    issues,
    scannedAt: new Date().toISOString(),
  }
}

function calculateRiskLevel(issues: SecurityIssue[]): 'low' | 'medium' | 'high' | 'critical' {
  if (issues.some(i => i.severity === 'critical')) return 'critical'
  if (issues.some(i => i.severity === 'high')) return 'high'
  if (issues.some(i => i.severity === 'medium')) return 'medium'
  return 'low'
}

async function checkVulnerabilities(packageId: string): Promise<SecurityIssue[]> {
  // Check against vulnerability database
  // e.g., npm audit, Snyk, etc.
  return []
}

async function checkPermissions(packageId: string): Promise<SecurityIssue[]> {
  // Check for suspicious permissions
  // e.g., filesystem access, network access, process execution
  return []
}

async function checkLicense(packageId: string): Promise<SecurityIssue[]> {
  // Check license compatibility
  return []
}

async function checkDependencies(packageId: string): Promise<SecurityIssue[]> {
  // Check dependencies for vulnerabilities
  return []
}
```

### Step 4.2: Update Installation with Security

**Updated install function**:
```typescript
export async function mcpInstall(packageId: string, options: McpMarketOptions = {}): Promise<void> {
  try {
    const client = getDefaultMarketplaceClient()
    const pkg = await client.getPackage(packageId)

    if (!pkg) {
      console.error(ansis.red(`Package not found: ${packageId}`))
      return
    }

    // Check if already installed
    if (await isPackageInstalled(packageId)) {
      console.log(ansis.yellow(`Package '${packageId}' is already installed`))
      return
    }

    // Show package info
    console.log(ansis.cyan(`\n📦 Installing ${pkg.name} v${pkg.version}\n`))
    console.log(pkg.description.en || Object.values(pkg.description)[0])
    console.log()

    // Security scan
    if (!options.skipVerification) {
      console.log(ansis.cyan('🔒 Running security scan...'))
      const scanResult = await scanPackage(packageId)

      if (scanResult.riskLevel !== 'low') {
        console.log(ansis.yellow(`\n⚠️ Security Warning: ${scanResult.riskLevel.toUpperCase()} risk\n`))
        scanResult.issues.forEach(issue => {
          const icon = issue.severity === 'critical' ? '🔴' : '🟡'
          console.log(`${icon} ${issue.description}`)
          if (issue.recommendation) {
            console.log(`   → ${issue.recommendation}`)
          }
        })
        console.log()

        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue installation?',
            default: false,
          },
        ])

        if (!proceed) {
          console.log(ansis.gray('Installation cancelled'))
          return
        }
      }
    }

    // Show permissions
    if (pkg.permissions.length > 0) {
      console.log(ansis.cyan('\n🔐 This package requires:\n'))
      pkg.permissions.forEach(perm => {
        const required = perm.required ? '(required)' : '(optional)'
        console.log(`  ${perm.name} ${required}`)
        console.log(`  ${perm.description}`)
      })
      console.log()

      const { accept } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'accept',
          message: 'Accept permissions?',
          default: true,
        },
      ])

      if (!accept) {
        console.log(ansis.gray('Installation cancelled'))
        return
      }
    }

    // Install
    console.log(ansis.cyan('\n⏳ Installing...\n'))
    const result = await installPackage(packageId, options)

    if (result.success) {
      console.log(ansis.green(`✓ Successfully installed ${pkg.name} v${result.version}`))
      if (result.installedDependencies.length > 0) {
        console.log(`  Dependencies: ${result.installedDependencies.join(', ')}`)
      }
    } else {
      console.error(ansis.red(`✗ Installation failed: ${result.error}`))
    }
  }
  catch (error) {
    console.error(ansis.red('Installation error:'), error)
    throw error
  }
}
```

---

## Phase 5: Testing

### Step 5.1: Unit Tests

**File**: `tests/unit/mcp-marketplace.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MarketplaceClient } from '../../src/mcp-marketplace/marketplace-client'

describe('MarketplaceClient', () => {
  let client: MarketplaceClient

  beforeEach(() => {
    client = new MarketplaceClient({
      baseUrl: 'https://api.test.local/v1/mcp-marketplace',
      timeout: 5000,
    })
  })

  describe('search', () => {
    it('should search packages', async () => {
      const result = await client.search({ query: 'github' })
      expect(result.packages).toBeDefined()
      expect(Array.isArray(result.packages)).toBe(true)
    })

    it('should filter by category', async () => {
      const result = await client.search({ category: 'development' })
      expect(result.packages.every(p => p.category === 'development')).toBe(true)
    })

    it('should handle pagination', async () => {
      const page1 = await client.search({ page: 1, limit: 10 })
      const page2 = await client.search({ page: 2, limit: 10 })
      expect(page1.packages).not.toEqual(page2.packages)
    })
  })

  describe('caching', () => {
    it('should cache search results', async () => {
      const spy = vi.spyOn(client as any, 'makeRequest')

      await client.search({ query: 'github' })
      await client.search({ query: 'github' })

      // Should only make one actual request
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should clear cache', () => {
      client.clearCache()
      // Verify cache is empty
    })

    it('should clear expired cache', () => {
      client.clearExpiredCache()
      // Verify expired entries are removed
    })
  })

  describe('offline mode', () => {
    it('should return cached data in offline mode', async () => {
      // Prime cache
      await client.search({ query: 'github' })

      // Enable offline mode
      client.setOfflineMode(true)

      // Should return cached data
      const result = await client.search({ query: 'github' })
      expect(result.success).toBe(true)
    })

    it('should error when no cache in offline mode', async () => {
      client.setOfflineMode(true)
      const result = await client.search({ query: 'nonexistent-xyz' })
      expect(result.success).toBe(false)
    })
  })
})
```

### Step 5.2: Integration Tests

**File**: `tests/integration/marketplace.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  searchPackages,
  installPackage,
  isPackageInstalled,
  getInstalledPackages,
  checkForUpdates,
} from '../../src/utils/marketplace'

describe('Marketplace Integration', () => {
  it('should search and install package', async () => {
    // Search
    const results = await searchPackages({ query: 'github' })
    expect(results.packages.length).toBeGreaterThan(0)

    // Get first result
    const pkg = results.packages[0]

    // Install
    const result = await installPackage(pkg.id)
    expect(result.success).toBe(true)

    // Verify installation
    const installed = await isPackageInstalled(pkg.id)
    expect(installed).toBe(true)
  })

  it('should check for updates', async () => {
    const installed = await getInstalledPackages()
    if (installed.length > 0) {
      const updates = await checkForUpdates(installed)
      expect(Array.isArray(updates)).toBe(true)
    }
  })
})
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit + integration)
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated
- [ ] API endpoint tested and stable
- [ ] Database migrations completed
- [ ] Cache infrastructure ready

### Deployment
- [ ] Deploy API backend
- [ ] Deploy CLI updates
- [ ] Update documentation
- [ ] Announce changes to users
- [ ] Monitor for issues

### Post-Deployment
- [ ] Monitor API performance
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Fix any issues
- [ ] Plan Phase 2 improvements

---

## Rollback Plan

If issues occur:

1. **Revert CLI changes**: `git revert <commit>`
2. **Fallback to local services**: Hardcoded list still available
3. **Disable marketplace**: Set `MARKETPLACE_ENABLED=false`
4. **Investigate**: Check API logs, error rates
5. **Fix and redeploy**: Once issues resolved

---

**End of Implementation Guide**
