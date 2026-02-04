/**
 * CCJK Skills V3 - Unified Parser
 *
 * Parses SKILL.md files and JSON skill definitions into SkillV3 format.
 * Supports automatic detection and migration of V1/V2 formats.
 *
 * @module skills-v3/parser
 */

import type {
  LocalizedString,
  ParseResult,
  ParserOptions,
  SkillCategory,
  SkillHook,
  SkillOutput,
  SkillPriority,
  SkillV3,
  SkillV3Config,
  SkillV3Metadata,
  SkillVersion,
} from './types'
import { readFileSync, statSync } from 'node:fs'
import { extname } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

/** Token estimation: ~4 characters per token */
const CHARS_PER_TOKEN = 4

/** Maximum skill file size (1MB) */
const MAX_SKILL_SIZE = 1024 * 1024

/** Valid skill file extensions */
const VALID_EXTENSIONS = ['.md', '.MD', '.markdown', '.json']

/** Valid skill categories */
const VALID_CATEGORIES: SkillCategory[] = [
  'dev',
  'git',
  'review',
  'testing',
  'docs',
  'devops',
  'planning',
  'debugging',
  'seo',
  'custom',
]

/** Required V3 fields */
const REQUIRED_FIELDS = ['id', 'version', 'triggers', 'template'] as const

/** Valid hook types */
const VALID_HOOK_TYPES = [
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'PermissionRequest',
  'SkillActivate',
  'SkillComplete',
]

// ============================================================================
// Parser Class
// ============================================================================

/**
 * Unified Skill Parser
 *
 * Parses skill files in various formats (SKILL.md, JSON) and converts
 * them to the unified SkillV3 format.
 */
export class SkillParser {
  private options: Required<ParserOptions>

  constructor(options: ParserOptions = {}) {
    this.options = {
      strict: false,
      validate: true,
      allowMissingOptional: true,
      autoMigrate: true,
      ...options,
    }
  }

  /**
   * Parse a skill file
   */
  parseFile(filePath: string): ParseResult {
    const warnings: string[] = []

    try {
      // Check file extension
      const ext = extname(filePath).toLowerCase()
      if (!VALID_EXTENSIONS.includes(ext) && !filePath.toUpperCase().endsWith('SKILL.MD')) {
        return {
          success: false,
          warnings,
          error: `Invalid file extension: ${ext}. Expected: ${VALID_EXTENSIONS.join(', ')}`,
        }
      }

      // Check file size
      const stats = statSync(filePath)
      if (stats.size > MAX_SKILL_SIZE) {
        return {
          success: false,
          warnings,
          error: `File too large: ${stats.size} bytes. Maximum: ${MAX_SKILL_SIZE} bytes`,
        }
      }

      // Read file content
      const content = readFileSync(filePath, 'utf-8')

      // Parse based on extension
      if (ext === '.json') {
        return this.parseJSON(content, filePath, warnings)
      }
      else {
        return this.parseMarkdown(content, filePath, warnings)
      }
    }
    catch (error) {
      return {
        success: false,
        warnings,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Parse skill content string
   */
  parseContent(content: string, filePath?: string): ParseResult {
    const warnings: string[] = []
    const trimmed = content.trim()

    // Detect format
    if (trimmed.startsWith('{')) {
      return this.parseJSON(content, filePath, warnings)
    }
    else if (trimmed.startsWith('---')) {
      return this.parseMarkdown(content, filePath, warnings)
    }
    else {
      return {
        success: false,
        warnings,
        error: 'Unknown format. Expected JSON or Markdown with YAML frontmatter.',
      }
    }
  }

  /**
   * Parse JSON skill definition
   */
  private parseJSON(content: string, filePath: string | undefined, warnings: string[]): ParseResult {
    try {
      const json = JSON.parse(content)

      // Detect version
      const detectedVersion = this.detectVersion(json)

      // If V3, validate and return
      if (detectedVersion === 'v3') {
        const skill = this.parseV3JSON(json, warnings)
        if (this.options.validate) {
          const validationError = this.validateSkill(skill)
          if (validationError) {
            return { success: false, warnings, error: validationError, detectedVersion }
          }
        }
        return {
          success: true,
          skill,
          filePath,
          detectedVersion,
          warnings,
          estimatedTokens: this.estimateTokens(skill),
        }
      }

      // If auto-migrate is enabled, convert old formats
      if (this.options.autoMigrate) {
        warnings.push(`Detected ${detectedVersion} format, auto-migrating to V3`)
        // Migration will be handled by migrator module
        return {
          success: false,
          warnings,
          detectedVersion,
          error: `${detectedVersion} format detected. Use migrator to convert.`,
        }
      }

      return {
        success: false,
        warnings,
        detectedVersion,
        error: `Unsupported format version: ${detectedVersion}`,
      }
    }
    catch (error) {
      return {
        success: false,
        warnings,
        error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Parse Markdown skill definition (SKILL.md format)
   */
  private parseMarkdown(content: string, filePath: string | undefined, warnings: string[]): ParseResult {
    try {
      // Extract frontmatter
      const { frontmatter, body } = this.extractFrontmatter(content)

      if (!frontmatter) {
        return {
          success: false,
          warnings,
          error: 'No YAML frontmatter found. SKILL.md files must start with ---',
        }
      }

      // Parse frontmatter to skill
      const skill = this.parseFrontmatterToSkill(frontmatter, body, warnings)

      if (this.options.validate) {
        const validationError = this.validateSkill(skill)
        if (validationError) {
          return { success: false, warnings, error: validationError, detectedVersion: 'v3' }
        }
      }

      return {
        success: true,
        skill,
        filePath,
        detectedVersion: 'v3',
        warnings,
        estimatedTokens: this.estimateTokens(skill),
      }
    }
    catch (error) {
      return {
        success: false,
        warnings,
        error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Extract YAML frontmatter from markdown
   */
  private extractFrontmatter(content: string): { frontmatter: Record<string, unknown> | null, body: string } {
    const trimmed = content.trimStart()

    if (!trimmed.startsWith('---')) {
      return { frontmatter: null, body: content }
    }

    const endDelimiter = trimmed.indexOf('\n---', 4)
    if (endDelimiter === -1) {
      return { frontmatter: null, body: content }
    }

    const frontmatterText = trimmed.slice(4, endDelimiter)
    const body = trimmed.slice(endDelimiter + 5).trimStart()

    const frontmatter = this.parseYAML(frontmatterText)
    return { frontmatter, body }
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private parseYAML(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const lines = text.split('\n')
    let currentKey: string | null = null
    let currentValue: unknown = null
    let isArray = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#'))
        continue

      // Array item
      if (trimmed.startsWith('- ')) {
        const item = this.parseYAMLValue(trimmed.slice(2))
        if (currentKey && isArray && Array.isArray(currentValue)) {
          currentValue.push(item)
        }
        continue
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        // Save previous value
        if (currentKey) {
          result[currentKey] = currentValue
        }

        currentKey = trimmed.slice(0, colonIndex).trim()
        const valueStr = trimmed.slice(colonIndex + 1).trim()

        if (!valueStr || valueStr.startsWith('|') || valueStr.startsWith('>')) {
          currentValue = null
          isArray = false
        }
        else {
          currentValue = this.parseYAMLValue(valueStr)
          isArray = Array.isArray(currentValue)
        }

        // Check if next lines are array items
        if (valueStr === '' || valueStr.startsWith('[')) {
          isArray = true
          currentValue = []
        }
      }
    }

    // Save last value
    if (currentKey) {
      result[currentKey] = currentValue
    }

    return result
  }

  /**
   * Parse a YAML value
   */
  private parseYAMLValue(value: string): unknown {
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
      return items.map(s => this.parseYAMLValue(s))
    }

    return value
  }

  /**
   * Parse frontmatter to SkillV3
   */
  private parseFrontmatterToSkill(
    fm: Record<string, unknown>,
    body: string,
    warnings: string[],
  ): SkillV3 {
    // Parse name (support both string and localized)
    const name = this.parseLocalizedString(fm.name, 'name', warnings)

    // Parse description
    const description = this.parseLocalizedString(fm.description, 'description', warnings)

    // Build metadata
    const metadata: SkillV3Metadata = {
      name,
      description,
      category: this.parseCategory(fm.category, warnings),
      tags: this.parseStringArray(fm.tags, 'tags', warnings),
    }

    // Optional metadata fields
    if (fm.author !== undefined)
      metadata.author = String(fm.author)
    if (fm.difficulty !== undefined)
      metadata.difficulty = this.parseDifficulty(fm.difficulty, warnings)
    if (fm.priority !== undefined)
      metadata.priority = this.parsePriority(fm.priority, warnings)
    if (fm.use_when !== undefined)
      metadata.useWhen = this.parseStringArray(fm.use_when, 'use_when', warnings)
    if (fm.auto_activate !== undefined)
      metadata.autoActivate = Boolean(fm.auto_activate)
    if (fm.user_invocable !== undefined)
      metadata.userInvocable = Boolean(fm.user_invocable)
    if (fm.related_skills !== undefined)
      metadata.relatedSkills = this.parseStringArray(fm.related_skills, 'related_skills', warnings)
    if (fm.ccjk_version !== undefined)
      metadata.ccjkVersion = String(fm.ccjk_version)

    // Build config
    const config: SkillV3Config = {}
    let hasConfig = false

    if (fm.allowed_tools !== undefined) {
      config.allowedTools = this.parseStringArray(fm.allowed_tools, 'allowed_tools', warnings)
      hasConfig = true
    }
    if (fm.permissions !== undefined) {
      config.permissions = this.parseStringArray(fm.permissions, 'permissions', warnings)
      hasConfig = true
    }
    if (fm.timeout !== undefined) {
      config.timeout = Number(fm.timeout)
      hasConfig = true
    }
    if (fm.agents !== undefined) {
      config.agents = this.parseStringArray(fm.agents, 'agents', warnings)
      hasConfig = true
    }
    if (fm.context !== undefined) {
      config.contextMode = fm.context === 'fork' ? 'fork' : 'inherit'
      hasConfig = true
    }
    if (fm.hooks !== undefined) {
      config.hooks = this.parseHooks(fm.hooks, warnings)
      hasConfig = true
    }
    if (fm.outputs !== undefined) {
      config.outputs = this.parseOutputs(fm.outputs, warnings)
      hasConfig = true
    }

    // Build skill
    const skill: SkillV3 = {
      id: String(fm.name || fm.id || 'unknown'),
      version: String(fm.version || '1.0.0'),
      metadata,
      triggers: this.parseStringArray(fm.triggers, 'triggers', warnings),
      template: body,
    }

    if (hasConfig) {
      skill.config = config
    }

    if (fm.dependencies !== undefined) {
      skill.dependencies = this.parseStringArray(fm.dependencies, 'dependencies', warnings)
    }

    return skill
  }

  /**
   * Parse V3 JSON format
   */
  private parseV3JSON(json: Record<string, unknown>, warnings: string[]): SkillV3 {
    const metadata = json.metadata as Record<string, unknown> || {}

    return {
      id: String(json.id || ''),
      version: String(json.version || '1.0.0'),
      metadata: {
        name: this.parseLocalizedString(metadata.name, 'name', warnings),
        description: this.parseLocalizedString(metadata.description, 'description', warnings),
        category: this.parseCategory(metadata.category, warnings),
        tags: this.parseStringArray(metadata.tags, 'tags', warnings),
        author: metadata.author ? String(metadata.author) : undefined,
        difficulty: metadata.difficulty ? this.parseDifficulty(metadata.difficulty, warnings) : undefined,
        priority: metadata.priority ? this.parsePriority(metadata.priority, warnings) : undefined,
        useWhen: metadata.useWhen ? this.parseStringArray(metadata.useWhen, 'useWhen', warnings) : undefined,
        autoActivate: metadata.autoActivate !== undefined ? Boolean(metadata.autoActivate) : undefined,
        userInvocable: metadata.userInvocable !== undefined ? Boolean(metadata.userInvocable) : undefined,
        relatedSkills: metadata.relatedSkills ? this.parseStringArray(metadata.relatedSkills, 'relatedSkills', warnings) : undefined,
        ccjkVersion: metadata.ccjkVersion ? String(metadata.ccjkVersion) : undefined,
      },
      triggers: this.parseStringArray(json.triggers, 'triggers', warnings),
      template: String(json.template || ''),
      config: json.config as SkillV3Config | undefined,
      dependencies: json.dependencies ? this.parseStringArray(json.dependencies, 'dependencies', warnings) : undefined,
    }
  }

  /**
   * Detect skill format version
   */
  private detectVersion(json: Record<string, unknown>): SkillVersion {
    // V3: has metadata.name as object with en/zh-CN
    if (json.metadata && typeof json.metadata === 'object') {
      const metadata = json.metadata as Record<string, unknown>
      if (metadata.name && typeof metadata.name === 'object') {
        return 'v3'
      }
    }

    // V2: has protocol and ast
    if (json.protocol && json.ast) {
      return 'v2'
    }

    // V1: has name as object with en/zh-CN at top level
    if (json.name && typeof json.name === 'object' && json.triggers) {
      return 'v1'
    }

    // Default to V3 for new format
    if (json.id && json.triggers && json.template) {
      return 'v3'
    }

    return 'v1' // Fallback
  }

  /**
   * Validate skill
   */
  private validateSkill(skill: SkillV3): string | undefined {
    // Check required fields
    if (!skill.id)
      return 'Missing required field: id'
    if (!skill.version)
      return 'Missing required field: version'
    if (!skill.triggers || skill.triggers.length === 0)
      return 'triggers array cannot be empty'
    if (!skill.template)
      return 'Missing required field: template'

    // Validate id format (kebab-case)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill.id)) {
      return `Invalid id format: ${skill.id}. Must be kebab-case`
    }

    // Validate version (semver)
    if (!/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i.test(skill.version)) {
      return `Invalid version format: ${skill.version}. Must be semver (e.g., 1.0.0)`
    }

    // Validate priority range
    if (skill.metadata.priority !== undefined) {
      if (skill.metadata.priority < 1 || skill.metadata.priority > 10) {
        return `priority must be between 1 and 10, got: ${skill.metadata.priority}`
      }
    }

    // Validate timeout
    if (skill.config?.timeout !== undefined && skill.config.timeout <= 0) {
      return `timeout must be positive, got: ${skill.config.timeout}`
    }

    return undefined
  }

  /**
   * Parse localized string
   */
  private parseLocalizedString(
    value: unknown,
    field: string,
    warnings: string[],
  ): LocalizedString {
    if (!value) {
      return { 'en': '', 'zh-CN': '' }
    }

    if (typeof value === 'string') {
      return { 'en': value, 'zh-CN': value }
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, string>
      return {
        'en': obj.en || obj.en || '',
        'zh-CN': obj['zh-CN'] || obj.zh || obj['zh-CN'] || '',
      }
    }

    warnings.push(`Invalid ${field} format, expected string or localized object`)
    return { 'en': String(value), 'zh-CN': String(value) }
  }

  /**
   * Parse string array
   */
  private parseStringArray(value: unknown, field: string, warnings: string[]): string[] {
    if (!value)
      return []
    if (Array.isArray(value))
      return value.map(String)
    if (typeof value === 'string')
      return [value]
    warnings.push(`Invalid ${field} format, expected array`)
    return []
  }

  /**
   * Parse category
   */
  private parseCategory(value: unknown, warnings: string[]): SkillCategory {
    const str = String(value || 'custom')
    if (VALID_CATEGORIES.includes(str as SkillCategory)) {
      return str as SkillCategory
    }
    warnings.push(`Invalid category: ${str}, defaulting to 'custom'`)
    return 'custom'
  }

  /**
   * Parse difficulty
   */
  private parseDifficulty(value: unknown, warnings: string[]): 'beginner' | 'intermediate' | 'advanced' {
    const str = String(value)
    if (['beginner', 'intermediate', 'advanced'].includes(str)) {
      return str as 'beginner' | 'intermediate' | 'advanced'
    }
    warnings.push(`Invalid difficulty: ${str}, defaulting to 'intermediate'`)
    return 'intermediate'
  }

  /**
   * Parse priority
   */
  private parsePriority(value: unknown, warnings: string[]): SkillPriority {
    const num = Number(value)
    if (Number.isInteger(num) && num >= 1 && num <= 10) {
      return num as SkillPriority
    }
    warnings.push(`Invalid priority: ${value}, defaulting to 5`)
    return 5
  }

  /**
   * Parse hooks
   */
  private parseHooks(value: unknown, warnings: string[]): SkillHook[] {
    if (!Array.isArray(value)) {
      warnings.push('hooks must be an array')
      return []
    }

    const hooks: SkillHook[] = []
    for (const item of value) {
      if (typeof item !== 'object' || !item)
        continue

      const hook = item as Record<string, unknown>
      const type = String(hook.type || '')

      if (!VALID_HOOK_TYPES.includes(type)) {
        warnings.push(`Invalid hook type: ${type}`)
        continue
      }

      hooks.push({
        type: type as SkillHook['type'],
        matcher: hook.matcher ? String(hook.matcher) : undefined,
        command: hook.command ? String(hook.command) : undefined,
        script: hook.script ? String(hook.script) : undefined,
        timeout: hook.timeout ? Number(hook.timeout) : undefined,
      })
    }

    return hooks
  }

  /**
   * Parse outputs
   */
  private parseOutputs(value: unknown, warnings: string[]): SkillOutput[] {
    if (!Array.isArray(value)) {
      warnings.push('outputs must be an array')
      return []
    }

    const outputs: SkillOutput[] = []
    for (const item of value) {
      if (typeof item !== 'object' || !item)
        continue

      const output = item as Record<string, unknown>
      const name = String(output.name || '')
      const type = String(output.type || '')

      if (!name || !['file', 'variable', 'artifact'].includes(type)) {
        warnings.push(`Invalid output: ${JSON.stringify(output)}`)
        continue
      }

      outputs.push({
        name,
        type: type as SkillOutput['type'],
        path: output.path ? String(output.path) : undefined,
        description: output.description ? String(output.description) : undefined,
      })
    }

    return outputs
  }

  /**
   * Estimate token count
   */
  private estimateTokens(skill: SkillV3): number {
    let totalChars = skill.template.length
    totalChars += skill.id.length
    totalChars += JSON.stringify(skill.metadata).length
    totalChars += skill.triggers.join(',').length

    if (skill.config) {
      totalChars += JSON.stringify(skill.config).length
    }

    return Math.ceil(totalChars / CHARS_PER_TOKEN)
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let parserInstance: SkillParser | null = null

/**
 * Get singleton parser instance
 */
export function getSkillParser(options?: ParserOptions): SkillParser {
  if (!parserInstance) {
    parserInstance = new SkillParser(options)
  }
  return parserInstance
}

/**
 * Reset parser instance (for testing)
 */
export function resetSkillParser(): void {
  parserInstance = null
}

/**
 * Parse a skill file
 */
export function parseSkillFile(filePath: string, options?: ParserOptions): ParseResult {
  const parser = options ? new SkillParser(options) : getSkillParser()
  return parser.parseFile(filePath)
}

/**
 * Parse skill content
 */
export function parseSkillContent(content: string, filePath?: string, options?: ParserOptions): ParseResult {
  const parser = options ? new SkillParser(options) : getSkillParser()
  return parser.parseContent(content, filePath)
}

/**
 * Check if a file is a valid skill file
 */
export function isSkillFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return VALID_EXTENSIONS.includes(ext) || filePath.toUpperCase().endsWith('SKILL.MD')
}
