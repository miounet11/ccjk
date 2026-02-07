import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import ora from 'ora'
import { basename, join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../constants'
import { detectProject, generateSuggestions, getProjectSummary } from './auto-config/detector'
import { boxify, COLORS, STATUS } from './banner'
import { writeFileAtomic } from './fs-operations'

/**
 * Knowledge base entry
 */
export interface KnowledgeEntry {
  id: string
  type: 'claude-md' | 'agent' | 'skill' | 'workflow' | 'project-info'
  name: string
  path: string
  content: string
  hash: string
  createdAt: string
  updatedAt: string
  projectRoot?: string
}

/**
 * Knowledge base
 */
export interface KnowledgeBase {
  version: string
  lastSync: string
  entries: KnowledgeEntry[]
  projectContexts: ProjectContext[]
}

/**
 * Project context for knowledge
 */
export interface ProjectContext {
  rootDir: string
  name: string
  type: string
  frameworks: string[]
  lastScanned: string
  claudeMdHash?: string
  agentsCount: number
  skillsCount: number
}

/**
 * Onboarding result
 */
export interface OnboardingResult {
  success: boolean
  projectDetected: boolean
  claudeMdFound: boolean
  claudeMdUpdated: boolean
  agentsFound: number
  skillsFound: number
  knowledgeEntriesCreated: number
  recommendations: string[]
}

// Knowledge base file path
const KNOWLEDGE_BASE_FILE = join(CCJK_CONFIG_DIR, 'knowledge-base.json')

/**
 * Simple hash for content comparison
 */
function simpleHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

/**
 * Load knowledge base
 */
export function loadKnowledgeBase(): KnowledgeBase {
  if (existsSync(KNOWLEDGE_BASE_FILE)) {
    try {
      return JSON.parse(readFileSync(KNOWLEDGE_BASE_FILE, 'utf-8'))
    }
    catch {
      // Return empty
    }
  }

  return {
    version: '1.0.0',
    lastSync: new Date().toISOString(),
    entries: [],
    projectContexts: [],
  }
}

/**
 * Save knowledge base
 */
export function saveKnowledgeBase(kb: KnowledgeBase): void {
  if (!existsSync(CCJK_CONFIG_DIR)) {
    mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
  }
  kb.lastSync = new Date().toISOString()
  writeFileAtomic(KNOWLEDGE_BASE_FILE, JSON.stringify(kb, null, 2))
}

/**
 * Check if file is outdated (older than 30 days)
 */
function isFileOutdated(filePath: string, daysThreshold: number = 30): boolean {
  try {
    const stat = statSync(filePath)
    const daysSinceModified = dayjs().diff(dayjs(stat.mtime), 'day')
    return daysSinceModified > daysThreshold
  }
  catch {
    return true
  }
}

/**
 * Scan project for CLAUDE.md
 */
function scanClaudeMd(projectDir: string): { path: string, content: string, outdated: boolean } | null {
  const possiblePaths = [
    join(projectDir, 'CLAUDE.md'),
    join(projectDir, 'claude.md'),
    join(projectDir, '.claude', 'CLAUDE.md'),
    join(projectDir, 'docs', 'CLAUDE.md'),
  ]

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      return {
        path,
        content,
        outdated: isFileOutdated(path),
      }
    }
  }

  return null
}

/**
 * Scan project for agents
 */
function scanAgents(projectDir: string): Array<{ path: string, name: string, content: string }> {
  const agents: Array<{ path: string, name: string, content: string }> = []

  const agentDirs = [
    join(projectDir, '.claude', 'agents'),
    join(projectDir, 'agents'),
    join(projectDir, '.agents'),
  ]

  for (const dir of agentDirs) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir)
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = join(dir, file)
            agents.push({
              path: filePath,
              name: basename(file, '.md'),
              content: readFileSync(filePath, 'utf-8'),
            })
          }
        }
      }
      catch {
        // Skip
      }
    }
  }

  return agents
}

/**
 * Scan project for skills
 */
function scanSkills(projectDir: string): Array<{ path: string, name: string, content: string }> {
  const skills: Array<{ path: string, name: string, content: string }> = []

  const skillDirs = [
    join(projectDir, '.claude', 'commands'),
    join(projectDir, '.claude', 'skills'),
    join(projectDir, 'skills'),
  ]

  for (const dir of skillDirs) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir)
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = join(dir, file)
            skills.push({
              path: filePath,
              name: basename(file, '.md'),
              content: readFileSync(filePath, 'utf-8'),
            })
          }
        }
      }
      catch {
        // Skip
      }
    }
  }

  return skills
}

/**
 * Add entry to knowledge base
 */
function addToKnowledgeBase(
  kb: KnowledgeBase,
  type: KnowledgeEntry['type'],
  name: string,
  path: string,
  content: string,
  projectRoot?: string,
): void {
  const hash = simpleHash(content)
  const now = new Date().toISOString()

  // Check if entry exists
  const existingIndex = kb.entries.findIndex(e => e.path === path)

  if (existingIndex >= 0) {
    // Update if content changed
    if (kb.entries[existingIndex].hash !== hash) {
      kb.entries[existingIndex] = {
        ...kb.entries[existingIndex],
        content,
        hash,
        updatedAt: now,
      }
    }
  }
  else {
    // Add new entry
    kb.entries.push({
      id: `${type}-${Date.now()}`,
      type,
      name,
      path,
      content,
      hash,
      createdAt: now,
      updatedAt: now,
      projectRoot,
    })
  }
}

/**
 * Generate default CLAUDE.md content
 */
function generateDefaultClaudeMd(project: ReturnType<typeof detectProject>): string {
  return `# ${project.name}

## Project Overview

This is a ${project.type} project using ${project.frameworks.join(', ') || 'standard tools'}.

## Tech Stack

${project.languages.map(l => `- ${l}`).join('\n')}
${project.frameworks.map(f => `- ${f}`).join('\n')}

## Development Guidelines

### Code Style
- Follow existing code conventions
- Use TypeScript strict mode
- Write meaningful commit messages

### Testing
${project.testFrameworks.length > 0 ? `Using: ${project.testFrameworks.join(', ')}` : '- Add tests for new features'}

### Build & Deploy
${project.buildTools.length > 0 ? `Build tools: ${project.buildTools.join(', ')}` : '- Follow standard build process'}

## Important Files

- \`README.md\` - Project documentation
- \`package.json\` - Dependencies and scripts

## AI Assistant Notes

- Prefer concise, actionable responses
- Follow existing patterns in the codebase
- Ask before making breaking changes

---
*Generated by CCJK on ${dayjs().format('YYYY-MM-DD')}*
`
}

/**
 * Run onboarding process
 */
export async function runOnboarding(projectDir: string = process.cwd()): Promise<OnboardingResult> {
  console.log(boxify(`
  Welcome to CCJK!

  Let's set up your project for optimal AI-assisted development.
  This will scan your project and create a knowledge base.
`, 'double', '🚀 CCJK Setup'))

  const result: OnboardingResult = {
    success: false,
    projectDetected: false,
    claudeMdFound: false,
    claudeMdUpdated: false,
    agentsFound: 0,
    skillsFound: 0,
    knowledgeEntriesCreated: 0,
    recommendations: [],
  }

  // Load or create knowledge base
  const kb = loadKnowledgeBase()

  // Step 1: Detect project
  const spinner = ora('Scanning project...').start()
  const project = detectProject(projectDir)
  spinner.succeed('Project detected')

  result.projectDetected = true

  console.log('')
  console.log(COLORS.secondary('📁 Project Info:'))
  console.log(ansis.gray(getProjectSummary(project)))
  console.log('')

  // Step 2: Scan CLAUDE.md
  spinner.start('Looking for CLAUDE.md...')
  const claudeMd = scanClaudeMd(projectDir)

  if (claudeMd) {
    spinner.succeed(`Found CLAUDE.md at ${claudeMd.path}`)
    result.claudeMdFound = true

    // Check if outdated
    if (claudeMd.outdated) {
      console.log(STATUS.warning('CLAUDE.md appears to be outdated (>30 days old)'))

      const { updateClaudeMd } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateClaudeMd',
          message: 'Would you like to refresh it with current project info?',
          default: true,
        },
      ])

      if (updateClaudeMd) {
        const newContent = generateDefaultClaudeMd(project)
        const backupPath = `${claudeMd.path}.backup-${dayjs().format('YYYYMMDD')}`
        writeFileAtomic(backupPath, claudeMd.content)
        writeFileAtomic(claudeMd.path, newContent)
        console.log(STATUS.success(`Updated! Backup saved to ${backupPath}`))
        result.claudeMdUpdated = true
        addToKnowledgeBase(kb, 'claude-md', 'CLAUDE.md', claudeMd.path, newContent, projectDir)
      }
      else {
        addToKnowledgeBase(kb, 'claude-md', 'CLAUDE.md', claudeMd.path, claudeMd.content, projectDir)
      }
    }
    else {
      addToKnowledgeBase(kb, 'claude-md', 'CLAUDE.md', claudeMd.path, claudeMd.content, projectDir)
    }
    result.knowledgeEntriesCreated++
  }
  else {
    spinner.warn('No CLAUDE.md found')

    const { createClaudeMd } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createClaudeMd',
        message: 'Would you like to create one? (Recommended for AI assistance)',
        default: true,
      },
    ])

    if (createClaudeMd) {
      const newContent = generateDefaultClaudeMd(project)
      const newPath = join(projectDir, 'CLAUDE.md')
      writeFileAtomic(newPath, newContent)
      console.log(STATUS.success(`Created ${newPath}`))
      result.claudeMdFound = true
      result.claudeMdUpdated = true
      addToKnowledgeBase(kb, 'claude-md', 'CLAUDE.md', newPath, newContent, projectDir)
      result.knowledgeEntriesCreated++
    }
    else {
      result.recommendations.push('Consider creating a CLAUDE.md file for better AI assistance')
    }
  }

  // Step 3: Scan agents
  spinner.start('Scanning for agents...')
  const agents = scanAgents(projectDir)
  spinner.succeed(`Found ${agents.length} agent(s)`)
  result.agentsFound = agents.length

  for (const agent of agents) {
    addToKnowledgeBase(kb, 'agent', agent.name, agent.path, agent.content, projectDir)
    result.knowledgeEntriesCreated++
  }

  if (agents.length === 0) {
    result.recommendations.push('Add custom agents in .claude-code/agents/ for specialized assistance')
  }

  // Step 4: Scan skills
  spinner.start('Scanning for skills...')
  const skills = scanSkills(projectDir)
  spinner.succeed(`Found ${skills.length} skill(s)`)
  result.skillsFound = skills.length

  for (const skill of skills) {
    addToKnowledgeBase(kb, 'skill', skill.name, skill.path, skill.content, projectDir)
    result.knowledgeEntriesCreated++
  }

  if (skills.length === 0) {
    result.recommendations.push('Add custom skills in .claude/commands/ for quick actions')
  }

  // Step 5: Store project context
  const suggestions = generateSuggestions(project)
  const existingContextIndex = kb.projectContexts.findIndex(c => c.rootDir === projectDir)

  const projectContext: ProjectContext = {
    rootDir: projectDir,
    name: project.name,
    type: project.type,
    frameworks: project.frameworks,
    lastScanned: new Date().toISOString(),
    claudeMdHash: claudeMd ? simpleHash(claudeMd.content) : undefined,
    agentsCount: agents.length,
    skillsCount: skills.length,
  }

  if (existingContextIndex >= 0) {
    kb.projectContexts[existingContextIndex] = projectContext
  }
  else {
    kb.projectContexts.push(projectContext)
  }

  // Add project info to knowledge base
  addToKnowledgeBase(
    kb,
    'project-info',
    project.name,
    projectDir,
    JSON.stringify({ project, suggestions }, null, 2),
    projectDir,
  )
  result.knowledgeEntriesCreated++

  // Save knowledge base
  saveKnowledgeBase(kb)

  // Show summary
  console.log('')
  console.log(COLORS.primary('═══════════════════════════════════════════════'))
  console.log(COLORS.accent('                 Setup Complete!                '))
  console.log(COLORS.primary('═══════════════════════════════════════════════'))
  console.log('')
  console.log(`  📚 Knowledge entries: ${result.knowledgeEntriesCreated}`)
  console.log(`  📄 CLAUDE.md: ${result.claudeMdFound ? '✓' : '✗'}`)
  console.log(`  🤖 Agents: ${result.agentsFound}`)
  console.log(`  ⚡ Skills: ${result.skillsFound}`)
  console.log('')

  if (result.recommendations.length > 0) {
    console.log(COLORS.secondary('💡 Recommendations:'))
    for (const rec of result.recommendations) {
      console.log(ansis.gray(`   • ${rec}`))
    }
    console.log('')
  }

  // Suggest next steps
  console.log(COLORS.secondary('📌 Next Steps:'))
  console.log(ansis.gray('   • Run `ccjk` to open the main menu'))
  console.log(ansis.gray('   • Run `ccjk doctor` to check environment'))
  console.log(ansis.gray('   • Run `ccjk groups enable typescript-dev` for TypeScript support'))
  console.log('')

  result.success = true
  return result
}

/**
 * Quick sync - update knowledge base without prompts
 */
export async function quickSync(projectDir: string = process.cwd()): Promise<void> {
  const spinner = ora('Syncing project knowledge...').start()

  const kb = loadKnowledgeBase()
  detectProject(projectDir)

  // Scan and update
  const claudeMd = scanClaudeMd(projectDir)
  if (claudeMd) {
    addToKnowledgeBase(kb, 'claude-md', 'CLAUDE.md', claudeMd.path, claudeMd.content, projectDir)
  }

  const agents = scanAgents(projectDir)
  for (const agent of agents) {
    addToKnowledgeBase(kb, 'agent', agent.name, agent.path, agent.content, projectDir)
  }

  const skills = scanSkills(projectDir)
  for (const skill of skills) {
    addToKnowledgeBase(kb, 'skill', skill.name, skill.path, skill.content, projectDir)
  }

  saveKnowledgeBase(kb)

  spinner.succeed(`Synced: ${claudeMd ? 1 : 0} CLAUDE.md, ${agents.length} agents, ${skills.length} skills`)
}

/**
 * Get knowledge for current project
 */
export function getProjectKnowledge(projectDir: string = process.cwd()): KnowledgeEntry[] {
  const kb = loadKnowledgeBase()
  return kb.entries.filter(e => e.projectRoot === projectDir)
}

/**
 * Export knowledge for a project
 */
export function exportProjectKnowledge(projectDir: string = process.cwd()): string {
  const entries = getProjectKnowledge(projectDir)
  return JSON.stringify(entries, null, 2)
}
