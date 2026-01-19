/**
 * SKILL.md Parser Module
 *
 * Provides parsing, validation, and metadata extraction for SKILL.md files.
 * Supports YAML frontmatter parsing with comprehensive error handling.
 *
 * @module utils/skill-md/parser
 */

import type {
  SkillCategory,
  SkillMdFile,
  SkillMdMetadata,
  SkillPriority,
  SkillValidationError,
  SkillValidationResult,
  SkillValidationWarning,
} from '../../types/skill-md.js'
import { readFile, stat } from 'node:fs/promises'
import matter from 'gray-matter'

/**
 * Valid skill categories for validation
 */
const VALID_CATEGORIES: SkillCategory[] = [
  'dev',
  'git',
  'review',
  'testing',
  'docs',
  'devops',
  'planning',
  'debugging',
  'custom',
]

/**
 * Valid priority range (1-10)
 */
const MIN_PRIORITY = 1
const MAX_PRIORITY = 10

/**
 * Parse SKILL.md content with YAML frontmatter
 *
 * Extracts metadata from YAML frontmatter and returns the parsed structure
 * along with the markdown content (without frontmatter).
 *
 * @param content - Raw SKILL.md file content
 * @param filePath - Optional file path for error reporting
 * @returns Parsed SKILL.md file structure
 * @throws Error if frontmatter parsing fails or required fields are missing
 *
 * @example
 * ```typescript
 * const content = `---
 * name: git-commit
 * description: Intelligent git commit workflow
 * version: 1.0.0
 * category: git
 * triggers: ['/commit', '/gc']
 * use_when:
 *   - User wants to commit changes
 * ---
 * # Git Commit Skill
 * ...
 * `
 * const skill = parseSkillMd(content, '/path/to/SKILL.md')
 * ```
 */
export function parseSkillMd(content: string, filePath = 'unknown'): SkillMdFile {
  try {
    // Parse frontmatter using gray-matter
    const parsed = matter(content)

    // Extract metadata
    const metadata = extractMetadata(parsed.data, filePath)

    // Return parsed structure
    return {
      metadata,
      content: parsed.content.trim(),
      filePath,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse SKILL.md at ${filePath}: ${errorMessage}`)
  }
}

/**
 * Parse SKILL.md file from filesystem
 *
 * Reads a SKILL.md file from the filesystem, parses its content,
 * and includes file modification time.
 *
 * @param filePath - Absolute path to SKILL.md file
 * @returns Parsed SKILL.md file structure with modification time
 * @throws Error if file cannot be read or parsed
 *
 * @example
 * ```typescript
 * const skill = await parseSkillMdFile('/Users/lu/.claude/skills/git-commit/SKILL.md')
 * console.log(skill.metadata.name) // 'git-commit'
 * console.log(skill.modifiedAt) // Date object
 * ```
 */
export async function parseSkillMdFile(filePath: string): Promise<SkillMdFile> {
  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8')

    // Parse content
    const skill = parseSkillMd(content, filePath)

    // Get file stats for modification time
    try {
      const stats = await stat(filePath)
      skill.modifiedAt = stats.mtime
    }
    catch {
      // If stat fails, continue without modification time
      // This is non-critical information
    }

    return skill
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read SKILL.md file at ${filePath}: ${errorMessage}`)
  }
}

/**
 * Extract and validate metadata from frontmatter data
 *
 * Converts raw frontmatter data into typed SkillMdMetadata structure
 * with basic validation of required fields.
 *
 * @param data - Raw frontmatter data from gray-matter
 * @param filePath - File path for error reporting
 * @returns Validated metadata structure
 * @throws Error if required fields are missing or invalid
 *
 * @internal
 */
function extractMetadata(data: any, filePath: string): SkillMdMetadata {
  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    throw new Error(`Missing or invalid 'name' field in ${filePath}`)
  }

  if (!data.description || typeof data.description !== 'string') {
    throw new Error(`Missing or invalid 'description' field in ${filePath}`)
  }

  if (!data.version || typeof data.version !== 'string') {
    throw new Error(`Missing or invalid 'version' field in ${filePath}`)
  }

  if (!data.category || typeof data.category !== 'string') {
    throw new Error(`Missing or invalid 'category' field in ${filePath}`)
  }

  if (!Array.isArray(data.triggers) || data.triggers.length === 0) {
    throw new Error(`Missing or invalid 'triggers' field in ${filePath}`)
  }

  if (!Array.isArray(data.use_when) || data.use_when.length === 0) {
    throw new Error(`Missing or invalid 'use_when' field in ${filePath}`)
  }

  // Build metadata object
  const metadata: SkillMdMetadata = {
    name: data.name,
    description: data.description,
    version: data.version,
    category: data.category as SkillCategory,
    triggers: data.triggers,
    use_when: data.use_when,
  }

  // Add optional fields
  if (data.author && typeof data.author === 'string') {
    metadata.author = data.author
  }

  if (typeof data.auto_activate === 'boolean') {
    metadata.auto_activate = data.auto_activate
  }

  if (typeof data.priority === 'number') {
    metadata.priority = data.priority as SkillPriority
  }

  if (Array.isArray(data.agents)) {
    metadata.agents = data.agents
  }

  if (data.difficulty && typeof data.difficulty === 'string') {
    metadata.difficulty = data.difficulty as any
  }

  if (Array.isArray(data.related_skills)) {
    metadata.related_skills = data.related_skills
  }

  if (data.ccjk_version && typeof data.ccjk_version === 'string') {
    metadata.ccjk_version = data.ccjk_version
  }

  if (Array.isArray(data.tags)) {
    metadata.tags = data.tags
  }

  // Add new extended fields (v3.5.0+)
  if (Array.isArray(data.allowed_tools)) {
    metadata.allowed_tools = data.allowed_tools
  }

  if (data.context && typeof data.context === 'string') {
    metadata.context = data.context as 'fork' | 'inherit'
  }

  if (data.agent && typeof data.agent === 'string') {
    metadata.agent = data.agent
  }

  if (typeof data.user_invocable === 'boolean') {
    metadata.user_invocable = data.user_invocable
  }

  if (Array.isArray(data.hooks)) {
    metadata.hooks = data.hooks
  }

  if (Array.isArray(data.permissions)) {
    metadata.permissions = data.permissions
  }

  if (typeof data.timeout === 'number') {
    metadata.timeout = data.timeout
  }

  if (Array.isArray(data.outputs)) {
    metadata.outputs = data.outputs
  }

  return metadata
}

/**
 * Validate allowed_tools field format
 *
 * Validates that allowed_tools contains valid tool patterns.
 * Supports wildcards (e.g., "Bash(*)", "mcp__*", "Read", "Write").
 *
 * @param tools - Array of tool patterns to validate
 * @returns Validation result with errors
 *
 * @internal
 */
function validateAllowedTools(tools: string[]): SkillValidationError[] {
  const errors: SkillValidationError[] = []

  if (!Array.isArray(tools)) {
    errors.push({
      field: 'metadata.allowed_tools',
      message: 'allowed_tools must be an array',
      code: 'INVALID_ALLOWED_TOOLS_TYPE',
    })
    return errors
  }

  for (const tool of tools) {
    if (typeof tool !== 'string' || tool.trim().length === 0) {
      errors.push({
        field: 'metadata.allowed_tools',
        message: `Invalid tool pattern: '${tool}'. Must be a non-empty string`,
        code: 'INVALID_TOOL_PATTERN',
      })
    }
  }

  return errors
}

/**
 * Validate hooks field structure
 *
 * Validates that hooks array contains valid hook definitions with
 * required fields and proper structure.
 *
 * @param hooks - Array of hook definitions to validate
 * @returns Validation result with errors
 *
 * @internal
 */
function validateHooks(hooks: any[]): SkillValidationError[] {
  const errors: SkillValidationError[] = []

  if (!Array.isArray(hooks)) {
    errors.push({
      field: 'metadata.hooks',
      message: 'hooks must be an array',
      code: 'INVALID_HOOKS_TYPE',
    })
    return errors
  }

  const validHookTypes = [
    'PreToolUse',
    'PostToolUse',
    'SubagentStart',
    'SubagentStop',
    'PermissionRequest',
    'SkillActivate',
    'SkillComplete',
  ]

  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i]

    // Validate hook type
    if (!hook.type || typeof hook.type !== 'string') {
      errors.push({
        field: `metadata.hooks[${i}]`,
        message: 'Hook must have a valid type field',
        code: 'MISSING_HOOK_TYPE',
      })
      continue
    }

    if (!validHookTypes.includes(hook.type)) {
      errors.push({
        field: `metadata.hooks[${i}].type`,
        message: `Invalid hook type '${hook.type}'. Must be one of: ${validHookTypes.join(', ')}`,
        code: 'INVALID_HOOK_TYPE',
      })
    }

    // Validate that either command or script is provided
    if (!hook.command && !hook.script) {
      errors.push({
        field: `metadata.hooks[${i}]`,
        message: 'Hook must have either command or script field',
        code: 'MISSING_HOOK_ACTION',
      })
    }

    // Validate timeout if present
    if (hook.timeout !== undefined) {
      if (typeof hook.timeout !== 'number' || hook.timeout <= 0) {
        errors.push({
          field: `metadata.hooks[${i}].timeout`,
          message: `Hook timeout must be a positive number, got ${hook.timeout}`,
          code: 'INVALID_HOOK_TIMEOUT',
        })
      }
    }

    // Validate matcher if present
    if (hook.matcher !== undefined && typeof hook.matcher !== 'string') {
      errors.push({
        field: `metadata.hooks[${i}].matcher`,
        message: 'Hook matcher must be a string',
        code: 'INVALID_HOOK_MATCHER',
      })
    }
  }

  return errors
}

/**
 * Validate permissions field format
 *
 * Validates that permissions array contains valid permission strings.
 * Expected format: "resource:action" (e.g., "file:read", "network:http").
 *
 * @param permissions - Array of permission strings to validate
 * @returns Validation result with errors
 *
 * @internal
 */
function validatePermissions(permissions: string[]): SkillValidationError[] {
  const errors: SkillValidationError[] = []

  if (!Array.isArray(permissions)) {
    errors.push({
      field: 'metadata.permissions',
      message: 'permissions must be an array',
      code: 'INVALID_PERMISSIONS_TYPE',
    })
    return errors
  }

  const permissionPattern = /^[a-z]+:[a-z]+$/

  for (const permission of permissions) {
    if (typeof permission !== 'string' || !permissionPattern.test(permission)) {
      errors.push({
        field: 'metadata.permissions',
        message: `Invalid permission format: '${permission}'. Expected format: 'resource:action' (e.g., 'file:read')`,
        code: 'INVALID_PERMISSION_FORMAT',
      })
    }
  }

  return errors
}

/**
 * Validate SKILL.md file structure and metadata
 *
 * Performs comprehensive validation of a parsed SKILL.md file,
 * checking for errors (critical issues) and warnings (non-critical issues).
 *
 * Validation checks include:
 * - Required fields presence and format
 * - Valid category values
 * - Priority range (1-10)
 * - Trigger format (must start with /)
 * - Name format (kebab-case recommended)
 * - Version format (semantic versioning)
 * - Extended fields validation (allowed_tools, hooks, permissions, etc.)
 *
 * @param skill - Parsed SKILL.md file to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const skill = parseSkillMd(content)
 * const validation = validateSkillMd(skill)
 *
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors)
 * }
 *
 * if (validation.warnings.length > 0) {
 *   console.warn('Validation warnings:', validation.warnings)
 * }
 * ```
 */
export function validateSkillMd(skill: SkillMdFile): SkillValidationResult {
  const errors: SkillValidationError[] = []
  const warnings: SkillValidationWarning[] = []

  const { metadata } = skill

  // Validate name format (kebab-case recommended)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name)) {
    warnings.push({
      field: 'metadata.name',
      message: `Skill name '${metadata.name}' should be in kebab-case format (e.g., 'git-commit')`,
      code: 'INVALID_NAME_FORMAT',
    })
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(metadata.category)) {
    errors.push({
      field: 'metadata.category',
      message: `Invalid category '${metadata.category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      code: 'INVALID_CATEGORY',
    })
  }

  // Validate triggers format
  for (const trigger of metadata.triggers) {
    if (!trigger.startsWith('/')) {
      errors.push({
        field: 'metadata.triggers',
        message: `Trigger '${trigger}' must start with '/' (e.g., '/commit')`,
        code: 'INVALID_TRIGGER_FORMAT',
      })
    }

    if (trigger.includes(' ')) {
      errors.push({
        field: 'metadata.triggers',
        message: `Trigger '${trigger}' cannot contain spaces`,
        code: 'INVALID_TRIGGER_SPACES',
      })
    }
  }

  // Validate use_when conditions
  if (metadata.use_when.length === 0) {
    errors.push({
      field: 'metadata.use_when',
      message: 'At least one use_when condition is required',
      code: 'MISSING_USE_WHEN',
    })
  }

  // Validate priority range
  if (metadata.priority !== undefined) {
    if (metadata.priority < MIN_PRIORITY || metadata.priority > MAX_PRIORITY) {
      errors.push({
        field: 'metadata.priority',
        message: `Priority must be between ${MIN_PRIORITY} and ${MAX_PRIORITY}, got ${metadata.priority}`,
        code: 'INVALID_PRIORITY_RANGE',
      })
    }
  }

  // Validate version format (semantic versioning)
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?(?:\+[a-z0-9.-]+)?$/i.test(metadata.version)) {
    warnings.push({
      field: 'metadata.version',
      message: `Version '${metadata.version}' should follow semantic versioning (e.g., '1.0.0')`,
      code: 'INVALID_VERSION_FORMAT',
    })
  }

  // Validate difficulty if present
  if (metadata.difficulty && !['beginner', 'intermediate', 'advanced'].includes(metadata.difficulty)) {
    errors.push({
      field: 'metadata.difficulty',
      message: `Invalid difficulty '${metadata.difficulty}'. Must be 'beginner', 'intermediate', or 'advanced'`,
      code: 'INVALID_DIFFICULTY',
    })
  }

  // Validate content is not empty
  if (!skill.content || skill.content.trim().length === 0) {
    warnings.push({
      field: 'content',
      message: 'Skill content is empty. Consider adding documentation.',
      code: 'EMPTY_CONTENT',
    })
  }

  // Validate ccjk_version format if present
  if (metadata.ccjk_version && !/^\d+\.\d+\.\d+/.test(metadata.ccjk_version)) {
    warnings.push({
      field: 'metadata.ccjk_version',
      message: `CCJK version '${metadata.ccjk_version}' should follow semantic versioning`,
      code: 'INVALID_CCJK_VERSION',
    })
  }

  // Check for duplicate triggers
  const triggerSet = new Set(metadata.triggers)
  if (triggerSet.size !== metadata.triggers.length) {
    warnings.push({
      field: 'metadata.triggers',
      message: 'Duplicate triggers detected',
      code: 'DUPLICATE_TRIGGERS',
    })
  }

  // Validate extended fields (v3.5.0+)

  // Validate allowed_tools if present
  if (metadata.allowed_tools) {
    const toolErrors = validateAllowedTools(metadata.allowed_tools)
    errors.push(...toolErrors)
  }

  // Validate context if present
  if (metadata.context && !['fork', 'inherit'].includes(metadata.context)) {
    errors.push({
      field: 'metadata.context',
      message: `Invalid context '${metadata.context}'. Must be 'fork' or 'inherit'`,
      code: 'INVALID_CONTEXT',
    })
  }

  // Validate hooks if present
  if (metadata.hooks) {
    const hookErrors = validateHooks(metadata.hooks)
    errors.push(...hookErrors)
  }

  // Validate permissions if present
  if (metadata.permissions) {
    const permissionErrors = validatePermissions(metadata.permissions)
    errors.push(...permissionErrors)
  }

  // Validate timeout if present
  if (metadata.timeout !== undefined) {
    if (typeof metadata.timeout !== 'number' || metadata.timeout <= 0) {
      errors.push({
        field: 'metadata.timeout',
        message: `Timeout must be a positive number, got ${metadata.timeout}`,
        code: 'INVALID_TIMEOUT',
      })
    }
    else if (metadata.timeout > 3600) {
      warnings.push({
        field: 'metadata.timeout',
        message: `Timeout of ${metadata.timeout} seconds is very long (>1 hour). Consider reducing it.`,
        code: 'EXCESSIVE_TIMEOUT',
      })
    }
  }

  // Validate outputs if present
  if (metadata.outputs) {
    if (!Array.isArray(metadata.outputs)) {
      errors.push({
        field: 'metadata.outputs',
        message: 'outputs must be an array',
        code: 'INVALID_OUTPUTS_TYPE',
      })
    }
    else {
      for (let i = 0; i < metadata.outputs.length; i++) {
        const output = metadata.outputs[i]

        if (!output.name || typeof output.name !== 'string') {
          errors.push({
            field: `metadata.outputs[${i}]`,
            message: 'Output must have a valid name field',
            code: 'MISSING_OUTPUT_NAME',
          })
        }

        if (!output.type || !['file', 'variable', 'artifact'].includes(output.type)) {
          errors.push({
            field: `metadata.outputs[${i}].type`,
            message: `Invalid output type '${output.type}'. Must be 'file', 'variable', or 'artifact'`,
            code: 'INVALID_OUTPUT_TYPE',
          })
        }

        if (output.type === 'file' && !output.path) {
          warnings.push({
            field: `metadata.outputs[${i}].path`,
            message: `Output '${output.name}' is of type 'file' but has no path specified`,
            code: 'MISSING_OUTPUT_PATH',
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Extract metadata from SKILL.md content without full parsing
 *
 * Lightweight function to extract only the metadata from SKILL.md content
 * without parsing the full markdown content. Useful for quick metadata access.
 *
 * @param content - Raw SKILL.md file content
 * @returns Extracted metadata structure
 * @throws Error if frontmatter parsing fails or required fields are missing
 *
 * @example
 * ```typescript
 * const content = await readFile('SKILL.md', 'utf-8')
 * const metadata = extractMetadata(content)
 * console.log(metadata.name, metadata.triggers)
 * ```
 */
export function extractSkillMetadata(content: string): SkillMdMetadata {
  try {
    const parsed = matter(content)
    return extractMetadata(parsed.data, 'content')
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to extract metadata: ${errorMessage}`)
  }
}
