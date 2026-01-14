/**
 * Unit tests for fc-parser.ts
 */

import { describe, expect, it } from 'vitest'
import { createFCParser, formatFCForLog, getFCCategory, ParserState } from '../../../../src/utils/context/fc-parser'

describe('fc-parser', () => {
  describe('fCParser', () => {
    it('should start in IDLE state', () => {
      const parser = createFCParser()
      expect(parser.getState()).toBe(ParserState.IDLE)
    })

    it('should parse simple Read tool call', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>File content here</system>
</function_results>
`.trim()

      const lines = output.split('\n')
      for (const line of lines) {
        parser.parse(`${line}\n`)
      }
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].name).toBe('Read')
      expect(completedFCs[0].arguments.file_path).toBe('/path/to/file.ts')
      expect(completedFCs[0].status).toBe('success')
    })

    it('should parse Write tool call with multi-line parameter', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Write">
<parameter name="file_path">/path/to/file.ts</parameter>
<parameter name="content">
Line 1
Line 2
Line 3
</parameter>
</invoke>
</function_calls>

<function_results>
<system>File written successfully</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].name).toBe('Write')
      expect(completedFCs[0].arguments.file_path).toBe('/path/to/file.ts')
      expect(completedFCs[0].arguments.content).toContain('Line 1')
      expect(completedFCs[0].arguments.content).toContain('Line 2')
    })

    it('should parse Bash tool call', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Bash">
<parameter name="command">ls -la</parameter>
<parameter name="description">List files</parameter>
</invoke>
</function_calls>

<function_results>
total 100
drwxr-xr-x  5 user  staff  160 Jan 13 10:00 .
drwxr-xr-x 10 user  staff  320 Jan 13 09:00 ..
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].name).toBe('Bash')
      expect(completedFCs[0].arguments.command).toBe('ls -la')
      expect(completedFCs[0].result).toContain('total 100')
    })

    it('should handle error results', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/nonexistent/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<error>File not found</error>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].status).toBe('error')
      expect(completedFCs[0].error).toBe('File not found')
    })

    it('should emit fc:start event when tool invocation begins', () => {
      const parser = createFCParser()
      const startedFCs: any[] = []

      parser.on('fc:start', (fc) => {
        startedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(startedFCs).toHaveLength(1)
      expect(startedFCs[0].name).toBe('Read')
    })

    it('should emit state:change events', () => {
      const parser = createFCParser()
      const stateChanges: any[] = []

      parser.on('state:change', (oldState, newState) => {
        stateChanges.push({ oldState, newState })
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(stateChanges.length).toBeGreaterThan(0)
      expect(stateChanges[0].oldState).toBe(ParserState.IDLE)
      expect(stateChanges[0].newState).toBe(ParserState.IN_FUNCTION_CALLS)
    })

    it('should handle streaming chunks', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      // Simulate streaming by sending output in chunks
      const chunks = [
        '<function_calls>\n',
        '<invoke name="Read">\n',
        '<parameter name="file_path">',
        '/path/to/file.ts',
        '</parameter>\n',
        '</invoke>\n',
        '</function_calls>\n\n',
        '<function_results>\n',
        '<system>Success</system>\n',
        '</function_results>\n',
      ]

      for (const chunk of chunks) {
        parser.parse(chunk)
      }

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].name).toBe('Read')
    })

    it('should handle multiple tool calls in sequence', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/file1.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>Content 1</system>
</function_results>

<function_calls>
<invoke name="Read">
<parameter name="file_path">/file2.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>Content 2</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(2)
      expect(completedFCs[0].arguments.file_path).toBe('/file1.ts')
      expect(completedFCs[1].arguments.file_path).toBe('/file2.ts')
    })

    it('should calculate duration correctly', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Bash">
<parameter name="command">sleep 1</parameter>
</invoke>
</function_calls>

<function_results>
<system>Done</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].duration).toBeGreaterThanOrEqual(0)
      expect(typeof completedFCs[0].duration).toBe('number')
    })

    it('should estimate tokens', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>This is a long result with many tokens that should be counted properly</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].tokens).toBeGreaterThan(0)
    })

    it('should reset parser state', () => {
      const parser = createFCParser()

      parser.parse('<function_calls>\n<invoke name="Read">\n')
      expect(parser.getState()).not.toBe(ParserState.IDLE)

      parser.reset()
      expect(parser.getState()).toBe(ParserState.IDLE)
      expect(parser.getCurrentFC()).toBeNull()
    })

    it('should flush remaining data', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      // Parse incomplete output
      parser.parse(`
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>Success</system>
`.trim())

      // Flush should complete the FC
      const flushed = parser.flush()
      expect(flushed.length + completedFCs.length).toBeGreaterThan(0)
    })

    it('should track incomplete FCs', () => {
      const parser = createFCParser()

      parser.parse(`
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>
`.trim())

      const incomplete = parser.getIncompleteFCs()
      expect(incomplete.length).toBeGreaterThan(0)
    })

    it('should provide parser statistics', () => {
      const parser = createFCParser()

      const stats = parser.getStats()
      expect(stats).toHaveProperty('state')
      expect(stats).toHaveProperty('incompleteFCCount')
      expect(stats).toHaveProperty('bufferSize')
    })

    it('should handle MCP tool names', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const output = `
<function_calls>
<invoke name="mcp__ide__getDiagnostics">
<parameter name="uri">file:///path/to/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>No diagnostics</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].name).toBe('mcp__ide__getDiagnostics')
    })

    it('should truncate long results', () => {
      const parser = createFCParser()
      const completedFCs: any[] = []

      parser.on('fc:end', (fc) => {
        completedFCs.push(fc)
      })

      const longResult = 'A'.repeat(20000)
      const output = `
<function_calls>
<invoke name="Read">
<parameter name="file_path">/path/to/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<system>${longResult}</system>
</function_results>
`.trim()

      parser.parse(output)
      parser.flush()

      expect(completedFCs).toHaveLength(1)
      expect(completedFCs[0].result.length).toBeLessThan(longResult.length)
      expect(completedFCs[0].result).toContain('truncated')
    })
  })

  describe('helper functions', () => {
    it('getFCCategory should return correct category', () => {
      const fc = {
        name: 'Read',
        arguments: {},
        result: '',
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        tokens: 50,
        summary: '',
        status: 'success' as const,
        id: '123',
      }

      expect(getFCCategory(fc)).toBe('FILE_OPERATIONS')
    })

    it('formatFCForLog should format FC correctly', () => {
      const fc = {
        name: 'Read',
        arguments: {},
        result: '',
        startTime: new Date(),
        endTime: new Date(),
        duration: 123,
        tokens: 456,
        summary: '',
        status: 'success' as const,
        id: '123',
      }

      const formatted = formatFCForLog(fc)
      expect(formatted).toContain('Read')
      expect(formatted).toContain('123ms')
      expect(formatted).toContain('456 tokens')
      expect(formatted).toContain('✅')
    })

    it('formatFCForLog should show error status', () => {
      const fc = {
        name: 'Read',
        arguments: {},
        result: '',
        startTime: new Date(),
        endTime: new Date(),
        duration: 123,
        tokens: 456,
        summary: '',
        status: 'error' as const,
        id: '123',
        error: 'File not found',
      }

      const formatted = formatFCForLog(fc)
      expect(formatted).toContain('❌')
    })
  })
})
