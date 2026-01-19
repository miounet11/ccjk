/**
 * Integration test with real Claude Code output samples
 */

import { describe, expect, it } from 'vitest'
import { createFCParser } from '../../../../src/utils/context/fc-parser'

describe('fc-parser integration with real samples', () => {
  it('should parse real Read tool output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    // Real output from Claude Code Read tool
    const realOutput = `<function_calls>
<invoke name="Read">
<parameter name="file_path">/Users/lu/ccjk/src/index.ts</parameter>
</invoke>
</function_calls>

<function_results>
File content here...
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Read')
    expect(completedFCs[0].arguments.file_path).toBe('/Users/lu/ccjk/src/index.ts')
  })

  it('should parse real Write tool output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Write">
<parameter name="file_path">/Users/lu/ccjk/test.ts</parameter>
<parameter name="content">console.log('Hello World')</parameter>
</invoke>
</function_calls>

<function_results>
File created successfully at: /Users/lu/ccjk/test.ts
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Write')
    expect(completedFCs[0].arguments.file_path).toBe('/Users/lu/ccjk/test.ts')
    expect(completedFCs[0].arguments.content).toBe('console.log(\'Hello World\')')
  })

  it('should parse real Bash tool output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Bash">
<parameter name="command">ls -la</parameter>
<parameter name="description">List files in directory</parameter>
</invoke>
</function_calls>

<function_results>
total 100
drwxr-xr-x  10 user  staff   320 Jan 13 10:00 .
drwxr-xr-x  20 user  staff   640 Jan 13 09:00 ..
-rw-r--r--   1 user  staff  1234 Jan 13 10:00 file.ts
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Bash')
    expect(completedFCs[0].arguments.command).toBe('ls -la')
    expect(completedFCs[0].result).toContain('total 100')
  })

  it('should parse real Grep tool output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Grep">
<parameter name="pattern">export function</parameter>
<parameter name="path">src/</parameter>
<parameter name="output_mode">files_with_matches</parameter>
</invoke>
</function_calls>

<function_results>
src/utils/config.ts
src/utils/platform.ts
src/commands/init.ts
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Grep')
    expect(completedFCs[0].result).toContain('src/utils/config.ts')
  })

  it('should parse real MCP tool output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="mcp__ide__getDiagnostics">
<parameter name="uri">file:///Users/lu/ccjk/src/index.ts</parameter>
</invoke>
</function_calls>

<function_results>
[]
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('mcp__ide__getDiagnostics')
    expect(completedFCs[0].result).toBe('[]')
  })

  it('should parse error output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Read">
<parameter name="file_path">/nonexistent/file.ts</parameter>
</invoke>
</function_calls>

<function_results>
<error>ENOENT: no such file or directory, open '/nonexistent/file.ts'</error>
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].status).toBe('error')
    expect(completedFCs[0].error).toContain('ENOENT')
  })

  it('should parse system message output', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Write">
<parameter name="file_path">/Users/lu/ccjk/test.ts</parameter>
<parameter name="content">test</parameter>
</invoke>
</function_calls>

<function_results>
<system>File created successfully</system>
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].status).toBe('success')
    expect(completedFCs[0].result).toContain('File created successfully')
  })

  it('should parse streaming output in chunks', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    // Simulate streaming by parsing in chunks
    const chunks = [
      '<function_calls>\n',
      '<invoke name="Read">\n',
      '<parameter name="file_path">',
      '/Users/lu/ccjk/src/index.ts',
      '</parameter>\n',
      '</invoke>\n',
      '</function_calls>\n\n',
      '<function_results>\n',
      'File content line 1\n',
      'File content line 2\n',
      '</function_results>\n',
    ]

    for (const chunk of chunks) {
      parser.parse(chunk)
    }
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Read')
    expect(completedFCs[0].result).toContain('File content line 1')
  })

  it('should parse multiple sequential tool calls', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Read">
<parameter name="file_path">/file1.ts</parameter>
</invoke>
</function_calls>

<function_results>
Content 1
</function_results>

<function_calls>
<invoke name="Read">
<parameter name="file_path">/file2.ts</parameter>
</invoke>
</function_calls>

<function_results>
Content 2
</function_results>

<function_calls>
<invoke name="Write">
<parameter name="file_path">/file3.ts</parameter>
<parameter name="content">New content</parameter>
</invoke>
</function_calls>

<function_results>
<system>File written</system>
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(3)
    expect(completedFCs[0].name).toBe('Read')
    expect(completedFCs[1].name).toBe('Read')
    expect(completedFCs[2].name).toBe('Write')
  })

  it('should handle system warnings', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Read">
<parameter name="file_path">/Users/lu/ccjk/src/index.ts</parameter>
</invoke>
</function_calls>

<function_results>
File content here
</function_results>
<system_warning>Token usage: 1000/200000; 199000 remaining</system_warning>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Read')
  })

  it('should parse Edit tool with old_string and new_string', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="Edit">
<parameter name="file_path">/Users/lu/ccjk/src/index.ts</parameter>
<parameter name="old_string">const oldValue = 1</parameter>
<parameter name="new_string">const newValue = 2</parameter>
</invoke>
</function_calls>

<function_results>
<system>Edit completed successfully</system>
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('Edit')
    expect(completedFCs[0].arguments.old_string).toBe('const oldValue = 1')
    expect(completedFCs[0].arguments.new_string).toBe('const newValue = 2')
  })

  it('should parse TodoWrite tool', () => {
    const parser = createFCParser()
    const completedFCs: any[] = []

    parser.on('fc:end', (fc) => {
      completedFCs.push(fc)
    })

    const realOutput = `<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Task 1", "status": "completed", "activeForm": "Completed task 1"}]</parameter>
</invoke>
</function_calls>

<function_results>
Todos have been modified successfully.
</function_results>`

    parser.parse(realOutput)
    parser.flush()

    expect(completedFCs).toHaveLength(1)
    expect(completedFCs[0].name).toBe('TodoWrite')
    expect(completedFCs[0].arguments.todos).toContain('Task 1')
  })
})
