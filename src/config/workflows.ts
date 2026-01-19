import type { WorkflowConfig, WorkflowDisplayCategory, WorkflowMetadata, WorkflowTag } from '../types/workflow'
import { ensureI18nInitialized, i18n } from '../i18n'

// Re-export types for convenience
export type { WorkflowDisplayCategory, WorkflowMetadata, WorkflowTag }

// Pure business configuration without any i18n text
export interface WorkflowConfigBase {
  id: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: Array<{ id: string, filename: string, required: boolean }>
  autoInstallAgents: boolean
  category: 'essential' | 'sixStep' | 'git' | 'interview'
  displayCategory: WorkflowDisplayCategory
  outputDir: string
  metadata: WorkflowMetadata
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
    displayCategory: 'planning',
    outputDir: 'interview',
    metadata: {
      version: '1.0.0',
      addedDate: '2025-01',
      tags: ['recommended', 'popular'],
      difficulty: 'beginner',
    },
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
    displayCategory: 'planning',
    outputDir: 'essential',
    metadata: {
      version: '1.0.0',
      addedDate: '2025-01',
      tags: ['essential'],
      difficulty: 'beginner',
    },
  },
  {
    id: 'gitWorkflow',
    defaultSelected: true,
    order: 3,
    commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'git',
    displayCategory: 'versionControl',
    outputDir: 'git',
    metadata: {
      version: '1.0.0',
      addedDate: '2025-01',
      tags: ['popular'],
      difficulty: 'beginner',
    },
  },
  {
    id: 'sixStepsWorkflow',
    defaultSelected: false,
    order: 4,
    commands: ['workflow.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'sixStep',
    displayCategory: 'development',
    outputDir: 'workflow',
    metadata: {
      version: '1.0.0',
      addedDate: '2025-01',
      tags: ['professional'],
      difficulty: 'intermediate',
    },
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
      stats: i18n.t('workflow:workflowStats.interviewWorkflow'),
    },
    {
      id: 'essentialTools',
      name: i18n.t('workflow:workflowOption.essentialTools'),
      description: i18n.t('workflow:workflowDescription.essentialTools'),
      stats: i18n.t('workflow:workflowStats.essentialTools'),
    },
    {
      id: 'gitWorkflow',
      name: i18n.t('workflow:workflowOption.gitWorkflow'),
      description: i18n.t('workflow:workflowDescription.gitWorkflow'),
      stats: i18n.t('workflow:workflowStats.gitWorkflow'),
    },
    {
      id: 'sixStepsWorkflow',
      name: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
      description: i18n.t('workflow:workflowDescription.sixStepsWorkflow'),
      stats: i18n.t('workflow:workflowStats.sixStepsWorkflow'),
    },
  ]

  // Merge base config with translations
  return WORKFLOW_CONFIG_BASE.map((baseConfig) => {
    const translation = workflowTranslations.find(t => t.id === baseConfig.id)
    return {
      ...baseConfig,
      name: translation?.name || baseConfig.id,
      description: translation?.description,
      stats: translation?.stats,
    }
  })
}

export function getWorkflowConfig(workflowId: string): WorkflowConfig | undefined {
  return getWorkflowConfigs().find(config => config.id === workflowId)
}

export function getOrderedWorkflows(): WorkflowConfig[] {
  return getWorkflowConfigs().sort((a, b) => a.order - b.order)
}

// Get workflows grouped by display category
export function getWorkflowsByDisplayCategory(): Map<WorkflowDisplayCategory, WorkflowConfig[]> {
  const workflows = getOrderedWorkflows()
  const grouped = new Map<WorkflowDisplayCategory, WorkflowConfig[]>()

  for (const workflow of workflows) {
    const category = workflow.displayCategory
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push(workflow)
  }

  return grouped
}

// Get display category order for CLI
export function getDisplayCategoryOrder(): WorkflowDisplayCategory[] {
  return ['planning', 'development', 'versionControl', 'quality']
}

// Get translated tag label
export function getTagLabel(tag: WorkflowTag): string {
  ensureI18nInitialized()
  const tagKeys: Record<WorkflowTag, string> = {
    recommended: 'workflow:tags.recommended',
    popular: 'workflow:tags.popular',
    new: 'workflow:tags.new',
    essential: 'workflow:tags.essential',
    professional: 'workflow:tags.professional',
  }
  return i18n.t(tagKeys[tag])
}

// Get translated category label
export function getCategoryLabel(category: WorkflowDisplayCategory): string {
  ensureI18nInitialized()
  const categoryKeys: Record<WorkflowDisplayCategory, string> = {
    planning: 'workflow:category.planning',
    development: 'workflow:category.development',
    versionControl: 'workflow:category.versionControl',
    quality: 'workflow:category.quality',
  }
  return i18n.t(categoryKeys[category])
}

// Note: WORKFLOW_CONFIGS should not be used directly in new code
// Use getWorkflowConfigs() instead for proper i18n initialization
