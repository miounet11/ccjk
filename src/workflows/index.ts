/**
 * CCJK Workflows Module Exports
 *
 * Central export point for workflow orchestration functionality.
 *
 * @module workflows/index
 */

// Workflow Executor
export {
  createExecutor,
  executeWorkflow,
  executeWorkflowTemplate,
  getGlobalExecutor,
  WorkflowExecutor,
} from './executor.js'

export type {
  WorkflowContext,
  WorkflowExecutionOptions,
  WorkflowExecutionSummary,
} from './executor.js'

// Workflow Templates
export {
  bugFixTemplate,
  codeReviewTemplate,
  documentationTemplate,
  featureDevelopmentTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplate,
  getWorkflowTemplateIds,
  getWorkflowTemplatesByCategory,
  refactoringTemplate,
  searchWorkflowTemplates,
  workflowTemplates,
} from './templates.js'

export type {
  WorkflowTemplate,
  WorkflowTemplateId,
} from './templates.js'
