/**
 * CCJK Workflows Command
 *
 * Quick alias for workflow management commands.
 * Delegates to subagent-workflow for full functionality.
 *
 * @module commands/workflows
 */

import type { SupportedLang } from '../constants.js'
import type { SubagentWorkflowOptions } from './subagent-workflow.js'
import {
  controlWorkflow,
  createNewWorkflow,
  listAllWorkflows as listWorkflowsImpl,
  showWorkflowDetails,

} from './subagent-workflow.js'

export interface WorkflowsOptions {
  lang?: SupportedLang
  format?: 'table' | 'json' | 'minimal'
}

/**
 * List all workflows (quick alias)
 */
export async function listWorkflowsQuick(options: WorkflowsOptions = {}): Promise<void> {
  const opts: SubagentWorkflowOptions = {
    lang: options.lang,
    format: options.format,
  }
  await listWorkflowsImpl(opts)
}

/**
 * Show workflow status (quick alias)
 */
export async function showWorkflowStatus(
  workflowId: string,
  options: WorkflowsOptions = {},
): Promise<void> {
  await showWorkflowDetails({
    lang: options.lang,
    workflowId,
    format: options.format,
  })
}

/**
 * Create a new workflow
 */
export async function createWorkflow(options: WorkflowsOptions = {}): Promise<string | null> {
  return createNewWorkflow({
    lang: options.lang,
    format: options.format,
  })
}

/**
 * Control workflow (pause/resume/cancel)
 */
export async function controlWorkflowAction(
  _action: 'pause' | 'resume' | 'cancel',
  _workflowId: string,
  _options: WorkflowsOptions = {},
): Promise<void> {
  // controlWorkflow uses interactive prompts, so we just call it directly
  await controlWorkflow()
}

/**
 * Run workflows command
 */
export async function runWorkflowsCommand(
  action: 'list' | 'status' | 'create' | 'pause' | 'resume',
  options: WorkflowsOptions & { workflowId?: string } = {},
): Promise<void> {
  switch (action) {
    case 'list':
      await listWorkflowsQuick(options)
      break
    case 'status':
      if (options.workflowId) {
        await showWorkflowStatus(options.workflowId, options)
      }
      break
    case 'create':
      await createWorkflow(options)
      break
    case 'pause':
    case 'resume':
      if (options.workflowId) {
        await controlWorkflowAction(action, options.workflowId, options)
      }
      break
  }
}
