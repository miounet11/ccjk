/**
 * Unit tests for parser-patterns.ts
 */

import { describe, expect, it } from 'vitest'
import {
  estimateTokens,
  extractErrorMessage,
  extractParameter,
  extractSystemMessage,
  extractToolName,
  getToolCategory,
  isFunctionCallsEnd,
  isFunctionCallsStart,
  isFunctionResultsEnd,
  isFunctionResultsStart,
  isInvokeEnd,
  isInvokeStart,
  isKnownTool,
  KNOWN_TOOLS,
  PARSER_CONFIG,
  TOKEN_ESTIMATION,
  TOOL_CATEGORIES,
  TOOL_PATTERNS,
  truncateText,
} from '../../../../src/utils/context/parser-patterns'

describe('parser-patterns', () => {
  describe('tOOL_PATTERNS', () => {
    it('should match function_calls start tag', () => {
      expect(TOOL_PATTERNS.FUNCTION_CALLS_START.test('<function_calls>')).toBe(true)
      expect(TOOL_PATTERNS.FUNCTION_CALLS_START.test('</function_calls>')).toBe(false)
      expect(TOOL_PATTERNS.FUNCTION_CALLS_START.test('<function_calls')).toBe(false)
    })

    it('should match function_calls end tag', () => {
      expect(TOOL_PATTERNS.FUNCTION_CALLS_END.test('</function_calls>')).toBe(true)
      expect(TOOL_PATTERNS.FUNCTION_CALLS_END.test('<function_calls>')).toBe(false)
    })

    it('should match invoke start tag and capture tool name', () => {
      const match = '<invoke name="Read">'.match(TOOL_PATTERNS.INVOKE_START)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('Read')
    })

    it('should match invoke end tag', () => {
      expect(TOOL_PATTERNS.INVOKE_END.test('</invoke>')).toBe(true)
      expect(TOOL_PATTERNS.INVOKE_END.test('<invoke>')).toBe(false)
    })

    it('should match parameter tag and capture name and value', () => {
      const match = '<parameter name="file_path">/path/to/file.ts</parameter>'.match(TOOL_PATTERNS.PARAMETER)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('file_path')
      expect(match![2]).toBe('/path/to/file.ts')
    })

    it('should match parameter start tag', () => {
      const match = '<parameter name="content">'.match(TOOL_PATTERNS.PARAMETER_START)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('content')
    })

    it('should match parameter end tag', () => {
      expect(TOOL_PATTERNS.PARAMETER_END.test('</parameter>')).toBe(true)
    })

    it('should match function_results start tag', () => {
      expect(TOOL_PATTERNS.FUNCTION_RESULTS_START.test('<function_results>')).toBe(true)
    })

    it('should match function_results end tag', () => {
      expect(TOOL_PATTERNS.FUNCTION_RESULTS_END.test('</function_results>')).toBe(true)
    })

    it('should match system message and capture content', () => {
      const match = '<system>Tool ran without output or errors</system>'.match(TOOL_PATTERNS.SYSTEM_MESSAGE)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('Tool ran without output or errors')
    })

    it('should match error message and capture content', () => {
      const match = '<error>File not found</error>'.match(TOOL_PATTERNS.ERROR_MESSAGE)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('File not found')
    })

    it('should match system warning', () => {
      const match = '<system-warning>Token usage: 1000/200000</system-warning>'.match(TOOL_PATTERNS.SYSTEM_WARNING)
      expect(match).toBeTruthy()
      expect(match![1]).toBe('Token usage: 1000/200000')
    })
  })

  describe('kNOWN_TOOLS', () => {
    it('should include basic tools', () => {
      expect(KNOWN_TOOLS).toContain('Read')
      expect(KNOWN_TOOLS).toContain('Write')
      expect(KNOWN_TOOLS).toContain('Edit')
      expect(KNOWN_TOOLS).toContain('Bash')
      expect(KNOWN_TOOLS).toContain('Grep')
      expect(KNOWN_TOOLS).toContain('Glob')
    })

    it('should include MCP tools', () => {
      expect(KNOWN_TOOLS).toContain('mcp__ide__getDiagnostics')
      expect(KNOWN_TOOLS).toContain('mcp__Playwright__browser_click')
      expect(KNOWN_TOOLS).toContain('mcp__context7__query-docs')
    })

    it('should include workflow tools', () => {
      expect(KNOWN_TOOLS).toContain('Skill')
      expect(KNOWN_TOOLS).toContain('TodoWrite')
    })
  })

  describe('tOOL_CATEGORIES', () => {
    it('should categorize file operations', () => {
      expect(TOOL_CATEGORIES.FILE_OPERATIONS).toContain('Read')
      expect(TOOL_CATEGORIES.FILE_OPERATIONS).toContain('Write')
      expect(TOOL_CATEGORIES.FILE_OPERATIONS).toContain('Edit')
      expect(TOOL_CATEGORIES.FILE_OPERATIONS).toContain('Glob')
    })

    it('should categorize search tools', () => {
      expect(TOOL_CATEGORIES.SEARCH).toContain('Grep')
      expect(TOOL_CATEGORIES.SEARCH).toContain('WebSearch')
    })

    it('should categorize execution tools', () => {
      expect(TOOL_CATEGORIES.EXECUTION).toContain('Bash')
      expect(TOOL_CATEGORIES.EXECUTION).toContain('mcp__ide__executeCode')
    })

    it('should categorize browser tools', () => {
      expect(TOOL_CATEGORIES.BROWSER).toContain('mcp__Playwright__browser_click')
      expect(TOOL_CATEGORIES.BROWSER).toContain('mcp__Playwright__browser_navigate')
    })
  })

  describe('tOKEN_ESTIMATION', () => {
    it('should have correct constants', () => {
      expect(TOKEN_ESTIMATION.CHARS_PER_TOKEN_EN).toBe(4)
      expect(TOKEN_ESTIMATION.CHARS_PER_TOKEN_ZH).toBe(1.5)
      expect(TOKEN_ESTIMATION.MAX_RESULT_LENGTH).toBe(10000)
      expect(TOKEN_ESTIMATION.MAX_ARG_LENGTH).toBe(5000)
    })
  })

  describe('pARSER_CONFIG', () => {
    it('should have correct constants', () => {
      expect(PARSER_CONFIG.BUFFER_SIZE).toBe(8192)
      expect(PARSER_CONFIG.TOOL_TIMEOUT).toBe(300000)
      expect(PARSER_CONFIG.EVENT_DEBOUNCE).toBe(100)
      expect(PARSER_CONFIG.MAX_INCOMPLETE_TOOLS).toBe(10)
    })
  })

  describe('estimateTokens', () => {
    it('should estimate tokens for English text', () => {
      const text = 'Hello world this is a test'
      const tokens = estimateTokens(text)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(text.length)
    })

    it('should estimate tokens for Chinese text', () => {
      const text = '你好世界这是一个测试'
      const tokens = estimateTokens(text)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeGreaterThan(text.length / 2)
    })

    it('should estimate tokens for mixed text', () => {
      const text = 'Hello 你好 World 世界'
      const tokens = estimateTokens(text)
      expect(tokens).toBeGreaterThan(0)
    })

    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0)
    })

    it('should handle null/undefined gracefully', () => {
      expect(estimateTokens(null as any)).toBe(0)
      expect(estimateTokens(undefined as any)).toBe(0)
    })
  })

  describe('truncateText', () => {
    it('should not truncate text shorter than max length', () => {
      const text = 'Short text'
      expect(truncateText(text, 100)).toBe(text)
    })

    it('should truncate text longer than max length', () => {
      const text = 'A'.repeat(1000)
      const truncated = truncateText(text, 100)
      expect(truncated.length).toBeLessThan(text.length)
      expect(truncated).toContain('truncated')
      expect(truncated).toContain('900 chars')
    })

    it('should preserve exact max length text', () => {
      const text = 'A'.repeat(100)
      expect(truncateText(text, 100)).toBe(text)
    })
  })

  describe('isKnownTool', () => {
    it('should return true for known tools', () => {
      expect(isKnownTool('Read')).toBe(true)
      expect(isKnownTool('Write')).toBe(true)
      expect(isKnownTool('Bash')).toBe(true)
    })

    it('should return false for unknown tools', () => {
      expect(isKnownTool('UnknownTool')).toBe(false)
      expect(isKnownTool('RandomTool')).toBe(false)
    })
  })

  describe('getToolCategory', () => {
    it('should return correct category for file operations', () => {
      expect(getToolCategory('Read')).toBe('FILE_OPERATIONS')
      expect(getToolCategory('Write')).toBe('FILE_OPERATIONS')
      expect(getToolCategory('Edit')).toBe('FILE_OPERATIONS')
    })

    it('should return correct category for search tools', () => {
      expect(getToolCategory('Grep')).toBe('SEARCH')
      expect(getToolCategory('WebSearch')).toBe('SEARCH')
    })

    it('should return correct category for execution tools', () => {
      expect(getToolCategory('Bash')).toBe('EXECUTION')
    })

    it('should return null for unknown tools', () => {
      expect(getToolCategory('UnknownTool')).toBeNull()
    })
  })

  describe('extractToolName', () => {
    it('should extract tool name from invoke tag', () => {
      expect(extractToolName('<invoke name="Read">')).toBe('Read')
      expect(extractToolName('<invoke name="Write">')).toBe('Write')
      expect(extractToolName('<invoke name="mcp__ide__getDiagnostics">')).toBe('mcp__ide__getDiagnostics')
    })

    it('should return null for invalid input', () => {
      expect(extractToolName('</invoke>')).toBeNull()
      expect(extractToolName('random text')).toBeNull()
      expect(extractToolName('')).toBeNull()
    })
  })

  describe('extractParameter', () => {
    it('should extract parameter name and value', () => {
      const param = extractParameter('<parameter name="file_path">/path/to/file.ts</parameter>')
      expect(param).toEqual({ name: 'file_path', value: '/path/to/file.ts' })
    })

    it('should handle empty parameter value', () => {
      const param = extractParameter('<parameter name="empty"></parameter>')
      expect(param).toEqual({ name: 'empty', value: '' })
    })

    it('should return null for invalid input', () => {
      expect(extractParameter('random text')).toBeNull()
      expect(extractParameter('<parameter name="test">')).toBeNull()
    })
  })

  describe('helper functions', () => {
    it('isFunctionCallsStart should detect function_calls start', () => {
      expect(isFunctionCallsStart('<function_calls>')).toBe(true)
      expect(isFunctionCallsStart('</function_calls>')).toBe(false)
    })

    it('isFunctionCallsEnd should detect function_calls end', () => {
      expect(isFunctionCallsEnd('</function_calls>')).toBe(true)
      expect(isFunctionCallsEnd('<function_calls>')).toBe(false)
    })

    it('isInvokeStart should detect invoke start', () => {
      expect(isInvokeStart('<invoke name="Read">')).toBe(true)
      expect(isInvokeStart('</invoke>')).toBe(false)
    })

    it('isInvokeEnd should detect invoke end', () => {
      expect(isInvokeEnd('</invoke>')).toBe(true)
      expect(isInvokeEnd('<invoke name="Read">')).toBe(false)
    })

    it('isFunctionResultsStart should detect function_results start', () => {
      expect(isFunctionResultsStart('<function_results>')).toBe(true)
      expect(isFunctionResultsStart('</function_results>')).toBe(false)
    })

    it('isFunctionResultsEnd should detect function_results end', () => {
      expect(isFunctionResultsEnd('</function_results>')).toBe(true)
      expect(isFunctionResultsEnd('<function_results>')).toBe(false)
    })

    it('extractSystemMessage should extract system message', () => {
      expect(extractSystemMessage('<system>Success</system>')).toBe('Success')
      expect(extractSystemMessage('random text')).toBeNull()
    })

    it('extractErrorMessage should extract error message', () => {
      expect(extractErrorMessage('<error>Failed</error>')).toBe('Failed')
      expect(extractErrorMessage('random text')).toBeNull()
    })
  })
})
