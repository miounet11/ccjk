/**
 * Code Parser with Tree-sitter Integration
 *
 * Provides intelligent code analysis using Tree-sitter WASM.
 * Supports core languages: TypeScript, JavaScript, Python, Go, Rust, Java.
 *
 * Compatible with Claude Code v2.1.0+ tree-sitter integration.
 *
 * @module utils/code-parser
 */

import type { Language, Tree, Parser as TreeSitterParser } from 'web-tree-sitter'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'pathe'

// ============================================================================
// Types
// ============================================================================

/**
 * Supported programming languages
 */
export type SupportedLanguage
  = | 'typescript'
    | 'javascript'
    | 'python'
    | 'go'
    | 'rust'
    | 'java'

/**
 * Code structure node
 */
export interface CodeNode {
  type: string
  name?: string
  startLine: number
  endLine: number
  startColumn: number
  endColumn: number
  children?: CodeNode[]
  text?: string
}

/**
 * Function/method definition
 */
export interface FunctionDef {
  name: string
  params: string[]
  returnType?: string
  startLine: number
  endLine: number
  isAsync: boolean
  isExported: boolean
  docstring?: string
}

/**
 * Class definition
 */
export interface ClassDef {
  name: string
  extends?: string
  implements?: string[]
  startLine: number
  endLine: number
  methods: FunctionDef[]
  properties: PropertyDef[]
  isExported: boolean
}

/**
 * Property/field definition
 */
export interface PropertyDef {
  name: string
  type?: string
  startLine: number
  isStatic: boolean
  isPrivate: boolean
}

/**
 * Import statement
 */
export interface ImportDef {
  source: string
  specifiers: string[]
  isDefault: boolean
  isNamespace: boolean
  startLine: number
}

/**
 * Code analysis result
 */
export interface CodeAnalysis {
  language: SupportedLanguage
  filePath: string
  imports: ImportDef[]
  exports: string[]
  functions: FunctionDef[]
  classes: ClassDef[]
  lineCount: number
  hasErrors: boolean
  errors?: string[]
}

// ============================================================================
// Language Detection
// ============================================================================

/**
 * File extension to language mapping
 */
const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
}

/**
 * Detect language from file path
 */
export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = extname(filePath).toLowerCase()
  return EXTENSION_MAP[ext] || null
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): language is SupportedLanguage {
  return ['typescript', 'javascript', 'python', 'go', 'rust', 'java'].includes(language)
}

// ============================================================================
// Code Parser Class
// ============================================================================

/**
 * Code Parser using Tree-sitter WASM
 *
 * Provides intelligent code analysis for supported languages.
 */
export class CodeParser {
  private parser: TreeSitterParser | null = null
  private languages: Map<SupportedLanguage, Language> = new Map()
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the parser with Tree-sitter WASM
   */
  async initialize(): Promise<void> {
    if (this.initialized)
      return
    if (this.initPromise)
      return this.initPromise

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamic import for web-tree-sitter
      const TreeSitterModule = await import('web-tree-sitter')
      const TreeSitter = TreeSitterModule.default || TreeSitterModule

      // Check if TreeSitter has init method
      if (typeof TreeSitter === 'function' && 'init' in TreeSitter) {
        await (TreeSitter as any).init()
      }

      // Create parser instance
      if (typeof TreeSitter === 'function') {
        this.parser = new (TreeSitter as any)()
        this.initialized = true
      }
    }
    catch (error) {
      console.warn('Tree-sitter initialization failed:', error)
      // Parser will work in fallback mode without tree-sitter
    }
  }

  /**
   * Load a language grammar
   */
  async loadLanguage(language: SupportedLanguage): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.parser) {
      return false
    }

    if (this.languages.has(language)) {
      return true
    }

    try {
      // Language WASM files need to be available
      // In production, these would be bundled or downloaded
      const TreeSitterModule = await import('web-tree-sitter')
      const TreeSitter = TreeSitterModule.default || TreeSitterModule
      const wasmPath = this.getWasmPath(language)

      if (!wasmPath || !existsSync(wasmPath)) {
        console.warn(`Language WASM not found for ${language}`)
        return false
      }

      const lang = await TreeSitter.Language.load(wasmPath)
      this.languages.set(language, lang)
      return true
    }
    catch (error) {
      console.warn(`Failed to load language ${language}:`, error)
      return false
    }
  }

  /**
   * Get WASM file path for a language
   */
  private getWasmPath(language: SupportedLanguage): string | null {
    // Try common locations for tree-sitter WASM files
    const possiblePaths = [
      `node_modules/tree-sitter-${language}/tree-sitter-${language}.wasm`,
      `node_modules/web-tree-sitter/tree-sitter-${language}.wasm`,
    ]

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        return p
      }
    }

    return null
  }

  /**
   * Parse source code
   */
  async parse(code: string, language: SupportedLanguage): Promise<Tree | null> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.parser) {
      return null
    }

    const loaded = await this.loadLanguage(language)
    if (!loaded) {
      return null
    }

    const lang = this.languages.get(language)
    if (!lang) {
      return null
    }

    this.parser.setLanguage(lang)
    return this.parser.parse(code)
  }

  /**
   * Parse a file
   */
  async parseFile(filePath: string): Promise<Tree | null> {
    const language = detectLanguage(filePath)
    if (!language) {
      return null
    }

    if (!existsSync(filePath)) {
      return null
    }

    const code = readFileSync(filePath, 'utf-8')
    return this.parse(code, language)
  }

  /**
   * Analyze code structure
   */
  async analyze(code: string, language: SupportedLanguage, filePath = '<unknown>'): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      language,
      filePath,
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      lineCount: code.split('\n').length,
      hasErrors: false,
    }

    // Try tree-sitter parsing first
    const tree = await this.parse(code, language)

    if (tree) {
      // Use tree-sitter for accurate parsing
      this.extractFromTree(tree, analysis, code)
    }
    else {
      // Fallback to regex-based parsing
      this.extractWithRegex(code, language, analysis)
    }

    return analysis
  }

  /**
   * Analyze a file
   */
  async analyzeFile(filePath: string): Promise<CodeAnalysis | null> {
    const language = detectLanguage(filePath)
    if (!language) {
      return null
    }

    if (!existsSync(filePath)) {
      return null
    }

    const code = readFileSync(filePath, 'utf-8')
    return this.analyze(code, language, filePath)
  }

  /**
   * Extract code structure from tree-sitter tree
   */
  private extractFromTree(tree: Tree, analysis: CodeAnalysis, _code: string): void {
    const cursor = tree.walk()

    const visit = (): void => {
      const node = cursor.currentNode

      // Extract based on node type
      switch (node.type) {
        case 'import_statement':
        case 'import_declaration':
          this.extractImport(node, analysis)
          break

        case 'function_declaration':
        case 'function_definition':
        case 'method_definition':
        case 'arrow_function':
          this.extractFunction(node, analysis)
          break

        case 'class_declaration':
        case 'class_definition':
          this.extractClass(node, analysis)
          break

        case 'export_statement':
          this.extractExport(node, analysis)
          break
      }

      // Visit children
      if (cursor.gotoFirstChild()) {
        do {
          visit()
        } while (cursor.gotoNextSibling())
        cursor.gotoParent()
      }
    }

    visit()
  }

  /**
   * Extract import from tree node
   */
  private extractImport(node: { text: string, startPosition: { row: number } }, analysis: CodeAnalysis): void {
    const text = node.text
    const startLine = node.startPosition.row + 1

    // Simple extraction - can be enhanced
    const importDef: ImportDef = {
      source: '',
      specifiers: [],
      isDefault: false,
      isNamespace: false,
      startLine,
    }

    // Extract source
    const sourceMatch = text.match(/['"]([^'"]+)['"]/) || text.match(/from\s+['"]([^'"]+)['"]$/)
    if (sourceMatch) {
      importDef.source = sourceMatch[1]
    }

    // Check for default import
    importDef.isDefault = /import\s+\w+\s+from/.test(text)

    // Check for namespace import
    importDef.isNamespace = /import\s+\*\s+as/.test(text)

    analysis.imports.push(importDef)
  }

  /**
   * Extract function from tree node
   */
  private extractFunction(node: { text: string, startPosition: { row: number }, endPosition: { row: number } }, analysis: CodeAnalysis): void {
    const text = node.text
    const startLine = node.startPosition.row + 1
    const endLine = node.endPosition.row + 1

    // Extract function name
    const nameMatch = text.match(/(?:function|def|fn|func)\s+(\w+)/)
      || text.match(/^(\w+)\s*[=:]\s*(?:async\s+)?(?:function|\()/)
      || text.match(/^(\w+)\s*\(/)

    if (!nameMatch)
      return

    const funcDef: FunctionDef = {
      name: nameMatch[1],
      params: [],
      startLine,
      endLine,
      isAsync: /async/.test(text),
      isExported: /export/.test(text),
    }

    // Extract parameters (simplified)
    const paramsMatch = text.match(/\(([^)]*)\)/)
    if (paramsMatch) {
      funcDef.params = paramsMatch[1]
        .split(',')
        .map(p => p.trim().split(':')[0].trim())
        .filter(p => p)
    }

    analysis.functions.push(funcDef)
  }

  /**
   * Extract class from tree node
   */
  private extractClass(node: { text: string, startPosition: { row: number }, endPosition: { row: number } }, analysis: CodeAnalysis): void {
    const text = node.text
    const startLine = node.startPosition.row + 1
    const endLine = node.endPosition.row + 1

    // Extract class name
    const nameMatch = text.match(/class\s+(\w+)/)
    if (!nameMatch)
      return

    const classDef: ClassDef = {
      name: nameMatch[1],
      startLine,
      endLine,
      methods: [],
      properties: [],
      isExported: /export/.test(text),
    }

    // Extract extends
    const extendsMatch = text.match(/extends\s+(\w+)/)
    if (extendsMatch) {
      classDef.extends = extendsMatch[1]
    }

    // Extract implements
    const implementsMatch = text.match(/implements\s+([\w,\s]+)/)
    if (implementsMatch) {
      classDef.implements = implementsMatch[1].split(',').map(i => i.trim())
    }

    analysis.classes.push(classDef)
  }

  /**
   * Extract export from tree node
   */
  private extractExport(node: { text: string }, analysis: CodeAnalysis): void {
    const text = node.text

    // Extract exported names
    const namedMatch = text.match(/export\s+\{([^}]+)\}/)
    if (namedMatch) {
      const names = namedMatch[1].split(',').map(n => n.trim().split(' as ')[0].trim())
      analysis.exports.push(...names)
    }

    // Default export
    if (/export\s+default/.test(text)) {
      analysis.exports.push('default')
    }

    // Named export
    const namedExportMatch = text.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/)
    if (namedExportMatch) {
      analysis.exports.push(namedExportMatch[1])
    }
  }

  /**
   * Fallback regex-based extraction
   */
  private extractWithRegex(code: string, language: SupportedLanguage, analysis: CodeAnalysis): void {
    const lines = code.split('\n')

    // Language-specific patterns
    const patterns = this.getLanguagePatterns(language)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Check for imports
      if (patterns.import.test(line)) {
        const sourceMatch = line.match(/['"]([^'"]+)['"]/) || line.match(/from\s+['"]([^'"]+)['"]$/)
        analysis.imports.push({
          source: sourceMatch ? sourceMatch[1] : '',
          specifiers: [],
          isDefault: patterns.defaultImport?.test(line) ?? false,
          isNamespace: patterns.namespaceImport?.test(line) ?? false,
          startLine: lineNum,
        })
      }

      // Check for functions
      const funcMatch = line.match(patterns.function)
      if (funcMatch) {
        analysis.functions.push({
          name: funcMatch[1],
          params: [],
          startLine: lineNum,
          endLine: lineNum, // Simplified - would need brace matching for accurate end
          isAsync: /async/.test(line),
          isExported: /export/.test(line),
        })
      }

      // Check for classes
      const classMatch = line.match(patterns.class)
      if (classMatch) {
        analysis.classes.push({
          name: classMatch[1],
          startLine: lineNum,
          endLine: lineNum, // Simplified
          methods: [],
          properties: [],
          isExported: /export/.test(line),
        })
      }
    }
  }

  /**
   * Get regex patterns for a language
   */
  private getLanguagePatterns(language: SupportedLanguage): {
    import: RegExp
    defaultImport?: RegExp
    namespaceImport?: RegExp
    function: RegExp
    class: RegExp
  } {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return {
          import: /^\s*import\s/,
          defaultImport: /import\s+\w+\s+from/,
          namespaceImport: /import\s+\*\s+as/,
          function: /(?:function|const|let|var)\s+(\w+)\s*(?:[=:]\s*)?(?:async\s+)?(?:function)?\s*\(/,
          class: /class\s+(\w+)/,
        }

      case 'python':
        return {
          import: /^\s*(?:import|from)\s/,
          function: /def\s+(\w+)\s*\(/,
          class: /class\s+(\w+)/,
        }

      case 'go':
        return {
          import: /^\s*import\s/,
          function: /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/,
          class: /type\s+(\w+)\s+struct/,
        }

      case 'rust':
        return {
          import: /^\s*use\s/,
          function: /fn\s+(\w+)\s*[<(]/,
          class: /(?:struct|enum|trait)\s+(\w+)/,
        }

      case 'java':
        return {
          import: /^\s*import\s/,
          function: /(?:public|private|protected)?\s*(?:static\s*)?\w+\s+(\w+)\s*\(/,
          class: /class\s+(\w+)/,
        }

      default:
        return {
          import: /^$/,
          function: /^$/,
          class: /^$/,
        }
    }
  }

  /**
   * Get a summary of the code structure
   */
  async getSummary(filePath: string): Promise<string | null> {
    const analysis = await this.analyzeFile(filePath)
    if (!analysis)
      return null

    const lines: string[] = [
      `File: ${filePath}`,
      `Language: ${analysis.language}`,
      `Lines: ${analysis.lineCount}`,
      '',
    ]

    if (analysis.imports.length > 0) {
      lines.push(`Imports (${analysis.imports.length}):`, ...analysis.imports.slice(0, 5).map(i => `  - ${i.source}`), analysis.imports.length > 5 ? `  ... and ${analysis.imports.length - 5} more` : '')
    }

    if (analysis.classes.length > 0) {
      lines.push('', `Classes (${analysis.classes.length}):`, ...analysis.classes.map(c => `  - ${c.name}${c.extends ? ` extends ${c.extends}` : ''}`))
    }

    if (analysis.functions.length > 0) {
      lines.push('', `Functions (${analysis.functions.length}):`, ...analysis.functions.slice(0, 10).map(f => `  - ${f.isAsync ? 'async ' : ''}${f.name}(${f.params.join(', ')})`), analysis.functions.length > 10 ? `  ... and ${analysis.functions.length - 10} more` : '')
    }

    if (analysis.exports.length > 0) {
      lines.push('', `Exports: ${analysis.exports.join(', ')}`)
    }

    return lines.filter(l => l !== '').join('\n')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let parserInstance: CodeParser | null = null

/**
 * Get the singleton code parser instance
 */
export function getCodeParser(): CodeParser {
  if (!parserInstance) {
    parserInstance = new CodeParser()
  }
  return parserInstance
}

/**
 * Analyze a file using the singleton parser
 */
export async function analyzeFile(filePath: string): Promise<CodeAnalysis | null> {
  const parser = getCodeParser()
  return parser.analyzeFile(filePath)
}

/**
 * Analyze code string using the singleton parser
 */
export async function analyzeCode(
  code: string,
  language: SupportedLanguage,
  filePath?: string,
): Promise<CodeAnalysis> {
  const parser = getCodeParser()
  return parser.analyze(code, language, filePath)
}

/**
 * Get a summary of a file's structure
 */
export async function getFileSummary(filePath: string): Promise<string | null> {
  const parser = getCodeParser()
  return parser.getSummary(filePath)
}
