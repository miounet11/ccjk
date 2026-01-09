export type WorkflowType = 'interviewWorkflow' | 'essentialTools' | 'gitWorkflow' | 'sixStepsWorkflow'

export type AgentType
  = | 'init-architect'
    | 'get-current-datetime'
    | 'planner'
    | 'ui-ux-designer'

export interface WorkflowAgent {
  id: string
  filename: string
  required: boolean
}

export interface WorkflowConfig {
  id: string
  name: string
  description?: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: WorkflowAgent[]
  autoInstallAgents: boolean
  category: 'essential' | 'sixStep' | 'git' | 'interview'
  outputDir: string
}

export interface WorkflowInstallResult {
  workflow: string
  success: boolean
  installedCommands: string[]
  installedAgents: string[]
  errors?: string[]
}
