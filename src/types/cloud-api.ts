/**
 * Cloud API Type Definitions
 *
 * Types for CCJK Cloud API communication.
 */

/**
 * Generic API response wrapper
 */
export interface CloudApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    requestId: string
    timestamp: number
  }
}

/**
 * Cloud recommendation from AI analysis
 */
export interface CloudRecommendation {
  id: string
  name: {
    en: string
    'zh-CN': string
  }
  description: {
    en: string
    'zh-CN': string
  }
  category: 'workflow' | 'mcp' | 'agent' | 'tool' | 'skill'
  relevanceScore: number
  tags: string[]
  templateId?: string
  dependencies?: string[]
}

/**
 * Cloud template for skills, workflows, etc.
 */
export interface CloudTemplate {
  id: string
  name: string
  version: string
  content: string
  type: 'skill' | 'workflow' | 'agent' | 'hook' | 'mcp'
  metadata: {
    author: string
    description: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
}

/**
 * Telemetry payload for anonymous usage statistics
 */
export interface TelemetryPayload {
  sessionId: string
  projectFingerprint: string
  events: TelemetryEvent[]
  metadata: {
    ccjkVersion: string
    platform: string
    nodeVersion: string
    timestamp: number
  }
}

/**
 * Individual telemetry event
 */
export interface TelemetryEvent {
  type: 'setup_started' | 'setup_completed' | 'setup_failed' | 'resource_installed' | 'error'
  timestamp: number
  data?: Record<string, unknown>
}

/**
 * Cloud recommendation response with insights
 */
export interface CloudRecommendationResponse {
  skills: CloudRecommendation[]
  mcpServices: CloudRecommendation[]
  agents: CloudRecommendation[]
  hooks: CloudRecommendation[]
  confidence: number
  fingerprint: string
  insights: CloudInsights
}

/**
 * AI-generated insights about the project
 */
export interface CloudInsights {
  insights: string[]
  productivityImprovements: string[]
  nextRecommendations: string[]
}
