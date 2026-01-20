/**
 * Security Manager
 * Handles email whitelist, command whitelist/blacklist, and security checks
 */

import type { DaemonConfig, SecurityCheckResult } from '../types'

export class SecurityManager {
  private allowedSenders: Set<string>
  private allowedCommands: Set<string>
  private blockedCommands: Set<string>

  constructor(config: DaemonConfig) {
    this.allowedSenders = new Set(config.allowedSenders)
    this.allowedCommands = new Set(config.allowedCommands || this.getDefaultAllowedCommands())
    this.blockedCommands = new Set(config.blockedCommands || this.getDefaultBlockedCommands())
  }

  /**
   * Check if sender is allowed
   */
  checkSender(email: string): SecurityCheckResult {
    const normalizedEmail = email.toLowerCase().trim()

    if (this.allowedSenders.has(normalizedEmail)) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Sender ${email} is not in the whitelist`,
    }
  }

  /**
   * Check if command is allowed
   */
  checkCommand(command: string): SecurityCheckResult {
    const normalizedCommand = command.trim()

    // Check blocked commands first
    for (const blocked of this.blockedCommands) {
      if (normalizedCommand.includes(blocked)) {
        return {
          allowed: false,
          reason: `Command contains blocked pattern: ${blocked}`,
        }
      }
    }

    // If allowedCommands is empty, allow all (except blocked)
    if (this.allowedCommands.size === 0) {
      return { allowed: true }
    }

    // Check if command starts with allowed pattern
    for (const allowed of this.allowedCommands) {
      if (normalizedCommand.startsWith(allowed)) {
        return { allowed: true }
      }
    }

    return {
      allowed: false,
      reason: `Command does not match any allowed pattern`,
    }
  }

  /**
   * Perform full security check
   */
  performSecurityCheck(sender: string, command: string): SecurityCheckResult {
    // Check sender
    const senderCheck = this.checkSender(sender)
    if (!senderCheck.allowed) {
      return senderCheck
    }

    // Check command
    const commandCheck = this.checkCommand(command)
    if (!commandCheck.allowed) {
      return commandCheck
    }

    return { allowed: true }
  }

  /**
   * Add allowed sender
   */
  addAllowedSender(email: string): void {
    this.allowedSenders.add(email.toLowerCase().trim())
  }

  /**
   * Remove allowed sender
   */
  removeAllowedSender(email: string): void {
    this.allowedSenders.delete(email.toLowerCase().trim())
  }

  /**
   * Get default allowed commands
   */
  private getDefaultAllowedCommands(): string[] {
    return [
      'npm test',
      'npm run',
      'pnpm test',
      'pnpm run',
      'yarn test',
      'yarn run',
      'git status',
      'git log',
      'git diff',
      'claude',
      'ccjk',
      'status',
      'echo',
      'ls',
      'pwd',
    ]
  }

  /**
   * Get default blocked commands
   */
  private getDefaultBlockedCommands(): string[] {
    return [
      'rm -rf',
      'rm -fr',
      'sudo',
      'su',
      'chmod 777',
      'chown',
      'git push --force',
      'git push -f',
      'dd if=',
      'mkfs',
      'format',
      ':(){:|:&};:',
      'curl | sh',
      'wget | sh',
      'eval',
      'exec',
    ]
  }
}
