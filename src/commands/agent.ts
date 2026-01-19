/**
 * Agent CLI Command
 *
 * Create and manage AI agents (Skills + MCP composition)
 *
 * Commands:
 * - agent create <name>     - Create a new agent
 * - agent list              - List all agents
 * - agent info <id>         - Show agent details
 * - agent remove <id>       - Remove an agent
 * - agent run <id>          - Run an agent
 * - agent templates         - List available templates
 *
 * @module commands/agent
 */

import type { AgentCapability, AgentDefinition } from '../plugins-v2/types'
import chalk from 'chalk'
import {
  createAgent,
  createAgentFromTemplate,
  getAgentCreator,
  getAgentRuntime,
  getPluginManager,
} from '../plugins-v2'

// ============================================================================
// Command Handler
// ============================================================================

export interface AgentCommandOptions {
  template?: string
  skills?: string[]
  mcp?: string[]
  persona?: string
  json?: boolean
}

/**
 * Handle agent command
 */
export async function handleAgentCommand(
  args: string[],
  options: AgentCommandOptions = {},
): Promise<void> {
  const subcommand = args[0]
  const restArgs = args.slice(1)

  switch (subcommand) {
    case 'create':
    case 'new':
      await createNewAgent(restArgs[0], options)
      break

    case 'list':
    case 'ls':
      await listAgents(options)
      break

    case 'info':
    case 'show':
      await showAgentInfo(restArgs[0], options)
      break

    case 'remove':
    case 'rm':
    case 'delete':
      await removeAgent(restArgs[0])
      break

    case 'run':
    case 'start':
      await runAgent(restArgs[0], restArgs.slice(1).join(' '))
      break

    case 'templates':
      await listTemplates(options)
      break

    default:
      showAgentHelp()
  }
}

// ============================================================================
// Subcommands
// ============================================================================

/**
 * Create a new agent
 */
async function createNewAgent(name: string, options: AgentCommandOptions): Promise<void> {
  if (!name) {
    console.log(chalk.red('Error: Please specify an agent name'))
    console.log(chalk.dim('Example: agent create my-assistant'))
    return
  }

  console.log(chalk.cyan(`\n🤖 Creating agent: ${name}\n`))

  try {
    let agent: AgentDefinition

    if (options.template) {
      // Create from template
      console.log(chalk.dim(`Using template: ${options.template}`))

      agent = await createAgentFromTemplate(options.template, {
        id: name,
        name: { 'en': name, 'zh-CN': name },
      })
    }
    else {
      // Create custom agent
      const builder = createAgent()
        .id(name)
        .name(name)
        .description(`Custom agent: ${name}`)

      // Add skills
      if (options.skills && options.skills.length > 0) {
        builder.addSkills(options.skills)
        console.log(chalk.dim(`Adding skills: ${options.skills.join(', ')}`))
      }

      // Add MCP servers
      if (options.mcp && options.mcp.length > 0) {
        builder.addMcpServers(options.mcp)
        console.log(chalk.dim(`Adding MCP servers: ${options.mcp.join(', ')}`))
      }

      // Set persona
      if (options.persona) {
        builder.persona(options.persona)
      }

      agent = await builder.save()
    }

    console.log(chalk.green(`\n✅ Agent created successfully!`))
    console.log('')
    console.log(chalk.bold('Agent Details:'))
    console.log(chalk.dim(`  ID: ${agent.id}`))
    console.log(chalk.dim(`  Name: ${agent.name.en}`))
    console.log(chalk.dim(`  Skills: ${agent.skills.length}`))
    console.log(chalk.dim(`  MCP Servers: ${agent.mcpServers.length}`))
    console.log(chalk.dim(`  Capabilities: ${agent.capabilities.join(', ')}`))
    console.log('')
    console.log(chalk.dim(`Run with: agent run ${agent.id}`))
  }
  catch (error) {
    console.log(chalk.red(`❌ Failed to create agent: ${error instanceof Error ? error.message : error}`))
  }
}

/**
 * List all agents
 */
async function listAgents(options: AgentCommandOptions): Promise<void> {
  const manager = await getPluginManager()
  const agents = manager.listAgents()

  if (options.json) {
    console.log(JSON.stringify(agents, null, 2))
    return
  }

  console.log(chalk.cyan('\n🤖 Installed Agents\n'))

  if (agents.length === 0) {
    console.log(chalk.dim('No agents created yet.'))
    console.log(chalk.dim('\nCreate an agent with:'))
    console.log(chalk.dim('  agent create my-assistant --template code-assistant'))
    console.log(chalk.dim('  agent create my-agent --skills git-helper,code-reviewer'))
    return
  }

  for (const agent of agents) {
    const name = agent.name.en || agent.id

    console.log(`  ${chalk.bold(name)} ${chalk.dim(`(${agent.id})`)}`)
    console.log(chalk.dim(`    ${agent.description.en}`))

    const badges: string[] = []
    if (agent.skills.length > 0)
      badges.push(`📚 ${agent.skills.length} skills`)
    if (agent.mcpServers.length > 0)
      badges.push(`🔧 ${agent.mcpServers.length} MCP`)
    if (agent.capabilities.length > 0)
      badges.push(`⚡ ${agent.capabilities.length} capabilities`)

    if (badges.length > 0) {
      console.log(chalk.dim(`    ${badges.join(' • ')}`))
    }

    console.log('')
  }

  console.log(chalk.dim(`Total: ${agents.length} agents`))
}

/**
 * Show agent info
 */
async function showAgentInfo(agentId: string, options: AgentCommandOptions): Promise<void> {
  if (!agentId) {
    console.log(chalk.red('Error: Please specify an agent ID'))
    return
  }

  const manager = await getPluginManager()
  const agent = manager.getAgent(agentId)

  if (!agent) {
    console.log(chalk.red(`Agent not found: ${agentId}`))
    return
  }

  if (options.json) {
    console.log(JSON.stringify(agent, null, 2))
    return
  }

  console.log('')
  console.log(chalk.bold(chalk.cyan(`🤖 ${agent.name.en}`)))
  console.log(chalk.dim(`ID: ${agent.id}`))
  console.log('')

  console.log(chalk.bold('📝 Description'))
  console.log(chalk.dim(`  ${agent.description.en}`))
  console.log('')

  console.log(chalk.bold('🎭 Persona'))
  console.log(chalk.dim(`  ${agent.persona.substring(0, 200)}${agent.persona.length > 200 ? '...' : ''}`))
  console.log('')

  if (agent.instructions) {
    console.log(chalk.bold('📋 Instructions'))
    const lines = agent.instructions.split('\n').slice(0, 5)
    for (const line of lines) {
      console.log(chalk.dim(`  ${line}`))
    }
    if (agent.instructions.split('\n').length > 5) {
      console.log(chalk.dim('  ...'))
    }
    console.log('')
  }

  if (agent.skills.length > 0) {
    console.log(chalk.bold('📚 Skills'))
    for (const skill of agent.skills) {
      const plugin = manager.getPlugin(skill.pluginId)
      const name = plugin?.manifest.name.en || skill.pluginId
      console.log(chalk.dim(`  • ${name}`))
    }
    console.log('')
  }

  if (agent.mcpServers.length > 0) {
    console.log(chalk.bold('🔧 MCP Servers'))
    for (const mcp of agent.mcpServers) {
      console.log(chalk.dim(`  • ${mcp.serverName}`))
      if (mcp.tools && mcp.tools.length > 0) {
        console.log(chalk.dim(`    Tools: ${mcp.tools.join(', ')}`))
      }
    }
    console.log('')
  }

  if (agent.capabilities.length > 0) {
    console.log(chalk.bold('⚡ Capabilities'))
    for (const cap of agent.capabilities) {
      console.log(chalk.dim(`  • ${formatCapability(cap)}`))
    }
    console.log('')
  }

  if (agent.triggers && agent.triggers.length > 0) {
    console.log(chalk.bold('🎯 Triggers'))
    for (const trigger of agent.triggers) {
      console.log(chalk.dim(`  • ${trigger}`))
    }
    console.log('')
  }

  // Show system prompt preview
  console.log(chalk.bold('💬 System Prompt Preview'))
  try {
    const runtime = await getAgentRuntime(agentId)
    const prompt = runtime.getSystemPrompt()
    const lines = prompt.split('\n').slice(0, 10)
    for (const line of lines) {
      console.log(chalk.dim(`  ${line}`))
    }
    console.log(chalk.dim('  ...'))
  }
  catch {
    console.log(chalk.dim('  (Unable to generate preview)'))
  }
}

/**
 * Remove an agent
 */
async function removeAgent(agentId: string): Promise<void> {
  if (!agentId) {
    console.log(chalk.red('Error: Please specify an agent ID'))
    return
  }

  const manager = await getPluginManager()
  const agent = manager.getAgent(agentId)

  if (!agent) {
    console.log(chalk.red(`Agent not found: ${agentId}`))
    return
  }

  console.log(chalk.yellow(`\n⚠️  Removing agent: ${agent.name.en}`))

  // TODO: Implement agent removal in plugin manager
  console.log(chalk.red('Agent removal not yet implemented'))
}

/**
 * Run an agent
 */
async function runAgent(agentId: string, task: string): Promise<void> {
  if (!agentId) {
    console.log(chalk.red('Error: Please specify an agent ID'))
    return
  }

  const manager = await getPluginManager()
  const agent = manager.getAgent(agentId)

  if (!agent) {
    console.log(chalk.red(`Agent not found: ${agentId}`))
    return
  }

  console.log(chalk.cyan(`\n🤖 Starting agent: ${agent.name.en}\n`))

  try {
    const runtime = await getAgentRuntime(agentId)

    // Show system prompt
    console.log(chalk.bold('System Prompt:'))
    console.log(chalk.dim('─'.repeat(60)))
    console.log(chalk.dim(runtime.getSystemPrompt()))
    console.log(chalk.dim('─'.repeat(60)))
    console.log('')

    if (task) {
      runtime.setTask(task)
      console.log(chalk.bold('Task:'))
      console.log(chalk.dim(task))
      console.log('')
    }

    // Show skill content if available
    const skillContent = runtime.getSkillContent()
    if (skillContent) {
      console.log(chalk.bold('Skill Knowledge:'))
      console.log(chalk.dim('─'.repeat(60)))
      const lines = skillContent.split('\n').slice(0, 20)
      for (const line of lines) {
        console.log(chalk.dim(line))
      }
      if (skillContent.split('\n').length > 20) {
        console.log(chalk.dim('... (truncated)'))
      }
      console.log(chalk.dim('─'.repeat(60)))
    }

    console.log('')
    console.log(chalk.green('✅ Agent ready!'))
    console.log(chalk.dim('The system prompt and skill knowledge above can be used with Claude.'))
  }
  catch (error) {
    console.log(chalk.red(`❌ Failed to start agent: ${error instanceof Error ? error.message : error}`))
  }
}

/**
 * List available templates
 */
async function listTemplates(options: AgentCommandOptions): Promise<void> {
  const creator = getAgentCreator()
  const templates = creator.listTemplates()

  if (options.json) {
    console.log(JSON.stringify(templates, null, 2))
    return
  }

  console.log(chalk.cyan('\n📋 Available Agent Templates\n'))

  const templateInfo: Record<string, { name: string, description: string, capabilities: string[] }> = {
    'code-assistant': {
      name: 'Code Assistant',
      description: 'General-purpose coding assistant',
      capabilities: ['code-generation', 'code-review', 'debugging', 'refactoring'],
    },
    'git-master': {
      name: 'Git Master',
      description: 'Expert Git operations assistant',
      capabilities: ['git-operations'],
    },
    'test-engineer': {
      name: 'Test Engineer',
      description: 'Testing and quality assurance specialist',
      capabilities: ['testing', 'code-review'],
    },
    'devops-engineer': {
      name: 'DevOps Engineer',
      description: 'DevOps and deployment specialist',
      capabilities: ['deployment', 'file-management'],
    },
    'full-stack': {
      name: 'Full Stack Developer',
      description: 'Full stack development assistant',
      capabilities: ['code-generation', 'code-review', 'testing', 'documentation', 'deployment'],
    },
  }

  for (const templateId of templates) {
    const info = templateInfo[templateId]
    if (info) {
      console.log(`  ${chalk.bold(info.name)} ${chalk.dim(`(${templateId})`)}`)
      console.log(chalk.dim(`    ${info.description}`))
      console.log(chalk.dim(`    Capabilities: ${info.capabilities.join(', ')}`))
      console.log('')
    }
    else {
      console.log(`  ${chalk.bold(templateId)}`)
      console.log('')
    }
  }

  console.log(chalk.dim('Create an agent from template:'))
  console.log(chalk.dim('  agent create my-assistant --template code-assistant'))
}

/**
 * Format capability for display
 */
function formatCapability(cap: AgentCapability): string {
  const labels: Record<AgentCapability, string> = {
    'code-generation': 'Code Generation',
    'code-review': 'Code Review',
    'testing': 'Testing',
    'documentation': 'Documentation',
    'deployment': 'Deployment',
    'debugging': 'Debugging',
    'refactoring': 'Refactoring',
    'git-operations': 'Git Operations',
    'file-management': 'File Management',
    'web-search': 'Web Search',
    'api-integration': 'API Integration',
  }
  return labels[cap] || cap
}

/**
 * Show help
 */
function showAgentHelp(): void {
  console.log(`
${chalk.bold(chalk.cyan('🤖 Agent Command'))}

${chalk.bold('Usage:')}
  agent <command> [options]

${chalk.bold('Commands:')}
  ${chalk.green('create')} <name>     Create a new agent
  ${chalk.green('list')}              List all agents
  ${chalk.green('info')} <id>         Show agent details
  ${chalk.green('remove')} <id>       Remove an agent
  ${chalk.green('run')} <id> [task]   Run an agent
  ${chalk.green('templates')}         List available templates

${chalk.bold('Options:')}
  --template <id>    Use a template (code-assistant, git-master, etc.)
  --skills <ids>     Comma-separated skill IDs to include
  --mcp <servers>    Comma-separated MCP server names
  --persona <text>   Custom persona for the agent
  --json             Output as JSON

${chalk.bold('Examples:')}
  ${chalk.dim('# Create from template')}
  agent create my-assistant --template code-assistant

  ${chalk.dim('# Create with specific skills')}
  agent create reviewer --skills code-reviewer,react-best-practices

  ${chalk.dim('# Create with MCP servers')}
  agent create deployer --mcp vercel,github --skills vercel-deploy

  ${chalk.dim('# List all agents')}
  agent list

  ${chalk.dim('# Run an agent')}
  agent run my-assistant "Review this code"

${chalk.bold('Agent Composition:')}
  Agents combine Skills (knowledge) + MCP (tools) + Persona (behavior)

  ┌─────────────────────────────────────────────┐
  │                   Agent                      │
  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
  │  │ Skills  │ +│   MCP   │ +│   Persona   │ │
  │  │(知识库) │  │ (工具)  │  │  (行为)     │ │
  │  └─────────┘  └─────────┘  └─────────────┘ │
  └─────────────────────────────────────────────┘
`)
}

// ============================================================================
// Export
// ============================================================================

export default handleAgentCommand
