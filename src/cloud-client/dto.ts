/**
 * Cloud Client DTO (Data Transfer Objects)
 *
 * Strict type definitions and converters for API responses
 * Eliminates `any` types in core cloud flows
 *
 * @module cloud-client/dto
 */

import type {
  BatchTemplateRequest,
  BatchTemplateResponse,
  MetricType,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  Recommendation,
  TemplateParameter,
  TemplateResponse,
  UsageReport,
} from './types'

// ============================================================================
// Strict Config Types
// ============================================================================

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  type?: 'stdio' | 'http' | 'websocket'
  command?: string
  args?: string[]
  env?: Record<string, string>
  npmPackage?: string
  installCommand?: string
}

/**
 * Skill Configuration
 */
export interface SkillConfig {
  enabled?: boolean
  priority?: number
  triggers?: string[]
  parameters?: Record<string, string | number | boolean>
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  persona?: string
  capabilities?: string[]
  skills?: string[]
  mcpServers?: string[]
  temperature?: number
  maxTokens?: number
}

/**
 * Hook Configuration
 */
export interface HookConfig {
  command?: string
  args?: string[]
  when?: 'pre' | 'post'
  enabled?: boolean
}

/**
 * Workflow Configuration
 */
export interface WorkflowConfig {
  steps?: string[]
  triggers?: string[]
  conditions?: Record<string, string | boolean>
}

/**
 * Union type for all config types
 */
export type RecommendationConfig
  = | McpServerConfig
    | SkillConfig
    | AgentConfig
    | HookConfig
    | WorkflowConfig

// ============================================================================
// Template Parameter Value Types
// ============================================================================

/**
 * Allowed template parameter default values
 */
export type TemplateParameterValue
  = | string
    | number
    | boolean
    | string[]
    | number[]
    | Record<string, string | number | boolean>
    | null

// ============================================================================
// Telemetry Data Types
// ============================================================================

/**
 * Template download telemetry data
 */
export interface TemplateDownloadData {
  templateId: string
  templateType: string
  timestamp: number
}

/**
 * Recommendation shown telemetry data
 */
export interface RecommendationShownData {
  recommendationId: string
  category: string
  timestamp: number
}

/**
 * Recommendation accepted telemetry data
 */
export interface RecommendationAcceptedData {
  recommendationId: string
  category: string
  timestamp: number
}

/**
 * Analysis completed telemetry data
 */
export interface AnalysisCompletedData {
  projectType?: string
  frameworks?: string[]
  recommendationCount: number
  timestamp: number
}

/**
 * Error occurred telemetry data
 */
export interface ErrorOccurredData {
  errorType: string
  errorMessage?: string
  context?: string
  timestamp: number
}

/**
 * Batch telemetry data
 */
export interface BatchTelemetryData {
  events: Array<{
    type: MetricType
    data?: TelemetryEventData
    timestamp: string
  }>
  batchSize: number
  userId: string
}

/**
 * Union type for all telemetry data
 */
export type TelemetryEventData
  = | TemplateDownloadData
    | RecommendationShownData
    | RecommendationAcceptedData
    | AnalysisCompletedData
    | ErrorOccurredData
    | BatchTelemetryData

// ============================================================================
// API Response DTOs (from cloud)
// ============================================================================

/**
 * Raw recommendation from cloud API
 */
export interface RawRecommendation {
  id: string
  name: string | Record<string, string>
  description: string | Record<string, string>
  category: 'skill' | 'mcp' | 'agent' | 'hook'
  relevanceScore: number
  installCommand?: string
  config?: unknown
  tags?: string[]
  dependencies?: string[]
}

/**
 * Raw template from cloud API
 */
export interface RawTemplate {
  id: string
  type: 'workflow' | 'output-style' | 'prompt' | 'agent'
  name: string | Record<string, string>
  description: string | Record<string, string>
  content: string
  version: string
  author?: string
  tags?: string[]
  parameters?: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required: boolean
    default?: unknown
    description?: string | Record<string, string>
  }>
  createdAt: string
  updatedAt: string
}

/**
 * Raw project analysis response from cloud API
 */
export interface RawProjectAnalysisResponse {
  requestId: string
  recommendations: RawRecommendation[]
  projectType?: string
  frameworks?: string[]
}

/**
 * Raw batch template response from cloud API
 */
export interface RawBatchTemplateResponse {
  requestId: string
  templates: Record<string, RawTemplate>
  notFound: string[]
}

// ============================================================================
// DTO Converters
// ============================================================================

/**
 * Extract string from multilingual field
 */
export function extractString(
  val: string | Record<string, string> | undefined,
  fallback: string,
  preferredLang: 'en' | 'zh-CN' = 'en',
): string {
  if (val === undefined || val === null)
    return fallback
  if (typeof val === 'string')
    return val || fallback

  if (typeof val === 'object') {
    // Preferred language
    const preferred = val[preferredLang]
    if (typeof preferred === 'string' && preferred)
      return preferred

    // Fallback to English
    const en = val.en || val['en-US']
    if (typeof en === 'string' && en)
      return en

    // Fallback to Chinese
    const zhCN = val['zh-CN'] || val.zh || val['zh-Hans']
    if (typeof zhCN === 'string' && zhCN)
      return zhCN

    // Use first available value
    for (const v of Object.values(val)) {
      if (typeof v === 'string' && v)
        return v
    }
  }

  return fallback
}

/**
 * Validate and convert config object
 */
export function convertConfig(config: unknown): RecommendationConfig | undefined {
  if (!config || typeof config !== 'object')
    return undefined

  // Type guard: check if it's a valid config object
  const obj = config as Record<string, unknown>

  // MCP Server Config
  if ('command' in obj || 'npmPackage' in obj) {
    return {
      type: typeof obj.type === 'string' ? obj.type as 'stdio' | 'http' | 'websocket' : undefined,
      command: typeof obj.command === 'string' ? obj.command : undefined,
      args: Array.isArray(obj.args) ? obj.args.filter(a => typeof a === 'string') : undefined,
      env: typeof obj.env === 'object' && obj.env ? obj.env as Record<string, string> : undefined,
      npmPackage: typeof obj.npmPackage === 'string' ? obj.npmPackage : undefined,
      installCommand: typeof obj.installCommand === 'string' ? obj.installCommand : undefined,
    } as McpServerConfig
  }

  // Skill Config
  if ('enabled' in obj || 'triggers' in obj) {
    return {
      enabled: typeof obj.enabled === 'boolean' ? obj.enabled : undefined,
      priority: typeof obj.priority === 'number' ? obj.priority : undefined,
      triggers: Array.isArray(obj.triggers) ? obj.triggers.filter(t => typeof t === 'string') : undefined,
      parameters: typeof obj.parameters === 'object' && obj.parameters ? obj.parameters as Record<string, string | number | boolean> : undefined,
    } as SkillConfig
  }

  // Agent Config
  if ('persona' in obj || 'capabilities' in obj) {
    return {
      persona: typeof obj.persona === 'string' ? obj.persona : undefined,
      capabilities: Array.isArray(obj.capabilities) ? obj.capabilities.filter(c => typeof c === 'string') : undefined,
      skills: Array.isArray(obj.skills) ? obj.skills.filter(s => typeof s === 'string') : undefined,
      mcpServers: Array.isArray(obj.mcpServers) ? obj.mcpServers.filter(m => typeof m === 'string') : undefined,
      temperature: typeof obj.temperature === 'number' ? obj.temperature : undefined,
      maxTokens: typeof obj.maxTokens === 'number' ? obj.maxTokens : undefined,
    } as AgentConfig
  }

  // Hook Config
  if ('when' in obj) {
    return {
      command: typeof obj.command === 'string' ? obj.command : undefined,
      args: Array.isArray(obj.args) ? obj.args.filter(a => typeof a === 'string') : undefined,
      when: typeof obj.when === 'string' ? obj.when as 'pre' | 'post' : undefined,
      enabled: typeof obj.enabled === 'boolean' ? obj.enabled : undefined,
    } as HookConfig
  }

  // Workflow Config
  if ('steps' in obj) {
    return {
      steps: Array.isArray(obj.steps) ? obj.steps.filter(s => typeof s === 'string') : undefined,
      triggers: Array.isArray(obj.triggers) ? obj.triggers.filter(t => typeof t === 'string') : undefined,
      conditions: typeof obj.conditions === 'object' && obj.conditions ? obj.conditions as Record<string, string | boolean> : undefined,
    } as WorkflowConfig
  }

  return undefined
}

/**
 * Convert template parameter default value
 */
export function convertParameterDefault(value: unknown): TemplateParameterValue {
  if (value === null || value === undefined)
    return null

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value

  if (Array.isArray(value)) {
    if (value.every(v => typeof v === 'string'))
      return value as string[]
    if (value.every(v => typeof v === 'number'))
      return value as number[]
    return null
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const converted: Record<string, string | number | boolean> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        converted[k] = v
    }
    return converted
  }

  return null
}

/**
 * Convert raw recommendation to typed recommendation
 */
export function convertRecommendation(
  raw: RawRecommendation,
  preferredLang: 'en' | 'zh-CN' = 'en',
): Recommendation {
  return {
    id: raw.id,
    name: typeof raw.name === 'string'
      ? { en: raw.name }
      : raw.name,
    description: typeof raw.description === 'string'
      ? { en: raw.description }
      : raw.description,
    category: raw.category,
    relevanceScore: raw.relevanceScore,
    installCommand: raw.installCommand,
    config: convertConfig(raw.config),
    tags: raw.tags,
    dependencies: raw.dependencies,
  }
}

/**
 * Convert raw template parameter to typed parameter
 */
export function convertTemplateParameter(
  raw: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required: boolean
    default?: unknown
    description?: string | Record<string, string>
  },
): TemplateParameter {
  return {
    name: raw.name,
    type: raw.type,
    required: raw.required,
    default: convertParameterDefault(raw.default),
    description: typeof raw.description === 'string'
      ? { en: raw.description }
      : raw.description,
  }
}

/**
 * Convert raw template to typed template
 */
export function convertTemplate(
  raw: RawTemplate,
  preferredLang: 'en' | 'zh-CN' = 'en',
): TemplateResponse {
  return {
    id: raw.id,
    type: raw.type,
    name: typeof raw.name === 'string'
      ? { en: raw.name }
      : raw.name,
    description: typeof raw.description === 'string'
      ? { en: raw.description }
      : raw.description,
    content: raw.content,
    version: raw.version,
    author: raw.author,
    tags: raw.tags,
    parameters: raw.parameters ? raw.parameters.map(convertTemplateParameter) : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

/**
 * Convert raw project analysis response to typed response
 */
export function convertProjectAnalysisResponse(
  raw: RawProjectAnalysisResponse,
  preferredLang: 'en' | 'zh-CN' = 'en',
): ProjectAnalysisResponse {
  return {
    requestId: raw.requestId,
    recommendations: raw.recommendations.map(r => convertRecommendation(r, preferredLang)),
    projectType: raw.projectType,
    frameworks: raw.frameworks,
  }
}

/**
 * Convert raw batch template response to typed response
 */
export function convertBatchTemplateResponse(
  raw: RawBatchTemplateResponse,
  preferredLang: 'en' | 'zh-CN' = 'en',
): BatchTemplateResponse {
  const templates: Record<string, TemplateResponse> = {}
  for (const [id, template] of Object.entries(raw.templates)) {
    templates[id] = convertTemplate(template, preferredLang)
  }

  return {
    requestId: raw.requestId,
    templates,
    notFound: raw.notFound,
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate project analysis request
 */
export function validateProjectAnalysisRequest(
  request: ProjectAnalysisRequest,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!request.projectRoot || typeof request.projectRoot !== 'string')
    errors.push('projectRoot is required and must be a string')

  if (request.dependencies && typeof request.dependencies !== 'object')
    errors.push('dependencies must be an object')

  if (request.devDependencies && typeof request.devDependencies !== 'object')
    errors.push('devDependencies must be an object')

  if (request.language && !['en', 'zh-CN'].includes(request.language))
    errors.push('language must be "en" or "zh-CN"')

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate batch template request
 */
export function validateBatchTemplateRequest(
  request: BatchTemplateRequest,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(request.ids))
    errors.push('ids must be an array')
  else if (request.ids.length === 0)
    errors.push('ids array cannot be empty')
  else if (!request.ids.every(id => typeof id === 'string'))
    errors.push('all ids must be strings')

  if (request.language && !['en', 'zh-CN'].includes(request.language))
    errors.push('language must be "en" or "zh-CN"')

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate usage report
 */
export function validateUsageReport(
  report: UsageReport,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!report.reportId || typeof report.reportId !== 'string')
    errors.push('reportId is required and must be a string')

  if (!report.metricType || typeof report.metricType !== 'string')
    errors.push('metricType is required and must be a string')

  if (!report.timestamp || typeof report.timestamp !== 'string')
    errors.push('timestamp is required and must be a string')

  if (!report.ccjkVersion || typeof report.ccjkVersion !== 'string')
    errors.push('ccjkVersion is required and must be a string')

  if (!report.nodeVersion || typeof report.nodeVersion !== 'string')
    errors.push('nodeVersion is required and must be a string')

  if (!report.platform || typeof report.platform !== 'string')
    errors.push('platform is required and must be a string')

  if (report.deviceId !== undefined && typeof report.deviceId !== 'string')
    errors.push('deviceId must be a string when provided')

  if (report.clientVersion !== undefined && typeof report.clientVersion !== 'string')
    errors.push('clientVersion must be a string when provided')

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid recommendation config
 */
export function isRecommendationConfig(value: unknown): value is RecommendationConfig {
  return convertConfig(value) !== undefined
}

/**
 * Check if value is a valid telemetry event data
 */
export function isTelemetryEventData(value: unknown): value is TelemetryEventData {
  if (!value || typeof value !== 'object')
    return false

  const obj = value as Record<string, unknown>

  // Check for required timestamp field
  if (typeof obj.timestamp !== 'number' && typeof obj.timestamp !== 'string')
    return false

  return true
}

/**
 * Check if value is a valid template parameter value
 */
export function isTemplateParameterValue(value: unknown): value is TemplateParameterValue {
  if (value === null || value === undefined)
    return value === null // null is valid, undefined is not

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true

  if (Array.isArray(value)) {
    if (value.length === 0)
      return true
    // Check if all elements are strings OR all are numbers (not mixed)
    const allStrings = value.every(v => typeof v === 'string')
    const allNumbers = value.every(v => typeof v === 'number')
    return allStrings || allNumbers
  }

  if (typeof value === 'object') {
    return Object.values(value).every(v =>
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    )
  }

  return false
}
