import { ensureI18nInitialized, i18n } from '../i18n'

export interface CodexWorkflowConfigBase {
  id: string
  order: number
  defaultSelected: boolean
  category: string
  type: 'single' | 'group'
  files: string[]
}

export const CODEX_WORKFLOW_GROUP_PREFIX = '::codexWorkflowGroup:'

/**
 * Codex prompts — aligned with OpenAI Codex best practices:
 * plan → implement → test → review → ship (git)
 */
export const CODEX_WORKFLOW_CONFIG_BASE: CodexWorkflowConfigBase[] = [
  {
    id: 'commonTools',
    order: 1,
    defaultSelected: true,
    category: 'essential',
    type: 'group',
    files: ['init-project.md', 'agents/init-architect.md', 'agents/get-current-datetime.md'],
  },
  {
    id: 'featPlanUx',
    order: 2,
    defaultSelected: true,
    category: 'essential',
    type: 'group',
    files: ['feat.md', 'agents/planner.md', 'agents/ui-ux-designer.md'],
  },
  {
    id: 'sixStepsWorkflow',
    order: 3,
    defaultSelected: true,
    category: 'sixStep',
    type: 'single',
    files: ['workflow.md'],
  },
  {
    id: 'specFirstTDD',
    order: 4,
    defaultSelected: true,
    category: 'specFirstTDD',
    type: 'single',
    files: ['spec-first-tdd.md'],
  },
  {
    id: 'codeReview',
    order: 5,
    defaultSelected: true,
    category: 'codeReview',
    type: 'single',
    files: ['code-review.md'],
  },
  {
    id: 'refactoringMaster',
    order: 6,
    defaultSelected: false,
    category: 'refactoringMaster',
    type: 'single',
    files: ['refactoring-master.md'],
  },
  {
    id: 'gitWorkflow',
    order: 7,
    defaultSelected: true,
    category: 'git',
    type: 'group',
    files: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
  },
  {
    id: 'continuousDelivery',
    order: 8,
    defaultSelected: false,
    category: 'continuousDelivery',
    type: 'single',
    files: ['continuous-delivery.md'],
  },
  {
    id: 'bmadWorkflow',
    order: 9,
    defaultSelected: false,
    category: 'bmad',
    type: 'single',
    files: ['bmad-init.md'],
  },
]

export interface CodexWorkflowOption {
  id: string
  name: string
  path: string
  defaultSelected: boolean
}

export function getCodexWorkflowGroupSentinel(workflowId: string): string {
  return `${CODEX_WORKFLOW_GROUP_PREFIX}${workflowId}`
}

export function isCodexWorkflowGroupSentinel(path: string): boolean {
  return path.startsWith(CODEX_WORKFLOW_GROUP_PREFIX)
}

export function getCodexWorkflowIdFromSentinel(path: string): string | undefined {
  if (!isCodexWorkflowGroupSentinel(path))
    return undefined
  return path.slice(CODEX_WORKFLOW_GROUP_PREFIX.length)
}

export function getCodexWorkflowOptions(): Array<{
  id: string
  order: number
  defaultSelected: boolean
  name: string
}> {
  ensureI18nInitialized()

  return CODEX_WORKFLOW_CONFIG_BASE
    .map(config => ({
      id: config.id,
      order: config.order,
      defaultSelected: config.defaultSelected,
      name: i18n.t(`workflow:workflowOption.${config.id}`),
    }))
    .sort((a, b) => a.order - b.order)
}