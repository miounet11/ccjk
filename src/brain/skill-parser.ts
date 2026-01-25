/**
 * Skill Parser - Parse SKILL.md files with YAML frontmatter
 *
 * This module parses SKILL.md files with YAML frontmatter to extract
 * metadata and content for hot-reload skill registration.
 *
 * @module brain/skill-parser
 */

import type {
  Hook,
  SkillCategory,
  SkillDifficulty,
  SkillMdFile,
  SkillMdMetadata,
  SkillOutput,
  SubagentContextMode,
} from '../types/skill-md'
import { readFileSync, statSync } from 'node:fs'
import { extname, join } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

/**
 * Token estimation: ~4 characters per token (rough approximation for English)
 * Adjusted for markdown which tends to be more verbose
 */
const CHARS_PER_TOKEN = 4

/**
 * Maximum allowed skill file size (1MB)
 */
const MAX_SKILL_SIZE = 1024 * 1024

/**
 * Valid skill file extensions
 */
const VALID_SKILL_EXTENSIONS = ['.md', '.MD', '.markdown']

/**
 * Required frontmatter fields
 */
const REQUIRED_FIELDS = ['name', 'description', 'version', 'category', 'triggers', 'use_when'] as const

/**
 * Valid skill categories
 */
const VALID_CATEGORIES: SkillCategory[] = ['dev', 'git', 'review', 'testing', 'docs', 'devops', 'planning', 'debugging', 'custom']

/**
 * Valid context modes
 */
const VALID_CONTEXT_MODES: SubagentContextMode[] = ['fork', 'inherit']

/**
 * Valid hook types
 */
const VALID_HOOK_TYPES: Hook['type'][] = [
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'PermissionRequest',
  'SkillActivate',
  'SkillComplete',
]

// ============================================================================
// Types
// ============================================================================

/**
 * Parse result with validation
 */
export interface SkillParseResult {
  /** Whether parsing succeeded */
  success: boolean
  /** Parsed skill file */
  skill?: SkillMdFile
  /** Error message (if failed) */
  error?: string
  /** Validation warnings */
  warnings?: string[]
  /** Estimated token count */
  estimatedTokens?: number
}

/**
 * Frontmatter parsing options
 */
export interface FrontmatterParseOptions {
  /** Strict mode - fail on unknown fields */
  strict?: boolean
  /** Validate required fields */
  validate?: boolean
  /** Allow missing optional fields */
  allowMissingOptional?: boolean
}

/**
 * Raw frontmatter data (before validation)
 */
interface RawFrontmatter {
  name?: string
  description?: string
  version?: string
  author?: string
  category?: string
  triggers?: string[] | string
  use_when?: string[] | string
  auto_activate?: boolean
  priority?: number
  agents?: string[] | string
  difficulty?: string
  related_skills?: string[] | string
  ccjk_version?: string
  tags?: string[] | string
  allowed_tools?: string[] | string
  context?: string
  agent?: string
  user_invocable?: boolean
  hooks?: unknown[]
  permissions?: string[] | string
  timeout?: number
  outputs?: unknown[]
  [key: string]: unknown
}

// ============================================================================
// Skill Parser Class
// ============================================================================

/**
 * Skill Parser
 *
 * Parses SKILL.md files with YAML frontmatter and validates
 * the structure according to the SKILL.md specification.
 */
export class SkillParser {
  private options: FrontmatterParseOptions

  constructor(options: FrontmatterParseOptions = {}) {
    this.options = {
      strict: false,
      validate: true,
      allowMissingOptional: true,
      ...options,
    }
  }

  /**
   * Parse a SKILL.md file
   *
   * @param filePath - Path to the skill file
   * @returns Parse result with skill data or error
   */
  parseFile(filePath: string): SkillParseResult {
    try {
      // Check file extension
      const ext = extname(filePath)
      if (!VALID_SKILL_EXTENSIONS.includes(ext)) {
        return {
          success: false,
          error: `Invalid file extension: ${ext}. Expected: ${VALID_SKILL_EXTENSIONS.join(', ')}`,
        }
      }

      // Check file size
      const stats = statSync(filePath)
      if (stats.size > MAX_SKILL_SIZE) {
        return {
          success: false,
          error: `File too large: ${stats.size} bytes. Maximum: ${MAX_SKILL_SIZE} bytes`,
        }
      }

      // Read file content
      const content = readFileSync(filePath, 'utf-8')

      // Parse content
      return this.parseContent(content, filePath)
    }
    catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Parse skill content string
   *
   * @param content - Raw markdown content with frontmatter
   * @param filePath - Optional file path for error reporting
   * @returns Parse result with skill data or error
   */
  parseContent(content: string, filePath?: string): SkillParseResult {
    const warnings: string[] = []

    try {
      // Extract frontmatter
      const { frontmatter, body } = this.extractFrontmatter(content)

      if (!frontmatter) {
        return {
          success: false,
          error: 'No YAML frontmatter found. SKILL.md files must start with ---',
        }
      }

      // Parse and validate metadata
      const metadata = this.parseMetadata(frontmatter, warnings)

      if (this.options.validate) {
        const validationError = this.validateMetadata(metadata)
        if (validationError) {
          return {
            success: false,
            error: validationError,
            warnings,
          }
        }
      }

      // Estimate token count
      const estimatedTokens = this.estimateTokens(body, metadata)

      const skill: SkillMdFile = {
        metadata,
        content: body,
        filePath: filePath || '<unknown>',
        modifiedAt: filePath ? new Date(statSync(filePath).mtime) : undefined,
      }

      return {
        success: true,
        skill,
        warnings,
        estimatedTokens,
      }
    }
    catch (error) {
      return {
        success: false,
        error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Parse metadata from raw frontmatter object
   *
   * @param raw - Raw frontmatter data
   * @param warnings - Array to collect warnings
   * @returns Parsed and typed metadata
   */
  private parseMetadata(raw: RawFrontmatter, warnings: string[]): SkillMdMetadata {
    const metadata: SkillMdMetadata = {
      name: this.parseString(raw.name, 'name', true)!,
      description: this.parseString(raw.description, 'description', true)!,
      version: this.parseString(raw.version, 'version', true)!,
      category: this.parseCategory(raw.category),
      triggers: this.parseArray(raw.triggers, 'triggers', true)!,
      use_when: this.parseArray(raw.use_when, 'use_when', true)!,
    }

    // Optional fields
    if (raw.author !== undefined)
      metadata.author = this.parseString(raw.author, 'author')
    if (raw.auto_activate !== undefined)
      metadata.auto_activate = this.parseBoolean(raw.auto_activate, 'auto_activate')
    if (raw.priority !== undefined)
      metadata.priority = this.parsePriority(raw.priority)
    if (raw.agents !== undefined)
      metadata.agents = this.parseArray(raw.agents, 'agents')
    if (raw.difficulty !== undefined)
      metadata.difficulty = this.parseDifficulty(raw.difficulty)
    if (raw.related_skills !== undefined)
      metadata.related_skills = this.parseArray(raw.related_skills, 'related_skills')
    if (raw.ccjk_version !== undefined)
      metadata.ccjk_version = this.parseString(raw.ccjk_version, 'ccjk_version')
    if (raw.tags !== undefined)
      metadata.tags = this.parseArray(raw.tags, 'tags')
    if (raw.allowed_tools !== undefined)
      metadata.allowed_tools = this.parseArray(raw.allowed_tools, 'allowed_tools')
    if (raw.context !== undefined)
      metadata.context = this.parseContextMode(raw.context)
    if (raw.agent !== undefined)
      metadata.agent = this.parseString(raw.agent, 'agent')
    if (raw.user_invocable !== undefined)
      metadata.user_invocable = this.parseBoolean(raw.user_invocable, 'user_invocable')
    if (raw.permissions !== undefined)
      metadata.permissions = this.parseArray(raw.permissions, 'permissions')
    if (raw.timeout !== undefined)
      metadata.timeout = this.parseNumber(raw.timeout, 'timeout')
    if (raw.hooks !== undefined)
      metadata.hooks = this.parseHooks(raw.hooks, warnings)
    if (raw.outputs !== undefined)
      metadata.outputs = this.parseOutputs(raw.outputs, warnings)

    return metadata
  }

  /**
   * Extract YAML frontmatter from markdown content
   *
   * @param content - Full markdown content
   * @returns Object with frontmatter and body
   */
  private extractFrontmatter(content: string): { frontmatter: RawFrontmatter | null, body: string } {
    const trimmed = content.trimStart()

    // Check for frontmatter delimiter
    if (!trimmed.startsWith('---')) {
      return { frontmatter: null, body: content }
    }

    // Find end delimiter
    const endDelimiter = trimmed.indexOf('\n---', 4)
    if (endDelimiter === -1) {
      return { frontmatter: null, body: content }
    }

    // Extract frontmatter content
    const frontmatterText = trimmed.slice(4, endDelimiter)
    const body = trimmed.slice(endDelimiter + 5).trimStart()

    // Parse YAML
    const frontmatter = this.parseYaml(frontmatterText)

    return { frontmatter, body }
  }

  /**
   * Simple YAML parser for skill frontmatter
   * Handles basic YAML structures used in SKILL.md files
   *
   * @param text - YAML text to parse
   * @returns Parsed object
   */
  private parseYaml(text: string): RawFrontmatter {
    const result: RawFrontmatter = {}
    const lines = text.split('\n')
    let currentKey: string | null = null
    let currentValue: unknown = null
    let isArray = false
    const indentLevel = 0

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#'))
        continue

      // Check for array items
      if (trimmed.startsWith('- ')) {
        const item = this.parseYamlValue(trimmed.slice(2))

        if (currentKey && isArray) {
          if (Array.isArray(currentValue)) {
            currentValue.push(item)
          }
        }

        continue
      }

      // Check for key-value pair
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        // Save previous value
        if (currentKey) {
          result[currentKey] = currentValue as string & string[]
        }

        // Start new key
        currentKey = trimmed.slice(0, colonIndex).trim()
        const valueStr = trimmed.slice(colonIndex + 1).trim()

        if (!valueStr || valueStr.startsWith('|') || valueStr.startsWith('>')) {
          // Multi-line value (not supported in this simple parser)
          currentValue = null
          isArray = false
        }
        else {
          currentValue = this.parseYamlValue(valueStr)
          isArray = Array.isArray(currentValue)
        }

        // Check if next lines are array items
        if (valueStr === '' || valueStr.startsWith('[')) {
          isArray = true
          currentValue = []
        }

        continue
      }

      // Array continuation
      if (currentKey && isArray && trimmed.startsWith('- ')) {
        const item = this.parseYamlValue(trimmed.slice(2))
        if (Array.isArray(currentValue)) {
          currentValue.push(item)
        }
      }
    }

    // Save last value
    if (currentKey) {
      result[currentKey] = currentValue as string & string[]
    }

    return result
  }

  /**
   * Parse a YAML value
   *
   * @param value - Value string
   * @returns Parsed value
   */
  private parseYamlValue(value: string): unknown {
    value = value.trim()

    // Boolean
    if (value === 'true' || value === 'yes')
      return true
    if (value === 'false' || value === 'no')
      return false

    // Null
    if (value === 'null' || value === '~' || value === '')
      return null

    // Number
    if (/^-?\d+(\.\d+)?$/.test(value))
      return Number.parseFloat(value)

    // Quoted string
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      return value.slice(1, -1)
    }

    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(s => s.trim())
      return items.map(s => this.parseYamlValue(s))
    }

    // Default: return as string
    return value
  }

  /**
   * Validate parsed metadata
   *
   * @param metadata - Metadata to validate
   * @returns Error message if invalid, undefined if valid
   */
  private validateMetadata(metadata: SkillMdMetadata): string | undefined {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in metadata)) {
        return `Missing required field: ${field}`
      }
    }

    // Validate name format (kebab-case)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(metadata.name)) {
      return `Invalid name format: ${metadata.name}. Must be kebab-case`
    }

    // Validate version (semver)
    if (!/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i.test(metadata.version)) {
      return `Invalid version format: ${metadata.version}. Must be semver (e.g., 1.0.0)`
    }

    // Validate triggers non-empty
    if (metadata.triggers.length === 0) {
      return 'triggers array cannot be empty'
    }

    // Validate use_when non-empty
    if (metadata.use_when.length === 0) {
      return 'use_when array cannot be empty'
    }

    // Validate priority range
    if (metadata.priority !== undefined && (metadata.priority < 1 || metadata.priority > 10)) {
      return `priority must be between 1 and 10, got: ${metadata.priority}`
    }

    // Validate timeout positive
    if (metadata.timeout !== undefined && metadata.timeout <= 0) {
      return `timeout must be positive, got: ${metadata.timeout}`
    }

    return undefined
  }

  // ==========================================================================
  // Type-specific parsers
  // ==========================================================================

  /**
   * Parse string value
   */
  private parseString(value: unknown, field: string, required = false): string | undefined {
    if (value === undefined || value === null) {
      if (required)
        throw new Error(`Missing required field: ${field}`)
      return undefined
    }
    if (typeof value !== 'string')
      throw new Error(`Field ${field} must be a string, got: ${typeof value}`)
    return value
  }

  /**
   * Parse array value
   */
  private parseArray<T = string>(value: unknown, field: string, required = false): T[] | undefined {
    if (value === undefined || value === null) {
      if (required)
        throw new Error(`Missing required field: ${field}`)
      return undefined
    }
    if (Array.isArray(value))
      return value as T[]
    if (typeof value === 'string')
      return [value] as T[]
    throw new Error(`Field ${field} must be an array, got: ${typeof value}`)
  }

  /**
   * Parse boolean value
   */
  private parseBoolean(value: unknown, field: string): boolean {
    if (typeof value === 'boolean')
      return value
    if (typeof value === 'string')
      return value === 'true' || value === 'yes'
    if (typeof value === 'number')
      return value !== 0
    throw new Error(`Field ${field} must be a boolean, got: ${typeof value}`)
  }

  /**
   * Parse number value
   */
  private parseNumber(value: unknown, field: string): number {
    if (typeof value === 'number')
      return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isNaN(parsed))
        throw new Error(`Field ${field} is not a valid number: ${value}`)
      return parsed
    }
    throw new Error(`Field ${field} must be a number, got: ${typeof value}`)
  }

  /**
   * Parse category
   */
  private parseCategory(value: unknown): SkillCategory {
    const str = this.parseString(value, 'category', true)!
    if (!VALID_CATEGORIES.includes(str as SkillCategory))
      throw new Error(`Invalid category: ${str}. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    return str as SkillCategory
  }

  /**
   * Parse priority
   */
  private parsePriority(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
    const num = this.parseNumber(value, 'priority')
    if (num < 1 || num > 10 || !Number.isInteger(num))
      throw new Error(`priority must be an integer between 1 and 10, got: ${num}`)
    return num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  }

  /**
   * Parse difficulty
   */
  private parseDifficulty(value: unknown): SkillDifficulty {
    const str = this.parseString(value, 'difficulty')!
    const validDifficulties: SkillDifficulty[] = ['beginner', 'intermediate', 'advanced']
    if (!validDifficulties.includes(str as SkillDifficulty))
      throw new Error(`Invalid difficulty: ${str}. Must be one of: ${validDifficulties.join(', ')}`)
    return str as SkillDifficulty
  }

  /**
   * Parse context mode
   */
  private parseContextMode(value: unknown): SubagentContextMode {
    const str = this.parseString(value, 'context')!
    if (!VALID_CONTEXT_MODES.includes(str as SubagentContextMode))
      throw new Error(`Invalid context mode: ${str}. Must be one of: ${VALID_CONTEXT_MODES.join(', ')}`)
    return str as SubagentContextMode
  }

  /**
   * Parse hooks array
   */
  private parseHooks(value: unknown[], warnings: string[]): Hook[] {
    if (!Array.isArray(value))
      throw new Error('hooks must be an array')

    const hooks: Hook[] = []

    for (let i = 0; i < value.length; i++) {
      const hook = value[i]
      if (typeof hook !== 'object' || hook === null) {
        warnings.push(`Hook at index ${i} is not an object, skipping`)
        continue
      }

      const hookObj = hook as Record<string, unknown>

      // Validate hook type
      const type = this.parseString(hookObj.type, `hooks[${i}].type`, true)!
      if (!VALID_HOOK_TYPES.includes(type as Hook['type'])) {
        warnings.push(`Invalid hook type at index ${i}: ${type}`)
        continue
      }

      const parsedHook: Hook = {
        type: type as Hook['type'],
      }

      if (hookObj.matcher !== undefined)
        parsedHook.matcher = this.parseString(hookObj.matcher, `hooks[${i}].matcher`)
      if (hookObj.command !== undefined)
        parsedHook.command = this.parseString(hookObj.command, `hooks[${i}].command`)
      if (hookObj.script !== undefined)
        parsedHook.script = this.parseString(hookObj.script, `hooks[${i}].script`)
      if (hookObj.timeout !== undefined)
        parsedHook.timeout = this.parseNumber(hookObj.timeout, `hooks[${i}].timeout`)

      hooks.push(parsedHook)
    }

    return hooks
  }

  /**
   * Parse outputs array
   */
  private parseOutputs(value: unknown[], warnings: string[]): SkillOutput[] {
    if (!Array.isArray(value))
      throw new Error('outputs must be an array')

    const outputs: SkillOutput[] = []

    for (let i = 0; i < value.length; i++) {
      const output = value[i]
      if (typeof output !== 'object' || output === null) {
        warnings.push(`Output at index ${i} is not an object, skipping`)
        continue
      }

      const outputObj = output as Record<string, unknown>

      // Validate required fields
      const name = this.parseString(outputObj.name, `outputs[${i}].name`, true)
      const type = this.parseString(outputObj.type, `outputs[${i}].type`, true)

      if (!name || !type)
        continue

      const validTypes = ['file', 'variable', 'artifact']
      if (!validTypes.includes(type)) {
        warnings.push(`Invalid output type at index ${i}: ${type}`)
        continue
      }

      const parsedOutput: SkillOutput = {
        name,
        type: type as SkillOutput['type'],
      }

      if (outputObj.path !== undefined)
        parsedOutput.path = this.parseString(outputObj.path, `outputs[${i}].path`)
      if (outputObj.description !== undefined)
        parsedOutput.description = this.parseString(outputObj.description, `outputs[${i}].description`)

      outputs.push(parsedOutput)
    }

    return outputs
  }

  /**
   * Estimate token count for skill content
   *
   * @param content - Markdown content
   * @param metadata - Skill metadata
   * @returns Estimated token count
   */
  private estimateTokens(content: string, metadata: SkillMdMetadata): number {
    // Count characters in content and metadata
    let totalChars = content.length

    // Add frontmatter fields
    totalChars += metadata.name.length
    totalChars += metadata.description.length
    totalChars += metadata.version.length
    totalChars += metadata.triggers.join(',').length
    totalChars += metadata.use_when.join(',').length

    if (metadata.tags)
      totalChars += metadata.tags.join(',').length
    if (metadata.agents)
      totalChars += metadata.agents.join(',').length

    // Estimate tokens (rough approximation)
    return Math.ceil(totalChars / CHARS_PER_TOKEN)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let parserInstance: SkillParser | null = null

/**
 * Get the singleton SkillParser instance
 */
export function getSkillParser(options?: FrontmatterParseOptions): SkillParser {
  if (!parserInstance) {
    parserInstance = new SkillParser(options)
  }
  return parserInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSkillParser(): void {
  parserInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a skill file
 *
 * @param filePath - Path to SKILL.md file
 * @returns Parse result
 */
export function parseSkillFile(filePath: string): SkillParseResult {
  return getSkillParser().parseFile(filePath)
}

/**
 * Parse skill content
 *
 * @param content - Markdown content with frontmatter
 * @param filePath - Optional file path
 * @returns Parse result
 */
export function parseSkillContent(content: string, filePath?: string): SkillParseResult {
  return getSkillParser().parseContent(content, filePath)
}

/**
 * Check if a file is a valid skill file
 *
 * This is the canonical implementation for skill file detection.
 * It supports multiple file extensions (.md, .yaml, .yml) and
 * the standard SKILL.md naming convention.
 *
 * @param filePath - Path to check
 * @returns True if valid skill file
 *
 * @example
 * ```typescript
 * import { isSkillFile } from '@/brain/skill-parser'
 *
 * isSkillFile('/path/to/SKILL.md')     // true
 * isSkillFile('/path/to/skill.yaml')   // true
 * isSkillFile('/path/to/readme.md')    // false (not in skills dir)
 * ```
 */
export function isSkillFile(filePath: string): boolean {
  const ext = extname(filePath)
  return VALID_SKILL_EXTENSIONS.includes(ext) || filePath.toUpperCase().endsWith('SKILL.MD')
}
