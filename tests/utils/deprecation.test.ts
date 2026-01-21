/**
 * Tests for Deprecation System
 */

import type { DeprecationWarning } from '../../src/utils/deprecation'
import { describe, expect, it } from 'vitest'
import {
  DEPRECATED_COMMANDS,

  getAllDeprecated,
  getCommandsRemovedIn,
  getDeprecationInfo,
  isDeprecated,
  showDeprecationWarning,
} from '../../src/utils/deprecation'

describe('deprecation System', () => {
  describe('isDeprecated', () => {
    it('should return true for deprecated commands', () => {
      expect(isDeprecated('daemon')).toBe(true)
      expect(isDeprecated('mcp-doctor')).toBe(true)
    })

    it('should return false for active commands', () => {
      expect(isDeprecated('init')).toBe(false)
      expect(isDeprecated('mcp')).toBe(false)
    })
  })

  describe('getDeprecationInfo', () => {
    it('should return info for deprecated command', () => {
      const info = getDeprecationInfo('daemon')
      expect(info).not.toBeNull()
      expect(info?.command).toBe('daemon')
      expect(info?.removedIn).toBe('4.0.0')
    })

    it('should return null for active command', () => {
      const info = getDeprecationInfo('init')
      expect(info).toBeNull()
    })
  })

  describe('getAllDeprecated', () => {
    it('should return all deprecated commands', () => {
      const all = getAllDeprecated()
      expect(all.length).toBeGreaterThan(0)
      expect(all[0]).toHaveProperty('command')
      expect(all[0]).toHaveProperty('replacement')
    })
  })

  describe('getCommandsRemovedIn', () => {
    it('should filter by removal version', () => {
      const v4Commands = getCommandsRemovedIn('4.0.0')
      expect(v4Commands.length).toBeGreaterThan(0)
      v4Commands.forEach((cmd) => {
        expect(cmd.removedIn).toBe('4.0.0')
      })
    })
  })

  describe('dEPRECATED_COMMANDS', () => {
    it('should have all required fields', () => {
      Object.values(DEPRECATED_COMMANDS).forEach((cmd: DeprecationWarning) => {
        expect(cmd).toHaveProperty('command')
        expect(cmd).toHaveProperty('deprecatedIn')
        expect(cmd).toHaveProperty('removedIn')
        expect(cmd).toHaveProperty('replacement')
        expect(cmd).toHaveProperty('reason')
      })
    })
  })
})
