export type WorkflowType = 'interviewWorkflow' | 'essentialTools' | 'gitWorkflow' | 'sixStepsWorkflow'

export type AgentType
  = | 'init-architect'
    | 'get-current-datetime'
    | 'planner'
    | 'ui-ux-designer'

// Workflow tag types for marketing and categorization
export type WorkflowTag = 'recommended' | 'popular' | 'new' | 'essential' | 'professional'

// Workflow display category for CLI grouping
export type WorkflowDisplayCategory = 'planning' | 'development' | 'versionControl' | 'quality'

// Workflow metadata for marketing and stats display
export interface WorkflowMetadata {
  version: string
  addedDate: string // Format: "2025-01"
  tags: WorkflowTag[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface WorkflowAgent {
  id: string
  filename: string
  required: boolean
}

export interface WorkflowConfig {
  id: string
  name: string
  description?: string
  stats?: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: WorkflowAgent[]
  autoInstallAgents: boolean
  category: 'essential' | 'sixStep' | 'git' | 'interview'
  displayCategory: WorkflowDisplayCategory
  outputDir: string
  metadata: WorkflowMetadata
}

export interface WorkflowInstallResult {
  workflow: string
  success: boolean
  installedCommands: string[]
  installedAgents: string[]
  errors?: string[]
}
