import type { AutoMemoryEntry } from '../../src/brain/auto-memory-bridge.js'
import type { BrainContext } from '../../src/brain/types.js'
import { describe, expect, it } from 'vitest'
import {

  autoMemoryToBrainContext,
  brainContextToAutoMemory,
  parseAutoMemory,
} from '../../src/brain/auto-memory-bridge.js'

describe('auto-memory-bridge', () => {
  describe('parseAutoMemory', () => {
    it('should parse markdown headers and content', () => {
      const markdown = `# CCJK Project Memory

## Architecture
- ccjk-public is based on zcf
- Core init/menu flow should match zcf's behavior

## Key Files
- src/commands/menu.ts - Main menu
- src/commands/init.ts - Full init flow

### Critical Pattern
Menu option 1 must call init()`

      const entries = parseAutoMemory(markdown)

      // Only entries with content are included (empty headers skipped)
      expect(entries).toHaveLength(3)
      expect(entries[0].title).toBe('Architecture')
      expect(entries[0].level).toBe(2)
      expect(entries[0].content).toContain('- ccjk-public is based on zcf')
      expect(entries[1].title).toBe('Key Files')
      expect(entries[2].title).toBe('Critical Pattern')
      expect(entries[2].level).toBe(3)
      expect(entries[2].content).toContain('Menu option 1 must call init()')
    })

    it('should handle empty content', () => {
      const entries = parseAutoMemory('')
      expect(entries).toHaveLength(0)
    })

    it('should skip empty entries', () => {
      const markdown = `# Title

## Empty Section

## Real Section
Some content`

      const entries = parseAutoMemory(markdown)
      expect(entries).toHaveLength(1)
      expect(entries[0].title).toBe('Real Section')
    })
  })

  describe('autoMemoryToBrainContext', () => {
    it('should categorize architecture entries as patterns', () => {
      const entries: AutoMemoryEntry[] = [
        {
          title: 'Architecture Overview',
          content: ['System uses microservices'],
          level: 2,
        },
      ]

      const context = autoMemoryToBrainContext(entries, '/test/project')

      expect(context.patterns).toHaveLength(1)
      expect(context.patterns[0].name).toBe('Architecture Overview')
      expect(context.patterns[0].category).toBe('architecture')
    })

    it('should categorize decision entries as decisions', () => {
      const entries: AutoMemoryEntry[] = [
        {
          title: 'Why we chose TypeScript',
          content: ['Better type safety'],
          level: 2,
        },
      ]

      const context = autoMemoryToBrainContext(entries, '/test/project')

      expect(context.decisions).toHaveLength(1)
      expect(context.decisions[0].decision).toBe('Why we chose TypeScript')
    })

    it('should default to facts for other entries', () => {
      const entries: AutoMemoryEntry[] = [
        {
          title: 'Key Files',
          content: ['src/main.ts - Entry point'],
          level: 2,
        },
      ]

      const context = autoMemoryToBrainContext(entries, '/test/project')

      expect(context.facts).toHaveLength(1)
      expect(context.facts[0].key).toBe('Key Files')
    })

    it('should include metadata', () => {
      const entries: AutoMemoryEntry[] = []
      const context = autoMemoryToBrainContext(entries, '/test/project')

      expect(context.metadata.source).toBe('auto-memory')
      expect(context.metadata.projectPath).toBe('/test/project')
      expect(context.metadata.syncedAt).toBeDefined()
    })
  })

  describe('brainContextToAutoMemory', () => {
    it('should generate markdown from brain context', () => {
      const context: BrainContext = {
        facts: [
          { key: 'Test Fact', value: 'Fact content', confidence: 0.9 },
        ],
        patterns: [
          {
            name: 'Test Pattern',
            description: 'Pattern description',
            category: 'architecture',
          },
        ],
        decisions: [
          {
            decision: 'Test Decision',
            rationale: 'Decision rationale',
            timestamp: '2026-02-28',
          },
        ],
        metadata: {},
      }

      const markdown = brainContextToAutoMemory(context)

      expect(markdown).toContain('# CCJK Brain Memory')
      expect(markdown).toContain('## Key Facts')
      expect(markdown).toContain('### Test Fact')
      expect(markdown).toContain('## Patterns & Architecture')
      expect(markdown).toContain('### Test Pattern')
      expect(markdown).toContain('## Decisions')
      expect(markdown).toContain('### Test Decision')
    })

    it('should handle empty context', () => {
      const context: BrainContext = {
        facts: [],
        patterns: [],
        decisions: [],
        metadata: {},
      }

      const markdown = brainContextToAutoMemory(context)

      expect(markdown).toContain('# CCJK Brain Memory')
      expect(markdown).not.toContain('## Key Facts')
      expect(markdown).not.toContain('## Patterns')
      expect(markdown).not.toContain('## Decisions')
    })
  })
})
