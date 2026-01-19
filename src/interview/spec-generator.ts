import type { SupportedLang } from '../constants'
import type {
  GeneratedSpec,
  InterviewAnswer,
  InterviewCategoryId,
  InterviewSession,
  SpecDecision,
  SpecEdgeCase,
  SpecOpenQuestion,
} from './types'
import { writeFile } from 'node:fs/promises'
import { getCategoryById, getQuestionsByCategory } from './question-categories'

/**
 * Spec Generator - Converts interview answers into comprehensive specifications
 */
export class SpecGenerator {
  private language: SupportedLang = 'en'

  constructor(language: SupportedLang = 'en') {
    this.language = language
  }

  /**
   * Generate spec from completed interview session
   */
  async generateSpec(session: InterviewSession): Promise<GeneratedSpec> {
    const answersByCategory = this.groupAnswersByCategory(session.answers)

    const spec: GeneratedSpec = {
      title: this.extractTitle(session),
      generatedAt: new Date(),
      sessionId: session.id,
      questionCount: session.questionsAsked,
      depth: session.depth,

      overview: this.generateOverview(answersByCategory),
      technical: this.generateTechnical(answersByCategory),
      uiux: this.generateUIUX(answersByCategory),
      security: this.generateSecurity(answersByCategory),
      business: this.generateBusiness(answersByCategory),

      decisions: this.extractDecisions(session.answers),
      edgeCases: this.identifyEdgeCases(session.answers),
      openQuestions: this.identifyOpenQuestions(session),

      rawAnswers: session.answers,
    }

    return spec
  }

  /**
   * Write spec to file
   */
  async writeSpecToFile(spec: GeneratedSpec, filePath: string): Promise<void> {
    const markdown = this.formatSpecAsMarkdown(spec)
    await writeFile(filePath, markdown, 'utf-8')
  }

  /**
   * Group answers by category
   */
  private groupAnswersByCategory(
    answers: InterviewAnswer[],
  ): Map<InterviewCategoryId, InterviewAnswer[]> {
    const grouped = new Map<InterviewCategoryId, InterviewAnswer[]>()

    for (const answer of answers) {
      const existing = grouped.get(answer.categoryId) ?? []
      existing.push(answer)
      grouped.set(answer.categoryId, existing)
    }

    return grouped
  }

  /**
   * Extract title from session context or answers
   */
  private extractTitle(session: InterviewSession): string {
    if (session.context) {
      // Try to extract a title from context
      const match = session.context.match(/(?:build|create|implement)\s+(?:a\s+)?(\w+(?:\s+\w+)*)/i)
      if (match) {
        return match[1].trim()
      }
      return session.context.slice(0, 50)
    }

    // Use spec file name
    const fileName = session.specFile.replace(/\.md$/i, '').replace(/[-_]/g, ' ')
    return fileName.charAt(0).toUpperCase() + fileName.slice(1)
  }

  /**
   * Generate overview section
   */
  private generateOverview(
    answersByCategory: Map<InterviewCategoryId, InterviewAnswer[]>,
  ): GeneratedSpec['overview'] {
    const foundationAnswers = answersByCategory.get('project-foundation') ?? []
    const audienceAnswers = answersByCategory.get('target-audience') ?? []
    const featureAnswers = answersByCategory.get('features-scope') ?? []

    return {
      projectType: this.getAnswerValue(foundationAnswers, 'app-purpose') ?? 'Not specified',
      targetAudience: this.getAnswerValue(audienceAnswers, 'customer-segment') ?? 'Not specified',
      mvpScope: this.getAnswerValues(featureAnswers, 'mvp-features'),
      platforms: this.getAnswerValues(foundationAnswers, 'target-platform'),
    }
  }

  /**
   * Generate technical section
   */
  private generateTechnical(
    answersByCategory: Map<InterviewCategoryId, InterviewAnswer[]>,
  ): GeneratedSpec['technical'] {
    const techAnswers = answersByCategory.get('technical-implementation') ?? []
    const featureAnswers = answersByCategory.get('features-scope') ?? []

    return {
      architecture: this.getAnswerValue(techAnswers, 'api-design') ?? 'Not specified',
      database: this.getAnswerValue(techAnswers, 'primary-database') ?? 'Not specified',
      authentication: this.getAnswerValue(techAnswers, 'auth-strategy') ?? 'Not specified',
      stateManagement: this.getAnswerValue(techAnswers, 'state-management') ?? 'Not specified',
      integrations: this.getAnswerValues(featureAnswers, 'third-party-integrations'),
      apiDesign: this.getAnswerValue(techAnswers, 'api-design'),
    }
  }

  /**
   * Generate UI/UX section
   */
  private generateUIUX(
    answersByCategory: Map<InterviewCategoryId, InterviewAnswer[]>,
  ): GeneratedSpec['uiux'] {
    const uiuxAnswers = answersByCategory.get('ui-ux') ?? []
    const foundationAnswers = answersByCategory.get('project-foundation') ?? []

    return {
      platforms: this.getAnswerValues(foundationAnswers, 'target-platform'),
      designSystem: this.getAnswerValue(uiuxAnswers, 'design-system') ?? 'Not specified',
      accessibility: this.getAnswerValue(uiuxAnswers, 'accessibility-level') ?? 'Basic',
      responsiveDesign: this.getAnswerValues(foundationAnswers, 'target-platform').includes('web')
        ? 'Required'
        : 'Platform-specific',
      keyFlows: [], // Will be populated from user flows if asked
    }
  }

  /**
   * Generate security section
   */
  private generateSecurity(
    answersByCategory: Map<InterviewCategoryId, InterviewAnswer[]>,
  ): GeneratedSpec['security'] {
    const concernAnswers = answersByCategory.get('concerns') ?? []
    const complianceAnswers = answersByCategory.get('security-compliance') ?? []

    return {
      requirements: this.getAnswerValues(concernAnswers, 'security-requirements'),
      compliance: this.getAnswerValues(complianceAnswers, 'data-privacy'),
      dataPrivacy: [
        this.getAnswerValue(complianceAnswers, 'data-retention') ?? 'Standard',
      ],
    }
  }

  /**
   * Generate business logic section
   */
  private generateBusiness(
    answersByCategory: Map<InterviewCategoryId, InterviewAnswer[]>,
  ): GeneratedSpec['business'] {
    const businessAnswers = answersByCategory.get('business-logic') ?? []

    return {
      validationRules: [
        this.getAnswerValue(businessAnswers, 'validation-approach') ?? 'Progressive',
      ],
      workflowStates: this.getAnswerValues(businessAnswers, 'workflow-states'),
      constraints: [],
    }
  }

  /**
   * Extract decisions from answers
   */
  private extractDecisions(answers: InterviewAnswer[]): SpecDecision[] {
    const decisions: SpecDecision[] = []

    for (const answer of answers) {
      const questions = getQuestionsByCategory(answer.categoryId)
      const question = questions.find(q => q.id === answer.questionId)

      if (question && answer.values.length > 0) {
        const category = getCategoryById(answer.categoryId)

        // Find selected option descriptions
        const selectedOptions = question.options.filter(opt =>
          answer.values.includes(opt.value ?? opt.label[this.language]),
        )

        const rationale = selectedOptions
          .map(opt => opt.description[this.language])
          .join('; ')

        decisions.push({
          decision: `${question.header[this.language]}: ${answer.values.join(', ')}`,
          rationale: rationale || 'User preference',
          relatedQuestions: [answer.questionId],
          category: category?.name[this.language] ?? answer.categoryId,
        })
      }
    }

    return decisions
  }

  /**
   * Identify potential edge cases based on answers
   */
  private identifyEdgeCases(answers: InterviewAnswer[]): SpecEdgeCase[] {
    const edgeCases: SpecEdgeCase[] = []

    // Check for global audience -> i18n edge cases
    const geoAnswer = answers.find(a => a.questionId === 'geographic-focus')
    if (geoAnswer?.values.includes('global')) {
      edgeCases.push({
        description: 'Multi-language and localization support needed',
        handling: 'Implement i18n framework, RTL support, date/number formatting',
        severity: 'high',
        relatedQuestions: ['geographic-focus'],
      })
    }

    // Check for real-time features -> connection handling
    const mvpAnswer = answers.find(a => a.questionId === 'mvp-features')
    if (mvpAnswer?.values.includes('realtime')) {
      edgeCases.push({
        description: 'WebSocket connection handling edge cases',
        handling: 'Implement reconnection logic, offline queue, connection state management',
        severity: 'high',
        relatedQuestions: ['mvp-features'],
      })
    }

    // Check for enterprise customers -> compliance edge cases
    const customerAnswer = answers.find(a => a.questionId === 'customer-segment')
    if (customerAnswer?.values.includes('enterprise')) {
      edgeCases.push({
        description: 'Enterprise SSO and SAML integration',
        handling: 'Plan for custom identity provider integration, session management',
        severity: 'medium',
        relatedQuestions: ['customer-segment', 'auth-strategy'],
      })
    }

    // Check for payment integration -> failure handling
    const integrationAnswer = answers.find(a => a.questionId === 'third-party-integrations')
    if (integrationAnswer?.values.includes('stripe')) {
      edgeCases.push({
        description: 'Payment failure and retry handling',
        handling: 'Implement webhook handlers, failed payment recovery flow, dunning management',
        severity: 'high',
        relatedQuestions: ['third-party-integrations', 'mvp-features'],
      })
    }

    // Check for large user volume -> scaling edge cases
    const volumeAnswer = answers.find(a => a.questionId === 'user-volume')
    if (volumeAnswer?.values.includes('large') || volumeAnswer?.values.includes('massive')) {
      edgeCases.push({
        description: 'Database scaling and caching strategy',
        handling: 'Implement read replicas, caching layer, query optimization',
        severity: 'high',
        relatedQuestions: ['user-volume', 'primary-database'],
      })
    }

    return edgeCases
  }

  /**
   * Identify open questions for future consideration
   */
  private identifyOpenQuestions(session: InterviewSession): SpecOpenQuestion[] {
    const openQuestions: SpecOpenQuestion[] = []

    // Check for missing critical answers
    const criticalQuestions = ['auth-strategy', 'primary-database', 'mvp-features']
    const answeredQuestions = new Set(session.answers.map(a => a.questionId))

    for (const qId of criticalQuestions) {
      if (!answeredQuestions.has(qId)) {
        openQuestions.push({
          question: `${qId} was not determined during interview`,
          reason: 'Critical decision needs to be made',
          suggestedApproach: 'Conduct follow-up discussion',
          priority: 'high',
        })
      }
    }

    // Add standard open questions based on project type
    const projectType = session.answers.find(a => a.questionId === 'app-purpose')?.values[0]
    if (projectType === 'saas') {
      openQuestions.push({
        question: 'How will pricing tiers be structured?',
        reason: 'Pricing strategy affects feature gating implementation',
        suggestedApproach: 'Define feature matrix and usage limits per tier',
        priority: 'medium',
      })
    }

    // Add testing strategy as open question
    openQuestions.push({
      question: 'What testing strategy will be used?',
      reason: 'Testing approach affects CI/CD setup and development workflow',
      suggestedApproach: 'Define unit test, integration test, and E2E test coverage targets',
      priority: 'medium',
    })

    return openQuestions
  }

  /**
   * Get single answer value
   */
  private getAnswerValue(answers: InterviewAnswer[], questionId: string): string | undefined {
    const answer = answers.find(a => a.questionId === questionId)
    return answer?.values[0] ?? answer?.customInput
  }

  /**
   * Get multiple answer values
   */
  private getAnswerValues(answers: InterviewAnswer[], questionId: string): string[] {
    const answer = answers.find(a => a.questionId === questionId)
    if (!answer) {
      return []
    }
    const values = [...answer.values]
    if (answer.customInput) {
      values.push(answer.customInput)
    }
    return values
  }

  /**
   * Format spec as Markdown
   */
  formatSpecAsMarkdown(spec: GeneratedSpec): string {
    const lines: string[] = []

    // Header
    lines.push(`# Feature Specification: ${spec.title}`)
    lines.push('')
    lines.push(`Generated: ${spec.generatedAt.toISOString()}`)
    lines.push(`Interview Questions: ${spec.questionCount}`)
    lines.push(`Interview Depth: ${spec.depth}`)
    lines.push('')

    // Overview
    lines.push('## Overview')
    lines.push('')
    lines.push(`- **Project Type**: ${spec.overview.projectType}`)
    lines.push(`- **Target Audience**: ${spec.overview.targetAudience}`)
    lines.push(`- **Platforms**: ${spec.overview.platforms.join(', ') || 'Not specified'}`)
    lines.push(`- **MVP Scope**: ${spec.overview.mvpScope.join(', ') || 'Not specified'}`)
    lines.push('')

    // Technical Architecture
    lines.push('## Technical Architecture')
    lines.push('')
    lines.push(`- **Architecture**: ${spec.technical.architecture}`)
    lines.push(`- **Database**: ${spec.technical.database}`)
    lines.push(`- **Authentication**: ${spec.technical.authentication}`)
    lines.push(`- **State Management**: ${spec.technical.stateManagement}`)
    lines.push(`- **Integrations**: ${spec.technical.integrations.join(', ') || 'None'}`)
    lines.push('')

    // UI/UX Requirements
    lines.push('## UI/UX Requirements')
    lines.push('')
    lines.push(`- **Platforms**: ${spec.uiux.platforms.join(', ') || 'Web'}`)
    lines.push(`- **Design System**: ${spec.uiux.designSystem}`)
    lines.push(`- **Accessibility**: ${spec.uiux.accessibility}`)
    lines.push(`- **Responsive Design**: ${spec.uiux.responsiveDesign}`)
    lines.push('')

    // Security & Compliance
    lines.push('## Security & Compliance')
    lines.push('')
    lines.push(`- **Requirements**: ${spec.security.requirements.join(', ') || 'Standard'}`)
    lines.push(`- **Compliance**: ${spec.security.compliance.join(', ') || 'None specific'}`)
    lines.push(`- **Data Privacy**: ${spec.security.dataPrivacy.join(', ') || 'Standard'}`)
    lines.push('')

    // Business Logic
    if (spec.business.validationRules.length > 0 || spec.business.workflowStates.length > 0) {
      lines.push('## Business Logic')
      lines.push('')
      if (spec.business.validationRules.length > 0) {
        lines.push(`- **Validation**: ${spec.business.validationRules.join(', ')}`)
      }
      if (spec.business.workflowStates.length > 0) {
        lines.push(`- **Workflow States**: ${spec.business.workflowStates.join(', ')}`)
      }
      lines.push('')
    }

    // Decisions Made
    lines.push('## Decisions Made')
    lines.push('')
    if (spec.decisions.length > 0) {
      spec.decisions.forEach((decision, index) => {
        lines.push(`${index + 1}. **${decision.decision}**`)
        lines.push(`   - Rationale: ${decision.rationale}`)
        lines.push(`   - Category: ${decision.category}`)
        lines.push('')
      })
    }
    else {
      lines.push('No explicit decisions recorded.')
      lines.push('')
    }

    // Edge Cases Identified
    lines.push('## Edge Cases Identified')
    lines.push('')
    if (spec.edgeCases.length > 0) {
      spec.edgeCases.forEach((edgeCase, index) => {
        lines.push(`${index + 1}. **${edgeCase.description}** (${edgeCase.severity})`)
        lines.push(`   - Handling: ${edgeCase.handling}`)
        lines.push('')
      })
    }
    else {
      lines.push('No edge cases identified during interview.')
      lines.push('')
    }

    // Open Questions
    lines.push('## Open Questions')
    lines.push('')
    if (spec.openQuestions.length > 0) {
      spec.openQuestions.forEach((question, index) => {
        lines.push(`${index + 1}. **${question.question}** (${question.priority})`)
        lines.push(`   - Reason: ${question.reason}`)
        if (question.suggestedApproach) {
          lines.push(`   - Suggested: ${question.suggestedApproach}`)
        }
        lines.push('')
      })
    }
    else {
      lines.push('No open questions remaining.')
      lines.push('')
    }

    // Footer
    lines.push('---')
    lines.push('')
    lines.push(`*Generated by CCJK Interview-Driven Development*`)
    lines.push(`*Session ID: ${spec.sessionId}*`)

    return lines.join('\n')
  }

  /**
   * Set language
   */
  setLanguage(language: SupportedLang): void {
    this.language = language
  }
}

/**
 * Create a new spec generator instance
 */
export function createSpecGenerator(language: SupportedLang = 'en'): SpecGenerator {
  return new SpecGenerator(language)
}
