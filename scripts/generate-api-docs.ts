#!/usr/bin/env node
/**
 * CCJK v2.0 API Documentation Generator
 *
 * This script parses TypeScript source files, extracts JSDoc comments,
 * and generates comprehensive Markdown documentation for all public APIs.
 *
 * @module scripts/generate-api-docs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface ApiDoc {
  name: string
  kind: 'class' | 'interface' | 'function' | 'type' | 'enum' | 'constant'
  signature?: string
  description: string
  example?: string
  params?: ParameterDoc[]
  returns?: string
  throws?: string
  deprecated?: boolean
  since?: string
  see?: string[]
  sourceFile: string
  line: number
}

interface ParameterDoc {
  name: string
  type: string
  description: string
  optional: boolean
}

interface ModuleDoc {
  name: string
  description: string
  apis: ApiDoc[]
  sourceFile: string
}

/**
 * Extracts JSDoc comment from a line of code
 */
function extractJsDoc(lines: string[], startIndex: number): { comment: string, endIndex: number } {
  const commentLines: string[] = []
  let i = startIndex - 1

  // Look backwards for JSDoc start
  while (i >= 0) {
    const line = lines[i].trim()
    if (line.startsWith('*/')) {
      // Found end, now collect the comment
      i--
      while (i >= 0) {
        const commentLine = lines[i].trim()
        if (commentLine.startsWith('/**')) {
          // Found start
          return {
            comment: commentLines.reverse().join('\n'),
            endIndex: startIndex,
          }
        }
        // Extract content between * and the text
        const match = commentLine.match(/\*\s?(.*)/)
        if (match) {
          commentLines.push(match[1])
        }
        i--
      }
    }
    if (line.length > 0 && !line.startsWith('*')) {
      break
    }
    i--
  }

  return { comment: '', endIndex: startIndex }
}

/**
 * Parse JSDoc comment into structured documentation
 */
function parseJsDoc(comment: string): Partial<ApiDoc> {
  const doc: Partial<ApiDoc> = {}
  const lines = comment.split('\n')
  const description: string[] = []
  const params: ParameterDoc[] = []
  const see: string[] = []
  let currentParam: Partial<ParameterDoc> | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // @param
    const paramMatch = trimmed.match(/@param\s+(?:(\{([^}]+)\})\s*)?(\[[^\]]+\]|[\w.]+)\s+-\s*(.*)/)
    if (paramMatch) {
      if (currentParam?.name) {
        params.push(currentParam as ParameterDoc)
      }
      currentParam = {
        type: paramMatch[2] || 'any',
        name: paramMatch[3],
        description: paramMatch[4],
        optional: paramMatch[3].startsWith('['),
      }
      continue
    }

    // @return / @returns
    const returnMatch = trimmed.match(/@returns?\s+(.*)/)
    if (returnMatch) {
      doc.returns = returnMatch[1]
      continue
    }

    // @throws
    const throwsMatch = trimmed.match(/@throws\s+(\{([^}]+)\})?\s*(.*)/)
    if (throwsMatch) {
      doc.throws = throwsMatch[3]
      continue
    }

    // @example
    const exampleMatch = trimmed.match(/@example\s*/)
    if (exampleMatch) {
      // Example continues until next tag
      const exampleStart = lines.indexOf(line)
      const exampleLines: string[] = []
      for (let j = exampleStart + 1; j < lines.length; j++) {
        const exampleLine = lines[j]
        if (exampleLine.trim().startsWith('@')) {
          break
        }
        exampleLines.push(exampleLine)
      }
      doc.example = exampleLines.join('\n').trim()
      continue
    }

    // @deprecated
    if (trimmed.match(/@deprecated/)) {
      doc.deprecated = true
      continue
    }

    // @since
    const sinceMatch = trimmed.match(/@since\s+(.*)/)
    if (sinceMatch) {
      doc.since = sinceMatch[1]
      continue
    }

    // @see
    const seeMatch = trimmed.match(/@see\s+(.*)/)
    if (seeMatch) {
      see.push(seeMatch[1])
      continue
    }

    // Regular description line
    if (!trimmed.startsWith('@') && trimmed.length > 0) {
      if (currentParam?.name) {
        currentParam.description += ` ${trimmed}`
      }
      else {
        description.push(trimmed)
      }
    }
  }

  if (currentParam?.name) {
    params.push(currentParam as ParameterDoc)
  }

  doc.description = description.join('\n').trim()
  if (params.length > 0) {
    doc.params = params
  }
  if (see.length > 0) {
    doc.see = see
  }

  return doc
}

/**
 * Extract API signatures from TypeScript code
 */
function extractSignature(line: string, kind: ApiDoc['kind']): string | undefined {
  switch (kind) {
    case 'function':
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:(<[^>]+>)\s*)?\(([^)]*)\)/)
      if (funcMatch) {
        const name = funcMatch[1]
        const generics = funcMatch[2] || ''
        const params = funcMatch[3] || ''
        return `function ${name}${generics}(${params})`
      }
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*([^=]+)\s*)?=\s*(?:async\s+)?\(([^)]*)\)\s*=>/)
      if (arrowMatch) {
        const name = arrowMatch[1]
        const type = arrowMatch[2] ? `: ${arrowMatch[2]}` : ''
        const params = arrowMatch[3] || ''
        return `const ${name}${type} = (${params}) => ...`
      }
      break

    case 'class':
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/)
      if (classMatch) {
        const name = classMatch[1]
        const extendsClause = classMatch[2] ? ` extends ${classMatch[2]}` : ''
        const implementsClause = classMatch[3] ? ` implements ${classMatch[3]}` : ''
        return `class ${name}${extendsClause}${implementsClause}`
      }
      break

    case 'interface':
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/)
      if (interfaceMatch) {
        const name = interfaceMatch[1]
        const extendsClause = interfaceMatch[2] ? ` extends ${interfaceMatch[2]}` : ''
        return `interface ${name}${extendsClause}`
      }
      break

    case 'type':
      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)\s*(?:<[^>]+>\s*)?=\s*(.+)/)
      if (typeMatch) {
        const name = typeMatch[1]
        const definition = typeMatch[2].replace(/\{.*\}/, '{ ... }').substring(0, 100)
        return `type ${name} = ${definition}`
      }
      break

    case 'enum':
      const enumMatch = line.match(/(?:export\s+)?enum\s+(\w+)/)
      if (enumMatch) {
        return `enum ${enumMatch[1]}`
      }
      break

    case 'constant':
      const constMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*([^=]+)\s*)?=\s*(.+)/)
      if (constMatch) {
        const name = constMatch[1]
        const type = constMatch[2] || ''
        const value = constMatch[3]?.substring(0, 50) || ''
        return `const ${name}${type ? `: ${type}` : ''} = ${value}`
      }
      break
  }

  return undefined
}

/**
 * Parse a TypeScript file and extract API documentation
 */
function parseTypeScriptFile(filePath: string, rootDir: string): ApiDoc[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const apis: ApiDoc[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Look for exported definitions
    if (line.match(/export\s+(function|class|interface|type|enum|const|let|var)/)) {
      const { comment } = extractJsDoc(lines, i)
      if (!comment)
        continue

      const jsDoc = parseJsDoc(comment)

      // Determine kind
      let kind: ApiDoc['kind'] = 'function'
      if (line.includes('class'))
        kind = 'class'
      else if (line.includes('interface'))
        kind = 'interface'
      else if (line.includes('type '))
        kind = 'type'
      else if (line.includes('enum'))
        kind = 'enum'
      else if (line.match(/export\s+(const|let|var)/))
        kind = 'constant'

      const signature = extractSignature(line, kind)

      // Extract name
      const nameMatch = line.match(/(?:export\s+)?(?:\w+\s+)+(\w+)/)
      const name = nameMatch ? nameMatch[1] : 'unknown'

      apis.push({
        name,
        kind,
        signature,
        description: jsDoc.description || '',
        example: jsDoc.example,
        params: jsDoc.params,
        returns: jsDoc.returns,
        throws: jsDoc.throws,
        deprecated: jsDoc.deprecated,
        since: jsDoc.since,
        see: jsDoc.see,
        sourceFile: relative(rootDir, filePath),
        line: i + 1,
      })
    }
  }

  return apis
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string, rootDir: string, files: string[] = []): string[] {
  if (!existsSync(dir))
    return files

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip node_modules and test directories
      if (!['node_modules', 'test', 'tests', '__tests__', 'dist', 'build'].includes(entry.name)) {
        findTypeScriptFiles(fullPath, rootDir, files)
      }
    }
    else if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
      // Skip declaration files and test files
      if (!entry.name.endsWith('.d.ts') && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Generate Markdown documentation for a module
 */
function generateMarkdown(module: ModuleDoc): string {
  let md = ''

  // Header
  md += `# ${module.name}\n\n`
  if (module.description) {
    md += `${module.description}\n\n`
  }

  // Table of Contents
  if (module.apis.length > 0) {
    md += `## Table of Contents\n\n`
    for (const api of module.apis) {
      const icon = {
        class: '📦',
        interface: '🔌',
        function: '⚙️',
        type: '📝',
        enum: '🔢',
        constant: '🔒',
      }[api.kind]
      md += `- [${icon} ${api.name}](#${api.name.toLowerCase().replace(/\s+/g, '-')})\n`
    }
    md += '\n'
  }

  // API Reference
  for (const api of module.apis) {
    md += `## ${api.name}\n\n`

    if (api.deprecated) {
      md += `> **⚠️ Deprecated**${api.since ? ` since ${api.since}` : ''}\n\n`
    }

    if (api.signature) {
      md += `### Signature\n\n\`\`\`typescript\n${api.signature}\n\`\`\`\n\n`
    }

    if (api.description) {
      md += `### Description\n\n${api.description}\n\n`
    }

    if (api.params && api.params.length > 0) {
      md += `### Parameters\n\n`
      md += `| Name | Type | Required | Description |\n`
      md += `|------|------|----------|-------------|\n`
      for (const param of api.params) {
        md += `| ${param.name} | \`${param.type}\` | ${param.optional ? 'No' : 'Yes'} | ${param.description} |\n`
      }
      md += '\n'
    }

    if (api.returns) {
      md += `### Returns\n\n\`\`\`typescript\n${api.returns}\n\`\`\`\n\n`
    }

    if (api.throws) {
      md += `### Throws\n\n\`\`\`typescript\n${api.throws}\n\`\`\`\n\n`
    }

    if (api.example) {
      md += `### Example\n\n\`\`\`typescript\n${api.example}\n\`\`\`\n\n`
    }

    if (api.see && api.see.length > 0) {
      md += `### See Also\n\n`
      for (const link of api.see) {
        md += `- ${link}\n`
      }
      md += '\n'
    }

    md += `---\n\n**Source**: [${api.sourceFile}:${api.line}](../../${api.sourceFile}#L${api.line})\n\n`
  }

  return md
}

/**
 * Main documentation generation function
 */
async function generateDocs() {
  console.log('📚 Generating CCJK v2.0 API Documentation...\n')

  const rootDir = join(__dirname, '..')
  const srcDir = join(rootDir, 'src')
  const docsDir = join(rootDir, 'docs', 'v2', 'api')
  const examplesDir = join(docsDir, 'examples')
  const typesDir = join(docsDir, 'types')

  // Create directories
  if (!existsSync(docsDir))
    mkdirSync(docsDir, { recursive: true })
  if (!existsSync(examplesDir))
    mkdirSync(examplesDir, { recursive: true })
  if (!existsSync(typesDir))
    mkdirSync(typesDir, { recursive: true })

  // Find all TypeScript files
  console.log('🔍 Scanning source files...')
  const tsFiles = findTypeScriptFiles(srcDir, rootDir)
  console.log(`   Found ${tsFiles.length} TypeScript files\n`)

  // Parse files and organize by module
  const modules = new Map<string, ModuleDoc>()
  const totalApis = { class: 0, interface: 0, function: 0, type: 0, enum: 0, constant: 0 }

  for (const file of tsFiles) {
    const apis = parseTypeScriptFile(file, rootDir)
    if (apis.length === 0)
      continue

    const relativePath = relative(srcDir, file)
    const moduleName = dirname(relativePath).replace(/\\/g, '/') || 'index'

    if (!modules.has(moduleName)) {
      modules.set(moduleName, {
        name: moduleName,
        description: `API documentation for ${moduleName}`,
        apis: [],
        sourceFile: relativePath,
      })
    }

    const module = modules.get(moduleName)!
    module.apis.push(...apis)

    for (const api of apis) {
      totalApis[api.kind]++
    }
  }

  console.log('📊 API Statistics:')
  console.log(`   Classes:     ${totalApis.class}`)
  console.log(`   Interfaces:  ${totalApis.interface}`)
  console.log(`   Functions:   ${totalApis.function}`)
  console.log(`   Types:       ${totalApis.type}`)
  console.log(`   Enums:       ${totalApis.enum}`)
  console.log(`   Constants:   ${totalApis.constant}`)
  console.log(`   Total:       ${Object.values(totalApis).reduce((a, b) => a + b, 0)}\n`)

  // Generate Markdown files
  console.log('📝 Generating Markdown documentation...')
  for (const [moduleName, module] of modules) {
    const md = generateMarkdown(module)
    const outputFile = join(docsDir, `${moduleName}.md`)
    writeFileSync(outputFile, md, 'utf-8')
    console.log(`   ✓ ${moduleName}.md (${module.apis.length} APIs)`)
  }

  // Generate API index
  console.log('\n📋 Generating API index...')
  const indexMd = generateApiIndex(Array.from(modules.values()))
  writeFileSync(join(docsDir, 'README.md'), indexMd, 'utf-8')
  console.log('   ✓ README.md')

  // Generate type definition files
  console.log('\n📐 Generating type definition files...')
  await generateTypeDefinitions(modules, typesDir)

  console.log('\n✅ Documentation generation complete!')
  console.log(`   Output: ${docsDir}`)
}

/**
 * Generate API index page
 */
function generateApiIndex(modules: ModuleDoc[]): string {
  let md = `# CCJK v2.0 API Documentation

Complete API reference for CCJK v2.0 modules.

## Quick Links

`

  // Group modules by category
  const categories = {
    'Hooks & Enforcement': modules.filter(m => m.name.includes('hook') || m.name.includes('enforcement')),
    'Brain System': modules.filter(m => m.name.includes('brain')),
    'Skills': modules.filter(m => m.name.includes('skill')),
    'Agents': modules.filter(m => m.name.includes('agent')),
    'Workflow': modules.filter(m => m.name.includes('workflow')),
    'Actionbook': modules.filter(m => m.name.includes('actionbook')),
    'Utilities': modules.filter(m => !['hook', 'enforcement', 'brain', 'skill', 'agent', 'workflow', 'actionbook'].some(k => m.name.includes(k))),
  }

  for (const [category, catsModules] of Object.entries(categories)) {
    if (catsModules.length === 0)
      continue

    md += `### ${category}\n\n`
    for (const module of catsModules) {
      md += `- [${module.name}](${module.name}.md) - ${module.apis.length} APIs\n`
    }
    md += '\n'
  }

  md += `## Overview

CCJK v2.0 provides a comprehensive API for building AI-powered development tools. The API is organized into several key modules:

- **Hooks & Enforcement**: Traceability and enforcement mechanisms
- **Brain System**: Intelligent context management and optimization
- **Skills**: Dynamic skill loading and execution
- **Agents**: Multi-agent orchestration system
- **Workflow**: Workflow generation and management
- **Actionbook**: Action tracking and replay system

## Getting Started

\`\`\`typescript
import { HookEnforcer } from '@ccjk/v2'
import { BrainSystem } from '@ccjk/v2/brain'
import { SkillManager } from '@ccjk/v2/skills'

// Initialize hook enforcer
const enforcer = new HookEnforcer()

// Initialize brain system
const brain = new BrainSystem()

// Initialize skill manager
const skills = new SkillManager()
\`\`\`

## Documentation Structure

Each API module documentation includes:
- Overview and description
- Installation and usage
- Quick start examples
- Complete API reference
- Configuration options
- Error handling
- Performance considerations
- Related APIs

## Examples

See the [examples](./examples/) directory for complete working examples.

## Type Definitions

TypeScript type definitions are available in the [types](./types/) directory.

## Support

For issues and questions:
- GitHub: [https://github.com/ccjk/ccjk](https://github.com/ccjk/ccjk)
- Documentation: [https://ccjk.dev/docs](https://ccjk.dev/docs)
`

  return md
}

/**
 * Generate type definition files
 */
async function generateTypeDefinitions(modules: Map<string, ModuleDoc>, typesDir: string) {
  for (const [moduleName, module] of modules) {
    let dts = `// Type definitions for ${moduleName}\n`
    dts += `// Generated automatically from source code\n\n`

    for (const api of module.apis) {
      if (api.signature) {
        dts += `// ${api.description}\n`
        dts += `export ${api.signature}\n\n`
      }
    }

    const outputFile = join(typesDir, `${moduleName}.d.ts`)
    writeFileSync(outputFile, dts, 'utf-8')
    console.log(`   ✓ ${moduleName}.d.ts`)
  }
}

// Run the generator
generateDocs().catch(console.error)
