/**
 * Cloud Recommendations
 *
 * Provides agent recommendations from cloud service
 */

import type { ProjectAnalysis } from '../analyzers'
import type { AgentRecommendation } from '../templates/agents'
import { createCloudClient } from './client'

/**
 * Get agent recommendations from cloud
 */
export async function getCloudRecommendations(
  analysis: ProjectAnalysis
): Promise<AgentRecommendation[]> {
  try {
    const client = createCloudClient()

    // Send project analysis to cloud
    const response = await client.getRecommendations({
      projectType: analysis.projectType,
      frameworks: analysis.frameworks.map(f => f.name),
      languages: analysis.languages.map(l => l.language),
      dependencies: analysis.dependencies?.direct.map(d => d.name) || [],
    })

    // Convert cloud response to our format
    return response.recommendations.map(rec => ({
      name: rec.name,
      description: rec.description,
      skills: rec.skills || [],
      mcpServers: rec.mcpServers || [],
      persona: rec.persona,
      capabilities: rec.capabilities || [],
      confidence: rec.confidence || 0.8,
      reason: rec.reason || 'Recommended by CCJK Cloud'
    }))
  } catch (error) {
    console.warn('Failed to get cloud recommendations:', error)
    // Return empty array to fallback to local templates
    return []
  }
}

/**
 * Get skill recommendations from cloud
 */
export async function getCloudSkillRecommendations(
  analysis: ProjectAnalysis
): Promise<any[]> {
  try {
    const client = createCloudClient()
    const response = await client.getSkillRecommendations({
      projectType: analysis.projectType,
      languages: analysis.languages.map(l => l.language),
      frameworks: analysis.frameworks.map(f => f.name),
    })

    return response.skills
  } catch (error) {
    console.warn('Failed to get cloud skill recommendations:', error)
    return []
  }
}

/**
 * Get MCP recommendations from cloud
 */
export async function getCloudMcpRecommendations(
  analysis: ProjectAnalysis
): Promise<any[]> {
  try {
    const client = createCloudClient()
    const response = await client.getMcpRecommendations({
      projectType: analysis.projectType,
      languages: analysis.languages.map(l => l.language),
    })

    return response.mcpServers
  } catch (error) {
    console.warn('Failed to get cloud MCP recommendations:', error)
    return []
  }
}