/**
 * CCJK Help System - 智能帮助与新手引导
 *
 * 设计理念：
 * 1. 快速查阅 - 一眼看到常用命令
 * 2. 分层帮助 - 从简单到详细
 * 3. 上下文感知 - 根据场景提供相关帮助
 * 4. 新手友好 - 提供入门教程
 */

import ansis from 'ansis'

// ============================================================================
// 类型定义
// ============================================================================

interface CommandInfo {
  name: string
  alias?: string
  description: string
  examples?: string[]
  category: 'core' | 'dev' | 'cloud' | 'system' | 'other'
}

interface HelpTopic {
  name: string
  title: string
  content: () => void
}

// ============================================================================
// 命令速查表
// ============================================================================

const COMMAND_REFERENCE: CommandInfo[] = [
  // Core Commands
  { name: 'ccjk', description: '交互式菜单（默认）', category: 'core', examples: ['ccjk', 'ccjk -l zh-CN'] },
  { name: 'ccjk init', alias: 'i', description: '初始化配置', category: 'core', examples: ['ccjk init', 'ccjk init -f'] },
  { name: 'ccjk update', alias: 'u', description: '更新提示词和工作流', category: 'core', examples: ['ccjk update'] },
  { name: 'ccjk doctor', description: '健康检查与诊断', category: 'core', examples: ['ccjk doctor'] },

  // Development Commands
  { name: 'ccjk mcp <action>', description: 'MCP 服务器管理', category: 'dev', examples: ['ccjk mcp doctor', 'ccjk mcp profile minimal', 'ccjk mcp release'] },
  { name: 'ccjk interview', alias: 'iv', description: '访谈驱动开发', category: 'dev', examples: ['ccjk interview', 'ccjk iv -d quick'] },
  { name: 'ccjk commit', description: '智能 Git 提交', category: 'dev', examples: ['ccjk commit', 'ccjk commit -a'] },
  { name: 'ccjk config-switch', alias: 'cs', description: '切换配置', category: 'dev', examples: ['ccjk cs', 'ccjk cs work'] },

  // Cloud Commands
  { name: 'ccjk cloud skills', description: '同步自定义技能', category: 'cloud', examples: ['ccjk cloud skills sync', 'ccjk cloud skills push'] },
  { name: 'ccjk cloud agents', description: '同步 AI 代理', category: 'cloud', examples: ['ccjk cloud agents', 'ccjk agents list'] },
  { name: 'ccjk cloud plugins', description: '插件市场', category: 'cloud', examples: ['ccjk cloud plugins'] },

  // System Commands
  { name: 'ccjk system setup', description: '首次设置向导', category: 'system', examples: ['ccjk system setup'] },
  { name: 'ccjk system upgrade', description: '升级所有组件', category: 'system', examples: ['ccjk system upgrade'] },
  { name: 'ccjk system versions', description: '检查版本', category: 'system', examples: ['ccjk system versions'] },
  { name: 'ccjk system workspace', description: '工作区诊断', category: 'system', examples: ['ccjk system workspace'] },

  // Other Commands
  { name: 'ccjk workflows', alias: 'wf', description: '管理工作流', category: 'other', examples: ['ccjk wf'] },
  { name: 'ccjk ccr', description: 'CCR 代理管理', category: 'other', examples: ['ccjk ccr'] },
  { name: 'ccjk ccu', description: '使用量统计', category: 'other', examples: ['ccjk ccu'] },
  { name: 'ccjk impact', alias: 'gain', description: '每日 Token 效果页', category: 'other', examples: ['ccjk impact', 'ccjk impact --days 30'] },
  { name: 'ccjk uninstall', description: '卸载配置', category: 'other', examples: ['ccjk uninstall'] },
]

// ============================================================================
// 帮助主题
// ============================================================================

const HELP_TOPICS: HelpTopic[] = [
  {
    name: 'quick',
    title: '快速命令速查卡',
    content: showQuickReference,
  },
  {
    name: 'mcp',
    title: 'MCP 服务器管理',
    content: showMcpHelp,
  },
  {
    name: 'examples',
    title: '常用示例',
    content: showExamples,
  },
  {
    name: 'tutorial',
    title: '新手教程',
    content: showTutorial,
  },
  {
    name: 'faq',
    title: '常见问题',
    content: showFaq,
  },
]

// ============================================================================
// 主帮助命令
// ============================================================================

/**
 * 显示帮助信息
 * @param topic 帮助主题（可选）
 */
export async function help(topic?: string): Promise<void> {
  if (!topic) {
    showHelpMenu()
    return
  }

  const normalizedTopic = topic.toLowerCase()

  // 查找匹配的主题
  const helpTopic = HELP_TOPICS.find(t => t.name === normalizedTopic)
  if (helpTopic) {
    helpTopic.content()
    return
  }

  // 查找匹配的命令
  const command = COMMAND_REFERENCE.find(
    c => c.name.includes(normalizedTopic) || c.alias === normalizedTopic,
  )
  if (command) {
    showCommandHelp(command)
    return
  }

  // 未找到匹配
  console.log(ansis.yellow(`\n⚠️  未找到帮助主题: ${topic}`))
  console.log(ansis.gray('可用主题: quick, mcp, examples, tutorial, faq'))
  console.log(ansis.gray('或输入命令名称查看命令帮助\n'))
}

// ============================================================================
// 帮助菜单
// ============================================================================

function showHelpMenu(): void {
  console.log('')
  console.log(ansis.green.bold('📚 CCJK 帮助中心'))
  console.log(ansis.gray('─'.repeat(50)))
  console.log('')

  console.log(ansis.yellow('快速入门:'))
  console.log(`  ${ansis.green('ccjk help quick')}     ${ansis.gray('- 命令速查卡（推荐新手）')}`)
  console.log(`  ${ansis.green('ccjk help tutorial')}  ${ansis.gray('- 新手入门教程')}`)
  console.log(`  ${ansis.green('ccjk help examples')}  ${ansis.gray('- 常用示例')}`)
  console.log('')

  console.log(ansis.yellow('专题帮助:'))
  console.log(`  ${ansis.green('ccjk help mcp')}       ${ansis.gray('- MCP 服务器管理')}`)
  console.log(`  ${ansis.green('ccjk help faq')}       ${ansis.gray('- 常见问题解答')}`)
  console.log('')

  console.log(ansis.yellow('命令帮助:'))
  console.log(`  ${ansis.green('ccjk help <command>')} ${ansis.gray('- 查看特定命令帮助')}`)
  console.log(`  ${ansis.green('ccjk <command> -h')}   ${ansis.gray('- 查看命令选项')}`)
  console.log('')

  console.log(ansis.gray('─'.repeat(50)))
  console.log(ansis.gray('💡 提示: 在任何菜单中按 ? 或 H 可查看上下文帮助'))
  console.log('')
}

// ============================================================================
// 快速命令速查卡
// ============================================================================

function showQuickReference(): void {
  console.log('')
  console.log(ansis.green.bold('⚡ CCJK 命令速查卡'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  // 最常用命令（高亮显示）
  console.log(ansis.yellow.bold('🔥 最常用命令:'))
  console.log('')
  printCommandBox([
    { cmd: 'ccjk', desc: '打开交互式菜单' },
    { cmd: 'ccjk init', desc: '一键初始化所有配置' },
    { cmd: 'ccjk doctor', desc: '诊断并修复问题' },
    { cmd: 'ccjk mcp doctor', desc: 'MCP 健康检查' },
  ])
  console.log('')

  // 按类别显示
  const categories = [
    { key: 'core', title: '📦 核心命令', emoji: '📦' },
    { key: 'dev', title: '🛠️  开发命令', emoji: '🛠️' },
    { key: 'cloud', title: '☁️  云同步', emoji: '☁️' },
    { key: 'system', title: '🔧 系统管理', emoji: '🔧' },
  ]

  for (const cat of categories) {
    const commands = COMMAND_REFERENCE.filter(c => c.category === cat.key)
    if (commands.length > 0) {
      console.log(ansis.yellow(cat.title))
      for (const cmd of commands) {
        const alias = cmd.alias ? ansis.gray(` (${cmd.alias})`) : ''
        console.log(`  ${ansis.green(cmd.name.padEnd(25))}${alias} ${ansis.gray(cmd.description)}`)
      }
      console.log('')
    }
  }

  console.log(ansis.gray('─'.repeat(60)))
  console.log(ansis.gray('💡 使用 "ccjk help <命令>" 查看详细用法'))
  console.log('')
}

function printCommandBox(commands: Array<{ cmd: string, desc: string }>): void {
  const maxCmdLen = Math.max(...commands.map(c => c.cmd.length))
  const boxWidth = maxCmdLen + 40

  console.log(ansis.gray(`  ┌${'─'.repeat(boxWidth)}┐`))
  for (const { cmd, desc } of commands) {
    const paddedCmd = cmd.padEnd(maxCmdLen)
    console.log(ansis.gray('  │ ') + ansis.green.bold(paddedCmd) + ansis.gray(' → ') + desc.padEnd(boxWidth - maxCmdLen - 5) + ansis.gray(' │'))
  }
  console.log(ansis.gray(`  └${'─'.repeat(boxWidth)}┘`))
}

// ============================================================================
// MCP 帮助
// ============================================================================

function showMcpHelp(): void {
  console.log('')
  console.log(ansis.green.bold('🔌 MCP 服务器管理帮助'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  console.log(ansis.yellow('什么是 MCP?'))
  console.log(ansis.gray('  MCP (Model Context Protocol) 是 Claude 的扩展协议，'))
  console.log(ansis.gray('  允许 AI 访问外部工具和数据源。'))
  console.log('')

  console.log(ansis.yellow('常用命令:'))
  console.log(`  ${ansis.green('ccjk mcp doctor')}          ${ansis.gray('- 检查 MCP 健康状态')}`)
  console.log(`  ${ansis.green('ccjk mcp profile <name>')}  ${ansis.gray('- 切换 MCP 配置预设')}`)
  console.log(`  ${ansis.green('ccjk mcp release')}         ${ansis.gray('- 释放未使用的 MCP')}`)
  console.log('')

  console.log(ansis.yellow('可用预设 (Profile):'))
  console.log(`  ${ansis.green('minimal')}     ${ansis.gray('- 最小配置，仅核心 MCP（推荐日常使用）')}`)
  console.log(`  ${ansis.green('development')} ${ansis.gray('- 开发配置，包含开发工具')}`)
  console.log(`  ${ansis.green('testing')}     ${ansis.gray('- 测试配置，包含测试工具')}`)
  console.log(`  ${ansis.green('research')}    ${ansis.gray('- 研究配置，包含搜索和文档工具')}`)
  console.log(`  ${ansis.green('full')}        ${ansis.gray('- 完整配置，启用所有 MCP')}`)
  console.log('')

  console.log(ansis.yellow('性能优化建议:'))
  console.log(ansis.gray('  1. 日常使用建议使用 minimal 预设'))
  console.log(ansis.gray('  2. 定期运行 "ccjk mcp doctor" 检查健康状态'))
  console.log(ansis.gray('  3. 使用 "ccjk mcp release" 释放不需要的 MCP'))
  console.log(ansis.gray('  4. 避免同时启用超过 5 个 MCP'))
  console.log('')

  console.log(ansis.gray('─'.repeat(60)))
  console.log(ansis.gray('📖 更多信息: https://github.com/anthropics/claude-code'))
  console.log('')
}

// ============================================================================
// 常用示例
// ============================================================================

function showExamples(): void {
  console.log('')
  console.log(ansis.green.bold('📝 CCJK 常用示例'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  console.log(ansis.yellow('🚀 首次使用:'))
  console.log(ansis.gray('  # 一键完成所有配置'))
  console.log(`  ${ansis.green('ccjk init')}`)
  console.log('')

  console.log(ansis.yellow('🔧 日常维护:'))
  console.log(ansis.gray('  # 检查环境健康状态'))
  console.log(`  ${ansis.green('ccjk doctor')}`)
  console.log('')
  console.log(ansis.gray('  # 更新到最新配置'))
  console.log(`  ${ansis.green('ccjk update')}`)
  console.log('')

  console.log(ansis.yellow('⚡ MCP 性能优化:'))
  console.log(ansis.gray('  # 检查 MCP 状态'))
  console.log(`  ${ansis.green('ccjk mcp doctor')}`)
  console.log('')
  console.log(ansis.gray('  # 切换到最小配置（提升性能）'))
  console.log(`  ${ansis.green('ccjk mcp profile minimal')}`)
  console.log('')
  console.log(ansis.gray('  # 释放未使用的 MCP'))
  console.log(`  ${ansis.green('ccjk mcp release')}`)
  console.log('')

  console.log(ansis.yellow('💻 开发工作流:'))
  console.log(ansis.gray('  # 启动访谈驱动开发'))
  console.log(`  ${ansis.green('ccjk interview')}`)
  console.log('')
  console.log(ansis.gray('  # 智能 Git 提交'))
  console.log(`  ${ansis.green('ccjk commit -a')}`)
  console.log('')

  console.log(ansis.yellow('🔄 配置切换:'))
  console.log(ansis.gray('  # 切换工作/个人配置'))
  console.log(`  ${ansis.green('ccjk config-switch work')}`)
  console.log(`  ${ansis.green('ccjk config-switch personal')}`)
  console.log('')

  console.log(ansis.gray('─'.repeat(60)))
  console.log('')
}

// ============================================================================
// 新手教程
// ============================================================================

function showTutorial(): void {
  console.log('')
  console.log(ansis.green.bold('🎓 CCJK 新手入门教程'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  console.log(ansis.yellow.bold('第 1 步: 初始化配置'))
  console.log(ansis.gray('  运行以下命令完成一键配置:'))
  console.log(`  ${ansis.green.bold('ccjk init')}`)
  console.log(ansis.gray('  这将自动配置 API、工作流和 MCP 服务。'))
  console.log('')

  console.log(ansis.yellow.bold('第 2 步: 验证安装'))
  console.log(ansis.gray('  运行健康检查确保一切正常:'))
  console.log(`  ${ansis.green.bold('ccjk doctor')}`)
  console.log(ansis.gray('  如果有问题，按照提示修复。'))
  console.log('')

  console.log(ansis.yellow.bold('第 3 步: 优化性能（推荐）'))
  console.log(ansis.gray('  检查并优化 MCP 配置:'))
  console.log(`  ${ansis.green.bold('ccjk mcp doctor')}`)
  console.log(ansis.gray('  如果 MCP 过多，切换到最小配置:'))
  console.log(`  ${ansis.green.bold('ccjk mcp profile minimal')}`)
  console.log('')

  console.log(ansis.yellow.bold('第 4 步: 开始使用'))
  console.log(ansis.gray('  打开交互式菜单探索更多功能:'))
  console.log(`  ${ansis.green.bold('ccjk')}`)
  console.log('')

  console.log(ansis.green.bold('✅ 恭喜！你已经完成了基本设置。'))
  console.log('')

  console.log(ansis.gray('─'.repeat(60)))
  console.log(ansis.yellow('💡 进阶提示:'))
  console.log(ansis.gray('  • 使用 "ccjk help quick" 查看命令速查卡'))
  console.log(ansis.gray('  • 使用 "ccjk help examples" 查看更多示例'))
  console.log(ansis.gray('  • 使用 "ccjk help faq" 查看常见问题'))
  console.log('')
}

// ============================================================================
// 常见问题
// ============================================================================

function showFaq(): void {
  console.log('')
  console.log(ansis.green.bold('❓ 常见问题解答 (FAQ)'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  const faqs = [
    {
      q: 'Claude Code 的 /compact 命令失效怎么办？',
      a: [
        '这通常是因为 MCP 服务过多导致上下文膨胀。',
        '解决方案:',
        '  1. 运行 "ccjk mcp doctor" 检查 MCP 状态',
        '  2. 运行 "ccjk mcp profile minimal" 切换到最小配置',
        '  3. 运行 "ccjk mcp release" 释放未使用的 MCP',
      ],
    },
    {
      q: 'CCJK 运行很慢怎么办？',
      a: [
        '可能原因: MCP 服务过多、配置文件过大',
        '解决方案:',
        '  1. 运行 "ccjk doctor" 进行全面诊断',
        '  2. 减少同时启用的 MCP 数量（建议 ≤5 个）',
        '  3. 定期清理会话: "ccjk session cleanup"',
      ],
    },
    {
      q: '如何切换中英文界面？',
      a: [
        '方法 1: 运行 "ccjk -l zh-CN" 或 "ccjk -l en"',
        '方法 2: 在菜单中选择 "更改显示语言"',
        '方法 3: 设置环境变量 CCJK_LANG=zh-CN',
      ],
    },
    {
      q: '如何完全卸载 CCJK？',
      a: [
        '运行 "ccjk uninstall" 并选择完全卸载模式。',
        '这将移除所有 CCJK 相关配置。',
      ],
    },
    {
      q: '如何更新 CCJK？',
      a: [
        '方法 1: 运行 "ccjk system upgrade"',
        '方法 2: 运行 "npm update -g ccjk"',
        '方法 3: 在菜单中选择 "一键更新"',
      ],
    },
  ]

  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i]
    console.log(ansis.yellow(`Q${i + 1}: ${faq.q}`))
    for (const line of faq.a) {
      console.log(ansis.gray(`  ${line}`))
    }
    console.log('')
  }

  console.log(ansis.gray('─'.repeat(60)))
  console.log(ansis.gray('📖 更多问题请访问: https://github.com/miounet11/ccjk/issues'))
  console.log('')
}

// ============================================================================
// 命令详细帮助
// ============================================================================

function showCommandHelp(command: CommandInfo): void {
  console.log('')
  console.log(ansis.green.bold(`📖 命令帮助: ${command.name}`))
  console.log(ansis.gray('─'.repeat(50)))
  console.log('')

  console.log(ansis.yellow('描述:'))
  console.log(`  ${command.description}`)
  console.log('')

  if (command.alias) {
    console.log(ansis.yellow('别名:'))
    console.log(`  ${command.alias}`)
    console.log('')
  }

  if (command.examples && command.examples.length > 0) {
    console.log(ansis.yellow('示例:'))
    for (const example of command.examples) {
      console.log(`  ${ansis.green(example)}`)
    }
    console.log('')
  }

  console.log(ansis.gray('─'.repeat(50)))
  console.log(ansis.gray(`运行 "${command.name.split(' ')[0]} ${command.name.split(' ')[1] || ''} --help" 查看所有选项`))
  console.log('')
}

// ============================================================================
// 上下文帮助（在菜单中使用）
// ============================================================================

/**
 * 显示上下文相关的帮助提示
 * @param context 当前上下文（菜单名称）
 */
export function showContextHelp(context: string): void {
  console.log('')
  console.log(ansis.green.bold(`💡 ${context} 帮助`))
  console.log(ansis.gray('─'.repeat(40)))

  switch (context) {
    case 'main':
      console.log(ansis.gray('  1-4: 选择对应功能'))
      console.log(ansis.gray('  5: 查看更多功能'))
      console.log(ansis.gray('  0: 切换语言'))
      console.log(ansis.gray('  Q: 退出'))
      break
    case 'mcp':
      console.log(ansis.gray('  doctor: 检查 MCP 健康状态'))
      console.log(ansis.gray('  profile: 切换 MCP 预设'))
      console.log(ansis.gray('  release: 释放未使用的 MCP'))
      break
    default:
      console.log(ansis.gray('  输入数字选择功能'))
      console.log(ansis.gray('  输入 0 返回上级菜单'))
      console.log(ansis.gray('  输入 Q 退出'))
  }

  console.log(ansis.gray('─'.repeat(40)))
  console.log('')
}

// ============================================================================
// 首次运行引导
// ============================================================================

/**
 * 显示首次运行的欢迎信息
 */
export function showWelcomeGuide(): void {
  console.log('')
  console.log(ansis.green.bold('🎉 欢迎使用 CCJK!'))
  console.log(ansis.gray('─'.repeat(50)))
  console.log('')
  console.log(ansis.gray('CCJK 是 Claude Code 的增强工具包，帮助你:'))
  console.log(ansis.gray('  • 一键配置 Claude Code 环境'))
  console.log(ansis.gray('  • 优化 MCP 服务性能'))
  console.log(ansis.gray('  • 管理工作流和技能'))
  console.log('')
  console.log(ansis.yellow('快速开始:'))
  console.log(`  ${ansis.green('ccjk init')}        ${ansis.gray('- 一键初始化')}`)
  console.log(`  ${ansis.green('ccjk help quick')}  ${ansis.gray('- 查看命令速查卡')}`)
  console.log(`  ${ansis.green('ccjk')}             ${ansis.gray('- 打开交互式菜单')}`)
  console.log('')
  console.log(ansis.gray('─'.repeat(50)))
  console.log('')
}
