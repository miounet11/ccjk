export interface HookConfig {
  name: string
  type: HookType
  category: HookCategory
  description: string
  trigger: HookTrigger
  action: HookAction
  enabled: boolean
  priority: number
  metadata?: HookMetadata
}

export type HookType =
  | 'pre-commit'
  | 'post-commit'
  | 'pre-push'
  | 'post-push'
  | 'pre-test'
  | 'post-test'
  | 'pre-build'
  | 'post-build'
  | 'pre-install'
  | 'post-install'
  | 'pre-start'
  | 'post-start'
  | 'custom'

export type HookCategory = 'pre-commit' | 'post-test' | 'lifecycle' | 'custom'

export interface HookTrigger {
  matcher: string
  condition?: string
  parameters?: Record<string, any>
}

export interface HookAction {
  command: string
  args?: string[]
  workingDirectory?: string
  environment?: Record<string, string>
  timeout?: number
}

export interface HookMetadata {
  version?: string
  author?: string
  tags?: string[]
  projectTypes?: string[]
  created?: string
  updated?: string
  ccjkVersion?: string
}

export interface HookTemplate {
  name: string
  description: string
  type: HookType
  category: HookCategory
  projectTypes: string[]
  trigger: HookTrigger
  action: HookAction
  enabled: boolean
  priority: number
  metadata?: HookMetadata
}

export interface HookExecutionContext {
  projectPath: string
  trigger: string
  parameters: Record<string, any>
  timestamp: Date
}

export interface HookExecutionResult {
  success: boolean
  hook: string
  duration: number
  output?: string
  error?: string
  exitCode?: number
}