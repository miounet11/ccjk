/**
 * CCJK Vim Mode Enhancement System
 *
 * Implements enhanced Vim motions for Claude Code CLI 2.1.0+
 * Provides text manipulation capabilities similar to Vim editor
 *
 * Features:
 * - Motion repetition with ; and ,
 * - Yank operator with yy/Y
 * - Paste from kill ring with p/P
 * - Text objects: iw, aw, iW, aW, i", a", i', a', i(, a(, i[, a[, i{, a{
 * - Indent/dedent with >>/<<
 * - Join lines with J
 *
 * @module terminal/vim-mode
 */

import type { SupportedLang } from '../constants'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'

// ============================================================================
// Type Definitions
// ============================================================================

export type VimMode = 'normal' | 'insert' | 'visual' | 'replace'

export interface VimPosition {
  line: number
  column: number
}

export interface VimRange {
  start: VimPosition
  end: VimPosition
}

export interface TextObject {
  type: 'word' | 'WORD' | 'quote' | 'paren' | 'bracket' | 'brace'
  inclusive: boolean // true for 'a' (around), false for 'i' (inner)
  character?: string // for quotes: '"', "'", for brackets: '(', '[', '{'
}

export interface VimCommand {
  operator?: 'd' | 'c' | 'y' | 'p' | 'P' | '>' | '<' | 'J'
  motion?: string
  count?: number
  textObject?: TextObject
  register?: string // "a-z, "0-9, "*", "+
}

export interface VimState {
  mode: VimMode
  position: VimPosition
  lastCommand: VimCommand | null
  lastSearchedChar: { char: string, forward: boolean } | null
  registers: Map<string, string>
  marks: Map<string, VimPosition>
  visualStart: VimPosition | null
}

export interface VimModeConfig {
  enabled: boolean
  showModeIndicator: boolean
  autoIndent: boolean
  expandTab: boolean
  tabWidth: number
  smartCase: boolean
  lang: SupportedLang
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_VIM_CONFIG: VimModeConfig = {
  enabled: false,
  showModeIndicator: true,
  autoIndent: true,
  expandTab: true,
  tabWidth: 2,
  smartCase: true,
  lang: 'en',
}

// ============================================================================
// Vim Mode State Management
// ============================================================================

class VimModeManager {
  private state: VimState
  private config: VimModeConfig
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.ccjk', 'vim-mode.json')
    this.state = this.initializeState()
    this.config = { ...DEFAULT_VIM_CONFIG }
    this.loadConfig()
  }

  private initializeState(): VimState {
    return {
      mode: 'normal',
      position: { line: 0, column: 0 },
      lastCommand: null,
      lastSearchedChar: null,
      registers: new Map(),
      marks: new Map(),
      visualStart: null,
    }
  }

  // ========================================================================
  // Configuration Management
  // ========================================================================

  async loadConfig(): Promise<void> {
    try {
      if (existsSync(this.configPath)) {
        const content = await readFile(this.configPath, 'utf-8')
        const saved = JSON.parse(content)
        this.config = { ...DEFAULT_VIM_CONFIG, ...saved }
      }
    }
    catch {
      // Use defaults if config cannot be loaded
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const dir = join(this.configPath, '..')
      await mkdir(dir, { recursive: true })
      await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
    }
    catch (error) {
      console.error(ansis.red(`Failed to save vim config: ${error}`))
    }
  }

  getConfig(): VimModeConfig {
    return { ...this.config }
  }

  async updateConfig(updates: Partial<VimModeConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    await this.saveConfig()
  }

  // ========================================================================
  // State Management
  // ========================================================================

  getState(): VimState {
    return { ...this.state }
  }

  setMode(mode: VimMode): void {
    this.state.mode = mode
    if (mode === 'normal') {
      this.state.visualStart = null
    }
  }

  getMode(): VimMode {
    return this.state.mode
  }

  setPosition(position: VimPosition): void {
    this.state.position = position
  }

  getPosition(): VimPosition {
    return { ...this.state.position }
  }

  // ========================================================================
  // Register Operations (Yank/Paste)
  // ========================================================================

  yankToRegister(register: string, text: string): void {
    const reg = register || '"'
    this.state.registers.set(reg, text)
    // Also update the default register
    if (reg !== '"') {
      this.state.registers.set('"', text)
    }
  }

  getYankText(register?: string): string {
    const reg = register || '"'
    return this.state.registers.get(reg) || ''
  }

  pasteAfter(register?: string): string {
    const text = this.getYankText(register)
    // For paste after (p), the position would be updated
    return text
  }

  pasteBefore(register?: string): string {
    const text = this.getYankText(register)
    // For paste before (P), the position would be updated
    return text
  }

  // ========================================================================
  // Mark Operations
  // ========================================================================

  setMark(mark: string, position: VimPosition): void {
    this.state.marks.set(mark, position)
  }

  getMark(mark: string): VimPosition | undefined {
    return this.state.marks.get(mark)
  }

  // ========================================================================
  // Last Searched Character (for f/F/t/T repetition with ;/,)
  // ========================================================================

  setLastSearchedChar(char: string, forward: boolean): void {
    this.state.lastSearchedChar = { char, forward }
  }

  getLastSearchedChar(): { char: string, forward: boolean } | null {
    return this.state.lastSearchedChar
  }

  // ========================================================================
  // Visual Mode
  // ========================================================================

  startVisualMode(startPos: VimPosition): void {
    this.state.mode = 'visual'
    this.state.visualStart = startPos
  }

  endVisualMode(): void {
    this.state.mode = 'normal'
    this.state.visualStart = null
  }

  getVisualRange(): VimRange | null {
    if (!this.state.visualStart) {
      return null
    }
    return {
      start: this.state.visualStart,
      end: this.state.position,
    }
  }
}

// ============================================================================
// Vim Command Parser
// ============================================================================

/**
 * Parse a Vim command string into structured command
 *
 * Examples:
 * - "yy" -> yank current line
 * - "3yy" -> yank 3 lines
 * - "ciw" -> change inner word
 * - "da'" -> delete around single quote
 * - ">>" -> indent current line
 * - "3>>" -> indent 3 lines
 * - "J" -> join lines
 */
export function parseVimCommand(input: string): VimCommand | null {
  if (!input) {
    return null
  }

  let remaining = input
  let count = 0

  // Parse count prefix (e.g., "3yy" -> count = 3)
  const countMatch = remaining.match(/^(\d+)/)
  if (countMatch) {
    count = Number.parseInt(countMatch[1], 10)
    remaining = remaining.slice(countMatch[1].length)
  }

  // If remaining is empty, invalid command
  if (!remaining) {
    return null
  }

  const command: VimCommand = {}
  if (count > 0) {
    command.count = count
  }

  // Parse operator
  const operator = remaining[0]
  if (['d', 'c', 'y', '>', '<', 'J'].includes(operator)) {
    command.operator = operator as any
    remaining = remaining.slice(1)

    // yy/Y for yank line
    if (operator === 'y' && remaining === 'y') {
      command.motion = 'yy'
      return command
    }

    // Y is alias for yy
    if (operator === 'y' && remaining === '') {
      command.motion = 'yy'
      return command
    }

    // >> for indent, << for dedent
    if (operator === '>' && remaining === '>') {
      command.motion = '>>'
      return command
    }
    if (operator === '<' && remaining === '<') {
      command.motion = '<<'
      return command
    }

    // J operator has no motion
    if (operator === 'J') {
      return command
    }
  }
  else if (operator === 'p' || operator === 'P') {
    command.operator = operator as any
    return command
  }

  // Parse text object (e.g., iw, aw, i", a', ciw, da")
  if (remaining.length >= 2) {
    const scope = remaining[0] // 'i' or 'a'
    const type = remaining[1]

    if (scope === 'i' || scope === 'a') {
      let textObject: TextObject | undefined

      switch (type) {
        case 'w':
          textObject = { type: 'word', inclusive: scope === 'a' }
          break
        case 'W':
          textObject = { type: 'WORD', inclusive: scope === 'a' }
          break
        case '"':
        case '\'':
          textObject = { type: 'quote', inclusive: scope === 'a', character: type }
          break
        case '(':
        case ')':
          textObject = { type: 'paren', inclusive: scope === 'a', character: '(' }
          break
        case '[':
        case ']':
          textObject = { type: 'bracket', inclusive: scope === 'a', character: '[' }
          break
        case '{':
        case '}':
          textObject = { type: 'brace', inclusive: scope === 'a', character: '{' }
          break
      }

      if (textObject) {
        command.textObject = textObject
        // If we already have an operator, this is operator-pending mode
        // If not, we need to determine from context
        if (!command.operator) {
          // Text object without operator means delete in visual mode
          command.operator = 'd'
        }
        return command
      }
    }
  }

  // Parse motion
  if (remaining && !command.textObject) {
    command.motion = remaining
  }

  return command
}

// ============================================================================
// Text Object Resolution
// ============================================================================

export interface TextObjectResult {
  start: VimPosition
  end: VimPosition
  text: string
}

/**
 * Find text object boundaries in a line of text
 */
export function findTextObject(
  line: string,
  column: number,
  textObject: TextObject,
): TextObjectResult | null {
  const { type, inclusive, character } = textObject

  switch (type) {
    case 'word': {
      // Find word boundaries (alphanumeric + underscore)
      const wordRegex = /\w+/g
      const matches: Array<{ start: number, end: number }> = []
      let match: RegExpExecArray | null

      while ((match = wordRegex.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length })
      }

      // Find the word containing the cursor
      for (const m of matches) {
        if (column >= m.start && column < m.end) {
          const start = inclusive ? m.start - 1 : m.start
          const end = inclusive ? m.end : m.end - 1
          const safeStart = Math.max(0, start)
          const safeEnd = Math.min(line.length, end)
          return {
            start: { line: 0, column: safeStart },
            end: { line: 0, column: safeEnd },
            text: line.slice(safeStart, safeEnd + 1),
          }
        }
      }
      return null
    }

    case 'WORD': {
      // Find WORD boundaries (non-whitespace)
      const wordRegex = /[^ \t]+/g
      const matches: Array<{ start: number, end: number }> = []
      let match: RegExpExecArray | null

      while ((match = wordRegex.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length })
      }

      for (const m of matches) {
        if (column >= m.start && column < m.end) {
          const start = inclusive ? m.start - 1 : m.start
          const end = inclusive ? m.end : m.end - 1
          const safeStart = Math.max(0, start)
          const safeEnd = Math.min(line.length, end)
          return {
            start: { line: 0, column: safeStart },
            end: { line: 0, column: safeEnd },
            text: line.slice(safeStart, safeEnd + 1),
          }
        }
      }
      return null
    }

    case 'quote': {
      if (!character) {
        return null
      }
      // Find matching quote pair
      const quote = character
      const quotes: Array<{ pos: number, isStart: boolean }> = []

      for (let i = 0; i < line.length; i++) {
        if (line[i] === quote && (i === 0 || line[i - 1] !== '\\')) {
          quotes.push({ pos: i, isStart: quotes.length % 2 === 0 })
        }
      }

      // Find quote pair containing cursor
      for (let i = 0; i < quotes.length - 1; i++) {
        if (quotes[i].isStart && !quotes[i + 1].isStart) {
          if (column >= quotes[i].pos && column <= quotes[i + 1].pos) {
            const start = inclusive ? quotes[i].pos : quotes[i].pos + 1
            const end = inclusive ? quotes[i + 1].pos : quotes[i + 1].pos - 1
            return {
              start: { line: 0, column: start },
              end: { line: 0, column: end },
              text: line.slice(start, end + 1),
            }
          }
        }
      }
      return null
    }

    case 'paren':
    case 'bracket':
    case 'brace': {
      if (!character) {
        return null
      }
      const openChar = character
      const closeChar = character === '(' ? ')' : character === '[' ? ']' : '}'

      // Find matching pair
      const stack: number[] = []
      const pairs: Array<{ open: number, close: number }> = []

      for (let i = 0; i < line.length; i++) {
        if (line[i] === openChar) {
          stack.push(i)
        }
        else if (line[i] === closeChar && stack.length > 0) {
          const openPos = stack.pop()!
          if (stack.length === 0) {
            pairs.push({ open: openPos, close: i })
          }
        }
      }

      // Find pair containing cursor
      for (const pair of pairs) {
        if (column >= pair.open && column <= pair.close) {
          const start = inclusive ? pair.open : pair.open + 1
          const end = inclusive ? pair.close : pair.close - 1
          return {
            start: { line: 0, column: start },
            end: { line: 0, column: end },
            text: line.slice(start, end + 1),
          }
        }
      }
      return null
    }

    default:
      return null
  }
}

// ============================================================================
// Motion Repetition ( ; and , )
// ============================================================================

/**
 * Repeat the last character search motion
 * ; repeats in the same direction, , reverses direction
 */
export interface MotionResult {
  position: VimPosition
  found: boolean
}

export function repeatCharSearch(
  line: string,
  currentColumn: number,
  char: string,
  forward: boolean,
  reverse: boolean, // true for ',' (comma), false for ';' (semicolon)
): MotionResult {
  const actualForward = reverse ? !forward : forward
  let found = false
  let newColumn = currentColumn

  if (actualForward) {
    // Search forward after current position
    for (let i = currentColumn + 1; i < line.length; i++) {
      if (line[i] === char) {
        newColumn = i
        found = true
        break
      }
    }
  }
  else {
    // Search backward before current position
    for (let i = currentColumn - 1; i >= 0; i--) {
      if (line[i] === char) {
        newColumn = i
        found = true
        break
      }
    }
  }

  return {
    position: { line: 0, column: newColumn },
    found,
  }
}

// ============================================================================
// Line Operations
// ============================================================================

/**
 * Yank lines (yy or Y)
 */
export function yankLines(lines: string[], startLine: number, count: number = 1): string {
  const endLine = Math.min(startLine + count, lines.length)
  return lines.slice(startLine, endLine).join('\n')
}

/**
 * Indent lines (>>)
 */
export function indentLines(lines: string[], startLine: number, count: number = 1, tabWidth: number = 2, useSpaces: boolean = true): string[] {
  const indent = useSpaces ? ' '.repeat(tabWidth) : '\t'
  const endLine = Math.min(startLine + count, lines.length)
  const result = [...lines]

  for (let i = startLine; i < endLine; i++) {
    result[i] = indent + result[i]
  }

  return result
}

/**
 * Dedent lines (<<)
 */
export function dedentLines(lines: string[], startLine: number, count: number = 1, tabWidth: number = 2): string[] {
  const endLine = Math.min(startLine + count, lines.length)
  const result = [...lines]

  for (let i = startLine; i < endLine; i++) {
    const line = result[i]
    const leadingSpaces = line.match(/^\s*/)?.[0]?.length || 0
    const toRemove = Math.min(leadingSpaces, tabWidth)
    result[i] = line.slice(toRemove)
  }

  return result
}

/**
 * Join lines (J)
 */
export function joinLines(lines: string[], startLine: number, count: number = 1): string[] {
  const endLine = Math.min(startLine + count, lines.length)
  if (endLine >= lines.length) {
    return [...lines]
  }

  const result = [...lines]
  const joined = result[startLine].trimEnd()

  // Join with space
  const remainingLines: string[] = []
  for (let i = startLine + 1; i <= endLine && i < result.length; i++) {
    remainingLines.push(result[i].trimStart())
  }

  result[startLine] = `${joined} ${remainingLines.join(' ')}`
  result.splice(startLine + 1, remainingLines.length)

  return result
}

// ============================================================================
// Readline Keybinding Configuration
// ============================================================================

export interface ReadlineKeybinding {
  sequence: string
  action: string
  description: string
}

/**
 * Generate readline keybindings for Vim mode
 */
export function generateVimKeybindings(): ReadlineKeybinding[] {
  return [
    // Motion repetition
    { sequence: '\\C-;', action: 'repeatFind', description: 'Repeat last character search (same direction)' },
    { sequence: '\\C-,', action: 'repeatFindReverse', description: 'Repeat last character search (reverse direction)' },

    // Yank operations
    { sequence: '\\C-y\\C-y', action: 'yankLine', description: 'Yank current line' },
    { sequence: '\\C-Y', action: 'yankLine', description: 'Yank current line (alias)' },

    // Paste operations
    { sequence: '\\C-p', action: 'pasteAfter', description: 'Paste after cursor' },
    { sequence: '\\C-P', action: 'pasteBefore', description: 'Paste before cursor' },

    // Text object deletion
    { sequence: '\\C-c\\C-i\\C-w', action: 'changeInnerWord', description: 'Change inner word' },
    { sequence: '\\C-c\\C-a\\C-w', action: 'changeAroundWord', description: 'Change around word' },
    { sequence: '\\C-d\\C-i\\C-w', action: 'deleteInnerWord', description: 'Delete inner word' },
    { sequence: '\\C-d\\C-a\\C-w', action: 'deleteAroundWord', description: 'Delete around word' },

    // Indent operations
    { sequence: '\\C-\\>', action: 'indentLine', description: 'Indent current line' },
    { sequence: '\\C-<', action: 'dedentLine', description: 'Dedent current line' },

    // Join lines
    { sequence: '\\C-j', action: 'joinLines', description: 'Join with next line' },
  ]
}

/**
 * Generate .inputrc configuration for Vim mode
 */
export function generateInputrcConfig(config: Partial<VimModeConfig> = {}): string {
  const actualConfig = { ...DEFAULT_VIM_CONFIG, ...config }

  let content = `# CCJK Vim Mode Keybindings
# Generated by CCJK v3.8.0
# These keybindings enhance the readline experience with Vim-like motions

$if CCJK_VIM_MODE
`

  if (actualConfig.showModeIndicator) {
    content += `
# Show mode indicator in prompt
set show-mode-in-prompt on
set vi-cmd-mode-string "(cmd)"
set vi-ins-mode-string "(ins)"
`
  }

  content += `
# Vim editing mode
set editing-mode vi

# Key bindings for enhanced Vim motions
`

  const keybindings = generateVimKeybindings()
  for (const kb of keybindings) {
    content += `# ${kb.description}\n`
    content += `"${kb.sequence}": "${kb.action}"\n\n`
  }

  content += `
$endif
`

  return content
}

// ============================================================================
// InputRC File Management
// ============================================================================

/**
 * Get the path to the user's .inputrc file
 */
export function getInputrcPath(): string {
  const envInputrc = process.env.INPUTRC
  if (envInputrc) {
    return envInputrc
  }
  return join(homedir(), '.inputrc')
}

/**
 * Install Vim mode keybindings to .inputrc
 */
export async function installVimKeybindings(config: Partial<VimModeConfig> = {}): Promise<boolean> {
  try {
    const inputrcPath = getInputrcPath()
    let existingContent = ''

    if (existsSync(inputrcPath)) {
      existingContent = await readFile(inputrcPath, 'utf-8')
    }

    // Remove existing CCJK vim mode section
    const markerStart = '# CCJK Vim Mode Keybindings'
    const regex = new RegExp(`\\n${markerStart}[\\s\\S]*?\\$endif\\n`, 'g')

    let newContent = existingContent.replace(regex, '\n')

    // Append new configuration
    const vimConfig = generateInputrcConfig(config)
    newContent = `${newContent.trimEnd()}\n\n${vimConfig}`

    await writeFile(inputrcPath, newContent, 'utf-8')

    return true
  }
  catch (error) {
    console.error(ansis.red(`Failed to install vim keybindings: ${error}`))
    return false
  }
}

/**
 * Remove Vim mode keybindings from .inputrc
 */
export async function uninstallVimKeybindings(): Promise<boolean> {
  try {
    const inputrcPath = getInputrcPath()

    if (!existsSync(inputrcPath)) {
      return true
    }

    const existingContent = await readFile(inputrcPath, 'utf-8')

    // Remove CCJK vim mode section
    const markerStart = '# CCJK Vim Mode Keybindings'
    const regex = new RegExp(`\\n${markerStart}[\\s\\S]*?\\$endif\\n`, 'g')

    const newContent = existingContent.replace(regex, '\n')

    await writeFile(inputrcPath, `${newContent.trimEnd()}\n`, 'utf-8')

    return true
  }
  catch (error) {
    console.error(ansis.red(`Failed to uninstall vim keybindings: ${error}`))
    return false
  }
}

/**
 * Check if Vim mode keybindings are installed
 */
export function isVimKeybindingsInstalled(): boolean {
  try {
    const inputrcPath = getInputrcPath()

    if (!existsSync(inputrcPath)) {
      return false
    }

    const content = readFileSync(inputrcPath, 'utf-8')
    return content.includes('CCJK Vim Mode Keybindings')
  }
  catch {
    return false
  }
}

// ============================================================================
// Mode Indicator
// ============================================================================

/**
 * Generate mode indicator string for prompt
 */
export function generateModeIndicator(mode: VimMode, lang: SupportedLang = 'en'): string {
  const indicators = {
    'en': {
      normal: ansis.cyan('[N]'),
      insert: ansis.green('[I]'),
      visual: ansis.magenta('[V]'),
      replace: ansis.red('[R]'),
    },
    'zh-CN': {
      normal: ansis.cyan('[普通]'),
      insert: ansis.green('[插入]'),
      visual: ansis.magenta('[可视]'),
      replace: ansis.red('[替换]'),
    },
  }

  return indicators[lang][mode]
}

// ============================================================================
// Keybinding Reference
// ============================================================================

/**
 * Generate a reference card for Vim keybindings
 */
export function generateKeybindingReference(lang: SupportedLang = 'en'): string {
  const isZh = lang === 'zh-CN'

  const header = isZh
    ? '╔══════════════════════════════════════════════════════════════╗\n║           CCJK Vim 模式快捷键参考卡                          ║\n╠══════════════════════════════════════════════════════════════╣'
    : '╔══════════════════════════════════════════════════════════════╗\n║           CCJK Vim Mode Keybinding Reference                  ║\n╠══════════════════════════════════════════════════════════════╣'

  const sections: Array<{ title: string, bindings: Array<{ key: string, desc: string }> }> = [
    {
      title: isZh ? '操作符' : 'Operators',
      bindings: [
        { key: 'yy / Y', desc: isZh ? '复制当前行' : 'Yank current line' },
        { key: 'p / P', desc: isZh ? '在光标后/前粘贴' : 'Paste after/before cursor' },
        { key: '>> / <<', desc: isZh ? '增加/减少缩进' : 'Indent/dedent line' },
        { key: 'J', desc: isZh ? '合并下一行' : 'Join with next line' },
      ],
    },
    {
      title: isZh ? '文本对象' : 'Text Objects',
      bindings: [
        { key: 'iw / aw', desc: isZh ? '内部/周围单词' : 'Inner/around word' },
        { key: 'iW / aW', desc: isZh ? '内部/周围 WORD' : 'Inner/around WORD' },
        { key: 'i" / a"', desc: isZh ? '内部/周围双引号' : 'Inner/around double quotes' },
        { key: 'i\' / a\'', desc: isZh ? '内部/周围单引号' : 'Inner/around single quotes' },
        { key: 'i( / a(', desc: isZh ? '内部/周围括号' : 'Inner/around parentheses' },
        { key: 'i[ / a[', desc: isZh ? '内部/周围方括号' : 'Inner/around brackets' },
        { key: 'i{ / a{', desc: isZh ? '内部/周围花括号' : 'Inner/around braces' },
      ],
    },
    {
      title: isZh ? '动作重复' : 'Motion Repetition',
      bindings: [
        { key: ';', desc: isZh ? '重复上次字符查找（同向）' : 'Repeat last char search (same dir)' },
        { key: ',', desc: isZh ? '重复上次字符查找（反向）' : 'Repeat last char search (reverse)' },
        { key: 'f{char}', desc: isZh ? '向前查找字符' : 'Find character forward' },
        { key: 'F{char}', desc: isZh ? '向后查找字符' : 'Find character backward' },
        { key: 't{char}', desc: isZh ? '向前查找字符（直到）' : 'Till character forward' },
        { key: 'T{char}', desc: isZh ? '向后查找字符（直到）' : 'Till character backward' },
      ],
    },
    {
      title: isZh ? '操作符组合' : 'Operator Combinations',
      bindings: [
        { key: 'ciw / caw', desc: isZh ? '修改内部/周围单词' : 'Change inner/around word' },
        { key: 'diw / daw', desc: isZh ? '删除内部/周围单词' : 'Delete inner/around word' },
        { key: 'yi" / ya"', desc: isZh ? '复制引号内容' : 'Yank quoted content' },
        { key: 'ci" / ca"', desc: isZh ? '修改引号内容' : 'Change quoted content' },
        { key: 'di" / da"', desc: isZh ? '删除引号内容' : 'Delete quoted content' },
        { key: 'ci( / ca(', desc: isZh ? '修改括号内容' : 'Change parentheses content' },
        { key: 'di( / da(', desc: isZh ? '删除括号内容' : 'Delete parentheses content' },
        { key: '3yy', desc: isZh ? '复制3行' : 'Yank 3 lines' },
        { key: '3>>', desc: isZh ? '缩进3行' : 'Indent 3 lines' },
        { key: '3J', desc: isZh ? '合并3行' : 'Join 3 lines' },
      ],
    },
  ]

  const lines = [header]

  for (const section of sections) {
    lines.push(`║ ${section.title.padEnd(60)} ║`)
    lines.push('╠──────────────────────────────────────────────────────────────╣')

    for (const binding of section.bindings) {
      const key = binding.key.padEnd(12)
      const desc = binding.desc.padEnd(46)
      lines.push(`║  ${key}  ${desc}  ║`)
    }

    lines.push('╠──────────────────────────────────────────────────────────────╣')
  }

  lines.push(isZh
    ? '║ 💡 提示: 输入 /vim toggle 来启用/禁用 Vim 模式               ║'
    : '║ 💡 Tip: Type /vim toggle to enable/disable Vim mode                 ║')
  lines.push('╚══════════════════════════════════════════════════════════════╝')

  return lines.join('\n')
}

// ============================================================================
// Export Manager Instance Factory
// ============================================================================

let managerInstance: VimModeManager | null = null

export function getVimModeManager(): VimModeManager {
  if (!managerInstance) {
    managerInstance = new VimModeManager()
  }
  return managerInstance
}

export function createVimModeManager(configPath?: string): VimModeManager {
  return new VimModeManager(configPath)
}

// ============================================================================
// Exports
// ============================================================================

export {
  VimModeManager,
}
