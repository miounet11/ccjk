/**
 * SKILL.md Parser
 *
 * Parses SKILL.md files (Vercel Agent Skills format) into structured data
 * that can be used by the plugin system.
 *
 * SKILL.md Format:
 * - Title and description
 * - Applicability section (when to use)
 * - Rules/guidelines with priorities
 * - Code examples (good/bad)
 * - References to external docs
 *
 * @module plugins-v2/skills/skill-parser
 */

import type {
  CodeExample,
  ReferenceDocument,
  SkillApplicability,
  SkillDocument,
  SkillExample,
  SkillRule,
  SkillSection,
} from '../types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_KEYWORDS: Record<string, SkillRule['priority']> = {
  critical: 'critical',
  CRITICAL: 'critical',
  关键: 'critical',
  high: 'high',
  HIGH: 'high',
  高: 'high',
  medium: 'medium',
  MEDIUM: 'medium',
  中: 'medium',
  low: 'low',
  LOW: 'low',
  低: 'low',
}

// ============================================================================
// Skill Parser Class
// ============================================================================

/**
 * SKILL.md Parser
 *
 * Parses SKILL.md files into structured SkillDocument objects
 */
export class SkillParser {
  /**
   * Parse a SKILL.md file
   *
   * @param filePath - Path to SKILL.md file
   * @returns Parsed skill document
   */
  parse(filePath: string): SkillDocument {
    const content = readFileSync(filePath, 'utf-8')
    return this.parseContent(content, dirname(filePath))
  }

  /**
   * Parse SKILL.md content
   *
   * @param content - Raw markdown content
   * @param basePath - Base path for resolving references
   * @returns Parsed skill document
   */
  parseContent(content: string, basePath?: string): SkillDocument {
    const lines = content.split('\n')

    // Extract title (first H1)
    const title = this.extractTitle(lines)

    // Extract description (content after title, before first H2)
    const description = this.extractDescription(lines)

    // Extract applicability
    const applicability = this.extractApplicability(content)

    // Extract sections
    const sections = this.extractSections(content)

    // Extract rules
    const rules = this.extractRules(content, basePath)

    // Extract examples
    const examples = this.extractExamples(content)

    return {
      title,
      description,
      applicability,
      sections,
      rules,
      examples,
      rawContent: content,
    }
  }

  /**
   * Parse a skill directory (SKILL.md + references/)
   *
   * @param dirPath - Path to skill directory
   * @returns Parsed skill document with references
   */
  parseDirectory(dirPath: string): SkillDocument & { references: ReferenceDocument[] } {
    const skillPath = join(dirPath, 'SKILL.md')

    if (!existsSync(skillPath)) {
      throw new Error(`SKILL.md not found in ${dirPath}`)
    }

    const skill = this.parse(skillPath)

    // Load references
    const references = this.loadReferences(dirPath)

    return {
      ...skill,
      references,
    }
  }

  // ==========================================================================
  // Extraction Methods
  // ==========================================================================

  /**
   * Extract title from markdown
   */
  private extractTitle(lines: string[]): string {
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/)
      if (match) {
        return match[1].trim()
      }
    }
    return 'Untitled Skill'
  }

  /**
   * Extract description from markdown
   */
  private extractDescription(lines: string[]): string {
    let inDescription = false
    const descLines: string[] = []

    for (const line of lines) {
      // Start after first H1
      if (line.match(/^#\s+/)) {
        inDescription = true
        continue
      }

      // Stop at first H2
      if (line.match(/^##\s+/)) {
        break
      }

      if (inDescription && line.trim()) {
        descLines.push(line)
      }
    }

    return descLines.join('\n').trim()
  }

  /**
   * Extract applicability section
   */
  private extractApplicability(content: string): SkillApplicability {
    const applicability: SkillApplicability = {
      taskTypes: [],
      fileTypes: [],
      contexts: [],
    }

    // Look for "When to Apply" or "Applicability" section
    const applicabilityMatch = content.match(
      /##\s*(?:When to Apply|Applicability|适用场景|何时使用)[^\n]*\n([\s\S]*?)(?=\n##|\n$|$)/i,
    )

    if (applicabilityMatch) {
      const section = applicabilityMatch[1]

      // Extract task types from bullet points
      const taskMatches = section.matchAll(/[-*]\s*(.+)/g)
      for (const match of taskMatches) {
        const task = match[1].trim()
        if (task) {
          applicability.taskTypes.push(task)
        }
      }
    }

    // Look for file types
    const fileTypeMatch = content.match(
      /(?:file types?|文件类型)[:\s]*([^\n]+)/i,
    )
    if (fileTypeMatch) {
      applicability.fileTypes = fileTypeMatch[1]
        .split(/[,，]/)
        .map(t => t.trim())
        .filter(Boolean)
    }

    return applicability
  }

  /**
   * Extract sections from markdown
   */
  private extractSections(content: string): SkillSection[] {
    const sections: SkillSection[] = []
    const lines = content.split('\n')

    let currentSection: SkillSection | null = null
    let currentContent: string[] = []
    let currentSubsections: SkillSection[] = []

    for (const line of lines) {
      // H2 - Main section
      const h2Match = line.match(/^##\s+(.+)$/)
      if (h2Match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim()
          currentSection.subsections = currentSubsections.length > 0 ? currentSubsections : undefined
          sections.push(currentSection)
        }

        // Start new section
        currentSection = {
          title: h2Match[1].trim(),
          content: '',
          priority: this.detectPriority(h2Match[1]),
        }
        currentContent = []
        currentSubsections = []
        continue
      }

      // H3 - Subsection
      const h3Match = line.match(/^###\s+(.+)$/)
      if (h3Match && currentSection) {
        currentSubsections.push({
          title: h3Match[1].trim(),
          content: '', // Will be filled by subsequent lines
          priority: this.detectPriority(h3Match[1]),
        })
        continue
      }

      // Content line
      if (currentSection) {
        currentContent.push(line)
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim()
      currentSection.subsections = currentSubsections.length > 0 ? currentSubsections : undefined
      sections.push(currentSection)
    }

    return sections
  }

  /**
   * Extract rules from markdown
   */
  private extractRules(content: string, basePath?: string): SkillRule[] {
    const rules: SkillRule[] = []

    // Pattern 1: Rules with IDs like `async-001`, `bundle-002`
    const rulePattern = /###?\s*(?:`([a-z]+-\d+)`|(\w+-\d+))[:\s]*(.+?)(?=\n###?|\n##|$)/gs

    let match
    while ((match = rulePattern.exec(content)) !== null) {
      const id = match[1] || match[2]
      const titleAndContent = match[3]

      // Extract title (first line)
      const titleMatch = titleAndContent.match(/^[:\s]*(.+)(?:\n|$)/)
      const title = titleMatch ? titleMatch[1].trim() : id

      // Detect category from ID prefix
      const category = id.split('-')[0]

      // Detect priority
      const priority = this.detectPriority(titleAndContent)

      // Extract description
      const description = titleAndContent
        .replace(/^[:\s]*(.+)(?:\n|$)/, '')
        .trim()

      // Check for reference file
      let referencePath: string | undefined
      if (basePath) {
        const refPath = join(basePath, 'references', 'rules', `${id}.md`)
        if (existsSync(refPath)) {
          referencePath = refPath
        }
      }

      rules.push({
        id,
        title,
        category,
        priority,
        description,
        referencePath,
      })
    }

    // Pattern 2: Numbered rules like "1. Rule Name"
    const numberedPattern = /(?:^|\n)(\d+)\.\s+\*\*(.+?)\*\*[:\s]*(.+?)(?=\n\d+\.|\n##|$)/gs

    while ((match = numberedPattern.exec(content)) !== null) {
      const num = match[1]
      const title = match[2].trim()
      const description = match[3].trim()

      // Generate ID from title
      const id = `rule-${num.padStart(3, '0')}`

      rules.push({
        id,
        title,
        category: 'general',
        priority: this.detectPriority(description),
        description,
      })
    }

    return rules
  }

  /**
   * Extract code examples from markdown
   */
  private extractExamples(content: string): SkillExample[] {
    const examples: SkillExample[] = []

    // Look for example sections
    const examplePattern = /###?\s*(?:Example|示例|案例)[:\s]*(.+?)(?=\n###?|\n##|$)/gis

    let match
    while ((match = examplePattern.exec(content)) !== null) {
      const exampleContent = match[1]

      // Extract input/output
      const inputMatch = exampleContent.match(/(?:Input|输入)[:\s]*(.+?)(?=Output|输出|$)/is)
      const outputMatch = exampleContent.match(/(?:Output|输出)[:\s]*(.+)$/is)

      if (inputMatch || outputMatch) {
        examples.push({
          title: 'Example',
          input: inputMatch ? inputMatch[1].trim() : '',
          output: outputMatch ? outputMatch[1].trim() : '',
        })
      }
    }

    return examples
  }

  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content: string): CodeExample[] {
    const blocks: CodeExample[] = []

    const codePattern = /```(\w+)?\n([\s\S]*?)```/g

    let match
    while ((match = codePattern.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      })
    }

    return blocks
  }

  /**
   * Load reference documents from references/ directory
   */
  private loadReferences(dirPath: string): ReferenceDocument[] {
    const references: ReferenceDocument[] = []
    const refsPath = join(dirPath, 'references')

    if (!existsSync(refsPath)) {
      return references
    }

    const loadDir = (dir: string, prefix = '') => {
      const entries = readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          loadDir(fullPath, `${prefix}${entry.name}/`)
        }
        else if (entry.name.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8')
          const title = this.extractTitle(content.split('\n')) || basename(entry.name, '.md')

          references.push({
            path: `${prefix}${entry.name}`,
            title,
            content,
          })
        }
      }
    }

    loadDir(refsPath)
    return references
  }

  /**
   * Detect priority from text
   */
  private detectPriority(text: string): SkillRule['priority'] {
    const lowerText = text.toLowerCase()

    for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return priority
      }
    }

    return 'medium'
  }
}

// ============================================================================
// Skill Generator
// ============================================================================

/**
 * Generate SKILL.md content from structured data
 */
export class SkillGenerator {
  /**
   * Generate SKILL.md content
   */
  generate(skill: Partial<SkillDocument> & { title: string }): string {
    const lines: string[] = []

    // Title
    lines.push(`# ${skill.title}`)
    lines.push('')

    // Description
    if (skill.description) {
      lines.push(skill.description)
      lines.push('')
    }

    // Applicability
    if (skill.applicability && skill.applicability.taskTypes.length > 0) {
      lines.push('## When to Apply')
      lines.push('')
      for (const task of skill.applicability.taskTypes) {
        lines.push(`- ${task}`)
      }
      lines.push('')
    }

    // Sections
    if (skill.sections) {
      for (const section of skill.sections) {
        lines.push(`## ${section.title}`)
        lines.push('')
        if (section.content) {
          lines.push(section.content)
          lines.push('')
        }

        if (section.subsections) {
          for (const sub of section.subsections) {
            lines.push(`### ${sub.title}`)
            lines.push('')
            if (sub.content) {
              lines.push(sub.content)
              lines.push('')
            }
          }
        }
      }
    }

    // Rules
    if (skill.rules && skill.rules.length > 0) {
      lines.push('## Rules')
      lines.push('')

      // Group by category
      const byCategory = new Map<string, SkillRule[]>()
      for (const rule of skill.rules) {
        const cat = rule.category || 'general'
        if (!byCategory.has(cat)) {
          byCategory.set(cat, [])
        }
        byCategory.get(cat)!.push(rule)
      }

      for (const [category, categoryRules] of byCategory) {
        lines.push(`### ${this.formatCategory(category)}`)
        lines.push('')

        for (const rule of categoryRules) {
          lines.push(`#### \`${rule.id}\`: ${rule.title}`)
          lines.push('')
          lines.push(`**Priority**: ${rule.priority.toUpperCase()}`)
          lines.push('')
          if (rule.description) {
            lines.push(rule.description)
            lines.push('')
          }

          if (rule.badExample) {
            lines.push('**❌ Bad:**')
            lines.push(`\`\`\`${rule.badExample.language}`)
            lines.push(rule.badExample.code)
            lines.push('```')
            if (rule.badExample.explanation) {
              lines.push(rule.badExample.explanation)
            }
            lines.push('')
          }

          if (rule.goodExample) {
            lines.push('**✅ Good:**')
            lines.push(`\`\`\`${rule.goodExample.language}`)
            lines.push(rule.goodExample.code)
            lines.push('```')
            if (rule.goodExample.explanation) {
              lines.push(rule.goodExample.explanation)
            }
            lines.push('')
          }
        }
      }
    }

    // Examples
    if (skill.examples && skill.examples.length > 0) {
      lines.push('## Examples')
      lines.push('')

      for (const example of skill.examples) {
        lines.push(`### ${example.title}`)
        lines.push('')
        lines.push('**Input:**')
        lines.push(example.input)
        lines.push('')
        lines.push('**Output:**')
        lines.push(example.output)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  /**
   * Format category name
   */
  private formatCategory(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let parserInstance: SkillParser | null = null
let generatorInstance: SkillGenerator | null = null

/**
 * Get the singleton SkillParser instance
 */
export function getSkillParser(): SkillParser {
  if (!parserInstance) {
    parserInstance = new SkillParser()
  }
  return parserInstance
}

/**
 * Get the singleton SkillGenerator instance
 */
export function getSkillGenerator(): SkillGenerator {
  if (!generatorInstance) {
    generatorInstance = new SkillGenerator()
  }
  return generatorInstance
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a directory contains a valid skill
 */
export function isValidSkillDirectory(dirPath: string): boolean {
  return existsSync(join(dirPath, 'SKILL.md'))
}

/**
 * Check if a file is a SKILL.md file
 *
 * @param filePath - Path to check
 * @returns True if the file is named SKILL.md (case-insensitive)
 *
 * @remarks
 * This is a simplified implementation that only checks for SKILL.md files.
 * For more comprehensive skill file detection (including .yaml, .yml extensions),
 * use `isSkillFile` from `@/brain/skill-parser` instead.
 *
 * @see {@link @/brain/skill-parser#isSkillFile} for the canonical implementation
 */
export function isSkillFile(filePath: string): boolean {
  return basename(filePath).toUpperCase() === 'SKILL.MD'
}
