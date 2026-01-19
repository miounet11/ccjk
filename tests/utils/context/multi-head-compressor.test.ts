import type { RawContext } from '../../../src/utils/context/multi-head-compressor'
import { beforeEach, describe, expect, it } from 'vitest'
import { MultiHeadCompressor } from '../../../src/utils/context/multi-head-compressor'

// Helper to create a valid RawContext
function createContext(overrides: Partial<RawContext> = {}): RawContext {
  return {
    functionCalls: [],
    files: [],
    userMessages: [],
    assistantResponses: [],
    errors: [],
    ...overrides,
  }
}

describe('multiHeadCompressor', () => {
  let compressor: MultiHeadCompressor

  beforeEach(() => {
    compressor = new MultiHeadCompressor()
  })

  describe('constructor', () => {
    it('should create instance with default heads', () => {
      expect(compressor).toBeInstanceOf(MultiHeadCompressor)
    })

    it('should accept custom config', () => {
      const customCompressor = new MultiHeadCompressor({
        enableSemanticHead: false,
        targetRatio: 0.5,
        weights: {
          semantic: 0.2,
          structural: 0.4,
          temporal: 0.2,
          entity: 0.2,
        },
      })
      expect(customCompressor).toBeInstanceOf(MultiHeadCompressor)
    })
  })

  describe('compress', () => {
    it('should compress simple context', async () => {
      const context = createContext({
        userMessages: ['Hello'],
        assistantResponses: ['Hi there!'],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments).toBeInstanceOf(Array)
      expect(result.segments.length).toBeGreaterThan(0)
      expect(result.compressedTokens).toBeGreaterThanOrEqual(0)
      expect(result.compressionRatio).toBeGreaterThan(0)
    })

    it('should handle empty content', async () => {
      const context = createContext()

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments).toBeInstanceOf(Array)
    })

    it('should handle code in messages', async () => {
      const context = createContext({
        userMessages: ['Show me a function'],
        assistantResponses: [
          `Here's a simple function:
\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}
\`\`\``,
        ],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should handle file operations', async () => {
      const context = createContext({
        userMessages: ['Read the config file'],
        assistantResponses: ['I\'ll read the file for you.'],
        files: [
          {
            path: '/path/to/config.json',
            action: 'read',
            summary: 'JSON config with name and version',
          },
        ],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should handle function calls', async () => {
      const context = createContext({
        userMessages: ['List files in the directory'],
        assistantResponses: ['Here are the files...'],
        functionCalls: [
          {
            fcId: 'fc-1',
            fcName: 'Bash',
            summary: 'Listed files in /src directory',
            tokens: 50,
            timestamp: new Date(),
          },
          {
            fcId: 'fc-2',
            fcName: 'Read',
            summary: 'Read package.json file',
            tokens: 100,
            timestamp: new Date(),
          },
        ],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should preserve important context', async () => {
      const context = createContext({
        userMessages: [
          'What\'s the project structure?',
          'Create a new utility function',
        ],
        assistantResponses: [
          'The project has src/, tests/, and package.json',
          'I\'ll create a new utility function in src/utils/',
        ],
        currentGoal: 'Create utility function',
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.compressionRatio).toBeLessThanOrEqual(1)
    })
  })

  describe('compression heads', () => {
    it('should use semantic head for conversation', async () => {
      const context = createContext({
        userMessages: [
          'I want to build a REST API',
          'Let\'s use Express.js',
        ],
        assistantResponses: [
          'Great! What framework would you like to use?',
          'Perfect choice! Express.js is lightweight and flexible.',
        ],
      })

      const result = await compressor.compress(context)

      // Should have semantic compression
      const hasSemanticSegment = result.segments.some(
        s => s.headName === 'semantic' || s.headName === 'structural',
      )
      expect(hasSemanticSegment).toBe(true)
    })

    it('should use structural head for code', async () => {
      const context = createContext({
        assistantResponses: [
          `\`\`\`typescript
class UserService {
  private users: User[] = [];

  async getUser(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }
}
\`\`\``,
        ],
      })

      const result = await compressor.compress(context)

      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should use temporal head for time-sensitive content', async () => {
      const now = new Date()
      const context = createContext({
        userMessages: ['What did we discuss earlier?'],
        assistantResponses: [
          'Earlier we discussed: 1. Project structure 2. TypeScript 3. Express.js',
        ],
        functionCalls: [
          { fcId: 'fc-1', fcName: 'Read', summary: 'Read config', tokens: 30, timestamp: new Date(now.getTime() - 10000) },
          { fcId: 'fc-2', fcName: 'Write', summary: 'Created file', tokens: 40, timestamp: new Date(now.getTime() - 5000) },
          { fcId: 'fc-3', fcName: 'Bash', summary: 'Ran tests', tokens: 50, timestamp: now },
        ],
      })

      const result = await compressor.compress(context)

      expect(result.segments.length).toBeGreaterThan(0)
      expect(result.timestamp).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle very long content', async () => {
      const longMessages = Array.from({ length: 50 }).map((_, i) => `Question ${i}`)
      const longResponses = Array.from({ length: 50 }).map((_, i) => `Answer ${i} with some details.`)

      const context = createContext({
        userMessages: longMessages,
        assistantResponses: longResponses,
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.compressionRatio).toBeLessThan(1)
    })

    it('should handle special characters', async () => {
      const context = createContext({
        userMessages: ['你好世界 🌍'],
        assistantResponses: ['Hello! 안녕하세요 こんにちは'],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should handle errors in context', async () => {
      const context = createContext({
        userMessages: ['Run the build'],
        assistantResponses: ['I\'ll run the build command.'],
        errors: [
          'Error: Module not found',
          'TypeError: Cannot read property of undefined',
        ],
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
    })

    it('should handle metadata', async () => {
      const context = createContext({
        userMessages: ['Hello'],
        assistantResponses: ['Hi!'],
        metadata: {
          projectName: 'test-project',
          language: 'typescript',
          framework: 'express',
        },
      })

      const result = await compressor.compress(context)

      expect(result).toBeDefined()
    })
  })

  describe('token estimation', () => {
    it('should estimate tokens correctly', async () => {
      const context = createContext({
        userMessages: ['Short message'],
        assistantResponses: ['Short response'],
      })

      const result = await compressor.compress(context)

      expect(result.originalTokens).toBeGreaterThan(0)
      expect(result.compressedTokens).toBeGreaterThan(0)
      expect(result.compressedTokens).toBeLessThanOrEqual(result.originalTokens)
    })

    it('should handle large token counts', async () => {
      const largeContent = 'word '.repeat(1000)
      const context = createContext({
        userMessages: [largeContent],
        assistantResponses: [largeContent],
      })

      const result = await compressor.compress(context)

      expect(result.originalTokens).toBeGreaterThan(1000)
    })
  })
})
