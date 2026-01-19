import type { SupportedLang } from '../constants'
import type {
  CategoryProgress,
  InterviewAnswer,
  InterviewCategoryId,
  InterviewDepth,
  InterviewOptions,
  InterviewQuestion,
  InterviewResult,
  InterviewSession,
  QuestionDisplay,
} from './types'
import { randomUUID } from 'node:crypto'
import {
  calculateQuestionCount,
  getCategoryById,
  getQuestionsByCategory,
  INTERVIEW_CATEGORIES,
} from './question-categories'

/**
 * Default interview options
 */
const DEFAULT_OPTIONS: InterviewOptions = {
  depth: 'standard',
  categories: [],
  skipObvious: true,
  outputFile: 'SPEC.md',
  language: 'en',
}

/**
 * Interview Engine - Manages interview sessions and question flow
 */
export class InterviewEngine {
  private sessions: Map<string, InterviewSession> = new Map()
  private language: SupportedLang = 'en'

  constructor(language: SupportedLang = 'en') {
    this.language = language
  }

  /**
   * Start a new interview session
   */
  async startInterview(
    specFile: string,
    options: Partial<InterviewOptions> = {},
  ): Promise<InterviewSession> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
    const sessionId = randomUUID()

    // Determine categories to include
    let categories = mergedOptions.categories
    if (categories.length === 0) {
      // Use all categories based on depth
      categories = this.getCategoriesForDepth(mergedOptions.depth)
    }

    // Calculate question count
    const totalQuestions = calculateQuestionCount(categories)

    // Initialize progress for each category
    const progress: CategoryProgress[] = categories.map((catId, index) => {
      const category = getCategoryById(catId)
      return {
        categoryId: catId,
        name: category?.name[this.language] ?? catId,
        answered: 0,
        total: category?.questions.length ?? 0,
        percentage: 0,
        isComplete: false,
        isCurrent: index === 0,
      }
    })

    const session: InterviewSession = {
      id: sessionId,
      specFile,
      depth: mergedOptions.depth,
      currentCategory: categories[0],
      currentQuestionIndex: 0,
      questionsAsked: 0,
      questionsRemaining: totalQuestions,
      answers: [],
      progress,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'in_progress',
      includedCategories: categories,
      context: mergedOptions.context,
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * Get categories based on depth level
   */
  private getCategoriesForDepth(depth: InterviewDepth): InterviewCategoryId[] {
    switch (depth) {
      case 'quick':
        return ['project-foundation', 'technical-implementation', 'tradeoffs']
      case 'standard':
        return [
          'project-foundation',
          'target-audience',
          'technical-implementation',
          'features-scope',
          'ui-ux',
          'concerns',
          'tradeoffs',
        ]
      case 'deep':
        return INTERVIEW_CATEGORIES.map(c => c.id)
    }
  }

  /**
   * Get the next question to ask
   */
  async getNextQuestion(sessionId: string): Promise<QuestionDisplay | null> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'in_progress') {
      return null
    }

    // Get current category questions
    const categoryQuestions = getQuestionsByCategory(session.currentCategory)

    // Find next unanswered question
    while (session.currentQuestionIndex < categoryQuestions.length) {
      const question = categoryQuestions[session.currentQuestionIndex]

      // Check if this question should be skipped (conditional logic)
      if (this.shouldSkipQuestion(session, question)) {
        session.currentQuestionIndex++
        continue
      }

      // Format for display
      return this.formatQuestionForDisplay(session, question)
    }

    // Move to next category
    const currentCatIndex = session.includedCategories.indexOf(session.currentCategory)
    if (currentCatIndex < session.includedCategories.length - 1) {
      // Update progress
      this.updateCategoryProgress(session, session.currentCategory, true)

      // Move to next category
      session.currentCategory = session.includedCategories[currentCatIndex + 1]
      session.currentQuestionIndex = 0

      // Mark new category as current
      session.progress.forEach((p) => {
        p.isCurrent = p.categoryId === session.currentCategory
      })

      return this.getNextQuestion(sessionId)
    }

    // Interview complete
    session.status = 'completed'
    this.updateCategoryProgress(session, session.currentCategory, true)
    return null
  }

  /**
   * Check if a question should be skipped based on conditional logic
   */
  private shouldSkipQuestion(session: InterviewSession, question: InterviewQuestion): boolean {
    if (!question.conditional) {
      return false
    }

    const { dependsOn, whenValues, action } = question.conditional
    const dependentAnswer = session.answers.find(a => a.questionId === dependsOn)

    if (!dependentAnswer) {
      // If dependent question not answered, skip conditional questions
      return action === 'show'
    }

    const hasMatchingValue = dependentAnswer.values.some(v => whenValues.includes(v))

    if (action === 'show') {
      // Only show if condition matches
      return !hasMatchingValue
    }
    else {
      // Skip if condition matches
      return hasMatchingValue
    }
  }

  /**
   * Format a question for display
   */
  private formatQuestionForDisplay(
    session: InterviewSession,
    question: InterviewQuestion,
  ): QuestionDisplay {
    const estimatedTotal = this.getEstimatedTotal(session)

    return {
      question,
      progressText: this.formatProgressText(session),
      categoryBreadcrumb: this.formatCategoryBreadcrumb(session),
      questionNumber: session.questionsAsked + 1,
      estimatedTotal,
      options: question.options.map(opt => ({
        label: opt.label[this.language],
        description: opt.description[this.language],
        value: opt.value ?? opt.label[this.language],
        isRecommended: opt.recommended ?? false,
      })),
    }
  }

  /**
   * Format progress text
   */
  private formatProgressText(session: InterviewSession): string {
    const estimatedTotal = this.getEstimatedTotal(session)
    return `Question ${session.questionsAsked + 1} of ~${estimatedTotal}`
  }

  /**
   * Format category breadcrumb
   */
  private formatCategoryBreadcrumb(session: InterviewSession): string {
    return session.progress
      .map((p) => {
        if (p.isComplete) {
          return `[X] ${p.name}`
        }
        if (p.isCurrent) {
          return `[>] ${p.name}`
        }
        return `[ ] ${p.name}`
      })
      .join(' -> ')
  }

  /**
   * Get estimated total questions
   */
  private getEstimatedTotal(session: InterviewSession): number {
    switch (session.depth) {
      case 'quick':
        return 10
      case 'standard':
        return 25
      case 'deep':
        return 40
    }
  }

  /**
   * Process user's answer to a question
   */
  async processAnswer(
    sessionId: string,
    questionId: string,
    values: string[],
    customInput?: string,
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'in_progress') {
      return false
    }

    // Find the question
    const categoryQuestions = getQuestionsByCategory(session.currentCategory)
    const question = categoryQuestions.find(q => q.id === questionId)

    if (!question) {
      return false
    }

    // Store the answer
    const answer: InterviewAnswer = {
      questionId,
      categoryId: session.currentCategory,
      values,
      customInput,
      answeredAt: new Date(),
    }

    session.answers.push(answer)
    session.questionsAsked++
    session.questionsRemaining--
    session.currentQuestionIndex++
    session.lastActivityAt = new Date()

    // Update category progress
    this.updateCategoryProgress(session, session.currentCategory, false)

    return true
  }

  /**
   * Update category progress
   */
  private updateCategoryProgress(
    session: InterviewSession,
    categoryId: InterviewCategoryId,
    isComplete: boolean,
  ): void {
    const progressItem = session.progress.find(p => p.categoryId === categoryId)
    if (progressItem) {
      const categoryAnswers = session.answers.filter(a => a.categoryId === categoryId)
      progressItem.answered = categoryAnswers.length
      progressItem.percentage = Math.round((progressItem.answered / progressItem.total) * 100)
      progressItem.isComplete = isComplete || progressItem.answered >= progressItem.total
    }
  }

  /**
   * Pause an interview session
   */
  async pauseInterview(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'in_progress') {
      return false
    }

    session.status = 'paused'
    session.lastActivityAt = new Date()
    return true
  }

  /**
   * Resume a paused interview session
   */
  async resumeInterview(sessionId: string): Promise<InterviewSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'paused') {
      return null
    }

    session.status = 'in_progress'
    session.lastActivityAt = new Date()
    return session
  }

  /**
   * Cancel an interview session
   */
  async cancelInterview(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.status = 'cancelled'
    session.lastActivityAt = new Date()
    return true
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): InterviewSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === 'in_progress' || s.status === 'paused',
    )
  }

  /**
   * Check if interview is complete
   */
  isComplete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    return session?.status === 'completed'
  }

  /**
   * Get interview result
   */
  async getResult(sessionId: string): Promise<InterviewResult> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        session: null as any,
        error: 'Session not found',
      }
    }

    if (session.status !== 'completed') {
      return {
        success: false,
        session,
        error: `Interview not complete. Status: ${session.status}`,
      }
    }

    return {
      success: true,
      session,
    }
  }

  /**
   * Get answers grouped by category
   */
  getAnswersByCategory(sessionId: string): Map<InterviewCategoryId, InterviewAnswer[]> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return new Map()
    }

    const grouped = new Map<InterviewCategoryId, InterviewAnswer[]>()

    for (const answer of session.answers) {
      const existing = grouped.get(answer.categoryId) ?? []
      existing.push(answer)
      grouped.set(answer.categoryId, existing)
    }

    return grouped
  }

  /**
   * Get answer for a specific question
   */
  getAnswerForQuestion(sessionId: string, questionId: string): InterviewAnswer | undefined {
    const session = this.sessions.get(sessionId)
    return session?.answers.find(a => a.questionId === questionId)
  }

  /**
   * Get interview statistics
   */
  getStats(sessionId: string): {
    answered: number
    remaining: number
    percentage: number
    duration: number
  } | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const duration = Math.round(
      (session.lastActivityAt.getTime() - session.startedAt.getTime()) / 1000,
    )

    const total = session.questionsAsked + session.questionsRemaining
    const percentage = Math.round((session.questionsAsked / total) * 100)

    return {
      answered: session.questionsAsked,
      remaining: session.questionsRemaining,
      percentage,
      duration,
    }
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    return JSON.stringify(session, null, 2)
  }

  /**
   * Import session from JSON
   */
  importSession(json: string): InterviewSession | null {
    try {
      const session = JSON.parse(json) as InterviewSession

      // Restore dates
      session.startedAt = new Date(session.startedAt)
      session.lastActivityAt = new Date(session.lastActivityAt)
      session.answers.forEach((a) => {
        a.answeredAt = new Date(a.answeredAt)
      })

      this.sessions.set(session.id, session)
      return session
    }
    catch {
      return null
    }
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear()
  }

  /**
   * Set language for the engine
   */
  setLanguage(language: SupportedLang): void {
    this.language = language
  }

  /**
   * Get current language
   */
  getLanguage(): SupportedLang {
    return this.language
  }
}

/**
 * Create a new interview engine instance
 */
export function createInterviewEngine(language: SupportedLang = 'en'): InterviewEngine {
  return new InterviewEngine(language)
}

/**
 * Global interview engine instance
 */
let globalEngine: InterviewEngine | null = null

/**
 * Get or create the global interview engine
 */
export function getInterviewEngine(language: SupportedLang = 'en'): InterviewEngine {
  if (!globalEngine) {
    globalEngine = new InterviewEngine(language)
  }
  else if (globalEngine.getLanguage() !== language) {
    globalEngine.setLanguage(language)
  }
  return globalEngine
}
