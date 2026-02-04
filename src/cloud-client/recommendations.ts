/**
 * Cloud Recommendations
 *
 * Provides agent recommendations from cloud service
 */

import type { ProjectAnalysis } from '../analyzers'
import type { AgentRecommendation } from '../templates/agents'
import { extractString } from '../utils/i18n-helpers'
import { createCloudClient } from './client'

/**
 * Get agent recommendations from cloud
 */
export async function getCloudRecommendations(
  analysis: ProjectAnalysis,
): Promise<AgentRecommendation[]> {
  try {
    const client = createCloudClient()

    // Send project analysis to cloud using analyzeProject API
    const response = await client.analyzeProject({
      projectRoot: analysis.rootPath || process.cwd(),
      dependencies: analysis.dependencies?.direct.reduce((acc, d) => {
        acc[d.name] = d.version || '*'
        return acc
      }, {} as Record<string, string>),
    })

    // Convert cloud response to our format
    // Handle both string and multilingual object formats for name/description
    return (response.recommendations || []).map((rec: any) => ({
      name: extractString(rec.name, rec.id || 'Unknown Agent'),
      description: extractString(rec.description, 'No description available'),
      skills: rec.skills || [],
      mcpServers: rec.mcpServers || [],
      persona: rec.persona,
      capabilities: rec.capabilities || [],
      confidence: rec.confidence || rec.relevanceScore || 0.8,
      reason: rec.reason || 'Recommended by CCJK Cloud',
    }))
  }
  catch (error) {
    console.warn('Failed to get cloud recommendations:', error)
    // Return empty array to fallback to local templates
    return []
  }
}

/**
 * Get skill recommendations from cloud
 */
export async function getCloudSkillRecommendations(
  analysis: ProjectAnalysis,
): Promise<any[]> {
  try {
    const client = createCloudClient()
    const response = await client.analyzeProject({
      projectRoot: analysis.rootPath || process.cwd(),
      dependencies: analysis.dependencies?.direct.reduce((acc, d) => {
        acc[d.name] = d.version || '*'
        return acc
      }, {} as Record<string, string>),
    })

    return []
  }
  catch (error) {
    console.warn('Failed to get cloud skill recommendations:', error)
    return []
  }
}

/**
 * Get MCP recommendations from cloud
 */
export async function getCloudMcpRecommendations(
  analysis: ProjectAnalysis,
): Promise<any[]> {
  try {
    const client = createCloudClient()
    const response = await client.analyzeProject({
      projectRoot: analysis.rootPath || process.cwd(),
      dependencies: analysis.dependencies?.direct.reduce((acc, d) => {
        acc[d.name] = d.version || '*'
        return acc
      }, {} as Record<string, string>),
    })

    return []
  }
  catch (error) {
    console.warn('Failed to get cloud MCP recommendations:', error)
    return []
  }
}
