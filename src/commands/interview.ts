import type { SupportedLang } from '../constants'
import type {
  InterviewDepth,
  InterviewSession,
  QuestionDisplay,
} from '../interview/types'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import {
  createInterviewEngine,
  createSpecGenerator,
  getCategoryById,
  getTemplateById,
  INTERVIEW_TEMPLATES,
} from '../interview'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

/**
 * Interview command options
 */
export interface InterviewOptions {
  /** Spec file path to write results */
  specFile?: string
  /** Interview depth: quick (10), standard (25), deep (40+) */
  depth?: InterviewDepth
  /** Specific categories to focus on */
  category?: string
  /** Template to use (webapp, api, saas, ecommerce, quick) */
  template?: string
  /** Language for questions */
  lang?: SupportedLang
  /** Resume existing session */
  resume?: boolean
  /** List available templates */
  list?: boolean
  /** Context from user request */
  context?: string
}

/**
 * Display interview banner (compact version)
 */
function displayInterviewBanner(compact: boolean = false): void {
  console.log('')
  if (compact) {
    console.log(ansis.green.bold('  🎤 Interview-Driven Development'))
    console.log(ansis.gray('  "Interview first. Spec second. Code last."'))
  }
  else {
    console.log(ansis.green('╔═══════════════════════════════════════════════════════════════╗'))
    console.log(ansis.green('║') + ansis.bold.white('       🎤 Interview-Driven Development (IDD)                  ') + ansis.green('║'))
    console.log(ansis.green('║') + ansis.gray('  "Interview first. Spec second. Code last."                  ') + ansis.green('║'))
    console.log(ansis.green('║') + ansis.gray('  Based on Thariq (@trq212) workflow from Anthropic           ') + ansis.green('║'))
    console.log(ansis.green('╚═══════════════════════════════════════════════════════════════╝'))
  }
  console.log('')
}

/**
 * Detect project type from current directory
 */
async function detectProjectType(): Promise<string> {
  const { existsSync } = await import('node:fs')
  const cwd = process.cwd()

  // Check for common project indicators
  const indicators = {
    saas: ['prisma', 'drizzle', 'stripe', 'auth', 'subscription'].some(
      dir => existsSync(join(cwd, dir)) || existsSync(join(cwd, 'src', dir)),
    ),
    ecommerce: ['cart', 'checkout', 'products', 'shop'].some(
      dir => existsSync(join(cwd, dir)) || existsSync(join(cwd, 'src', dir)),
    ),
    api: existsSync(join(cwd, 'routes')) || existsSync(join(cwd, 'api'))
      || existsSync(join(cwd, 'src/routes')) || existsSync(join(cwd, 'src/api')),
    webapp: existsSync(join(cwd, 'pages')) || existsSync(join(cwd, 'app'))
      || existsSync(join(cwd, 'src/pages')) || existsSync(join(cwd, 'src/app'))
      || existsSync(join(cwd, 'components')),
  }

  if (indicators.saas)
    return 'saas'
  if (indicators.ecommerce)
    return 'ecommerce'
  if (indicators.api)
    return 'api'
  if (indicators.webapp)
    return 'webapp'

  return 'webapp' // default
}

/**
 * Display progress bar
 */
function displayProgressBar(session: InterviewSession): void {
  const total = session.questionsAsked + session.questionsRemaining
  const percentage = Math.round((session.questionsAsked / total) * 100)
  const barWidth = 30
  const filled = Math.round((percentage / 100) * barWidth)
  const empty = barWidth - filled

  const bar = ansis.green('█'.repeat(filled)) + ansis.gray('░'.repeat(empty))

  console.log('')
  console.log(ansis.gray(`  Progress: [${bar}] ${percentage}%`))
}

/**
 * Display category breadcrumb with icons
 */
function displayCategoryBreadcrumb(session: InterviewSession): void {
  const breadcrumb = session.progress
    .map((p) => {
      const category = getCategoryById(p.categoryId)
      const icon = category?.icon || '📌'

      if (p.isComplete) {
        return ansis.green(`${icon} ${p.name} ✓`)
      }
      if (p.isCurrent) {
        return ansis.green.bold(`${icon} ${p.name} ◀`)
      }
      return ansis.gray(`${icon} ${p.name}`)
    })
    .join(ansis.gray(' → '))

  console.log('')
  console.log(`  ${breadcrumb}`)
}

/**
 * Format question for display with beautiful UI
 */
function displayQuestion(display: QuestionDisplay, lang: SupportedLang): void {
  const questionText = display.question.question[lang]
  const headerText = display.question.header[lang]

  console.log('')
  console.log(ansis.gray('─'.repeat(65)))
  console.log('')
  console.log(ansis.green.bold(`  Q${display.questionNumber}`) + ansis.gray(` of ~${display.estimatedTotal}`) + ansis.gray(` │ `) + ansis.yellow(headerText))
  console.log('')
  console.log(ansis.white.bold(`  ${questionText}`))
  console.log('')
}

/**
 * Ask a single question using inquirer
 */
async function askQuestion(
  display: QuestionDisplay,
  lang: SupportedLang,
): Promise<{ values: string[], customInput?: string } | null> {
  displayQuestion(display, lang)

  const choices = display.options.map((opt, index) => {
    const label = opt.isRecommended
      ? `${opt.label} ${ansis.green('(Recommended)')}`
      : opt.label

    return {
      name: `${ansis.green(`${index + 1}.`)} ${label}\n     ${ansis.gray(opt.description)}`,
      value: opt.value,
      short: opt.label,
    }
  })

  // Add "Other" option
  choices.push({
    name: `${ansis.green(`${choices.length + 1}.`)} ${ansis.italic('Type something else...')}`,
    value: '__custom__',
    short: 'Custom',
  })

  try {
    if (display.question.multiSelect) {
      // Multi-select question
      const { selected } = await inquirer.prompt<{ selected: string[] }>({
        type: 'checkbox',
        name: 'selected',
        message: ansis.gray('Select all that apply (space to select, enter to confirm):'),
        choices: choices.map(c => ({
          name: c.name,
          value: c.value,
          short: c.short,
        })),
        pageSize: 10,
      })

      if (selected.includes('__custom__')) {
        const { customValue } = await inquirer.prompt<{ customValue: string }>({
          type: 'input',
          name: 'customValue',
          message: ansis.gray('Enter your custom answer:'),
        })
        const filtered = selected.filter(s => s !== '__custom__')
        return { values: filtered, customInput: customValue }
      }

      return { values: selected }
    }
    else {
      // Single-select question
      const { selected } = await inquirer.prompt<{ selected: string }>({
        type: 'list',
        name: 'selected',
        message: ansis.gray('Select one:'),
        choices,
        pageSize: 10,
      })

      if (selected === '__custom__') {
        const { customValue } = await inquirer.prompt<{ customValue: string }>({
          type: 'input',
          name: 'customValue',
          message: ansis.gray('Enter your custom answer:'),
        })
        return { values: [], customInput: customValue }
      }

      return { values: [selected] }
    }
  }
  catch {
    // Handle Ctrl+C gracefully
    return null
  }
}

/**
 * Select interview template
 */
async function selectTemplate(lang: SupportedLang): Promise<string | null> {
  console.log('')
  console.log(ansis.green.bold('  📋 Select Interview Template'))
  console.log('')

  const choices = INTERVIEW_TEMPLATES.map((template, index) => ({
    name: `${ansis.green(`${index + 1}.`)} ${ansis.bold(template.name[lang])}\n     ${ansis.gray(template.description[lang])}\n     ${ansis.gray(`~${template.estimatedQuestions} questions, ${template.defaultDepth} depth`)}`,
    value: template.id,
    short: template.name[lang],
  }))

  try {
    const { templateId } = await inquirer.prompt<{ templateId: string }>({
      type: 'list',
      name: 'templateId',
      message: ansis.gray('Choose a template:'),
      choices,
      pageSize: 10,
    })

    return templateId
  }
  catch {
    return null
  }
}

/**
 * Quick start - one-step interview configuration
 * Detects project type and offers smart defaults
 */
async function quickStartConfig(_lang: SupportedLang): Promise<{
  template: string
  depth: InterviewDepth
  specFile: string
} | null> {
  // Detect project type
  const detectedType = await detectProjectType()
  const detectedTemplate = getTemplateById(detectedType)

  console.log(ansis.gray(`  Detected project type: ${ansis.white(detectedType)}`))
  console.log('')

  // Show quick start options
  console.log(ansis.green.bold('  How would you like to proceed?'))
  console.log('')

  const quickChoices = [
    {
      name: `${ansis.green('1.')} ${ansis.green('⚡ Quick Start')} ${ansis.gray('(Recommended)')}\n     ${ansis.gray(`Use ${detectedType} template, ~${detectedTemplate?.estimatedQuestions || 25} questions → SPEC.md`)}`,
      value: 'quick-start',
      short: 'Quick Start',
    },
    {
      name: `${ansis.green('2.')} ${ansis.yellow('🔬 Deep Dive')}\n     ${ansis.gray('40+ comprehensive questions for complex features')}`,
      value: 'deep',
      short: 'Deep Dive',
    },
    {
      name: `${ansis.green('3.')} ${ansis.green('⚙️  Custom Setup')}\n     ${ansis.gray('Choose template, depth, and output file')}`,
      value: 'custom',
      short: 'Custom',
    },
    {
      name: `${ansis.green('4.')} ${ansis.magenta('💨 Express Mode')}\n     ${ansis.gray('~10 essential questions only')}`,
      value: 'express',
      short: 'Express',
    },
  ]

  try {
    const { mode } = await inquirer.prompt<{ mode: string }>({
      type: 'list',
      name: 'mode',
      message: ansis.gray('Select mode (press number or use arrows):'),
      choices: quickChoices,
      pageSize: 8,
    })

    switch (mode) {
      case 'quick-start':
        return {
          template: detectedType,
          depth: 'standard',
          specFile: 'SPEC.md',
        }
      case 'deep':
        return {
          template: detectedType,
          depth: 'deep',
          specFile: 'SPEC.md',
        }
      case 'express':
        return {
          template: 'quick',
          depth: 'quick',
          specFile: 'SPEC.md',
        }
      case 'custom':
        // Fall through to full configuration
        return null
      default:
        return null
    }
  }
  catch {
    return null
  }
}

/**
 * Get spec file path from user
 */
async function getSpecFilePath(defaultPath: string): Promise<string | null> {
  try {
    const { specFile } = await inquirer.prompt<{ specFile: string }>({
      type: 'input',
      name: 'specFile',
      message: ansis.gray('Spec file path (where to save the specification):'),
      default: defaultPath,
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Please enter a file path'
        }
        if (!value.endsWith('.md')) {
          return 'File should have .md extension'
        }
        return true
      },
    })

    return specFile
  }
  catch {
    return null
  }
}

/**
 * Display interview completion summary
 */
function displayCompletionSummary(session: InterviewSession, specFile: string): void {
  const duration = Math.round(
    (session.lastActivityAt.getTime() - session.startedAt.getTime()) / 1000 / 60,
  )

  console.log('')
  console.log(ansis.green('═'.repeat(65)))
  console.log('')
  console.log(ansis.green.bold('  ✓ Interview Complete!'))
  console.log('')
  console.log(`  ${ansis.gray('Questions answered:')} ${ansis.white(String(session.questionsAsked))}`)
  console.log(`  ${ansis.gray('Duration:')}           ${ansis.white(`${duration} minutes`)}`)
  console.log(`  ${ansis.gray('Spec file:')}          ${ansis.green(specFile)}`)
  console.log('')

  // Show category summary
  console.log(ansis.gray('  Category Summary:'))
  for (const progress of session.progress) {
    const category = getCategoryById(progress.categoryId)
    const icon = category?.icon || '📌'
    const status = progress.isComplete ? ansis.green('✓') : ansis.yellow('○')
    console.log(`    ${status} ${icon} ${progress.name}: ${progress.answered}/${progress.total}`)
  }

  console.log('')
  console.log(ansis.green('═'.repeat(65)))
  console.log('')
  console.log(ansis.green('  Next steps:'))
  console.log(ansis.gray(`    1. Review the spec: ${ansis.white(`cat ${specFile}`)}`))
  console.log(ansis.gray(`    2. Start planning:  ${ansis.white('/plan')}`))
  console.log(ansis.gray(`    3. Begin coding:    ${ansis.white('Use the spec as context')}`))
  console.log('')
}

/**
 * List available templates
 */
function listTemplates(lang: SupportedLang): void {
  console.log('')
  console.log(ansis.green.bold('  Available Interview Templates:'))
  console.log('')

  for (const template of INTERVIEW_TEMPLATES) {
    console.log(ansis.green(`  ${template.id}`))
    console.log(`    ${ansis.white(template.name[lang])}`)
    console.log(`    ${ansis.gray(template.description[lang])}`)
    console.log(`    ${ansis.gray(`~${template.estimatedQuestions} questions, ${template.defaultDepth} depth`)}`)
    console.log('')
  }

  console.log(ansis.gray('  Usage: ccjk interview --template <template-id> [SPEC.md]'))
  console.log('')
}

/**
 * Main interview command
 */
export async function interview(options: InterviewOptions = {}): Promise<void> {
  try {
    const lang: SupportedLang = options.lang || (i18n.language as SupportedLang) || 'en'

    // Handle --list flag
    if (options.list) {
      listTemplates(lang)
      return
    }

    // Display banner (compact if we have options pre-set)
    const hasPresetOptions = options.template || options.depth
    displayInterviewBanner(!hasPresetOptions)

    let templateId: string
    let depth: InterviewDepth
    let specFile: string

    // If no options provided, use quick start flow (streamlined)
    if (!hasPresetOptions) {
      const quickConfig = await quickStartConfig(lang)

      if (quickConfig) {
        // User selected quick start option
        templateId = quickConfig.template
        depth = quickConfig.depth
        specFile = quickConfig.specFile
      }
      else {
        // User wants custom setup - go through full flow
        const selectedTemplate = await selectTemplate(lang)
        if (!selectedTemplate) {
          console.log(ansis.yellow('\n  Interview cancelled.\n'))
          return
        }
        templateId = selectedTemplate

        const template = getTemplateById(templateId)
        if (!template) {
          console.log(ansis.red(`\n  Template not found: ${templateId}\n`))
          return
        }

        // Select depth
        const { selectedDepth } = await inquirer.prompt<{ selectedDepth: InterviewDepth }>({
          type: 'list',
          name: 'selectedDepth',
          message: ansis.gray('Interview depth:'),
          choices: [
            {
              name: `${ansis.green('1.')} ⚡ Quick (~10 questions)`,
              value: 'quick' as InterviewDepth,
              short: 'Quick',
            },
            {
              name: `${ansis.green('2.')} 📊 Standard (~25 questions) ${template.defaultDepth === 'standard' ? ansis.green('(Recommended)') : ''}`,
              value: 'standard' as InterviewDepth,
              short: 'Standard',
            },
            {
              name: `${ansis.green('3.')} 🔬 Deep (~40+ questions) ${template.defaultDepth === 'deep' ? ansis.green('(Recommended)') : ''}`,
              value: 'deep' as InterviewDepth,
              short: 'Deep',
            },
          ],
          default: template.defaultDepth,
          pageSize: 6,
        })
        depth = selectedDepth

        // Get spec file path
        const selectedSpecFile = await getSpecFilePath('SPEC.md')
        if (!selectedSpecFile) {
          console.log(ansis.yellow('\n  Interview cancelled.\n'))
          return
        }
        specFile = selectedSpecFile
      }
    }
    else {
      // Use provided options
      templateId = options.template || 'webapp'
      depth = options.depth || 'standard'
      specFile = options.specFile || 'SPEC.md'
    }

    // Validate template
    const template = getTemplateById(templateId)
    if (!template) {
      console.log(ansis.red(`\n  Template not found: ${templateId}\n`))
      console.log(ansis.gray('  Available templates:'))
      INTERVIEW_TEMPLATES.forEach(t => console.log(ansis.gray(`    - ${t.id}`)))
      return
    }

    // Resolve to absolute path
    const absoluteSpecFile = resolve(process.cwd(), specFile)

    // Show brief summary and start immediately (no extra confirmation)
    console.log('')
    console.log(ansis.gray('─'.repeat(50)))
    console.log(`  ${ansis.gray('Template:')} ${ansis.white(template.name[lang])}`)
    console.log(`  ${ansis.gray('Depth:')} ${ansis.white(depth)} ${ansis.gray(`(~${depth === 'quick' ? 10 : depth === 'standard' ? 25 : 40}+ questions)`)}`)
    console.log(`  ${ansis.gray('Output:')} ${ansis.green(specFile)}`)
    console.log(ansis.gray('─'.repeat(50)))
    console.log('')
    console.log(ansis.green('  Starting interview...'))
    console.log(ansis.gray('  Press Ctrl+C to pause | Enter to select | Type for custom'))
    console.log('')

    // Create interview engine and session
    const engine = createInterviewEngine(lang)
    const session = await engine.startInterview(absoluteSpecFile, {
      depth,
      categories: template.categories,
      skipObvious: true,
      outputFile: absoluteSpecFile,
      language: lang,
      context: options.context,
    })

    // Run interview loop
    let questionDisplay = await engine.getNextQuestion(session.id)

    while (questionDisplay) {
      // Display progress
      displayProgressBar(session)
      displayCategoryBreadcrumb(session)

      // Ask question
      const answer = await askQuestion(questionDisplay, lang)

      if (answer === null) {
        // User cancelled (Ctrl+C)
        console.log('')
        console.log(ansis.yellow('  Interview paused.'))

        // Offer to save progress
        try {
          const { saveProgress } = await inquirer.prompt<{ saveProgress: boolean }>({
            type: 'confirm',
            name: 'saveProgress',
            message: 'Save progress for later?',
            default: true,
          })

          if (saveProgress) {
            await engine.pauseInterview(session.id)
            const sessionJson = engine.exportSession(session.id)
            if (sessionJson) {
              const sessionFile = absoluteSpecFile.replace('.md', '.session.json')
              await writeFile(sessionFile, sessionJson, 'utf-8')
              console.log(ansis.gray(`  Session saved to: ${sessionFile}`))
              console.log(ansis.gray(`  Resume with: ccjk interview --resume`))
            }
          }
        }
        catch {
          // Ignore errors during pause
        }

        return
      }

      // Process answer
      const values = answer.customInput && answer.values.length === 0
        ? [answer.customInput]
        : answer.values

      await engine.processAnswer(
        session.id,
        questionDisplay.question.id,
        values,
        answer.customInput,
      )

      // Get next question
      questionDisplay = await engine.getNextQuestion(session.id)
    }

    // Generate spec
    console.log('')
    console.log(ansis.green('  Generating specification...'))

    const specGenerator = createSpecGenerator(lang)
    const spec = await specGenerator.generateSpec(session)

    // Ensure directory exists
    const specDir = dirname(absoluteSpecFile)
    if (!existsSync(specDir)) {
      await mkdir(specDir, { recursive: true })
    }

    // Write spec file
    await specGenerator.writeSpecToFile(spec, absoluteSpecFile)

    // Display completion summary
    displayCompletionSummary(session, specFile)
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Resume an interview from saved session
 */
export async function resumeInterview(sessionFile?: string, options: InterviewOptions = {}): Promise<void> {
  try {
    const lang: SupportedLang = options.lang || (i18n.language as SupportedLang) || 'en'

    // If no session file provided, list and select one
    let targetSessionFile = sessionFile

    if (!targetSessionFile) {
      const { readdir, stat } = await import('node:fs/promises')
      const { homedir } = await import('node:os')

      const searchDirs = [
        process.cwd(),
        join(homedir(), '.ccjk', 'sessions'),
      ]

      const sessions: Array<{ name: string, path: string, modified: Date }> = []

      for (const dir of searchDirs) {
        try {
          const files = await readdir(dir)
          const sessionFiles = files.filter(f => f.endsWith('.session.json'))

          for (const file of sessionFiles) {
            const filePath = join(dir, file)
            const fileStats = await stat(filePath)
            sessions.push({
              name: file,
              path: filePath,
              modified: fileStats.mtime,
            })
          }
        }
        catch {
          // Directory doesn't exist or can't be read
        }
      }

      if (sessions.length === 0) {
        console.log(ansis.yellow('\n  No saved sessions found.\n'))
        console.log(ansis.gray('  Start a new interview with: ccjk interview'))
        return
      }

      // Sort by most recent first
      sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime())

      const { selectedSession } = await inquirer.prompt<{ selectedSession: string }>({
        type: 'list',
        name: 'selectedSession',
        message: ansis.gray('Select a session to resume:'),
        choices: sessions.map((s, i) => ({
          name: `${ansis.green(`${i + 1}.`)} ${ansis.white(s.name)}\n     ${ansis.gray(`Modified: ${s.modified.toLocaleString()}`)}`,
          value: s.path,
          short: s.name,
        })),
        pageSize: 10,
      })

      targetSessionFile = selectedSession
    }

    // Read session file
    if (!existsSync(targetSessionFile)) {
      console.log(ansis.red(`\n  Session file not found: ${targetSessionFile}\n`))
      return
    }

    const sessionJson = await readFile(targetSessionFile, 'utf-8')
    const engine = createInterviewEngine(lang)
    const session = engine.importSession(sessionJson)

    if (!session) {
      console.log(ansis.red('\n  Failed to load session file.\n'))
      return
    }

    // Display banner
    displayInterviewBanner()

    console.log(ansis.green('  Resuming interview session...'))
    console.log(ansis.gray(`  Session ID: ${session.id}`))
    console.log(ansis.gray(`  Progress: ${session.questionsAsked} questions answered`))
    console.log('')

    // Resume session
    const resumed = await engine.resumeInterview(session.id)
    if (!resumed) {
      console.log(ansis.red('\n  Failed to resume session.\n'))
      return
    }

    // Continue interview loop
    let questionDisplay = await engine.getNextQuestion(session.id)

    while (questionDisplay) {
      displayProgressBar(session)
      displayCategoryBreadcrumb(session)

      const answer = await askQuestion(questionDisplay, lang)

      if (answer === null) {
        console.log('')
        console.log(ansis.yellow('  Interview paused.'))
        await engine.pauseInterview(session.id)

        const updatedSessionJson = engine.exportSession(session.id)
        if (updatedSessionJson) {
          await writeFile(targetSessionFile, updatedSessionJson, 'utf-8')
          console.log(ansis.gray(`  Progress saved to: ${targetSessionFile}`))
        }
        return
      }

      const values = answer.customInput && answer.values.length === 0
        ? [answer.customInput]
        : answer.values

      await engine.processAnswer(
        session.id,
        questionDisplay.question.id,
        values,
        answer.customInput,
      )

      questionDisplay = await engine.getNextQuestion(session.id)
    }

    // Generate spec
    console.log('')
    console.log(ansis.green('  Generating specification...'))

    const specGenerator = createSpecGenerator(lang)
    const spec = await specGenerator.generateSpec(session)

    await specGenerator.writeSpecToFile(spec, session.specFile)

    displayCompletionSummary(session, session.specFile)

    // Clean up session file
    const { unlink } = await import('node:fs/promises')
    await unlink(targetSessionFile).catch(() => {})
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Quick interview - start immediately with minimal setup
 */
export async function quickInterview(specFile?: string, options: InterviewOptions = {}): Promise<void> {
  await interview({
    ...options,
    template: 'quick',
    depth: 'quick',
    specFile: specFile || options.specFile || 'SPEC.md',
  })
}

/**
 * Deep interview - comprehensive exploration
 */
export async function deepInterview(specFile?: string, options: InterviewOptions = {}): Promise<void> {
  await interview({
    ...options,
    template: 'saas',
    depth: 'deep',
    specFile: specFile || options.specFile || 'SPEC.md',
  })
}

/**
 * List all saved interview sessions
 */
export async function listInterviewSessions(): Promise<void> {
  const { readdir, stat } = await import('node:fs/promises')
  const { homedir } = await import('node:os')

  console.log('')
  console.log(ansis.green.bold('  Saved Interview Sessions:'))
  console.log('')

  // Search for session files in common locations
  const searchDirs = [
    process.cwd(),
    join(homedir(), '.ccjk', 'sessions'),
  ]

  let foundAny = false

  for (const dir of searchDirs) {
    try {
      const files = await readdir(dir)
      const sessionFiles = files.filter(f => f.endsWith('.session.json'))

      for (const file of sessionFiles) {
        const filePath = join(dir, file)
        const fileStats = await stat(filePath)
        const modified = fileStats.mtime.toLocaleString()

        console.log(`  ${ansis.green('•')} ${ansis.white(file)}`)
        console.log(`    ${ansis.gray('Path:')} ${filePath}`)
        console.log(`    ${ansis.gray('Modified:')} ${modified}`)
        console.log('')
        foundAny = true
      }
    }
    catch {
      // Directory doesn't exist or can't be read
    }
  }

  if (!foundAny) {
    console.log(ansis.gray('  No saved sessions found.'))
    console.log('')
    console.log(ansis.gray('  Start a new interview with: ccjk interview'))
  }

  console.log('')
}
