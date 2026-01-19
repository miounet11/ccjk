/**
 * SKILL.md Activation Engine
 *
 * Implements Superpowers-style automatic skill activation based on:
 * - Explicit triggers (e.g., /commit, /debug)
 * - "Use when..." conditions matching user intent
 * - Context-aware activation (file type, git status, project type)
 *
 * @module utils/skill-md/activation
 */

import type {
  SkillActivationContext,
  SkillActivationResult,
  SkillMdFile,
} from '../../types/skill-md.js'

/**
 * Confidence threshold for auto-activation
 * Skills with confidence below this threshold will not auto-activate
 */
const AUTO_ACTIVATION_THRESHOLD = 0.6

/**
 * Confidence weights for different matching factors
 */
const CONFIDENCE_WEIGHTS = {
  TRIGGER_MATCH: 1.0, // Exact trigger match = 100% confidence
  USE_WHEN_EXACT: 0.9, // Exact use_when match
  USE_WHEN_PARTIAL: 0.7, // Partial use_when match
  CONTEXT_STRONG: 0.8, // Strong context match
  CONTEXT_WEAK: 0.4, // Weak context match
} as const

/**
 * Check if any skill should be activated based on context
 *
 * This is the main entry point for skill activation. It evaluates all provided
 * skills against the current context and returns the best match (if any).
 *
 * @param context - Current activation context (user message, file, git status, etc.)
 * @param skills - Array of available skills to check
 * @returns Activation result with matched skill and confidence score
 *
 * @example
 * ```typescript
 * const context: SkillActivationContext = {
 *   userMessage: '/commit',
 *   isGitRepo: true,
 *   currentFile: 'src/index.ts'
 * }
 * const result = checkActivation(context, allSkills)
 * if (result.shouldActivate) {
 *   console.log(`Activating skill: ${result.matchedSkill.metadata.name}`)
 * }
 * ```
 */
export function checkActivation(
  context: SkillActivationContext,
  skills: SkillMdFile[],
): SkillActivationResult {
  if (skills.length === 0) {
    return {
      shouldActivate: false,
      confidence: 0,
      reason: 'No skills available',
    }
  }

  const matches: Array<{
    skill: SkillMdFile
    confidence: number
    trigger?: string
    useWhen?: string
    reason: string
  }> = []

  for (const skill of skills) {
    // Check explicit trigger match first
    const triggerMatch = matchTriggers(context.userMessage, skill.metadata.triggers)

    if (triggerMatch) {
      // Explicit trigger always activates (if skill is enabled)
      matches.push({
        skill,
        confidence: CONFIDENCE_WEIGHTS.TRIGGER_MATCH,
        trigger: triggerMatch,
        reason: `Explicit trigger matched: ${triggerMatch}`,
      })
      continue
    }

    // For auto-activation, only consider skills with auto_activate: true
    if (!skill.metadata.auto_activate) {
      continue
    }

    // Check use_when conditions
    const useWhenMatch = matchUseWhen(context, skill.metadata.use_when)

    // Check context factors
    const contextMatch = matchContext(context, skill)

    // Calculate overall confidence
    const confidence = calculateConfidence(
      false, // No trigger match
      useWhenMatch,
      contextMatch,
    )

    if (confidence >= AUTO_ACTIVATION_THRESHOLD) {
      matches.push({
        skill,
        confidence,
        useWhen: useWhenMatch.condition,
        reason: buildActivationReason(useWhenMatch, contextMatch),
      })
    }
  }

  // Find best match
  if (matches.length === 0) {
    return {
      shouldActivate: false,
      confidence: 0,
      reason: 'No matching skills found',
    }
  }

  const bestMatch = findBestMatch(matches)

  if (!bestMatch) {
    return {
      shouldActivate: false,
      confidence: 0,
      reason: 'No suitable skill found',
    }
  }

  return {
    shouldActivate: true,
    matchedSkill: bestMatch.skill,
    matchedTrigger: bestMatch.trigger,
    matchedUseWhen: bestMatch.useWhen,
    confidence: bestMatch.confidence,
    reason: bestMatch.reason,
  }
}

/**
 * Match user message against skill triggers
 *
 * Supports both exact matches and prefix matches for command-style triggers.
 * Triggers are case-sensitive by default.
 *
 * @param message - User's input message
 * @param triggers - Array of trigger strings to match against
 * @returns The matched trigger string, or null if no match
 *
 * @example
 * ```typescript
 * matchTriggers('/commit', ['/commit', '/gc']) // Returns '/commit'
 * matchTriggers('/commit --amend', ['/commit']) // Returns '/commit'
 * matchTriggers('commit', ['/commit']) // Returns null (no match)
 * ```
 */
export function matchTriggers(
  message: string,
  triggers: string[],
): string | null {
  if (!message || triggers.length === 0) {
    return null
  }

  const normalizedMessage = message.trim()

  for (const trigger of triggers) {
    const normalizedTrigger = trigger.trim()

    // Exact match
    if (normalizedMessage === normalizedTrigger) {
      return trigger
    }

    // Prefix match for command-style triggers (e.g., '/commit --amend' matches '/commit')
    if (normalizedMessage.startsWith(`${normalizedTrigger} `)) {
      return trigger
    }
  }

  return null
}

/**
 * Match context against use_when conditions
 *
 * Performs fuzzy keyword matching against natural language conditions.
 * Returns confidence score based on match quality.
 *
 * @param context - Current activation context
 * @param useWhen - Array of use_when condition strings
 * @returns Match result with confidence score (0-1)
 *
 * @example
 * ```typescript
 * const context = { userMessage: 'I want to commit my changes' }
 * const useWhen = ['User wants to commit changes', 'When working on git']
 * const result = matchUseWhen(context, useWhen)
 * // result.matched = true, result.confidence = 0.9
 * ```
 */
export function matchUseWhen(
  context: SkillActivationContext,
  useWhen: string[],
): { matched: boolean, condition?: string, confidence: number } {
  if (useWhen.length === 0) {
    return { matched: false, confidence: 0 }
  }

  const message = context.userMessage.toLowerCase()
  let bestMatch: { condition: string, confidence: number } | null = null

  for (const condition of useWhen) {
    const normalizedCondition = condition.toLowerCase()

    // Extract keywords from condition (remove common words)
    const keywords = extractKeywords(normalizedCondition)

    if (keywords.length === 0) {
      continue
    }

    // Count matching keywords
    let matchCount = 0
    let exactMatch = false

    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        matchCount++
      }
    }

    // Check for exact phrase match
    if (message.includes(normalizedCondition)) {
      exactMatch = true
    }

    // Calculate confidence based on match quality
    let confidence = 0

    if (exactMatch) {
      confidence = CONFIDENCE_WEIGHTS.USE_WHEN_EXACT
    }
    else if (matchCount > 0) {
      // Partial match: scale confidence by keyword match ratio
      const matchRatio = matchCount / keywords.length
      confidence = CONFIDENCE_WEIGHTS.USE_WHEN_PARTIAL * matchRatio
    }

    // Update best match
    if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { condition, confidence }
    }
  }

  if (bestMatch) {
    return {
      matched: true,
      condition: bestMatch.condition,
      confidence: bestMatch.confidence,
    }
  }

  return { matched: false, confidence: 0 }
}

/**
 * Calculate overall activation confidence
 *
 * Combines trigger match, use_when match, and context match into a single
 * confidence score. Uses weighted averaging with priority given to explicit triggers.
 *
 * @param triggerMatch - Whether an explicit trigger was matched
 * @param useWhenMatch - Use_when match result with confidence
 * @param useWhenMatch.matched - Whether the use_when condition matched
 * @param useWhenMatch.confidence - Confidence score for the match
 * @param contextMatch - Context match result with confidence
 * @param contextMatch.matched - Whether the context matched
 * @param contextMatch.confidence - Confidence score for the context match
 * @returns Overall confidence score (0-1)
 *
 * @example
 * ```typescript
 * const confidence = calculateConfidence(
 *   false,
 *   { matched: true, confidence: 0.8 },
 *   { matched: true, confidence: 0.6 }
 * )
 * // Returns weighted average: ~0.7
 * ```
 */
export function calculateConfidence(
  triggerMatch: boolean,
  useWhenMatch: { matched: boolean, confidence: number },
  contextMatch: { matched: boolean, confidence: number },
): number {
  // Explicit trigger match = 100% confidence
  if (triggerMatch) {
    return CONFIDENCE_WEIGHTS.TRIGGER_MATCH
  }

  // For auto-activation, combine use_when and context confidence
  const weights = {
    useWhen: 0.7, // Use_when conditions are more important
    context: 0.3, // Context provides supporting evidence
  }

  const useWhenScore = useWhenMatch.matched ? useWhenMatch.confidence : 0
  const contextScore = contextMatch.matched ? contextMatch.confidence : 0

  return (useWhenScore * weights.useWhen) + (contextScore * weights.context)
}

/**
 * Match context factors (file type, git status, etc.)
 *
 * Evaluates environmental context to determine if a skill is relevant.
 * Considers file extensions, git repository status, project type, etc.
 *
 * @param context - Current activation context
 * @param skill - Skill to match against
 * @returns Match result with confidence score
 *
 * @example
 * ```typescript
 * const context = {
 *   currentFile: 'src/index.ts',
 *   isGitRepo: true,
 *   projectType: 'typescript'
 * }
 * const result = matchContext(context, gitCommitSkill)
 * // result.matched = true (git repo), result.confidence = 0.8
 * ```
 */
export function matchContext(
  context: SkillActivationContext,
  skill: SkillMdFile,
): { matched: boolean, confidence: number } {
  let matchScore = 0
  let totalFactors = 0

  // Factor 1: Git repository requirement
  if (skill.metadata.category === 'git') {
    totalFactors++
    if (context.isGitRepo) {
      matchScore += CONFIDENCE_WEIGHTS.CONTEXT_STRONG
    }
  }

  // Factor 2: File type matching
  if (context.currentFile) {
    totalFactors++
    const fileExt = getFileExtension(context.currentFile)

    // Check if skill tags include file type
    if (skill.metadata.tags?.some(tag => tag.toLowerCase() === fileExt)) {
      matchScore += CONFIDENCE_WEIGHTS.CONTEXT_STRONG
    }
    // Check if skill category matches file type
    else if (isFileTypeRelevant(fileExt, skill.metadata.category)) {
      matchScore += CONFIDENCE_WEIGHTS.CONTEXT_WEAK
    }
  }

  // Factor 3: Project type matching
  if (context.projectType) {
    totalFactors++
    const projectType = context.projectType.toLowerCase()

    // Check if skill tags include project type
    if (skill.metadata.tags?.some(tag => tag.toLowerCase() === projectType)) {
      matchScore += CONFIDENCE_WEIGHTS.CONTEXT_STRONG
    }
  }

  // Factor 4: Recent commands (workflow continuity)
  if (context.recentCommands && context.recentCommands.length > 0) {
    totalFactors++

    // Check if any recent command matches skill triggers
    const hasRelatedCommand = context.recentCommands.some(cmd =>
      skill.metadata.triggers.some(trigger => cmd.includes(trigger)),
    )

    if (hasRelatedCommand) {
      matchScore += CONFIDENCE_WEIGHTS.CONTEXT_WEAK
    }
  }

  // Calculate average confidence
  if (totalFactors === 0) {
    return { matched: false, confidence: 0 }
  }

  const confidence = matchScore / totalFactors

  return {
    matched: confidence > 0,
    confidence,
  }
}

/**
 * Find best matching skill when multiple match
 *
 * Resolves conflicts by considering:
 * 1. Confidence score (higher is better)
 * 2. Priority (higher priority wins ties)
 * 3. Specificity (more specific skills preferred)
 *
 * @param results - Array of matched skills with confidence scores
 * @returns Best matching skill, or null if none suitable
 *
 * @example
 * ```typescript
 * const matches = [
 *   { skill: gitCommit, confidence: 0.8 },
 *   { skill: gitPush, confidence: 0.7 }
 * ]
 * const best = findBestMatch(matches)
 * // Returns gitCommit (higher confidence)
 * ```
 */
export function findBestMatch(
  results: Array<{
    skill: SkillMdFile
    confidence: number
    trigger?: string
    useWhen?: string
    reason: string
  }>,
): typeof results[0] | null {
  if (results.length === 0) {
    return null
  }

  if (results.length === 1) {
    return results[0]
  }

  // Sort by confidence (descending), then by priority (descending)
  const sorted = [...results].sort((a, b) => {
    // First, compare confidence
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence
    }

    // If confidence is equal, compare priority
    const priorityA = a.skill.metadata.priority ?? 5
    const priorityB = b.skill.metadata.priority ?? 5

    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }

    // If priority is also equal, prefer skills with more specific triggers
    const triggersA = a.skill.metadata.triggers.length
    const triggersB = b.skill.metadata.triggers.length

    return triggersB - triggersA
  })

  return sorted[0]
}

/**
 * Extract meaningful keywords from a condition string
 *
 * Removes common stop words and extracts significant terms for matching.
 *
 * @param condition - Natural language condition string
 * @returns Array of extracted keywords
 *
 * @internal
 */
function extractKeywords(condition: string): string[] {
  // Common stop words to ignore
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'must',
    'can',
    'to',
    'of',
    'in',
    'on',
    'at',
    'by',
    'for',
    'with',
    'about',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'from',
    'up',
    'down',
    'out',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'both',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'user',
    'wants',
  ])

  // Split into words and filter
  const words = condition
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))

  return words
}

/**
 * Get file extension from file path
 *
 * @param filePath - File path
 * @returns File extension without dot (e.g., 'ts', 'py')
 *
 * @internal
 */
function getFileExtension(filePath: string): string {
  const match = filePath.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Check if file type is relevant to skill category
 *
 * @param fileExt - File extension
 * @param category - Skill category
 * @returns Whether file type is relevant
 *
 * @internal
 */
function isFileTypeRelevant(fileExt: string, category: string): boolean {
  const relevanceMap: Record<string, string[]> = {
    dev: ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp'],
    testing: ['test.ts', 'test.js', 'spec.ts', 'spec.js'],
    docs: ['md', 'mdx', 'rst', 'txt'],
    devops: ['yml', 'yaml', 'json', 'toml', 'dockerfile'],
  }

  const relevantExts = relevanceMap[category] || []
  return relevantExts.some(ext => fileExt.includes(ext))
}

/**
 * Build human-readable activation reason
 *
 * @param useWhenMatch - Use_when match result
 * @param useWhenMatch.matched - Whether the use_when condition matched
 * @param useWhenMatch.condition - The condition that matched
 * @param useWhenMatch.confidence - Confidence score for the match
 * @param contextMatch - Context match result
 * @param contextMatch.matched - Whether the context matched
 * @param contextMatch.confidence - Confidence score for the context match
 * @returns Human-readable reason string
 *
 * @internal
 */
function buildActivationReason(
  useWhenMatch: { matched: boolean, condition?: string, confidence: number },
  contextMatch: { matched: boolean, confidence: number },
): string {
  const reasons: string[] = []

  if (useWhenMatch.matched && useWhenMatch.condition) {
    reasons.push(`Condition matched: "${useWhenMatch.condition}"`)
  }

  if (contextMatch.matched) {
    reasons.push('Context is relevant')
  }

  return reasons.length > 0 ? reasons.join('; ') : 'Auto-activated based on context'
}
