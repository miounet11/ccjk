/**
 * Skill Argument Interpolation Utility
 *
 * Supports Claude Code v2.1.19+ style argument shorthand ($0, $1, etc.)
 *
 * @module utils/skill-args
 */

import type { SkillArgument } from '../types/skill-md'

/**
 * Parse arguments from a command string
 *
 * Handles quoted strings and escapes properly.
 *
 * @example
 * parseArgs('file.ts "commit message" --flag')
 * // Returns: ['file.ts', 'commit message', '--flag']
 */
export function parseArgs(input: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''
  let escaped = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true
      quoteChar = char
      continue
    }

    if (char === quoteChar && inQuote) {
      inQuote = false
      quoteChar = ''
      continue
    }

    if (char === ' ' && !inQuote) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    args.push(current)
  }

  return args
}

/**
 * Interpolate arguments into skill content
 *
 * Replaces $0, $1, $2... with actual argument values.
 * Also supports ${0}, ${1} syntax for clarity in complex strings.
 *
 * @example
 * interpolateArgs('Edit $0 with message: $1', ['file.ts', 'Fix bug'])
 * // Returns: 'Edit file.ts with message: Fix bug'
 */
export function interpolateArgs(content: string, args: string[]): string {
  let result = content

  // Replace ${N} syntax first (more specific)
  result = result.replace(/\$\{(\d+)\}/g, (_, index) => {
    const i = Number.parseInt(index, 10)
    return args[i] ?? `\${${index}}`
  })

  // Replace $N syntax (less specific, but common)
  result = result.replace(/\$(\d+)(?![\d{])/g, (_, index) => {
    const i = Number.parseInt(index, 10)
    return args[i] ?? `$${index}`
  })

  return result
}

/**
 * Validate arguments against skill argument definitions
 *
 * @returns Array of validation errors, empty if valid
 */
export function validateArgs(
  args: string[],
  definitions: SkillArgument[],
): string[] {
  const errors: string[] = []

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i]
    const value = args[i]

    // Check required
    if (def.required && (value === undefined || value === '')) {
      errors.push(`Argument $${i} (${def.name}) is required`)
      continue
    }

    // Skip validation if no value and not required
    if (value === undefined || value === '') {
      continue
    }

    // Type validation
    if (def.type) {
      switch (def.type) {
        case 'number':
          if (Number.isNaN(Number(value))) {
            errors.push(`Argument $${i} (${def.name}) must be a number`)
          }
          break
        case 'boolean':
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
            errors.push(`Argument $${i} (${def.name}) must be a boolean`)
          }
          break
        case 'url':
          try {
            new URL(value)
          }
          catch {
            errors.push(`Argument $${i} (${def.name}) must be a valid URL`)
          }
          break
        case 'path':
          // Basic path validation - no null bytes or control characters
          if (/[\x00-\x1f]/.test(value)) {
            errors.push(`Argument $${i} (${def.name}) contains invalid path characters`)
          }
          break
      }
    }

    // Pattern validation
    if (def.pattern) {
      try {
        const regex = new RegExp(def.pattern)
        if (!regex.test(value)) {
          errors.push(`Argument $${i} (${def.name}) does not match pattern: ${def.pattern}`)
        }
      }
      catch {
        // Invalid regex pattern in definition, skip validation
      }
    }
  }

  return errors
}

/**
 * Apply default values to arguments
 *
 * @returns New array with defaults applied
 */
export function applyDefaults(
  args: string[],
  definitions: SkillArgument[],
): string[] {
  const result = [...args]

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i]
    if ((result[i] === undefined || result[i] === '') && def.default !== undefined) {
      result[i] = def.default
    }
  }

  return result
}

/**
 * Process skill invocation with arguments
 *
 * Complete pipeline: parse -> validate -> apply defaults -> interpolate
 */
export function processSkillArgs(
  content: string,
  rawArgs: string,
  definitions?: SkillArgument[],
): {
    content: string
    args: string[]
    errors: string[]
  } {
  // Parse raw arguments
  let args = parseArgs(rawArgs)

  // If definitions provided, validate and apply defaults
  let errors: string[] = []
  if (definitions && definitions.length > 0) {
    errors = validateArgs(args, definitions)
    args = applyDefaults(args, definitions)
  }

  // Interpolate arguments into content
  const interpolatedContent = interpolateArgs(content, args)

  return {
    content: interpolatedContent,
    args,
    errors,
  }
}

/**
 * Generate usage string from argument definitions
 */
export function generateUsage(skillName: string, definitions?: SkillArgument[]): string {
  if (!definitions || definitions.length === 0) {
    return `/${skillName}`
  }

  const argParts = definitions.map((def) => {
    if (def.required) {
      return `<${def.name}>`
    }
    return `[${def.name}]`
  })

  return `/${skillName} ${argParts.join(' ')}`
}

/**
 * Generate help text for skill arguments
 */
export function generateArgsHelp(definitions?: SkillArgument[]): string {
  if (!definitions || definitions.length === 0) {
    return 'This skill does not accept arguments.'
  }

  const lines = ['Arguments:', '']

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i]
    let line = `  $${i} - ${def.name}`

    if (def.description) {
      line += `: ${def.description}`
    }

    const flags: string[] = []
    if (def.required)
      flags.push('required')
    if (def.type && def.type !== 'string')
      flags.push(def.type)
    if (def.default !== undefined)
      flags.push(`default: "${def.default}"`)

    if (flags.length > 0) {
      line += ` (${flags.join(', ')})`
    }

    lines.push(line)
  }

  return lines.join('\n')
}
