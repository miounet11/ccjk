import type { HookTrigger } from './types.js'
import type { ProjectAnalysis } from '../analyzers/types.js'
import { existsSync } from 'node:fs'
import { join } from 'pathe'

/**
 * Validate hook trigger configuration
 */
export async function validateHookTrigger(
  trigger: HookTrigger,
  projectInfo: ProjectAnalysis
): Promise<boolean> {
  try {
    const { matcher, condition } = trigger

    // Check matcher format
    if (!matcher || !matcher.includes(':')) {
      throw new Error(`Invalid trigger matcher format: ${matcher}`)
    }

    const [type, pattern] = matcher.split(':', 2)

    // Validate based on trigger type
    switch (type) {
      case 'git':
        return await validateGitTrigger(pattern, condition, projectInfo)

      case 'file':
        return await validateFileTrigger(pattern, condition, projectInfo)

      case 'command':
        return await validateCommandTrigger(pattern, condition, projectInfo)

      case 'schedule':
        return await validateScheduleTrigger(pattern, condition)

      case 'webhook':
        return await validateWebhookTrigger(pattern, condition)

      default:
        throw new Error(`Unknown trigger type: ${type}`)
    }
  } catch (error) {
    console.error(`Trigger validation failed: ${error}`)
    return false
  }
}

/**
 * Validate git trigger
 */
async function validateGitTrigger(
  pattern: string,
  condition: string | undefined,
  projectInfo: ProjectAnalysis
): Promise<boolean> {
  // Check if git repository exists
  const gitDir = join(process.cwd(), '.git')
  if (!existsSync(gitDir)) {
    throw new Error('Git repository not found')
  }

  // Validate git hook pattern
  const validGitHooks = [
    'pre-commit',
    'post-commit',
    'commit-msg',
    'prepare-commit-msg',
    'pre-push',
    'post-push',
    'pre-merge',
    'post-merge',
    'pre-rebase',
    'post-rebase',
    'pre-checkout',
    'post-checkout',
    'pre-receive',
    'post-receive',
    'update',
    'pre-applypatch',
    'post-applypatch',
    'applypatch-msg'
  ]

  if (!validGitHooks.includes(pattern)) {
    throw new Error(`Invalid git hook: ${pattern}`)
  }

  // Validate condition if provided
  if (condition) {
    // Check for valid git condition syntax
    const validConditions = [
      'staged',
      'unstaged',
      'branch=',
      'files=',
      'message=',
      'merge'
    ]

    const hasValidCondition = validConditions.some(c => condition.includes(c))

    // Also allow file pattern conditions (e.g., "package-lock.json || yarn.lock")
    // These are used by cloud hooks to specify which files trigger the hook
    const isFilePatternCondition = /^[\w\-.*]+(\s*\|\|\s*[\w\-.*]+)*$/.test(condition.trim())

    if (!hasValidCondition && !isFilePatternCondition) {
      throw new Error(`Invalid git condition: ${condition}`)
    }
  }

  return true
}

/**
 * Validate file trigger
 */
async function validateFileTrigger(
  pattern: string,
  condition: string | undefined,
  projectInfo: ProjectAnalysis
): Promise<boolean> {
  // Validate glob pattern
  if (!pattern || pattern.length === 0) {
    throw new Error('File pattern cannot be empty')
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    '**/.git/**',
    '**/node_modules/**',
    '**/.ccjk/**',
    '**/dist/**',
    '**/build/**',
    '**/*.{exe,dll,so,dylib}'
  ]

  const isDangerous = dangerousPatterns.some(p => pattern.includes(p))
  if (isDangerous) {
    console.warn(`Warning: Potentially dangerous file pattern: ${pattern}`)
  }

  // Validate condition if provided
  if (condition) {
    const validFileConditions = [
      'created',
      'modified',
      'deleted',
      'size>',
      'size<',
      'count>',
      'count<'
    ]

    const hasValidCondition = validFileConditions.some(c => condition.includes(c))
    if (!hasValidCondition) {
      throw new Error(`Invalid file condition: ${condition}`)
    }
  }

  return true
}

/**
 * Validate command trigger
 */
async function validateCommandTrigger(
  pattern: string,
  condition: string | undefined,
  projectInfo: ProjectAnalysis
): Promise<boolean> {
  // Validate command pattern
  if (!pattern || pattern.length === 0) {
    throw new Error('Command pattern cannot be empty')
  }

  // Check for valid command patterns
  const validPatterns = [
    'npm',
    'yarn',
    'pnpm',
    'pip',
    'cargo',
    'go',
    'mvn',
    'gradle',
    'make',
    'tsc',
    'node',
    'python',
    'pytest',
    'jest',
    'vitest',
    'mocha'
  ]

  const isValidPattern = validPatterns.some(p => pattern.includes(p))
  if (!isValidPattern) {
    console.warn(`Warning: Unusual command pattern: ${pattern}`)
  }

  // Validate condition if provided
  if (condition) {
    const validCommandConditions = [
      'exitCode=',
      'exitCode!=',
      'duration>',
      'duration<',
      'stdout=',
      'stderr=',
      'output='
    ]

    const hasValidCondition = validCommandConditions.some(c => condition.includes(c))
    if (!hasValidCondition) {
      throw new Error(`Invalid command condition: ${condition}`)
    }
  }

  return true
}

/**
 * Validate schedule trigger
 */
async function validateScheduleTrigger(
  pattern: string,
  condition: string | undefined
): Promise<boolean> {
  // Validate cron pattern
  const cronParts = pattern.split(' ')
  if (cronParts.length !== 5) {
    throw new Error(`Invalid cron pattern: ${pattern}. Expected 5 parts.`)
  }

  // Basic validation of cron parts
  const validateCronPart = (part: string, min: number, max: number): boolean => {
    if (part === '*') return true
    if (part.includes('/')) {
      const [, step] = part.split('/')
      const stepNum = parseInt(step)
      return !isNaN(stepNum) && stepNum > 0
    }
    if (part.includes('-')) {
      const [start, end] = part.split('-')
      const startNum = parseInt(start)
      const endNum = parseInt(end)
      return !isNaN(startNum) && !isNaN(endNum) && startNum <= endNum
    }
    if (part.includes(',')) {
      return part.split(',').every(p => validateCronPart(p, min, max))
    }

    const num = parseInt(part)
    return !isNaN(num) && num >= min && num <= max
  }

  // Validate each cron part
  const validations = [
    validateCronPart(cronParts[0], 0, 59), // minutes
    validateCronPart(cronParts[1], 0, 23), // hours
    validateCronPart(cronParts[2], 1, 31), // days
    validateCronPart(cronParts[3], 1, 12), // months
    validateCronPart(cronParts[4], 0, 7),  // weekdays
  ]

  if (!validations.every(v => v)) {
    throw new Error(`Invalid cron pattern: ${pattern}`)
  }

  return true
}

/**
 * Validate webhook trigger
 */
async function validateWebhookTrigger(
  pattern: string,
  condition: string | undefined
): Promise<boolean> {
  // Validate webhook URL
  try {
    const url = new URL(pattern)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid webhook protocol: ${url.protocol}`)
    }
  } catch {
    throw new Error(`Invalid webhook URL: ${pattern}`)
  }

  // Validate condition if provided
  if (condition) {
    const validWebhookConditions = [
      'method=',
      'header=',
      'body=',
      'status=',
      'content-type='
    ]

    const hasValidCondition = validWebhookConditions.some(c => condition.includes(c))
    if (!hasValidCondition) {
      throw new Error(`Invalid webhook condition: ${condition}`)
    }
  }

  return true
}

/**
 * Test if a trigger would fire for given context
 */
export async function testHookTrigger(
  trigger: HookTrigger,
  context: {
    event: string
    data?: any
  }
): Promise<boolean> {
  const { matcher, condition } = trigger
  const [type, pattern] = matcher.split(':', 2)

  switch (type) {
    case 'git':
      return context.event === `git:${pattern}`

    case 'file':
      if (context.event !== 'file:change') return false
      // Check if changed files match pattern
      const changedFiles = context.data?.files || []
      return changedFiles.some((file: string) => {
        // Simple glob matching - in real implementation use proper glob library
        return file.includes(pattern.replace('*', ''))
      })

    case 'command':
      return context.event === `command:${pattern}`

    case 'schedule':
      // Check if current time matches cron pattern
      // This would require proper cron parsing
      return false

    case 'webhook':
      return context.event === 'webhook' && context.data?.url === pattern

    default:
      return false
  }
}

/**
 * Get trigger statistics
 */
export async function getTriggerStats(): Promise<{
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
}> {
  // Mock stats - in real implementation would query database
  return {
    total: 42,
    byType: {
      git: 20,
      file: 10,
      command: 8,
      schedule: 3,
      webhook: 1
    },
    byStatus: {
      active: 35,
      inactive: 7
    }
  }
}

/**
 * Detect potential trigger conflicts
 */
export async function detectTriggerConflicts(
  triggers: HookTrigger[]
): Promise<Array<{
  trigger1: HookTrigger
  trigger2: HookTrigger
  conflict: string
}>> {
  const conflicts: Array<{
    trigger1: HookTrigger
    trigger2: HookTrigger
    conflict: string
  }> = []

  // Compare each pair of triggers
  for (let i = 0; i < triggers.length; i++) {
    for (let j = i + 1; j < triggers.length; j++) {
      const t1 = triggers[i]
      const t2 = triggers[j]

      // Check for identical matchers
      if (t1.matcher === t2.matcher) {
        conflicts.push({
          trigger1: t1,
          trigger2: t2,
          conflict: 'Identical matchers'
        })
      }

      // Check for overlapping file patterns
      if (t1.matcher.startsWith('file:') && t2.matcher.startsWith('file:')) {
        const p1 = t1.matcher.replace('file:', '')
        const p2 = t2.matcher.replace('file:', '')

        // Simple overlap detection - in real implementation use proper glob analysis
        if (p1.includes('**') || p2.includes('**')) {
          conflicts.push({
            trigger1: t1,
            trigger2: t2,
            conflict: 'Potentially overlapping file patterns'
          })
        }
      }
    }
  }

  return conflicts
}

/**
 * Optimize trigger performance
 */
export async function optimizeTriggers(
  triggers: HookTrigger[]
): Promise<{
  optimized: HookTrigger[]
  suggestions: string[]
}> {
  const suggestions: string[] = []

  // Group similar triggers
  const byType = triggers.reduce((groups, trigger) => {
    const type = trigger.matcher.split(':')[0]
    if (!groups[type]) groups[type] = []
    groups[type].push(trigger)
    return groups
  }, {} as Record<string, HookTrigger[]>)

  // Analyze each group
  for (const [type, typeTriggers] of Object.entries(byType)) {
    if (typeTriggers.length > 5) {
      suggestions.push(
        `Consider combining ${typeTriggers.length} ${type} triggers for better performance`
      )
    }

    // Check for inefficient patterns
    for (const trigger of typeTriggers) {
      const pattern = trigger.matcher.split(':', 2)[1]

      if (type === 'file' && pattern.includes('**/**')) {
        suggestions.push(
          `Trigger "${trigger.matcher}" uses inefficient pattern, consider using single **`
        )
      }

      if (type === 'command' && pattern.includes('*')) {
        suggestions.push(
          `Command trigger "${trigger.matcher}" uses wildcard which may impact performance`
        )
      }
    }
  }

  return {
    optimized: triggers, // For now, return same triggers
    suggestions
  }
}