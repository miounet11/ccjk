/**
 * CCJK Agents Command for v8.0.0
 *
 * Create and configure AI agents for your project based on analysis.
 *
 * Usage:
 *   ccjk ccjk:agents                    - Interactive mode with project analysis
 *   ccjk ccjk:agents --create <name>    - Create a specific agent
 *   ccjk ccjk:agents --list             - List available agents
 *   ccjk ccjk:agents --template <tmpl>  - Use specific template
 *   ccjk ccjk:agents --json             - JSON output for automation
 */

import type { AgentDefinition, AgentCapability } from '../plugins-v2/types'
import type { SupportedLang } from '../constants'
import consola from 'consola'
import process from 'node:process'
import { cwd } from 'node:process'
import { ProjectAnalyzer } from '../analyzers'
import type { AgentRecommendation } from '../templates/agents'
import { loadAgentTemplates } from '../templates/agents'
import { registerAgent } from '../plugins-v2/agent-manager'
import { getCloudRecommendations } from '../cloud-client'
import { i18n } from '../i18n'
import { validateAgentDefinition } from '../plugins-v2/agent-validator'
import { writeAgentFile } from '../plugins-v2/agent-writer'

/**
 * Command options interface
 */
export interface CcjkAgentsOptions {
  /** Create a new agent by name */
  create?: string
  /** List available agents */
  list?: boolean
  /** Delete an agent */
  delete?: string
  /** Use specific template */
  template?: string
  /** JSON output */
  json?: boolean
  /** Language */
  lang?: SupportedLang
  /** Additional options for internal use */
  mode?: 'template' | 'custom' | 'auto'
  skills?: string[]
  mcpServers?: string[]
  persona?: string
  capabilities?: AgentCapability[]
  all?: boolean
  dryRun?: boolean
}

/**
 * Main command handler
 */
export async function ccjkAgents(options: CcjkAgentsOptions = {}): Promise<void> {
  try {
    // Set language
    if (options.lang) {
      i18n.changeLanguage(options.lang)
    }

    const isZh = i18n.language === 'zh-CN'

    // Handle list option
    if (options.list) {
      await listAgents()
      return
    }

    // Handle delete option
    if (options.delete) {
      // TODO: Implement delete functionality
      consola.warn(isZh ? '删除功能暂未实现' : 'Delete functionality not yet implemented')
      return
    }

    // Step 1: Analyze project
    if (!options.json) {
      consola.info(isZh ? '🔍 分析项目中...' : '🔍 Analyzing project...')
    }

    const analyzer = new ProjectAnalyzer()
    const analysis = await analyzer.analyze(cwd())

    if (options.json) {
      console.log(JSON.stringify({
        analysis,
        recommendations: [],
      }, null, 2))
      return
    }

    // Display project info
    const projectType = analysis.projectType
    const frameworks = analysis.frameworks.map(f => f.name)
    const languages = analysis.languages.map(l => l.language)

    consola.success(`${isZh ? '检测到' : 'Detected'}: ${projectType}`)
    if (frameworks.length > 0) {
      consola.info(`${isZh ? '框架' : 'Frameworks'}: ${frameworks.join(', ')}`)
    }
    if (languages.length > 0) {
      consola.info(`${isZh ? '语言' : 'Languages'}: ${languages.join(', ')}`)
    }

    // Step 2: Get recommendations
    consola.log('')
    consola.info(isZh ? '📋 获取推荐中...' : '📋 Getting recommendations...')

    let recommendations = await getCloudRecommendations(analysis)

    // Fallback to local templates if cloud is unavailable
    if (!recommendations || recommendations.length === 0) {
      const templates = await loadAgentTemplates()
      recommendations = templates.filter(t =>
        t.skills.some(skill =>
          frameworks.includes(skill) ||
          languages.includes(skill) ||
          projectType.includes(skill)
        ) ||
        t.capabilities.some(cap =>
          frameworks.includes(cap) ||
          languages.includes(cap) ||
          projectType.includes(cap)
        )
      )
    }

    if (recommendations.length === 0) {
      consola.warn(isZh ? '未找到合适的代理，使用所有模板' : 'No suitable agents found, using all templates')
      recommendations = await loadAgentTemplates()
    }

    // Display recommendations
    consola.log('')
    consola.info(`${isZh ? '找到' : 'Found'} ${recommendations.length} ${isZh ? '个推荐代理' : 'recommended agent(s)'}:`)
    consola.log('')

    recommendations.forEach((agent, index) => {
      consola.log(`  ${index + 1}. ${agent.name}`)
      consola.log(`     ${agent.description}`)
      if (agent.skills && agent.skills.length > 0) {
        consola.log(`     ${isZh ? '技能' : 'Skills'}: ${agent.skills.join(', ')}`)
      }
      if (agent.mcpServers && agent.mcpServers.length > 0) {
        consola.log(`     MCP: ${agent.mcpServers.join(', ')}`)
      }
      consola.log('')
    })

    // Step 3: Mode selection
    if (!options.mode) {
      if (options.all) {
        options.mode = 'auto'
      } else if (options.template || options.skills || options.persona) {
        options.mode = 'custom'
      } else {
        // Default to auto mode
        options.mode = 'auto'
      }
    }

    // Step 4: Create agents based on mode
    const createdAgents: string[] = []

    switch (options.mode) {
      case 'auto':
        if (!options.dryRun) {
          consola.log('')
          consola.info(isZh ? '🤖 创建代理中...' : '🤖 Creating agents...')
        }

        for (const recommendation of recommendations) {
          const agentName = await createAgent(recommendation, options)
          if (agentName) {
            createdAgents.push(agentName)
            if (!options.dryRun) {
              consola.success(`${isZh ? '已创建' : 'Created'}: ${agentName}`)
            }
          }
        }
        break

      case 'template':
        let selectedTemplate = options.template
        if (!selectedTemplate && recommendations.length > 0) {
          selectedTemplate = recommendations[0].name
        }

        const template = recommendations.find(r => r.name === selectedTemplate)
        if (template) {
          const agentName = await createAgent(template, options)
          if (agentName) {
            createdAgents.push(agentName)
          }
        }
        break

      case 'custom':
        const customAgent = await createCustomAgent(options)
        if (customAgent) {
          createdAgents.push(customAgent)
        }
        break
    }

    // Step 5: Final output
    if (!options.dryRun) {
      consola.log('')
      if (createdAgents.length > 0) {
        consola.success(`${isZh ? '✅ 成功创建' : '✅ Successfully created'} ${createdAgents.length} ${isZh ? '个代理' : 'agent(s)'}`)
        consola.log('')
        consola.info(isZh ? '用法:' : 'Usage:')
        createdAgents.forEach(agent => {
          consola.log(`  /agent ${agent}`)
        })
        consola.log(`  ${isZh ? '查看所有代理' : 'List all agents'}: /agent list`)
      } else {
        consola.warn(isZh ? '未创建任何代理' : 'No agents created')
      }
    } else {
      consola.log('')
      consola.info(isZh ? '🔍 Dry run 完成' : '🔍 Dry run complete')
    }

  } catch (error) {
    consola.error(isZh ? '代理创建失败' : 'Agent creation failed', error)
    process.exit(1)
  }
}

/**
 * List available agents
 */
async function listAgents(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const templates = await loadAgentTemplates()

  consola.log('')
  consola.info(`${isZh ? '可用的代理模板' : 'Available Agent Templates'} (${templates.length}):`)
  consola.log('')

  templates.forEach((agent, index) => {
    consola.log(`  ${index + 1}. ${agent.name}`)
    consola.log(`     ${agent.description}`)
    if (agent.skills && agent.skills.length > 0) {
      consola.log(`     ${isZh ? '技能' : 'Skills'}: ${agent.skills.join(', ')}`)
    }
    consola.log('')
  })
}

/**
 * Create an agent from a recommendation
 */
async function createAgent(
  recommendation: AgentRecommendation,
  options: CcjkAgentsOptions
): Promise<string | null> {
  try {
    // Convert recommendation to agent definition
    const agentDef: AgentDefinition = {
      id: recommendation.name.toLowerCase().replace(/\s+/g, '-'),
      name: {
        en: recommendation.name,
        'zh-CN': recommendation.name
      },
      description: {
        en: recommendation.description,
        'zh-CN': recommendation.description
      },
      persona: recommendation.persona || recommendation.name,
      instructions: recommendation.description,
      skills: (recommendation.skills || []).map(skill => ({
        pluginId: 'local-agent',
        skillId: skill
      })),
      mcpServers: (recommendation.mcpServers || []).map(server => ({
        serverName: server
      })),
      capabilities: (recommendation.capabilities || []) as AgentCapability[]
    }

    // Validate agent definition
    const validation = validateAgentDefinition(agentDef)
    if (!validation.valid) {
      consola.error(`${isZh ? '验证失败' : 'Validation failed'}: ${recommendation.name}`, validation.errors)
      return null
    }

    if (options.dryRun) {
      consola.info(`[DRY RUN] ${isZh ? '将创建代理' : 'Would create agent'}: ${recommendation.name}`)
      return recommendation.name
    }

    // Write agent file
    await writeAgentFile(agentDef)

    // Register with agent manager
    await registerAgent(agentDef)

    return recommendation.name
  } catch (error) {
    const isZh = i18n.language === 'zh-CN'
    consola.error(`${isZh ? '创建失败' : 'Failed to create'}: ${recommendation.name}`, error)
    return null
  }
}

/**
 * Create a custom agent
 */
async function createCustomAgent(
  options: CcjkAgentsOptions
): Promise<string | null> {
  try {
    const isZh = i18n.language === 'zh-CN'

    // Get agent name
    let agentName = options.create || options.template
    if (!agentName) {
      agentName = 'my-custom-agent'
    }

    // Get description
    const description = options.persona || 'A custom AI agent for specific tasks'

    // Get skills
    const skills = options.skills || []

    // Get MCP servers
    const mcpServers = options.mcpServers || []

    // Create agent definition
    const agentDef: AgentDefinition = {
      id: agentName.toLowerCase().replace(/\s+/g, '-'),
      name: {
        en: agentName,
        'zh-CN': agentName
      },
      description: {
        en: description,
        'zh-CN': description
      },
      persona: options.persona || agentName,
      instructions: description,
      skills: skills.map(skill => ({
        pluginId: 'local-agent',
        skillId: skill
      })),
      mcpServers: mcpServers.map(server => ({
        serverName: server
      })),
      capabilities: options.capabilities || [],
    }

    // Validate
    const validation = validateAgentDefinition(agentDef)
    if (!validation.valid) {
      consola.error(isZh ? '验证错误' : 'Validation errors', validation.errors)
      return null
    }

    if (options.dryRun) {
      consola.info(`[DRY RUN] ${isZh ? '将创建自定义代理' : 'Would create custom agent'}: ${agentName}`)
      return agentName
    }

    // Write and register
    await writeAgentFile(agentDef)
    await registerAgent(agentDef)

    return agentName
  } catch (error) {
    const isZh = i18n.language === 'zh-CN'
    consola.error(isZh ? '自定义代理创建失败' : 'Custom agent creation failed', error)
    return null
  }
}
