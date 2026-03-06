import { describe, expect, it } from 'vitest'
import { SemanticCompressor } from '../../src/context/semantic-compressor'

describe('semanticCompressor', () => {
  const compressor = new SemanticCompressor()

  describe('message compression', () => {
    it('keeps recent messages intact', () => {
      const messages = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'Message 2' },
        { role: 'assistant' as const, content: 'Response 2' },
      ]

      const compressed = compressor.compress(messages)

      expect(compressed.length).toBe(4)
      expect(compressed).toEqual(messages)
    })

    it('compresses old messages', () => {
      const messages = new Array(20).fill(null).map((_, i) => ([
        { role: 'user' as const, content: `User message ${i}: ${'x'.repeat(500)}` },
        { role: 'assistant' as const, content: `Assistant response ${i}: ${'y'.repeat(500)}` },
      ])).flat()

      const compressed = compressor.compress(messages)

      expect(compressed.length).toBeLessThan(messages.length)

      // Recent 5 messages should be intact
      const recent = compressed.slice(-5)
      const originalRecent = messages.slice(-5)
      expect(recent).toEqual(originalRecent)
    })
  })

  describe('intent extraction', () => {
    it('extracts action keywords', () => {
      const content = 'Please refactor the authentication module and fix the bug in login.ts'
      const compressed = compressor.extractIntent(content)

      expect(compressed).toContain('refactor')
      expect(compressed).toContain('fix')
      expect(compressed).toContain('login.ts')
    })

    it('extracts entities', () => {
      const content = 'Update the UserService class in src/services/user.ts'
      const compressed = compressor.extractIntent(content)

      expect(compressed).toContain('UserService')
      expect(compressed).toContain('src/services/user.ts')
    })
  })

  describe('decision extraction', () => {
    it('extracts decisions from assistant messages', () => {
      const content = `
I recommend using TypeScript for type safety.
We should implement error handling with try-catch.
Avoid using any type.
      `.trim()

      const compressed = compressor.extractDecisions(content)

      expect(compressed).toContain('recommend')
      expect(compressed).toContain('should')
      expect(compressed).toContain('Avoid')
    })

    it('counts code blocks', () => {
      const content = `
Here's the solution:

\`\`\`typescript
function foo() {}
\`\`\`

And another example:

\`\`\`typescript
function bar() {}
\`\`\`
      `.trim()

      const compressed = compressor.extractDecisions(content)

      expect(compressed).toContain('[2 code blocks]')
    })
  })

  describe('compression stats', () => {
    it('calculates compression ratio', () => {
      const original = new Array(20).fill(null).map((_unused, _i) => ({
        role: 'user' as const,
        content: 'x'.repeat(1000),
      }))

      const compressed = compressor.compress(original)
      const stats = compressor.getStats(original, compressed)

      expect(stats.compressionRatio).toBeGreaterThan(0)
      expect(stats.compressedSize).toBeLessThan(stats.originalSize)
    })
  })
})
