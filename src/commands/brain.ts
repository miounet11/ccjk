/**
 * Brain Command - Multi-Agent System Management
 *
 * Provides comprehensive management and monitoring of the CCJK AI agent ecosystem.
 * Supports agent status tracking, task execution, and real-time monitoring.
 *
 * Usage:
 *   ccjk brain status   - Display brain system status
 *   ccjk brain agents   - List all available agents
 *   ccjk brain run      - Execute multi-agent tasks
 *   ccjk brain monitor  - Real-time monitoring panel
 */

import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { addNumbersToChoices } from '../utils/prompt-helpers'

/**
 * Brain command options interface
 */
export interface BrainCommandOptions {
  lang?: SupportedLang
  verbose?: boolean
  json?: boolean
}

/**
 * Agent status information
 */
export interface AgentStatus {
  id: string
  name: string
  type: 'architect' | 'specialist' | 'engineer' | 'devops'
  status: 'active' | 'idle' | 'busy' | 'offline'
  model: string
  domain: string
  lastActive?: Date
  tasksCompleted?: number
}

/**
 * Brain system status
 */
export interface BrainSystemStatus {
  totalAgents: number
  activeAgents: number
  idleAgents: number
  busyAgents: number
  offlineAgents: number
  systemHealth: 'healthy' | 'degraded' | 'critical'
  uptime?: number
}

/**
 * Task execution options
 */
export interface TaskExecutionOptions {
  task: string
  agents?: string[]
  priority?: 'low' | 'normal' | 'high'
  timeout?: number
}

/**
 * Get all available agents from CCJK configuration
 */
async function getAvailableAgents(): Promise<AgentStatus[]> {
  // Mock data - in production, this would read from actual agent configurations
  const agents: AgentStatus[] = [
    {
      id: 'typescript-cli-architect',
      name: 'TypeScript CLI Architect',
      type: 'architect',
      status: 'active',
      model: 'sonnet',
      domain: 'CLI Architecture & TypeScript',
      tasksCompleted: 42,
    },
    {
      id: 'ccjk-i18n-specialist',
      name: 'CCJK i18n Specialist',
      type: 'specialist',
      status: 'idle',
      model: 'opus',
      domain: 'Internationalization',
      tasksCompleted: 28,
    },
    {
      id: 'ccjk-tools-integration-specialist',
      name: 'CCJK Tools Integration Specialist',
      type: 'specialist',
      status: 'active',
      model: 'sonnet',
      domain: 'Tool Integration',
      tasksCompleted: 35,
    },
    {
      id: 'ccjk-template-engine',
      name: 'CCJK Template Engine',
      type: 'engineer',
      status: 'idle',
      model: 'haiku',
      domain: 'Template System',
      tasksCompleted: 51,
    },
    {
      id: 'ccjk-config-architect',
      name: 'CCJK Config Architect',
      type: 'architect',
      status: 'active',
      model: 'opus',
      domain: 'Configuration Management',
      tasksCompleted: 33,
    },
    {
      id: 'ccjk-testing-specialist',
      name: 'CCJK Testing Specialist',
      type: 'specialist',
      status: 'busy',
      model: 'sonnet',
      domain: 'Testing Infrastructure',
      tasksCompleted: 47,
    },
    {
      id: 'ccjk-devops-engineer',
      name: 'CCJK DevOps Engineer',
      type: 'devops',
      status: 'idle',
      model: 'inherit',
      domain: 'DevOps & Deployment',
      tasksCompleted: 19,
    },
  ]

  return agents
}

/**
 * Calculate brain system status from agents
 */
function calculateSystemStatus(agents: AgentStatus[]): BrainSystemStatus {
  const activeAgents = agents.filter(a => a.status === 'active').length
  const idleAgents = agents.filter(a => a.status === 'idle').length
  const busyAgents = agents.filter(a => a.status === 'busy').length
  const offlineAgents = agents.filter(a => a.status === 'offline').length

  let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (offlineAgents > agents.length * 0.5) {
    systemHealth = 'critical'
  }
  else if (offlineAgents > agents.length * 0.2) {
    systemHealth = 'degraded'
  }

  return {
    totalAgents: agents.length,
    activeAgents,
    idleAgents,
    busyAgents,
    offlineAgents,
    systemHealth,
  }
}

/**
 * Display brain system status
 */
export async function brainStatus(options: BrainCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧠 大脑系统状态' : '🧠 Brain System Status'))
  console.log(ansis.dim('─'.repeat(60)))

  const agents = await getAvailableAgents()
  const status = calculateSystemStatus(agents)

  // System health indicator
  const healthColor = status.systemHealth === 'healthy'
    ? ansis.green
    : status.systemHealth === 'degraded'
      ? ansis.yellow
      : ansis.red

  const healthText = isZh
    ? { healthy: '健康', degraded: '降级', critical: '严重' }[status.systemHealth]
    : status.systemHealth.toUpperCase()

  console.log('')
  console.log(`  ${isZh ? '系统健康' : 'System Health'}: ${healthColor(healthText)}`)
  console.log('')

  // Agent statistics
  console.log(ansis.cyan(isZh ? '📊 Agent 统计' : '📊 Agent Statistics'))
  console.log(`  ${ansis.green('●')} ${isZh ? '活跃' : 'Active'}: ${status.activeAgents}`)
  console.log(`  ${ansis.blue('●')} ${isZh ? '空闲' : 'Idle'}: ${status.idleAgents}`)
  console.log(`  ${ansis.yellow('●')} ${isZh ? '忙碌' : 'Busy'}: ${status.busyAgents}`)
  console.log(`  ${ansis.gray('●')} ${isZh ? '离线' : 'Offline'}: ${status.offlineAgents}`)
  console.log(`  ${ansis.dim('─')} ${isZh ? '总计' : 'Total'}: ${status.totalAgents}`)

  // Agent type distribution
  console.log('')
  console.log(ansis.cyan(isZh ? '🎯 Agent 类型分布' : '🎯 Agent Type Distribution'))
  const typeCount = {
    architect: agents.filter(a => a.type === 'architect').length,
    specialist: agents.filter(a => a.type === 'specialist').length,
    engineer: agents.filter(a => a.type === 'engineer').length,
    devops: agents.filter(a => a.type === 'devops').length,
  }
  console.log(`  ${ansis.magenta('◆')} ${isZh ? '架构师' : 'Architect'}: ${typeCount.architect}`)
  console.log(`  ${ansis.cyan('◆')} ${isZh ? '专家' : 'Specialist'}: ${typeCount.specialist}`)
  console.log(`  ${ansis.green('◆')} ${isZh ? '工程师' : 'Engineer'}: ${typeCount.engineer}`)
  console.log(`  ${ansis.blue('◆')} ${isZh ? 'DevOps' : 'DevOps'}: ${typeCount.devops}`)

  // Performance metrics
  const totalTasks = agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0)
  console.log('')
  console.log(ansis.cyan(isZh ? '⚡ 性能指标' : '⚡ Performance Metrics'))
  console.log(`  ${isZh ? '已完成任务' : 'Tasks Completed'}: ${ansis.green(totalTasks.toString())}`)
  console.log(`  ${isZh ? '平均任务数' : 'Avg Tasks/Agent'}: ${ansis.green((totalTasks / agents.length).toFixed(1))}`)

  console.log('')
  console.log(ansis.dim(isZh
    ? '提示: 使用 ccjk brain agents 查看详细 Agent 列表'
    : 'Tip: Use ccjk brain agents to view detailed agent list'))
  console.log('')
}

/**
 * List all available agents
 */
export async function brainAgents(options: BrainCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🤖 可用 Agent 列表' : '🤖 Available Agents'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  const agents = await getAvailableAgents()

  // Group agents by type
  const groupedAgents = {
    architect: agents.filter(a => a.type === 'architect'),
    specialist: agents.filter(a => a.type === 'specialist'),
    engineer: agents.filter(a => a.type === 'engineer'),
    devops: agents.filter(a => a.type === 'devops'),
  }

  const typeLabels = {
    architect: isZh ? '🏛️  架构师' : '🏛️  Architects',
    specialist: isZh ? '🎯 专家' : '🎯 Specialists',
    engineer: isZh ? '⚙️  工程师' : '⚙️  Engineers',
    devops: isZh ? '🚀 DevOps' : '🚀 DevOps',
  }

  for (const [type, typeAgents] of Object.entries(groupedAgents)) {
    if (typeAgents.length === 0)
      continue

    console.log(ansis.cyan.bold(typeLabels[type as keyof typeof typeLabels]))
    console.log('')

    for (const agent of typeAgents) {
      const statusIcon = {
        active: ansis.green('●'),
        idle: ansis.blue('○'),
        busy: ansis.yellow('◐'),
        offline: ansis.gray('○'),
      }[agent.status]

      console.log(`  ${statusIcon} ${ansis.bold(agent.name)}`)
      console.log(`    ${ansis.dim('ID:')} ${agent.id}`)
      console.log(`    ${ansis.dim(isZh ? '模型:' : 'Model:')} ${agent.model}`)
      console.log(`    ${ansis.dim(isZh ? '领域:' : 'Domain:')} ${agent.domain}`)
      console.log(`    ${ansis.dim(isZh ? '状态:' : 'Status:')} ${agent.status}`)
      if (agent.tasksCompleted) {
        console.log(`    ${ansis.dim(isZh ? '已完成:' : 'Completed:')} ${agent.tasksCompleted} ${isZh ? '个任务' : 'tasks'}`)
      }
      console.log('')
    }
  }

  console.log(ansis.dim(isZh
    ? '提示: 使用 ccjk brain run 执行多 Agent 任务'
    : 'Tip: Use ccjk brain run to execute multi-agent tasks'))
  console.log('')
}

/**
 * Execute multi-agent task
 */
export async function brainRun(taskOptions?: TaskExecutionOptions, options: BrainCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🚀 执行多 Agent 任务' : '🚀 Execute Multi-Agent Task'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  // If no task provided, prompt for task description
  let task = taskOptions?.task
  if (!task) {
    const { taskInput } = await inquirer.prompt<{ taskInput: string }>({
      type: 'input',
      name: 'taskInput',
      message: isZh ? '请描述任务:' : 'Describe the task:',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return isZh ? '任务描述不能为空' : 'Task description cannot be empty'
        }
        return true
      },
    })
    task = taskInput
  }

  console.log(ansis.cyan(isZh ? '📋 任务:' : '📋 Task:'), task)
  console.log('')

  // Get available agents
  const agents = await getAvailableAgents()
  const availableAgents = agents.filter(a => a.status !== 'offline')

  // Select agents for task
  let selectedAgents: string[]
  if (taskOptions?.agents && taskOptions.agents.length > 0) {
    selectedAgents = taskOptions.agents
  }
  else {
    const { agentSelection } = await inquirer.prompt<{ agentSelection: string[] }>({
      type: 'checkbox',
      name: 'agentSelection',
      message: isZh ? '选择参与的 Agent:' : 'Select agents to participate:',
      choices: addNumbersToChoices(availableAgents.map(a => ({
        name: `${a.name} (${a.domain})`,
        value: a.id,
        checked: a.status === 'active',
      }))),
      validate: (value) => {
        if (value.length === 0) {
          return isZh ? '至少选择一个 Agent' : 'Select at least one agent'
        }
        return true
      },
    })
    selectedAgents = agentSelection
  }

  console.log(ansis.cyan(isZh ? '🤖 已选择 Agent:' : '🤖 Selected Agents:'))
  for (const agentId of selectedAgents) {
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      console.log(`  ${ansis.green('✓')} ${agent.name}`)
    }
  }
  console.log('')

  // Simulate task execution
  console.log(ansis.yellow(isZh ? '⏳ 正在执行任务...' : '⏳ Executing task...'))
  console.log('')

  // Mock execution progress
  for (const agentId of selectedAgents) {
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      console.log(`  ${ansis.blue('→')} ${agent.name}: ${isZh ? '处理中...' : 'Processing...'}`)
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('')
  console.log(ansis.green(isZh ? '✅ 任务执行完成!' : '✅ Task execution completed!'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '注意: 这是一个演示功能。实际的多 Agent 任务执行需要集成到 Claude Code 工作流中。'
    : 'Note: This is a demo feature. Actual multi-agent task execution requires integration with Claude Code workflows.'))
  console.log('')
}

/**
 * Real-time monitoring panel
 */
export async function brainMonitor(options: BrainCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📊 实时监控面板' : '📊 Real-time Monitoring Panel'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  const agents = await getAvailableAgents()
  const status = calculateSystemStatus(agents)

  // Display monitoring dashboard
  console.log(ansis.cyan(isZh ? '🖥️  系统概览' : '🖥️  System Overview'))
  console.log('')
  console.log(`  ${isZh ? '总 Agent 数' : 'Total Agents'}: ${ansis.bold(status.totalAgents.toString())}`)
  console.log(`  ${isZh ? '活跃 Agent' : 'Active Agents'}: ${ansis.green(status.activeAgents.toString())}`)
  console.log(`  ${isZh ? '系统健康' : 'System Health'}: ${status.systemHealth === 'healthy' ? ansis.green('✓') : ansis.yellow('⚠')} ${status.systemHealth}`)
  console.log('')

  // Recent activity
  console.log(ansis.cyan(isZh ? '📈 最近活动' : '📈 Recent Activity'))
  console.log('')
  const recentAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').slice(0, 5)
  for (const agent of recentAgents) {
    console.log(`  ${ansis.green('●')} ${agent.name} - ${agent.status}`)
  }
  console.log('')

  // Performance chart (ASCII art)
  console.log(ansis.cyan(isZh ? '📊 性能图表' : '📊 Performance Chart'))
  console.log('')
  const maxTasks = Math.max(...agents.map(a => a.tasksCompleted || 0))
  for (const agent of agents.slice(0, 5)) {
    const tasks = agent.tasksCompleted || 0
    const barLength = Math.round((tasks / maxTasks) * 30)
    const bar = ansis.green('█'.repeat(barLength)) + ansis.dim('░'.repeat(30 - barLength))
    console.log(`  ${agent.name.substring(0, 25).padEnd(25)} ${bar} ${tasks}`)
  }
  console.log('')

  console.log(ansis.dim(isZh
    ? '提示: 按 Ctrl+C 退出监控'
    : 'Tip: Press Ctrl+C to exit monitoring'))
  console.log('')
  console.log(ansis.yellow(isZh
    ? '注意: 实时监控功能正在开发中。当前显示的是静态快照。'
    : 'Note: Real-time monitoring is under development. Currently showing static snapshot.'))
  console.log('')
}

/**
 * Show brain command help
 */
export function brainHelp(options: BrainCommandOptions = {}): void {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧠 大脑系统命令' : '🧠 Brain System Commands'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  const commands = [
    {
      cmd: 'ccjk brain status',
      desc: isZh ? '显示大脑系统状态和统计信息' : 'Display brain system status and statistics',
    },
    {
      cmd: 'ccjk brain agents',
      desc: isZh ? '列出所有可用的 Agent 及其详细信息' : 'List all available agents with details',
    },
    {
      cmd: 'ccjk brain run [task]',
      desc: isZh ? '执行多 Agent 协作任务' : 'Execute multi-agent collaborative task',
    },
    {
      cmd: 'ccjk brain monitor',
      desc: isZh ? '启动实时监控面板' : 'Launch real-time monitoring panel',
    },
  ]

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`)
    console.log(`    ${ansis.dim(desc)}`)
    console.log('')
  }

  console.log(ansis.dim('─'.repeat(60)))
  console.log(ansis.dim(isZh
    ? '💡 提示: 大脑系统管理 CCJK 的所有 AI Agent，支持多 Agent 协作和任务分配'
    : '💡 Tip: Brain system manages all CCJK AI agents, supporting multi-agent collaboration and task distribution'))
  console.log('')
}

/**
 * Main brain command entry point
 */
export async function brain(
  subcommand?: 'status' | 'agents' | 'run' | 'monitor' | 'help',
  taskOrOptions?: string | TaskExecutionOptions,
  options: BrainCommandOptions = {},
): Promise<void> {
  try {
    // Display banner if not in JSON mode
    if (!options.json) {
      displayBannerWithInfo()
    }

    // Route to appropriate subcommand
    switch (subcommand) {
      case 'status':
        await brainStatus(options)
        break
      case 'agents':
        await brainAgents(options)
        break
      case 'run': {
        const taskOptions = typeof taskOrOptions === 'string'
          ? { task: taskOrOptions }
          : taskOrOptions
        await brainRun(taskOptions, options)
        break
      }
      case 'monitor':
        await brainMonitor(options)
        break
      case 'help':
        brainHelp(options)
        break
      default:
        // If no subcommand, show help
        brainHelp(options)
        break
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
