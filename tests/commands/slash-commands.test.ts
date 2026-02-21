/**
 * Tests for slash commands system
 */

import { describe, expect, it, vi } from 'vitest'
import { executeSlashCommand, getSlashCommands, isSlashCommand, parseSlashCommand } from '../../src/commands/slash-commands'

describe('Slash Commands', () => {
  describe('parseSlashCommand', () => {
    it('should parse valid slash command', () => {
      const result = parseSlashCommand('/status')
      expect(result).toEqual({ command: 'status', args: [] })
    })

    it('should parse slash command with arguments', () => {
      const result = parseSlashCommand('/search authentication logic')
      expect(result).toEqual({ command: 'search', args: ['authentication', 'logic'] })
    })

    it('should handle leading/trailing whitespace', () => {
      const result = parseSlashCommand('  /health  ')
      expect(result).toEqual({ command: 'health', args: [] })
    })

    it('should return null for non-slash input', () => {
      const result = parseSlashCommand('status')
      expect(result).toBeNull()
    })

    it('should handle empty input', () => {
      const result = parseSlashCommand('')
      expect(result).toBeNull()
    })

    it('should convert command to lowercase', () => {
      const result = parseSlashCommand('/STATUS')
      expect(result).toEqual({ command: 'status', args: [] })
    })
  })

  describe('isSlashCommand', () => {
    it('should return true for slash commands', () => {
      expect(isSlashCommand('/status')).toBe(true)
      expect(isSlashCommand('  /health  ')).toBe(true)
    })

    it('should return false for non-slash input', () => {
      expect(isSlashCommand('status')).toBe(false)
      expect(isSlashCommand('help')).toBe(false)
      expect(isSlashCommand('')).toBe(false)
    })
  })

  describe('getSlashCommands', () => {
    it('should return all registered commands', () => {
      const commands = getSlashCommands()
      expect(commands.length).toBeGreaterThan(0)
    })

    it('should include required command properties', () => {
      const commands = getSlashCommands()
      commands.forEach(cmd => {
        expect(cmd).toHaveProperty('name')
        expect(cmd).toHaveProperty('description')
        expect(cmd).toHaveProperty('descriptionZh')
        expect(cmd).toHaveProperty('category')
        expect(cmd).toHaveProperty('handler')
        expect(typeof cmd.handler).toBe('function')
      })
    })

    it('should include core commands', () => {
      const commands = getSlashCommands()
      const commandNames = commands.map(cmd => cmd.name)
      expect(commandNames).toContain('status')
      expect(commandNames).toContain('health')
      expect(commandNames).toContain('search')
      expect(commandNames).toContain('compress')
      expect(commandNames).toContain('help')
    })

    it('should categorize commands correctly', () => {
      const commands = getSlashCommands()
      const categories = new Set(commands.map(cmd => cmd.category))
      expect(categories).toContain('brain')
      expect(categories).toContain('context')
      expect(categories).toContain('system')
    })
  })

  describe('executeSlashCommand', () => {
    it('should return false for non-slash input', async () => {
      const result = await executeSlashCommand('status')
      expect(result).toBe(false)
    })

    it('should return true for unknown slash command', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const result = await executeSlashCommand('/unknown')
      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle command aliases', async () => {
      const commands = getSlashCommands()
      const statusCmd = commands.find(cmd => cmd.name === 'status')
      expect(statusCmd?.aliases).toBeDefined()
    })
  })

  describe('Command Aliases', () => {
    it('should have aliases for common commands', () => {
      const commands = getSlashCommands()
      const aliasMap = new Map<string, string[]>()

      commands.forEach(cmd => {
        if (cmd.aliases) {
          aliasMap.set(cmd.name, cmd.aliases)
        }
      })

      // Check specific aliases
      expect(aliasMap.get('status')).toContain('s')
      expect(aliasMap.get('health')).toContain('h')
      expect(aliasMap.get('tasks')).toContain('t')
      expect(aliasMap.get('help')).toContain('?')
    })
  })

  describe('Command Categories', () => {
    it('should group brain commands correctly', () => {
      const commands = getSlashCommands()
      const brainCommands = commands.filter(cmd => cmd.category === 'brain')
      const brainNames = brainCommands.map(cmd => cmd.name)

      expect(brainNames).toContain('status')
      expect(brainNames).toContain('health')
      expect(brainNames).toContain('tasks')
    })

    it('should group context commands correctly', () => {
      const commands = getSlashCommands()
      const contextCommands = commands.filter(cmd => cmd.category === 'context')
      const contextNames = contextCommands.map(cmd => cmd.name)

      expect(contextNames).toContain('search')
      expect(contextNames).toContain('compress')
      expect(contextNames).toContain('optimize')
    })

    it('should group system commands correctly', () => {
      const commands = getSlashCommands()
      const systemCommands = commands.filter(cmd => cmd.category === 'system')
      const systemNames = systemCommands.map(cmd => cmd.name)

      expect(systemNames).toContain('backup')
      expect(systemNames).toContain('help')
    })
  })
})
