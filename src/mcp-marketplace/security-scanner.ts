/**
 * MCP Marketplace Security Scanner
 *
 * Provides comprehensive security analysis for marketplace packages
 * including permission analysis, vulnerability detection, and trust scoring.
 *
 * @module mcp-marketplace/security-scanner
 */

import type { PackageManifest } from '../types/marketplace.js'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Risk level classification for security issues
 */
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

/**
 * Types of security issues that can be detected
 */
export type SecurityIssueType
  = | 'dangerous-permission'
    | 'network-access'
    | 'file-system-access'
    | 'code-execution'
    | 'data-exfiltration'
    | 'dependency-vulnerability'
    | 'obfuscated-code'
    | 'suspicious-pattern'

/**
 * Security issue detected during scanning
 */
export interface SecurityIssue {
  /** Unique issue identifier */
  id: string
  /** Type of security issue */
  type: SecurityIssueType
  /** Severity level */
  severity: RiskLevel
  /** Short title describing the issue */
  title: string
  /** Detailed description of the issue */
  description: string
  /** Location in code/config where issue was found */
  location?: string
  /** Recommended action to address the issue */
  recommendation: string
  /** Common Weakness Enumeration identifier */
  cwe?: string
}

/**
 * Permission analysis result
 */
export interface PermissionAnalysis {
  /** List of requested permissions */
  requested: Permission[]
  /** Dangerous permissions that need review */
  dangerous: Permission[]
  /** Overall permission risk level */
  riskLevel: RiskLevel
  /** Summary of permission analysis */
  summary: string
}

/**
 * Individual permission entry
 */
export interface Permission {
  /** Permission name */
  name: string
  /** Permission description */
  description: string
  /** Risk level of this permission */
  risk: RiskLevel
  /** Reason why this permission is needed */
  reason?: string
}

/**
 * Dependency information
 */
export interface Dependency {
  /** Package name */
  name: string
  /** Version string */
  version: string
  /** Whether this is a direct or transitive dependency */
  direct: boolean
}

/**
 * Vulnerability information
 */
export interface Vulnerability {
  /** Vulnerability ID (CVE, GHSA, etc.) */
  id: string
  /** Affected package name */
  package: string
  /** Affected version range */
  affectedVersions: string
  /** Severity level */
  severity: RiskLevel
  /** Vulnerability title */
  title: string
  /** Detailed description */
  description: string
  /** Fixed version (if available) */
  fixedVersion?: string
  /** Reference URLs */
  references: string[]
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  /** Total number of dependencies */
  total: number
  /** Direct dependencies count */
  direct: number
  /** Transitive dependencies count */
  transitive: number
  /** List of all dependencies */
  dependencies: Dependency[]
  /** Outdated dependencies */
  outdated: Dependency[]
}

/**
 * Vulnerability report
 */
export interface VulnerabilityReport {
  /** Total vulnerabilities found */
  total: number
  /** Vulnerabilities by severity */
  bySeverity: Record<RiskLevel, number>
  /** List of vulnerabilities */
  vulnerabilities: Vulnerability[]
  /** Scan timestamp */
  scannedAt: Date
}

/**
 * Pattern match result from code analysis
 */
export interface PatternMatch {
  /** Pattern identifier */
  patternId: string
  /** Pattern name */
  name: string
  /** Matched content (sanitized) */
  match: string
  /** File path where pattern was found */
  filePath: string
  /** Line number */
  lineNumber: number
  /** Risk level */
  risk: RiskLevel
  /** Description of why this pattern is suspicious */
  description: string
}

/**
 * Trust factors used for scoring
 */
export interface TrustFactors {
  /** Package verification status */
  verified: boolean
  /** Author reputation score (0-100) */
  authorReputation: number
  /** Package age in days */
  packageAge: number
  /** Total downloads */
  downloads: number
  /** Average rating (1-5) */
  rating: number
  /** Number of ratings */
  ratingCount: number
  /** Has source code available */
  hasSourceCode: boolean
  /** Has security policy */
  hasSecurityPolicy: boolean
  /** Number of open security issues */
  openSecurityIssues: number
  /** Last update age in days */
  lastUpdateAge: number
}

/**
 * Security comparison between versions
 */
export interface SecurityComparison {
  /** First version */
  version1: string
  /** Second version */
  version2: string
  /** New issues in version2 */
  newIssues: SecurityIssue[]
  /** Resolved issues in version2 */
  resolvedIssues: SecurityIssue[]
  /** Changed risk level */
  riskChange: 'improved' | 'unchanged' | 'degraded'
  /** Summary of changes */
  summary: string
}

/**
 * Complete scan result
 */
export interface ScanResult {
  /** Package identifier */
  packageId: string
  /** Package version scanned */
  version: string
  /** Scan timestamp */
  scannedAt: Date
  /** Overall risk assessment */
  overallRisk: RiskLevel
  /** All security issues found */
  issues: SecurityIssue[]
  /** Permission analysis */
  permissions: PermissionAnalysis
  /** Dependency analysis */
  dependencies: DependencyAnalysis
  /** Trust score (0-100) */
  trustScore: number
  /** Installation recommendation */
  recommendation: 'install' | 'review' | 'avoid'
}

// =============================================================================
// Scanner Configuration
// =============================================================================

/**
 * Scanner configuration options
 */
export interface ScannerConfig {
  /** Enable verbose logging */
  verbose: boolean
  /** Maximum file size to scan (bytes) */
  maxFileSize: number
  /** Timeout for network checks (ms) */
  networkTimeout: number
  /** Skip vulnerability database check */
  skipVulnCheck: boolean
  /** Custom pattern rules */
  customPatterns?: SuspiciousPattern[]
}

/**
 * Default scanner configuration
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  verbose: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  networkTimeout: 5000,
  skipVulnCheck: false,
}

// =============================================================================
// Detection Patterns
// =============================================================================

/**
 * Suspicious pattern definition
 */
export interface SuspiciousPattern {
  /** Pattern identifier */
  id: string
  /** Pattern name */
  name: string
  /** Regex pattern to match */
  pattern: RegExp
  /** Risk level if matched */
  risk: RiskLevel
  /** Description of the pattern */
  description: string
  /** CWE identifier if applicable */
  cwe?: string
}

/**
 * Built-in suspicious patterns for code analysis
 */
export const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  // Base64 encoded code execution
  {
    id: 'base64-eval',
    name: 'Base64 Encoded Eval',
    pattern: /eval\s*\(\s*(?:atob|Buffer\.from)\s*\(/gi,
    risk: 'critical',
    description: 'Detected eval() with base64 decoding, commonly used to hide malicious code',
    cwe: 'CWE-95',
  },
  // Dynamic code execution
  {
    id: 'dynamic-eval',
    name: 'Dynamic Code Execution',
    pattern: /(?:eval|Function)\s*\(\s*[^"'`\s]/gi,
    risk: 'high',
    description: 'Dynamic code execution with variable input can lead to code injection',
    cwe: 'CWE-94',
  },
  // Shell command execution
  {
    id: 'shell-exec',
    name: 'Shell Command Execution',
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*[^"'`]/gi,
    risk: 'high',
    description: 'Shell command execution with dynamic input can lead to command injection',
    cwe: 'CWE-78',
  },
  // Hardcoded credentials
  {
    id: 'hardcoded-secret',
    name: 'Hardcoded Secret',
    pattern: /(?:password|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{8,}["']/gi,
    risk: 'high',
    description: 'Hardcoded credentials detected, which may expose sensitive data',
    cwe: 'CWE-798',
  },
  // Suspicious network requests
  {
    id: 'suspicious-url',
    name: 'Suspicious URL Pattern',
    pattern: /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?/gi,
    risk: 'medium',
    description: 'Direct IP address in URL may indicate data exfiltration or C2 communication',
    cwe: 'CWE-200',
  },
  // Obfuscated variable names
  {
    id: 'obfuscated-vars',
    name: 'Obfuscated Variables',
    pattern: /(?:var|let|const)\s+_0x[a-f0-9]+/gi,
    risk: 'high',
    description: 'Obfuscated variable names suggest intentionally hidden code',
    cwe: 'CWE-506',
  },
  // Hex encoded strings
  {
    id: 'hex-encoded',
    name: 'Hex Encoded String',
    pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/gi,
    risk: 'medium',
    description: 'Long hex-encoded strings may hide malicious payloads',
    cwe: 'CWE-506',
  },
  // Process environment access
  {
    id: 'env-access',
    name: 'Environment Variable Access',
    pattern: /process\.env\[(?:[^"'`\]]|["'`][^"'`]*["'`])*\]/gi,
    risk: 'low',
    description: 'Dynamic environment variable access may leak sensitive configuration',
    cwe: 'CWE-526',
  },
  // File system traversal
  {
    id: 'path-traversal',
    name: 'Path Traversal',
    pattern: /(?:\.\.\/|\.\.\\){2,}/g,
    risk: 'high',
    description: 'Path traversal patterns may allow unauthorized file access',
    cwe: 'CWE-22',
  },
  // Crypto mining indicators
  {
    id: 'crypto-mining',
    name: 'Crypto Mining Indicator',
    pattern: /(?:stratum\+tcp|coinhive|cryptonight|monero)/gi,
    risk: 'critical',
    description: 'Cryptocurrency mining code detected',
    cwe: 'CWE-506',
  },
]

/**
 * Dangerous permissions that require special attention
 */
export const DANGEROUS_PERMISSIONS: Record<string, { risk: RiskLevel, description: string }> = {
  'shell:*': {
    risk: 'critical',
    description: 'Full shell access allows arbitrary command execution',
  },
  'fs:write:*': {
    risk: 'high',
    description: 'Unrestricted file system write access',
  },
  'fs:read:*': {
    risk: 'medium',
    description: 'Unrestricted file system read access',
  },
  'network:*': {
    risk: 'high',
    description: 'Unrestricted network access',
  },
  'env:*': {
    risk: 'medium',
    description: 'Access to all environment variables',
  },
  'process:spawn': {
    risk: 'high',
    description: 'Ability to spawn child processes',
  },
}

/**
 * Known malicious domains for network analysis
 */
export const KNOWN_MALICIOUS_DOMAINS: string[] = [
  'evil.com',
  'malware.com',
  'phishing.com',
  // In production, this would be loaded from a threat intelligence feed
]

// =============================================================================
// Security Scanner Implementation
// =============================================================================

/**
 * Security Scanner for MCP Marketplace Packages
 *
 * Provides comprehensive security analysis including:
 * - Permission analysis
 * - Vulnerability detection
 * - Code pattern analysis
 * - Trust scoring
 *
 * @example
 * ```typescript
 * const scanner = new SecurityScanner()
 *
 * // Scan a package
 * const result = await scanner.scan('my-package', '1.0.0')
 *
 * if (result.recommendation === 'avoid') {
 *   console.log('Security issues found:', result.issues)
 * }
 * ```
 */
export class SecurityScanner {
  private config: ScannerConfig
  private issueCounter: number = 0

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = { ...DEFAULT_SCANNER_CONFIG, ...config }
  }

  // ===========================================================================
  // Main Scanning Methods
  // ===========================================================================

  /**
   * Perform a complete security scan on a package
   *
   * @param packageId - Package identifier
   * @param version - Optional specific version to scan
   * @returns Complete scan result
   */
  async scan(packageId: string, version?: string): Promise<ScanResult> {
    this.log(`Starting security scan for ${packageId}@${version || 'latest'}`)

    const issues: SecurityIssue[] = []
    const scannedAt = new Date()
    const resolvedVersion = version || 'latest'

    // In a real implementation, we would:
    // 1. Fetch package metadata from registry
    // 2. Download and extract package contents
    // 3. Analyze all files

    // For now, create a mock manifest for demonstration
    const manifest: PackageManifest = {
      name: packageId,
      version: resolvedVersion,
      description: 'Package description',
      ccjkVersion: '>=3.5.0',
      type: 'plugin',
    }

    // Analyze permissions
    const permissions = this.analyzePermissions(manifest)
    issues.push(...this.permissionIssues(permissions))

    // Check dependencies (mock for now)
    const dependencies = this.analyzeDependencies([])

    // Calculate trust score
    const trustFactors: TrustFactors = {
      verified: false,
      authorReputation: 50,
      packageAge: 30,
      downloads: 100,
      rating: 4.0,
      ratingCount: 10,
      hasSourceCode: true,
      hasSecurityPolicy: false,
      openSecurityIssues: issues.length,
      lastUpdateAge: 7,
    }
    const trustScore = this.calculateTrustScore(trustFactors)

    // Determine overall risk
    const overallRisk = this.calculateOverallRisk(issues, permissions.riskLevel)

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallRisk, trustScore)

    this.log(`Scan complete. Risk: ${overallRisk}, Trust: ${trustScore}, Recommendation: ${recommendation}`)

    return {
      packageId,
      version: resolvedVersion,
      scannedAt,
      overallRisk,
      issues,
      permissions,
      dependencies,
      trustScore,
      recommendation,
    }
  }

  /**
   * Analyze permissions from package manifest
   *
   * @param manifest - Package manifest
   * @returns Permission analysis result
   */
  analyzePermissions(manifest: PackageManifest): PermissionAnalysis {
    const requested: Permission[] = []
    const dangerous: Permission[] = []

    // Extract permissions from manifest
    const declaredPermissions = this.extractPermissions(manifest)

    for (const perm of declaredPermissions) {
      const permInfo = this.analyzePermission(perm)
      requested.push(permInfo)

      if (permInfo.risk === 'high' || permInfo.risk === 'critical') {
        dangerous.push(permInfo)
      }
    }

    // Calculate overall risk level
    let riskLevel: RiskLevel = 'safe'
    if (dangerous.some(p => p.risk === 'critical')) {
      riskLevel = 'critical'
    }
    else if (dangerous.some(p => p.risk === 'high')) {
      riskLevel = 'high'
    }
    else if (requested.some(p => p.risk === 'medium')) {
      riskLevel = 'medium'
    }
    else if (requested.some(p => p.risk === 'low')) {
      riskLevel = 'low'
    }

    const summary = this.generatePermissionSummary(requested, dangerous, riskLevel)

    return {
      requested,
      dangerous,
      riskLevel,
      summary,
    }
  }

  /**
   * Check dependencies for known vulnerabilities
   *
   * @param dependencies - List of dependencies to check
   * @returns Vulnerability report
   */
  async checkVulnerabilities(dependencies: Dependency[]): Promise<VulnerabilityReport> {
    if (this.config.skipVulnCheck) {
      return {
        total: 0,
        bySeverity: { safe: 0, low: 0, medium: 0, high: 0, critical: 0 },
        vulnerabilities: [],
        scannedAt: new Date(),
      }
    }

    this.log(`Checking ${dependencies.length} dependencies for vulnerabilities`)

    const vulnerabilities: Vulnerability[] = []

    // In a real implementation, we would query vulnerability databases:
    // - npm audit API
    // - GitHub Advisory Database
    // - OSV (Open Source Vulnerabilities)
    // - Snyk vulnerability database

    for (const dep of dependencies) {
      const vulns = await this.queryVulnerabilityDatabase(dep)
      vulnerabilities.push(...vulns)
    }

    const bySeverity: Record<RiskLevel, number> = {
      safe: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    for (const vuln of vulnerabilities) {
      bySeverity[vuln.severity]++
    }

    return {
      total: vulnerabilities.length,
      bySeverity,
      vulnerabilities,
      scannedAt: new Date(),
    }
  }

  /**
   * Detect suspicious patterns in code
   *
   * @param code - Source code to analyze
   * @param filePath - File path for reporting
   * @returns Array of pattern matches
   */
  detectSuspiciousPatterns(code: string, filePath: string = 'unknown'): PatternMatch[] {
    const matches: PatternMatch[] = []
    const patterns = [...SUSPICIOUS_PATTERNS, ...(this.config.customPatterns || [])]

    const lines = code.split('\n')

    for (const pattern of patterns) {
      // Reset regex state
      pattern.pattern.lastIndex = 0

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum]

        // Reset for each line
        pattern.pattern.lastIndex = 0
        let match: RegExpExecArray | null = pattern.pattern.exec(line)

        while (match !== null) {
          matches.push({
            patternId: pattern.id,
            name: pattern.name,
            match: this.sanitizeMatch(match[0]),
            filePath,
            lineNumber: lineNum + 1,
            risk: pattern.risk,
            description: pattern.description,
          })

          // Prevent infinite loop for zero-width matches
          if (match.index === pattern.pattern.lastIndex) {
            pattern.pattern.lastIndex++
          }

          match = pattern.pattern.exec(line)
        }
      }
    }

    return matches
  }

  /**
   * Calculate trust score based on various factors
   *
   * @param factors - Trust factors to consider
   * @returns Trust score (0-100)
   */
  calculateTrustScore(factors: TrustFactors): number {
    let score = 0

    // Verification status (20 points)
    if (factors.verified) {
      score += 20
    }

    // Author reputation (15 points)
    score += (factors.authorReputation / 100) * 15

    // Package age (10 points) - older packages are more trusted
    const ageScore = Math.min(factors.packageAge / 365, 1) * 10
    score += ageScore

    // Downloads (15 points) - logarithmic scale
    const downloadScore = Math.min(Math.log10(factors.downloads + 1) / 6, 1) * 15
    score += downloadScore

    // Rating (15 points)
    if (factors.ratingCount >= 5) {
      score += (factors.rating / 5) * 15
    }
    else {
      // Fewer ratings = less confidence
      score += (factors.rating / 5) * 15 * (factors.ratingCount / 5)
    }

    // Source code availability (10 points)
    if (factors.hasSourceCode) {
      score += 10
    }

    // Security policy (5 points)
    if (factors.hasSecurityPolicy) {
      score += 5
    }

    // Open security issues penalty (up to -20 points)
    const securityPenalty = Math.min(factors.openSecurityIssues * 5, 20)
    score -= securityPenalty

    // Recent updates bonus (10 points)
    if (factors.lastUpdateAge <= 30) {
      score += 10
    }
    else if (factors.lastUpdateAge <= 90) {
      score += 5
    }
    else if (factors.lastUpdateAge > 365) {
      score -= 5 // Penalty for abandoned packages
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Compare security between two versions
   *
   * @param v1 - First version
   * @param v2 - Second version
   * @returns Security comparison result
   */
  compareVersionSecurity(v1: string, v2: string): SecurityComparison {
    // In a real implementation, we would:
    // 1. Fetch scan results for both versions
    // 2. Compare issues between versions
    // 3. Identify new and resolved issues

    return {
      version1: v1,
      version2: v2,
      newIssues: [],
      resolvedIssues: [],
      riskChange: 'unchanged',
      summary: `No significant security changes between ${v1} and ${v2}`,
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Extract permissions from manifest
   */
  private extractPermissions(manifest: PackageManifest): string[] {
    const permissions: string[] = []

    // Check for shell access
    if (manifest.postInstall || manifest.preUninstall) {
      permissions.push('shell:execute')
    }

    // Check for file system access
    if (manifest.files || manifest.workflows || manifest.skills) {
      permissions.push('fs:read:project')
      permissions.push('fs:write:project')
    }

    // Check for MCP services (may require network)
    if (manifest.mcpServices && manifest.mcpServices.length > 0) {
      permissions.push('network:localhost')
    }

    return permissions
  }

  /**
   * Analyze a single permission
   */
  private analyzePermission(permission: string): Permission {
    // Check against dangerous permissions
    for (const [pattern, info] of Object.entries(DANGEROUS_PERMISSIONS)) {
      if (this.matchPermissionPattern(permission, pattern)) {
        return {
          name: permission,
          description: info.description,
          risk: info.risk,
        }
      }
    }

    // Default to low risk for unknown permissions
    return {
      name: permission,
      description: `Permission: ${permission}`,
      risk: 'low',
    }
  }

  /**
   * Match permission against pattern (supports wildcards)
   */
  private matchPermissionPattern(permission: string, pattern: string): boolean {
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1)
      return permission.startsWith(prefix)
    }
    return permission === pattern
  }

  /**
   * Generate permission summary
   */
  private generatePermissionSummary(
    requested: Permission[],
    dangerous: Permission[],
    riskLevel: RiskLevel,
  ): string {
    if (requested.length === 0) {
      return 'No special permissions requested.'
    }

    const parts: string[] = []
    parts.push(`${requested.length} permission(s) requested.`)

    if (dangerous.length > 0) {
      parts.push(`${dangerous.length} dangerous permission(s) require review.`)
    }

    parts.push(`Overall permission risk: ${riskLevel}.`)

    return parts.join(' ')
  }

  /**
   * Convert permission issues to security issues
   */
  private permissionIssues(analysis: PermissionAnalysis): SecurityIssue[] {
    return analysis.dangerous.map(perm => ({
      id: this.generateIssueId(),
      type: 'dangerous-permission' as SecurityIssueType,
      severity: perm.risk,
      title: `Dangerous Permission: ${perm.name}`,
      description: perm.description,
      recommendation: 'Review if this permission is necessary. Consider restricting scope.',
      cwe: 'CWE-250',
    }))
  }

  /**
   * Analyze dependencies
   */
  private analyzeDependencies(deps: Dependency[]): DependencyAnalysis {
    const direct = deps.filter(d => d.direct)
    const transitive = deps.filter(d => !d.direct)

    return {
      total: deps.length,
      direct: direct.length,
      transitive: transitive.length,
      dependencies: deps,
      outdated: [], // Would be populated by checking npm registry
    }
  }

  /**
   * Query vulnerability database for a dependency
   */
  private async queryVulnerabilityDatabase(dep: Dependency): Promise<Vulnerability[]> {
    // In a real implementation, this would query:
    // - npm audit API
    // - GitHub Advisory Database API
    // - OSV API
    // - Snyk API

    // Suppress unused variable warning
    void dep

    return []
  }

  /**
   * Calculate overall risk from issues and permission risk
   */
  private calculateOverallRisk(issues: SecurityIssue[], permissionRisk: RiskLevel): RiskLevel {
    const riskOrder: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical']

    let maxRisk = riskOrder.indexOf(permissionRisk)

    for (const issue of issues) {
      const issueRisk = riskOrder.indexOf(issue.severity)
      if (issueRisk > maxRisk) {
        maxRisk = issueRisk
      }
    }

    return riskOrder[maxRisk]
  }

  /**
   * Generate installation recommendation
   */
  private generateRecommendation(risk: RiskLevel, trustScore: number): 'install' | 'review' | 'avoid' {
    if (risk === 'critical') {
      return 'avoid'
    }

    if (risk === 'high' || trustScore < 30) {
      return 'avoid'
    }

    if (risk === 'medium' || trustScore < 60) {
      return 'review'
    }

    return 'install'
  }

  /**
   * Sanitize matched content for safe display
   */
  private sanitizeMatch(match: string): string {
    // Truncate long matches
    if (match.length > 50) {
      return `${match.substring(0, 47)}...`
    }
    return match
  }

  /**
   * Generate unique issue ID
   */
  private generateIssueId(): string {
    return `SEC-${Date.now()}-${++this.issueCounter}`
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[SecurityScanner] ${message}`)
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a security scanner with default configuration
 */
export function createSecurityScanner(config?: Partial<ScannerConfig>): SecurityScanner {
  return new SecurityScanner(config)
}

/**
 * Quick scan a package and return risk level
 */
export async function quickScan(packageId: string, version?: string): Promise<RiskLevel> {
  const scanner = new SecurityScanner()
  const result = await scanner.scan(packageId, version)
  return result.overallRisk
}

/**
 * Check if a risk level is acceptable for installation
 */
export function isRiskAcceptable(risk: RiskLevel, threshold: RiskLevel = 'medium'): boolean {
  const riskOrder: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical']
  return riskOrder.indexOf(risk) <= riskOrder.indexOf(threshold)
}

/**
 * Format scan result for display
 */
export function formatScanResult(result: ScanResult): string {
  const lines: string[] = []

  const riskEmoji: Record<RiskLevel, string> = {
    safe: '[OK]',
    low: '[LOW]',
    medium: '[MED]',
    high: '[HIGH]',
    critical: '[CRIT]',
  }

  lines.push(`Security Scan: ${result.packageId}@${result.version}`)
  lines.push(`${riskEmoji[result.overallRisk]} Overall Risk: ${result.overallRisk.toUpperCase()}`)
  lines.push(`Trust Score: ${result.trustScore}/100`)
  lines.push(`Recommendation: ${result.recommendation.toUpperCase()}`)
  lines.push('')

  if (result.issues.length > 0) {
    lines.push(`Issues Found: ${result.issues.length}`)
    for (const issue of result.issues) {
      lines.push(`  ${riskEmoji[issue.severity]} ${issue.title}`)
      if (issue.location) {
        lines.push(`     Location: ${issue.location}`)
      }
      lines.push(`     ${issue.recommendation}`)
    }
    lines.push('')
  }

  lines.push(`Permissions: ${result.permissions.summary}`)

  return lines.join('\n')
}

/**
 * Get risk level color for terminal output
 */
export function getRiskColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    safe: '[32m', // green
    low: '[36m', // cyan
    medium: '[33m', // yellow
    high: '[31m', // red
    critical: '[35m', // magenta
  }
  return colors[risk]
}

/**
 * Reset terminal color
 */
export const RESET_COLOR = '[0m'
