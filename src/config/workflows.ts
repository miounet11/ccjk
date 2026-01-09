import type { WorkflowConfig } from '../types/workflow'
import { ensureI18nInitialized, i18n } from '../i18n'

// Pure business configuration without any i18n text
export interface WorkflowConfigBase {
  id: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: Array<{ id: string, filename: string, required: boolean }>
  autoInstallAgents: boolean
  category: 'essential' | 'sixStep' | 'git' | 'interview'
  outputDir: string
}

export const WORKFLOW_CONFIG_BASE: WorkflowConfigBase[] = [
  {
    id: 'interviewWorkflow',
    defaultSelected: true,
    order: 1,
    commands: ['interview.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'interview',
    outputDir: 'interview',
  },
  {
    id: 'essentialTools',
    defaultSelected: true,
    order: 2,
    commands: ['init-project.md', 'feat.md'],
    agents: [
      { id: 'init-architect', filename: 'init-architect.md', required: true },
      { id: 'get-current-datetime', filename: 'get-current-datetime.md', required: true },
      { id: 'planner', filename: 'planner.md', required: true },
      { id: 'ui-ux-designer', filename: 'ui-ux-designer.md', required: true },
    ],
    autoInstallAgents: true,
    category: 'essential',
    outputDir: 'essential',
  },
  {
    id: 'gitWorkflow',
    defaultSelected: true,
    order: 3,
    commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'git',
    outputDir: 'git',
  },
  {
    id: 'sixStepsWorkflow',
    defaultSelected: false,
    order: 4,
    commands: ['workflow.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'sixStep',
    outputDir: 'workflow',
  },
]

export function getWorkflowConfigs(): WorkflowConfig[] {
  ensureI18nInitialized()

  // Create static workflow option list for i18n-ally compatibility
  const workflowTranslations = [
    {
      id: 'interviewWorkflow',
      name: i18n.t('workflow:workflowOption.interviewWorkflow'),
      description: i18n.t('workflow:workflowDescription.interviewWorkflow'),
    },
    {
      id: 'essentialTools',
      name: i18n.t('workflow:workflowOption.essentialTools'),
      description: i18n.t('workflow:workflowDescription.essentialTools'),
    },
    {
      id: 'gitWorkflow',
      name: i18n.t('workflow:workflowOption.gitWorkflow'),
      description: i18n.t('workflow:workflowDescription.gitWorkflow'),
    },
    {
      id: 'sixStepsWorkflow',
      name: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
      description: i18n.t('workflow:workflowDescription.sixStepsWorkflow'),
    },
  ]

  // Merge base config with translations
  return WORKFLOW_CONFIG_BASE.map((baseConfig) => {
    const translation = workflowTranslations.find(t => t.id === baseConfig.id)
    return {
      ...baseConfig,
      name: translation?.name || baseConfig.id,
      description: translation?.description,
    }
  })
}

export function getWorkflowConfig(workflowId: string): WorkflowConfig | undefined {
  return getWorkflowConfigs().find(config => config.id === workflowId)
}

export function getOrderedWorkflows(): WorkflowConfig[] {
  return getWorkflowConfigs().sort((a, b) => a.order - b.order)
}

// Note: WORKFLOW_CONFIGS should not be used directly in new code
// Use getWorkflowConfigs() instead for proper i18n initialization
