/**
 * Interview-Driven Development (IDD) System
 *
 * Based on the viral workflow by Thariq (@trq212) from Anthropic's Claude Code team
 * Core Principle: "Interview first. Spec second. Code last."
 *
 * This module provides:
 * - Interview engine for managing interview sessions
 * - Question categories with predefined questions
 * - Spec generator for creating comprehensive specifications
 * - Type definitions for the entire interview system
 */

// Type exports
export type {
  CategoryProgress,
  ConditionalLogic,
  GeneratedSpec,
  InterviewAnswer,
  InterviewCategory,
  InterviewCategoryId,
  InterviewDepth,
  InterviewOptions,
  InterviewQuestion,
  InterviewResult,
  InterviewSession,
  InterviewStats,
  InterviewStatus,
  InterviewStorage,
  InterviewTemplate,
  LocalizedQuestionOption,
  QuestionDisplay,
  QuestionOption,
  SpecDecision,
  SpecEdgeCase,
  SpecOpenQuestion,
  SpecSection,
} from './types'

// Question categories
export {
  calculateQuestionCount,
  getCategoryById,
  getQuestionsByCategory,
  getQuestionsForDepth,
  getTemplateById,
  INTERVIEW_CATEGORIES,
  INTERVIEW_TEMPLATES,
} from './question-categories'

// Interview engine
export {
  createInterviewEngine,
  getInterviewEngine,
  InterviewEngine,
} from './engine'

// Spec generator
export {
  createSpecGenerator,
  SpecGenerator,
} from './spec-generator'
