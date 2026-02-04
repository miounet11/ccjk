/**
 * Smart Agent/Skills Generation System
 * Automatically generates Claude Code compatible agents and skills based on project analysis
 */

export { ProjectAnalyzer, analyzeProject } from './analyzer/project-analyzer'
export { TemplateSelector, selectTemplates } from './selector/template-selector'
export { ConfigGenerator, generateConfigs, writeConfigs } from './generator/config-generator'
export * from './types'

import type { GeneratedConfig, ProjectAnalysis, TemplateSelection } from './types'
import { analyzeProject } from './analyzer/project-analyzer'
import { generateConfigs, writeConfigs } from './generator/config-generator'
import { selectTemplates } from './selector/template-selector'

/**
 * Smart generation workflow
 * Analyzes project, selects templates, and generates configurations
 */
export async function smartGenerate(projectRoot?: string): Promise<{
  analysis: ProjectAnalysis
  selection: TemplateSelection
  config: GeneratedConfig
}> {
  // Step 1: Analyze project
  const analysis = await analyzeProject(projectRoot)

  // Step 2: Select templates
  const selection = await selectTemplates(analysis)

  // Step 3: Generate configurations
  const config = await generateConfigs(selection)

  return {
    analysis,
    selection,
    config,
  }
}

/**
 * Smart generation and installation workflow
 * Analyzes, generates, and installs configurations
 */
export async function smartGenerateAndInstall(projectRoot?: string): Promise<{
  analysis: ProjectAnalysis
  selection: TemplateSelection
  config: GeneratedConfig
}> {
  const result = await smartGenerate(projectRoot)

  // Step 4: Write configurations to disk
  await writeConfigs(result.config)

  return result
}
