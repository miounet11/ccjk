/**
 * CCJK Vim Parser - Command Parsing and Motion Resolution
 *
 * Provides comprehensive Vim command parsing and motion resolution
 * for the CCJK Vim Mode Enhancement system
 *
 * @module terminal/vim-parser
 */

import type { SupportedLang } from '../constants'
import type { TextObject, VimCommand, VimPosition, VimRange } from './vim-mode'

// ============================================================================
// Parser Configuration
// ============================================================================

export interface ParserConfig {
  lang: SupportedLang
  timeout: number // milliseconds to wait for complete command
  bufferTimeout: number // milliseconds before clearing partial input
}

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  lang: 'en',
  timeout: 1000,
  bufferTimeout: 3000,
}

// ============================================================================
// Character Search State (for f/F/t/T and ;/, repetition)
// ============================================================================

export interface CharSearchState {
  char: string
  forward: boolean
  till: boolean // true for t/T, false for f/F
  lastPosition: VimPosition
}

// ============================================================================
// Vim Parser Class
// ============================================================================

export class VimParser {
  private buffer: string
  private lastCharSearch: CharSearchState | null
  private lastCommand: VimCommand | null
  private config: ParserConfig
  private bufferTimer: NodeJS.Timeout | null
  private commandTimers: Map<number, NodeJS.Timeout>

  constructor(config: Partial<ParserConfig> = {}) {
    this.buffer = ''
    this.lastCharSearch = null
    this.lastCommand = null
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config }
    this.bufferTimer = null
    this.commandTimers = new Map()
  }

  // ========================================================================
  // Buffer Management
  // ========================================================================

  /**
   * Add a character to the input buffer
   */
  push(char: string): void {
    this.buffer += char
    this.resetBufferTimer()
  }

  /**
   * Remove the last character from the buffer
   */
  pop(): string | null {
    const last = this.buffer.slice(-1)
    this.buffer = this.buffer.slice(0, -1)
    return last || null
  }

  /**
   * Clear the input buffer
   */
  clear(): void {
    this.buffer = ''
    this.clearBufferTimer()
  }

  /**
   * Get the current buffer content
   */
  getBuffer(): string {
    return this.buffer
  }

  /**
   * Check if buffer has content
   */
  hasBuffer(): boolean {
    return this.buffer.length > 0
  }

  /**
   * Reset the buffer clear timer
   */
  private resetBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer)
    }

    this.bufferTimer = setTimeout(() => {
      this.buffer = ''
    }, this.config.bufferTimeout)
  }

  /**
   * Clear the buffer timer
   */
  private clearBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer)
      this.bufferTimer = null
    }
  }

  // ========================================================================
  // Command Parsing
  // ========================================================================

  /**
   * Parse the current buffer as a Vim command
   */
  parse(): VimCommand | null {
    const input = this.buffer
    if (!input) {
      return null
    }

    const command = this.parseCommandString(input)
    if (command) {
      this.lastCommand = command
      this.buffer = ''
      this.clearBufferTimer()
    }

    return command
  }

  /**
   * Parse a command string
   */
  parseCommandString(input: string): VimCommand | null {
    if (!input) {
      return null
    }

    // Handle special repetition characters
    if (input === ';' || input === ',') {
      return this.parseRepetition(input)
    }

    let remaining = input
    let count = 0

    // Extract count prefix
    const countMatch = remaining.match(/^(\d+)/)
    if (countMatch) {
      count = Number.parseInt(countMatch[1], 10)
      remaining = remaining.slice(countMatch[1].length)
    }

    if (!remaining) {
      return null
    }

    const command: VimCommand = {}
    if (count > 0) {
      command.count = count
    }

    // Parse operator
    const firstChar = remaining[0]
    const secondChar = remaining[1]

    switch (firstChar) {
      case 'd': // Delete
      case 'c': // Change
      case 'y': // Yank
      case '>': // Indent
      case '<': // Dedent
        command.operator = firstChar as any
        break

      case 'p': // Paste after
      case 'P': // Paste before
        command.operator = firstChar as any
        return command

      case 'J': // Join lines
        command.operator = 'J'
        return command

      case 'Y': // Yank line (alias)
        command.operator = 'y'
        command.motion = 'yy'
        return command
    }

    // Handle special motions
    if (secondChar === firstChar) {
      switch (firstChar) {
        case 'y':
          command.motion = 'yy'
          return command
        case '>':
          command.motion = '>>'
          return command
        case '<':
          command.motion = '<<'
          return command
      }
    }

    // Parse character search motions (f, F, t, T)
    if (['f', 'F', 't', 'T'].includes(firstChar)) {
      if (remaining.length > 1) {
        const char = remaining[1]
        this.lastCharSearch = {
          char,
          forward: firstChar === 'f' || firstChar === 't',
          till: firstChar === 't' || firstChar === 'T',
          lastPosition: { line: 0, column: 0 },
        }
        command.motion = firstChar + char
        return command
      }
    }

    // Parse text objects
    if (remaining.length >= 2) {
      const scope = remaining[0] // 'i' or 'a'
      const type = remaining[1]

      if (scope === 'i' || scope === 'a') {
        const textObject = this.parseTextObject(scope, type)
        if (textObject) {
          command.textObject = textObject
          // If no operator set, default to delete (common in visual mode)
          if (!command.operator) {
            command.operator = 'd'
          }
          return command
        }
      }
    }

    // Parse remaining as motion
    if (remaining) {
      command.motion = remaining
    }

    return command
  }

  /**
   * Parse repetition command (; or ,)
   */
  private parseRepetition(input: string): VimCommand | null {
    if (!this.lastCharSearch) {
      return null
    }

    const forward = this.lastCharSearch.forward
    const reverse = input === ',' // comma reverses direction

    const command: VimCommand = {
      operator: this.lastCommand?.operator || 'd',
      motion: reverse
        ? (forward ? 'F' : 'f') + this.lastCharSearch.char
        : (forward ? 'f' : 'F') + this.lastCharSearch.char,
    }

    return command
  }

  /**
   * Parse text object from scope and type characters
   */
  private parseTextObject(scope: string, type: string): TextObject | null {
    const inclusive = scope === 'a'

    switch (type) {
      case 'w':
        return { type: 'word', inclusive }
      case 'W':
        return { type: 'WORD', inclusive }
      case '"':
      case '\'':
        return { type: 'quote', inclusive, character: type }
      case '(':
      case ')':
        return { type: 'paren', inclusive, character: '(' }
      case '[':
      case ']':
        return { type: 'bracket', inclusive, character: '[' }
      case '{':
      case '}':
        return { type: 'brace', inclusive, character: '{' }
      default:
        return null
    }
  }

  // ========================================================================
  // Motion Resolution
  // ========================================================================

  /**
   * Resolve a motion to a position range
   */
  resolveMotion(
    motion: string,
    currentPosition: VimPosition,
    lines: string[],
  ): VimRange | null {
    const currentLine = lines[currentPosition.line] || ''

    // Character search motions (f/F/t/T)
    const charSearchMatch = motion.match(/^([ft])(.)$/i)
    if (charSearchMatch) {
      const [, direction, char] = charSearchMatch
      return this.resolveCharSearch(direction, char, currentPosition, currentLine)
    }

    // Word motions
    switch (motion) {
      case 'w':
      case 'W':
        return this.resolveNextWord(motion === 'W', currentPosition, currentLine)
      case 'b':
      case 'B':
        return this.resolvePrevWord(motion === 'B', currentPosition, currentLine)
      case 'e':
      case 'E':
        return this.resolveWordEnd(motion === 'E', currentPosition, currentLine)
      case '0':
        return { start: { ...currentPosition, column: 0 }, end: { ...currentPosition, column: 0 } }
      case '^':
        return this.resolveLineStart(currentPosition, currentLine)
      case '$':
        return this.resolveLineEnd(currentPosition, currentLine)
    }

    return null
  }

  /**
   * Resolve character search motion
   */
  private resolveCharSearch(
    direction: string,
    char: string,
    pos: VimPosition,
    line: string,
  ): VimRange | null {
    const forward = direction === 'f' || direction === 't'
    const till = direction === 't' || direction === 'T'

    let foundColumn = -1

    if (forward) {
      for (let i = pos.column + 1; i < line.length; i++) {
        if (line[i] === char) {
          foundColumn = till ? i - 1 : i
          break
        }
      }
    }
    else {
      for (let i = pos.column - 1; i >= 0; i--) {
        if (line[i] === char) {
          foundColumn = till ? i + 1 : i
          break
        }
      }
    }

    if (foundColumn === -1) {
      return null
    }

    const foundPos = { line: pos.line, column: foundColumn }
    return {
      start: pos,
      end: foundPos,
    }
  }

  /**
   * Resolve to next word
   */
  private resolveNextWord(isWORD: boolean, pos: VimPosition, line: string): VimRange | null {
    const wordRegex = isWORD ? /[^ \t]+/g : /\w+/g
    const words: Array<{ start: number, end: number }> = []
    let match: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while ((match = wordRegex.exec(line)) !== null) {
      words.push({ start: match.index, end: match.index + match[0].length })
    }

    // Find next word after cursor
    for (const word of words) {
      if (word.start > pos.column) {
        return {
          start: pos,
          end: { line: pos.line, column: word.start },
        }
      }
    }

    return null
  }

  /**
   * Resolve to previous word
   */
  private resolvePrevWord(isWORD: boolean, pos: VimPosition, line: string): VimRange | null {
    const wordRegex = isWORD ? /[^ \t]+/g : /\w+/g
    const words: Array<{ start: number, end: number }> = []
    let match: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while ((match = wordRegex.exec(line)) !== null) {
      words.push({ start: match.index, end: match.index + match[0].length })
    }

    // Find previous word before cursor
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i]
      if (word.end <= pos.column) {
        return {
          start: pos,
          end: { line: pos.line, column: word.start },
        }
      }
    }

    return null
  }

  /**
   * Resolve to word end
   */
  private resolveWordEnd(isWORD: boolean, pos: VimPosition, line: string): VimRange | null {
    const wordRegex = isWORD ? /[^ \t]+/g : /\w+/g
    const words: Array<{ start: number, end: number }> = []
    let match: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while ((match = wordRegex.exec(line)) !== null) {
      words.push({ start: match.index, end: match.index + match[0].length })
    }

    // Find word containing cursor or next word
    for (const word of words) {
      if (word.start > pos.column) {
        return {
          start: pos,
          end: { line: pos.line, column: word.end - 1 },
        }
      }
      if (pos.column >= word.start && pos.column < word.end) {
        return {
          start: pos,
          end: { line: pos.line, column: word.end - 1 },
        }
      }
    }

    return null
  }

  /**
   * Resolve to first non-blank character
   */
  private resolveLineStart(pos: VimPosition, line: string): VimRange {
    const match = line.match(/^\s*/)
    const firstNonBlank = match ? match[0].length : 0
    return {
      start: pos,
      end: { line: pos.line, column: firstNonBlank },
    }
  }

  /**
   * Resolve to end of line
   */
  private resolveLineEnd(pos: VimPosition, line: string): VimRange {
    const endCol = Math.max(0, line.length - 1)
    return {
      start: pos,
      end: { line: pos.line, column: endCol },
    }
  }

  // ========================================================================
  // Operator Application
  // ========================================================================

  /**
   * Apply an operator to a range
   */
  applyOperator(
    operator: string,
    range: VimRange,
    lines: string[],
    count: number = 1,
  ): { result: string[], deleted: string, cursor: VimPosition } | null {
    switch (operator) {
      case 'd':
        return this.deleteOperator(range, lines)
      case 'y':
        return this.yankOperator(range, lines, count)
      case 'c':
        return this.changeOperator(range, lines)
      case '>':
        return this.indentOperator(range, lines, count)
      case '<':
        return this.dedentOperator(range, lines, count)
      case 'J':
        return this.joinOperator(range.start.line, lines, count)
      default:
        return null
    }
  }

  /**
   * Delete operator
   */
  private deleteOperator(range: VimRange, lines: string[]): { result: string[], deleted: string, cursor: VimPosition } | null {
    const startLine = range.start.line
    const endLine = range.end.line

    if (startLine >= lines.length) {
      return null
    }

    const startCol = range.start.column
    const endCol = range.end.column

    let deleted = ''
    const result = [...lines]

    if (startLine === endLine) {
      // Single line deletion
      const line = result[startLine]
      deleted = line.slice(startCol, endCol + 1)
      result[startLine] = line.slice(0, startCol) + line.slice(endCol + 1)
    }
    else {
      // Multi-line deletion
      const firstLine = result[startLine].slice(0, startCol)
      const lastLine = result[endLine].slice(endCol + 1)
      const middleLines = result.slice(startLine + 1, endLine)

      deleted = `${result[startLine].slice(startCol)}\n${
        middleLines.join('\n')}\n${
        result[endLine].slice(0, endCol + 1)}`

      result[startLine] = firstLine + lastLine
      result.splice(startLine + 1, endLine - startLine)
    }

    return {
      result,
      deleted,
      cursor: { line: startLine, column: startCol },
    }
  }

  /**
   * Yank operator
   */
  private yankOperator(range: VimRange, lines: string[], count: number): { result: string[], deleted: string, cursor: VimPosition } | null {
    const startLine = range.start.line
    const endLine = Math.min(range.end.line + 1, lines.length)
    const yankedLines = lines.slice(startLine, endLine)

    const yankedText = count > 1
      ? Array.from({ length: count }, () => yankedLines.join('\n')).join('\n')
      : yankedLines.join('\n')

    return {
      result: lines, // Yank doesn't modify
      deleted: yankedText,
      cursor: range.start,
    }
  }

  /**
   * Change operator (delete and enter insert mode)
   */
  private changeOperator(range: VimRange, lines: string[]): { result: string[], deleted: string, cursor: VimPosition } | null {
    const result = this.deleteOperator(range, lines)
    if (result) {
      // Change is like delete, but enters insert mode
      // For readline, we might position cursor for insertion
      return result
    }
    return null
  }

  /**
   * Indent operator
   */
  private indentOperator(range: VimRange, lines: string[], count: number): { result: string[], deleted: string, cursor: VimPosition } | null {
    const startLine = range.start.line
    const actualCount = count || 1
    const endLine = Math.min(startLine + actualCount, lines.length)

    const result = [...lines]
    const tabWidth = 2
    const indent = ' '.repeat(tabWidth)

    for (let i = startLine; i < endLine; i++) {
      result[i] = indent + result[i]
    }

    return {
      result,
      deleted: '',
      cursor: { line: startLine, column: range.start.column + tabWidth },
    }
  }

  /**
   * Dedent operator
   */
  private dedentOperator(range: VimRange, lines: string[], count: number): { result: string[], deleted: string, cursor: VimPosition } | null {
    const startLine = range.start.line
    const actualCount = count || 1
    const endLine = Math.min(startLine + actualCount, lines.length)

    const result = [...lines]
    const tabWidth = 2

    for (let i = startLine; i < endLine; i++) {
      const line = result[i]
      const leadingSpaces = line.match(/^\s*/)?.[0]?.length || 0
      const toRemove = Math.min(leadingSpaces, tabWidth)
      result[i] = line.slice(toRemove)
    }

    return {
      result,
      deleted: '',
      cursor: { line: startLine, column: Math.max(0, range.start.column - tabWidth) },
    }
  }

  /**
   * Join operator
   */
  private joinOperator(startLine: number, lines: string[], count: number): { result: string[], deleted: string, cursor: VimPosition } | null {
    const actualCount = count || 1
    const endLine = Math.min(startLine + actualCount, lines.length)

    if (endLine >= lines.length) {
      return { result: lines, deleted: '', cursor: { line: startLine, column: 0 } }
    }

    const result = [...lines]
    const joined = result[startLine].trimEnd()
    const nextLines = result.slice(startLine + 1, endLine + 1).map(l => l.trimStart())

    result[startLine] = `${joined} ${nextLines.join(' ')}`
    result.splice(startLine + 1, endLine - startLine)

    const newColumn = joined.length + 1

    return {
      result,
      deleted: '',
      cursor: { line: startLine, column: newColumn },
    }
  }

  // ========================================================================
  // State Management
  // ========================================================================

  getLastCommand(): VimCommand | null {
    return this.lastCommand
  }

  getLastCharSearch(): CharSearchState | null {
    return this.lastCharSearch
  }

  getConfig(): ParserConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<ParserConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  destroy(): void {
    this.clearBufferTimer()
    this.commandTimers.forEach(timer => clearTimeout(timer))
    this.commandTimers.clear()
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let parserInstance: VimParser | null = null

export function getVimParser(): VimParser {
  if (!parserInstance) {
    parserInstance = new VimParser()
  }
  return parserInstance
}

export function createVimParser(config?: Partial<ParserConfig>): VimParser {
  return new VimParser(config)
}

export function resetVimParser(): void {
  if (parserInstance) {
    parserInstance.destroy()
    parserInstance = null
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a string is a valid Vim command
 */
export function isValidVimCommand(input: string): boolean {
  if (!input) {
    return false
  }

  // Single character commands
  if (/^[dcy><pPJ]$/.test(input)) {
    return true
  }

  // Count + operator
  if (/^\d+[dcy><]$/.test(input)) {
    return true
  }

  // yy, Y, >>, << with optional count
  if (/^\d*(?:yy|>>|<<)$/.test(input)) {
    return true
  }

  // Text objects
  if (/^[dcy]?(?:i|a)[wW"'{}[\]]$/.test(input)) {
    return true
  }

  // Character search
  if (/^[ft][a-z]$/i.test(input)) {
    return true
  }

  // Repetition
  if (/^[;,]$/.test(input)) {
    return true
  }

  return false
}

/**
 * Get command type for display
 */
export function getCommandType(command: VimCommand): string {
  if (!command.operator) {
    return 'motion'
  }

  switch (command.operator) {
    case 'd':
      return 'delete'
    case 'c':
      return 'change'
    case 'y':
      return 'yank'
    case 'p':
      return 'paste'
    case 'P':
      return 'paste-before'
    case '>':
      return 'indent'
    case '<':
      return 'dedent'
    case 'J':
      return 'join'
    default:
      return 'unknown'
  }
}

/**
 * Format command for display
 */
export function formatCommand(command: VimCommand, lang: SupportedLang = 'en'): string {
  const type = getCommandType(command)

  const translations: Record<SupportedLang, Record<string, string>> = {
    'en': {
      'delete': 'Delete',
      'change': 'Change',
      'yank': 'Yank',
      'paste': 'Paste',
      'paste-before': 'Paste Before',
      'indent': 'Indent',
      'dedent': 'Dedent',
      'join': 'Join',
      'motion': 'Motion',
    },
    'zh-CN': {
      'delete': '删除',
      'change': '修改',
      'yank': '复制',
      'paste': '粘贴',
      'paste-before': '粘贴到前面',
      'indent': '缩进',
      'dedent': '减少缩进',
      'join': '合并',
      'motion': '移动',
    },
  }

  const langTranslations = translations[lang]
  let result = langTranslations[type] || type

  if (command.count) {
    result += ` x${command.count}`
  }

  if (command.motion) {
    result += ` (${command.motion})`
  }

  if (command.textObject) {
    const scope = command.textObject.inclusive ? 'a' : 'i'
    const typeChar = command.textObject.type === 'WORD'
      ? 'W'
      : command.textObject.character || command.textObject.type[0]
    result += ` (${scope}${typeChar})`
  }

  return result
}
