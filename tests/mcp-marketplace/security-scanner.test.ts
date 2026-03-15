import { describe, expect, it } from 'vitest'
import {
  createSecurityScanner,
  DANGEROUS_PERMISSIONS,
  formatScanResult,
  getRiskColor,
  isRiskAcceptable,
  SecurityScanner,
  SUSPICIOUS_PATTERNS,
} from '../../src/mcp-marketplace/security-scanner'
import type { TrustFactors } from '../../src/mcp-marketplace/security-scanner'

describe('SecurityScanner', () => {
  describe('detectSuspiciousPatterns', () => {
    const scanner = new SecurityScanner()

    it('detects base64 eval', () => {
      const code = 'eval(atob("aGVsbG8="))'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'base64-eval')).toBe(true)
      expect(matches[0].risk).toBe('critical')
    })

    it('detects dynamic eval', () => {
      const code = 'eval(userInput)'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'dynamic-eval')).toBe(true)
    })

    it('detects shell command execution', () => {
      const code = 'exec(command)'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'shell-exec')).toBe(true)
    })

    it('detects hardcoded secrets', () => {
      const code = 'const api_key = "sk-1234567890abcdef"'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'hardcoded-secret')).toBe(true)
    })

    it('detects suspicious IP URLs', () => {
      const code = 'fetch("http://192.168.1.100:8080/data")'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'suspicious-url')).toBe(true)
    })

    it('detects obfuscated variables', () => {
      const code = 'var _0x4a2b = "hidden"'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'obfuscated-vars')).toBe(true)
    })

    it('detects path traversal', () => {
      const code = 'readFile("../../../../../../etc/passwd")'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'path-traversal')).toBe(true)
    })

    it('detects crypto mining indicators', () => {
      const code = 'connect("stratum+tcp://pool.example.com")'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches.some(m => m.patternId === 'crypto-mining')).toBe(true)
    })

    it('returns empty for clean code', () => {
      const code = 'const x = 1 + 2;\nconsole.log(x);'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      expect(matches).toHaveLength(0)
    })

    it('reports correct line numbers', () => {
      const code = 'const a = 1;\neval(userInput)\nconst b = 2;'
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      const evalMatch = matches.find(m => m.patternId === 'dynamic-eval')
      expect(evalMatch?.lineNumber).toBe(2)
    })

    it('truncates long matches to 50 chars', () => {
      const longSecret = 'a'.repeat(60)
      const code = `const password = "${longSecret}"`
      const matches = scanner.detectSuspiciousPatterns(code, 'test.js')
      const secretMatch = matches.find(m => m.patternId === 'hardcoded-secret')
      if (secretMatch) {
        expect(secretMatch.match.length).toBeLessThanOrEqual(50)
      }
    })
  })

  describe('calculateTrustScore', () => {
    const scanner = new SecurityScanner()

    const baseTrust: TrustFactors = {
      verified: true,
      authorReputation: 80,
      packageAge: 365,
      downloads: 100000,
      rating: 4.5,
      ratingCount: 100,
      hasSourceCode: true,
      hasSecurityPolicy: true,
      openSecurityIssues: 0,
      lastUpdateAge: 7,
    }

    it('gives high score for trusted package', () => {
      const score = scanner.calculateTrustScore(baseTrust)
      expect(score).toBeGreaterThanOrEqual(80)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('gives low score for unverified, new, low-download package', () => {
      const score = scanner.calculateTrustScore({
        ...baseTrust,
        verified: false,
        authorReputation: 10,
        packageAge: 1,
        downloads: 5,
        rating: 2.0,
        ratingCount: 1,
        hasSourceCode: false,
        hasSecurityPolicy: false,
        openSecurityIssues: 3,
        lastUpdateAge: 400,
      })
      expect(score).toBeLessThan(30)
    })

    it('penalizes open security issues', () => {
      const clean = scanner.calculateTrustScore({ ...baseTrust, openSecurityIssues: 0 })
      const issues = scanner.calculateTrustScore({ ...baseTrust, openSecurityIssues: 4 })
      expect(clean).toBeGreaterThan(issues)
      expect(clean - issues).toBe(20) // 4 * 5 = 20 penalty
    })

    it('caps penalty at 20 for many security issues', () => {
      const four = scanner.calculateTrustScore({ ...baseTrust, openSecurityIssues: 4 })
      const ten = scanner.calculateTrustScore({ ...baseTrust, openSecurityIssues: 10 })
      expect(four).toBe(ten) // both capped at -20
    })

    it('gives bonus for recent updates', () => {
      const recent = scanner.calculateTrustScore({ ...baseTrust, lastUpdateAge: 7 })
      const old = scanner.calculateTrustScore({ ...baseTrust, lastUpdateAge: 200 })
      expect(recent).toBeGreaterThan(old)
    })

    it('penalizes abandoned packages (>365 days)', () => {
      const active = scanner.calculateTrustScore({ ...baseTrust, lastUpdateAge: 90 })
      const abandoned = scanner.calculateTrustScore({ ...baseTrust, lastUpdateAge: 400 })
      expect(active).toBeGreaterThan(abandoned)
    })

    it('adjusts rating confidence for low rating count', () => {
      const manyRatings = scanner.calculateTrustScore({ ...baseTrust, ratingCount: 100 })
      const fewRatings = scanner.calculateTrustScore({ ...baseTrust, ratingCount: 2 })
      expect(manyRatings).toBeGreaterThan(fewRatings)
    })

    it('clamps score between 0 and 100', () => {
      const score = scanner.calculateTrustScore(baseTrust)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('returns 0 for worst-case factors', () => {
      const score = scanner.calculateTrustScore({
        verified: false,
        authorReputation: 0,
        packageAge: 0,
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        hasSourceCode: false,
        hasSecurityPolicy: false,
        openSecurityIssues: 10,
        lastUpdateAge: 500,
      })
      expect(score).toBe(0)
    })
  })

  describe('analyzePermissions', () => {
    const scanner = new SecurityScanner()

    it('returns safe for manifest with no special permissions', () => {
      const result = scanner.analyzePermissions({
        name: 'test',
        version: '1.0.0',
        description: 'test',
        ccjkVersion: '>=3.0.0',
        type: 'plugin',
      })
      expect(result.riskLevel).toBe('safe')
      expect(result.requested).toHaveLength(0)
      expect(result.dangerous).toHaveLength(0)
    })

    it('detects shell permissions from postInstall', () => {
      const result = scanner.analyzePermissions({
        name: 'test',
        version: '1.0.0',
        description: 'test',
        ccjkVersion: '>=3.0.0',
        type: 'plugin',
        postInstall: 'npm install',
      })
      expect(result.requested.length).toBeGreaterThan(0)
    })

    it('detects fs permissions from files field', () => {
      const result = scanner.analyzePermissions({
        name: 'test',
        version: '1.0.0',
        description: 'test',
        ccjkVersion: '>=3.0.0',
        type: 'plugin',
        files: ['src/'],
      })
      expect(result.requested.some(p => p.name.includes('fs:'))).toBe(true)
    })
  })

  describe('scan', () => {
    it('returns a complete scan result', async () => {
      const scanner = new SecurityScanner()
      const result = await scanner.scan('test-package', '1.0.0')
      expect(result.packageId).toBe('test-package')
      expect(result.version).toBe('1.0.0')
      expect(result.scannedAt).toBeInstanceOf(Date)
      expect(['safe', 'low', 'medium', 'high', 'critical']).toContain(result.overallRisk)
      expect(['install', 'review', 'avoid']).toContain(result.recommendation)
      expect(result.trustScore).toBeGreaterThanOrEqual(0)
      expect(result.trustScore).toBeLessThanOrEqual(100)
    })

    it('defaults version to latest', async () => {
      const scanner = new SecurityScanner()
      const result = await scanner.scan('test-package')
      expect(result.version).toBe('latest')
    })
  })

  describe('checkVulnerabilities', () => {
    it('returns empty report when skipVulnCheck is true', async () => {
      const scanner = new SecurityScanner({ skipVulnCheck: true })
      const report = await scanner.checkVulnerabilities([
        { name: 'lodash', version: '4.17.0', direct: true },
      ])
      expect(report.total).toBe(0)
      expect(report.vulnerabilities).toHaveLength(0)
    })

    it('returns report with severity breakdown', async () => {
      const scanner = new SecurityScanner()
      const report = await scanner.checkVulnerabilities([])
      expect(report.bySeverity).toHaveProperty('safe')
      expect(report.bySeverity).toHaveProperty('critical')
      expect(report.scannedAt).toBeInstanceOf(Date)
    })
  })

  describe('compareVersionSecurity', () => {
    it('returns comparison between two versions', () => {
      const scanner = new SecurityScanner()
      const result = scanner.compareVersionSecurity('1.0.0', '2.0.0')
      expect(result.version1).toBe('1.0.0')
      expect(result.version2).toBe('2.0.0')
      expect(['improved', 'unchanged', 'degraded']).toContain(result.riskChange)
    })
  })
})

describe('utility functions', () => {
  describe('isRiskAcceptable', () => {
    it('accepts safe risk at any threshold', () => {
      expect(isRiskAcceptable('safe', 'low')).toBe(true)
      expect(isRiskAcceptable('safe', 'safe')).toBe(true)
    })

    it('rejects critical risk at medium threshold', () => {
      expect(isRiskAcceptable('critical', 'medium')).toBe(false)
    })

    it('accepts medium risk at medium threshold', () => {
      expect(isRiskAcceptable('medium', 'medium')).toBe(true)
    })

    it('rejects high risk at medium threshold', () => {
      expect(isRiskAcceptable('high', 'medium')).toBe(false)
    })

    it('defaults threshold to medium', () => {
      expect(isRiskAcceptable('low')).toBe(true)
      expect(isRiskAcceptable('high')).toBe(false)
    })
  })

  describe('formatScanResult', () => {
    it('formats a scan result as string', () => {
      const result = {
        packageId: 'test-pkg',
        version: '1.0.0',
        scannedAt: new Date(),
        overallRisk: 'low' as const,
        issues: [],
        permissions: { requested: [], dangerous: [], riskLevel: 'safe' as const, summary: 'No permissions' },
        dependencies: { total: 0, direct: 0, transitive: 0, dependencies: [], outdated: [] },
        trustScore: 85,
        recommendation: 'install' as const,
      }
      const output = formatScanResult(result)
      expect(output).toContain('test-pkg')
      expect(output).toContain('1.0.0')
      expect(output).toContain('85/100')
      expect(output).toContain('INSTALL')
    })

    it('includes issues in output', () => {
      const result = {
        packageId: 'risky-pkg',
        version: '0.1.0',
        scannedAt: new Date(),
        overallRisk: 'high' as const,
        issues: [{
          id: 'SEC-1',
          type: 'dangerous-permission' as const,
          severity: 'high' as const,
          title: 'Shell Access',
          description: 'Full shell access',
          recommendation: 'Review carefully',
        }],
        permissions: { requested: [], dangerous: [], riskLevel: 'high' as const, summary: 'Dangerous' },
        dependencies: { total: 0, direct: 0, transitive: 0, dependencies: [], outdated: [] },
        trustScore: 20,
        recommendation: 'avoid' as const,
      }
      const output = formatScanResult(result)
      expect(output).toContain('Shell Access')
      expect(output).toContain('Issues Found: 1')
    })
  })

  describe('getRiskColor', () => {
    it('returns different colors for each risk level', () => {
      const colors = new Set([
        getRiskColor('safe'),
        getRiskColor('low'),
        getRiskColor('medium'),
        getRiskColor('high'),
        getRiskColor('critical'),
      ])
      expect(colors.size).toBe(5)
    })
  })

  describe('createSecurityScanner', () => {
    it('creates scanner with default config', () => {
      const scanner = createSecurityScanner()
      expect(scanner).toBeInstanceOf(SecurityScanner)
    })

    it('creates scanner with custom config', () => {
      const scanner = createSecurityScanner({ verbose: true, skipVulnCheck: true })
      expect(scanner).toBeInstanceOf(SecurityScanner)
    })
  })
})

describe('SUSPICIOUS_PATTERNS', () => {
  it('has 10 built-in patterns', () => {
    expect(SUSPICIOUS_PATTERNS).toHaveLength(10)
  })

  it('all patterns have required fields', () => {
    for (const p of SUSPICIOUS_PATTERNS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.pattern).toBeInstanceOf(RegExp)
      expect(['safe', 'low', 'medium', 'high', 'critical']).toContain(p.risk)
      expect(p.description).toBeTruthy()
    }
  })
})

describe('DANGEROUS_PERMISSIONS', () => {
  it('includes shell:* as critical', () => {
    expect(DANGEROUS_PERMISSIONS['shell:*'].risk).toBe('critical')
  })

  it('includes all expected permission patterns', () => {
    const keys = Object.keys(DANGEROUS_PERMISSIONS)
    expect(keys).toContain('shell:*')
    expect(keys).toContain('fs:write:*')
    expect(keys).toContain('fs:read:*')
    expect(keys).toContain('network:*')
    expect(keys).toContain('env:*')
    expect(keys).toContain('process:spawn')
  })
})
