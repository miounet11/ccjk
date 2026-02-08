/**
 * Security Module
 * 安全模块
 *
 * @version 8.0.0
 * @module security
 */

/**
 * Permission Level
 */
export type PermissionLevel = 'read' | 'write' | 'execute' | 'delete'

/**
 * Permission Rule
 */
export interface PermissionRule {
  pattern: string
  level: PermissionLevel
  allowed: boolean
  reason?: string
}

/**
 * Process Info
 */
export interface ProcessInfo {
  pid: number
  command: string
  startTime: number
  status: 'running' | 'completed' | 'failed'
}

/**
 * Permission Manager
 * Manages file and command permissions
 */
export class PermissionManager {
  private rules: PermissionRule[]
  private deniedPatterns: Set<string>

  constructor() {
    this.rules = []
    this.deniedPatterns = new Set([
      '**/.env',
      '**/.env.*',
      '**/credentials.json',
      '**/secrets.json',
      '**/*.key',
      '**/*.pem',
      '**/id_rsa',
      '**/id_dsa',
    ])

    this.initializeDefaultRules()
  }

  /**
   * Initialize default security rules
   */
  private initializeDefaultRules(): void {
    // Deny access to sensitive files
    for (const pattern of this.deniedPatterns) {
      this.rules.push({
        pattern,
        level: 'read',
        allowed: false,
        reason: 'Sensitive file',
      })
    }

    // Deny destructive git commands
    this.rules.push(
      {
        pattern: 'git push --force',
        level: 'execute',
        allowed: false,
        reason: 'Destructive operation',
      },
      {
        pattern: 'git reset --hard',
        level: 'execute',
        allowed: false,
        reason: 'Destructive operation',
      },
      {
        pattern: 'git clean -f',
        level: 'execute',
        allowed: false,
        reason: 'Destructive operation',
      },
    )
  }

  /**
   * Check if operation is allowed
   */
  checkPermission(target: string, level: PermissionLevel): {
    allowed: boolean
    reason?: string
  } {
    for (const rule of this.rules) {
      if (this.matchPattern(target, rule.pattern) && rule.level === level) {
        return {
          allowed: rule.allowed,
          reason: rule.reason,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Add custom rule
   */
  addRule(rule: PermissionRule): void {
    this.rules.push(rule)
  }

  /**
   * Check if file is sensitive
   */
  isSensitiveFile(filePath: string): boolean {
    const normalized = filePath.toLowerCase()

    // Check against denied patterns
    for (const pattern of this.deniedPatterns) {
      if (this.matchPattern(normalized, pattern)) {
        return true
      }
    }

    // Check for common sensitive keywords
    const sensitiveKeywords = [
      'password',
      'secret',
      'token',
      'api_key',
      'apikey',
      'credential',
      'private',
    ]

    return sensitiveKeywords.some(keyword => normalized.includes(keyword))
  }

  /**
   * Match glob pattern
   */
  private matchPattern(target: string, pattern: string): boolean {
    // Simple glob matching (can be enhanced with a proper glob library)
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')

    return new RegExp(`^${regex}$`).test(target)
  }
}

/**
 * Process Manager
 * Manages and tracks spawned processes
 */
export class ProcessManager {
  private processes: Map<number, ProcessInfo>
  private maxProcesses: number

  constructor(maxProcesses: number = 50) {
    this.processes = new Map()
    this.maxProcesses = maxProcesses
  }

  /**
   * Register a process
   */
  register(pid: number, command: string): void {
    if (this.processes.size >= this.maxProcesses) {
      throw new Error('Maximum number of processes reached')
    }

    this.processes.set(pid, {
      pid,
      command,
      startTime: Date.now(),
      status: 'running',
    })
  }

  /**
   * Unregister a process
   */
  unregister(pid: number, status: 'completed' | 'failed'): void {
    const info = this.processes.get(pid)
    if (info) {
      info.status = status
      // Keep in map for a while for debugging
      setTimeout(() => {
        this.processes.delete(pid)
      }, 60000) // Remove after 1 minute
    }
  }

  /**
   * Get all running processes
   */
  getRunning(): ProcessInfo[] {
    return Array.from(this.processes.values()).filter(p => p.status === 'running')
  }

  /**
   * Kill all processes
   */
  async killAll(): Promise<void> {
    const running = this.getRunning()

    for (const info of running) {
      try {
        process.kill(info.pid, 'SIGTERM')
        this.unregister(info.pid, 'failed')
      }
      catch (_error) {
        // Process might already be dead
      }
    }
  }

  /**
   * Kill a specific process
   */
  async kill(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 'SIGTERM')
      this.unregister(pid, 'failed')
      return true
    }
    catch (_error) {
      return false
    }
  }

  /**
   * Get process info
   */
  getInfo(pid: number): ProcessInfo | undefined {
    return this.processes.get(pid)
  }

  /**
   * Clean up zombie processes
   */
  async cleanup(): Promise<number> {
    let cleaned = 0
    const now = Date.now()

    for (const [pid, info] of this.processes) {
      // Clean up processes older than 1 hour
      if (now - info.startTime > 3600000) {
        try {
          process.kill(pid, 0) // Check if process exists
        }
        catch (_error) {
          // Process doesn't exist, remove it
          this.processes.delete(pid)
          cleaned++
        }
      }
    }

    return cleaned
  }
}

/**
 * Command Validator
 * Validates shell commands for security issues
 */
export class CommandValidator {
  private dangerousPatterns: RegExp[]

  constructor() {
    this.dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /:\(\)\{\s*:\|:&\s*\};:/, // Fork bomb
      />\s*\/dev\/sda/, // Write to disk
      /dd\s+if=.*of=\/dev/, // Disk operations
      /mkfs/, // Format filesystem
      /curl.*\|\s*bash/, // Pipe to bash
      /wget.*\|\s*sh/, // Pipe to shell
    ]
  }

  /**
   * Validate command
   */
  validate(command: string): {
    safe: boolean
    reason?: string
  } {
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: 'Potentially dangerous command detected',
        }
      }
    }

    // Check for shell continuation bypass
    if (command.includes('\\') && command.includes('\n')) {
      return {
        safe: false,
        reason: 'Shell continuation character detected',
      }
    }

    return { safe: true }
  }

  /**
   * Sanitize command
   */
  sanitize(command: string): string {
    // Remove shell continuation characters
    return command.replace(/\\\n/g, ' ')
  }
}
