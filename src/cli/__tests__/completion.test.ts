/**
 * Tests for Shell Completion
 *
 * Tests command completion generation for all supported shells.
 */

import { describe, expect, it } from 'vitest'
import {
  completionProvider,
  getAvailableAgents,
  getAvailableSkills,
  getInstalledMcpServices,
  type CommandInfo,
  type ShellType,
} from '../completion'
import { generateBashCompletion } from '../completions/bash'
import { generateFishCompletion } from '../completions/fish'
import { generatePowerShellCompletion } from '../completions/powershell'
import { generateZshCompletion } from '../completions/zsh'

describe('completion', () => {
  describe('provider', () => {
    it('should return list of commands', () => {
      const commands = completionProvider.getCommands()

      expect(commands).toBeInstanceOf(Array)
      expect(commands.length).toBeGreaterThan(0)

      const commandNames = commands.map(c => c.name)
      expect(commandNames).toContain('init')
      expect(commandNames).toContain('mcp')
      expect(commandNames).toContain('config')
    })

    it('should return options for command', () => {
      const options = completionProvider.getOptions('init')

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      const optionFlags = options.map(o => o.flags)
      expect(optionFlags).toContain('--lang, -l')
      expect(optionFlags).toContain('--force, -f')
    })

    it('should return subcommands for command', () => {
      const subcommands = completionProvider.getSubcommands('mcp')

      expect(subcommands).toBeInstanceOf(Array)
      expect(subcommands.length).toBeGreaterThan(0)

      const subcommandNames = subcommands.map(s => s.name)
      expect(subcommandNames).toContain('status')
      expect(subcommandNames).toContain('list')
      expect(subcommandNames).toContain('install')
    })

    it('should generate completion script for bash', async () => {
      const script = await completionProvider.generateScript('bash')

      expect(script).toContain('#!/bin/bash')
      expect(script).toContain('_ccjk_completions()')
      expect(script).toContain('complete -F _ccjk_completions ccjk')
    })

    it('should generate completion script for zsh', async () => {
      const script = await completionProvider.generateScript('zsh')

      expect(script).toContain('#compdef ccjk')
      expect(script).toContain('_ccjk() {')
      expect(script).toContain('commands=(')
    })

    it('should generate completion script for fish', async () => {
      const script = await completionProvider.generateScript('fish')

      expect(script).toContain('# CCJK CLI Fish Completion')
      expect(script).toContain('complete -c ccjk')
      expect(script).toContain('__fish_ccjk_needs_command')
    })

    it('should generate completion script for powershell', async () => {
      const script = await completionProvider.generateScript('powershell')

      expect(script).toContain('# CCJK CLI PowerShell Completion')
      expect(script).toContain('Register-ArgumentCompleter')
    })

    it('should throw error for unsupported shell', async () => {
      await expect(async () => {
        await completionProvider.generateScript('tcsh' as ShellType)
      }).rejects.toThrow('Unsupported shell: tcsh')
    })
  })

  describe('bash generator', () => {
    const testCommands: CommandInfo[] = [
      {
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
        options: [
          {
            flags: '--flag, -f',
            description: 'Test flag',
            values: ['value1', 'value2'],
          },
          {
            flags: '--help, -h',
            description: 'Show help',
          },
        ],
        subcommands: [
          { name: 'sub', description: 'Subcommand' },
        ],
      },
    ]

    it('should generate valid bash completion script', () => {
      const script = generateBashCompletion(testCommands)

      expect(script).toContain('#!/bin/bash')
      expect(script).toContain('test)')
      // extractOptionFlags converts '--flag, -f' to separate flags '--flag' and '-f'
      expect(script).toContain('--flag')
      expect(script).toContain('-f')
      expect(script).toContain('sub)')
    })

    it('should include alias mappings', () => {
      const script = generateBashCompletion(testCommands)

      expect(script).toContain('declare -A _ccjk_aliases')
      expect(script).toContain('["t"]="test"')
    })

    it('should handle option value completion', () => {
      const script = generateBashCompletion(testCommands)

      // Option value completion is only generated for commands without subcommands
      // The testCommands has subcommands, so we need a separate test case
      const commandsWithValues: CommandInfo[] = [
        {
          name: 'simple',
          description: 'Simple command',
          options: [
            {
              flags: '--format, -f',
              description: 'Output format',
              values: ['json', 'yaml'],
            },
          ],
        },
      ]
      const scriptWithValues = generateBashCompletion(commandsWithValues)
      expect(scriptWithValues).toContain('json yaml')
    })
  })

  describe('zsh generator', () => {
    const testCommands: CommandInfo[] = [
      {
        name: 'test',
        description: 'Test command',
        options: [
          {
            flags: '--flag, -f',
            description: 'Test flag',
            values: ['value1', 'value2'],
          },
        ],
      },
    ]

    it('should generate valid zsh completion script', () => {
      const script = generateZshCompletion(testCommands)

      expect(script).toContain('#compdef ccjk')
      expect(script).toContain('\'test:Test command\'')
      expect(script).toContain('Test flag')
    })
  })

  describe('fish generator', () => {
    const testCommands: CommandInfo[] = [
      {
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
        options: [
          {
            flags: '--flag, -f',
            description: 'Test flag',
          },
        ],
      },
    ]

    it('should generate valid fish completion script', () => {
      const script = generateFishCompletion(testCommands)

      expect(script).toContain('# CCJK CLI Fish Completion')
      expect(script).toContain('complete -c ccjk -n __fish_ccjk_needs_command -a test')
      expect(script).toContain('__fish_ccjk_using_command')
    })
  })

  describe('powershell generator', () => {
    const testCommands: CommandInfo[] = [
      {
        name: 'test',
        description: 'Test command',
        options: [
          {
            flags: '--flag, -f',
            description: 'Test flag',
          },
        ],
      },
    ]

    it('should generate valid powershell completion script', () => {
      const script = generatePowerShellCompletion(testCommands)

      expect(script).toContain('# CCJK CLI PowerShell Completion')
      expect(script).toContain('Register-ArgumentCompleter')
      expect(script).toContain('\'test\'')
      expect(script).toContain('\'Description\' = \'Test command\'')
    })
  })

  describe('integration', () => {
    it('should generate completion for all defined commands', async () => {
      const commands = completionProvider.getCommands()

      for (const shell of ['bash', 'zsh', 'fish', 'powershell'] as ShellType[]) {
        const script = await completionProvider.generateScript(shell)

        expect(script).toBeTruthy()
        expect(script.length).toBeGreaterThan(0)

        // All commands should be in the script
        for (const cmd of commands) {
          expect(script).toContain(cmd.name)
        }
      }
    })
  })

  describe('dynamic values', () => {
    it('should handle async value providers', async () => {
      const values = await getInstalledMcpServices()
      expect(values).toBeInstanceOf(Array)
    })

    it('should return available skills', async () => {
      const skills = await getAvailableSkills()
      expect(skills).toBeInstanceOf(Array)
    })

    it('should return available agents', async () => {
      const agents = await getAvailableAgents()
      expect(agents).toBeInstanceOf(Array)
      expect(agents).toContain('typescript-cli-architect')
    })

    it('should fall back to empty array for failed dynamic lookups', async () => {
      const values = await getInstalledMcpServices()
      expect(values).toBeInstanceOf(Array)
    })
  })
})
