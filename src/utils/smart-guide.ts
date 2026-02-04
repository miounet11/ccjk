/**
 * Smart Guide - Intelligent assistant for CCJK
 * Provides zero-learning-curve experience with number-based quick actions
 */

import type { SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

export interface QuickAction {
  id: number
  name: string
  nameZh: string
  icon: string
  description: string
  descriptionZh: string
  command: string
  autoActivate: boolean
  triggers: string[]
}

/**
 * All available quick actions
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 1,
    name: 'Smart Commit',
    nameZh: '智能提交',
    icon: '📝',
    description: 'Auto-generate commit message',
    descriptionZh: '自动生成 commit 消息',
    command: '/commit',
    autoActivate: true,
    triggers: ['commit', 'git', 'push', 'save', '提交', '保存'],
  },
  {
    id: 2,
    name: 'Code Review',
    nameZh: '代码审查',
    icon: '🔍',
    description: 'Deep two-stage code review',
    descriptionZh: '深度两阶段代码审查',
    command: '/review',
    autoActivate: true,
    triggers: ['review', 'check', 'pr', 'merge', '审查', '检查', '合并'],
  },
  {
    id: 3,
    name: 'Write Tests',
    nameZh: '编写测试',
    icon: '🧪',
    description: 'TDD workflow',
    descriptionZh: 'TDD 工作流',
    command: '/tdd',
    autoActivate: true,
    triggers: ['test', 'tdd', 'unit', 'spec', '测试', '单元测试'],
  },
  {
    id: 4,
    name: 'Plan Feature',
    nameZh: '规划功能',
    icon: '📋',
    description: '6-step development workflow',
    descriptionZh: '6步开发流程',
    command: '/workflow',
    autoActivate: true,
    triggers: ['plan', 'feature', 'implement', 'build', 'create', '规划', '功能', '实现', '创建'],
  },
  {
    id: 5,
    name: 'Debug Issue',
    nameZh: '调试问题',
    icon: '🐛',
    description: 'Systematic debugging',
    descriptionZh: '系统性调试',
    command: '/debug',
    autoActivate: true,
    triggers: ['debug', 'bug', 'error', 'fix', 'issue', 'problem', '调试', '错误', '修复', '问题'],
  },
  {
    id: 6,
    name: 'Brainstorm',
    nameZh: '头脑风暴',
    icon: '💡',
    description: 'Explore ideas and solutions',
    descriptionZh: '探索想法和方案',
    command: '/brainstorm',
    autoActivate: true,
    triggers: ['brainstorm', 'idea', 'design', 'think', 'explore', '头脑风暴', '想法', '设计', '探索'],
  },
  {
    id: 7,
    name: 'Verify Code',
    nameZh: '验证代码',
    icon: '✅',
    description: 'Quality verification',
    descriptionZh: '质量验证',
    command: '/verify',
    autoActivate: true,
    triggers: ['verify', 'validate', 'quality', 'deploy', '验证', '质量', '部署'],
  },
  {
    id: 8,
    name: 'Write Docs',
    nameZh: '写文档',
    icon: '📖',
    description: 'Generate documentation',
    descriptionZh: '生成文档',
    command: '/docs',
    autoActivate: false,
    triggers: ['doc', 'docs', 'readme', 'documentation', '文档', '说明'],
  },
]

/**
 * Generate quick actions panel for display
 */
export function generateQuickActionsPanel(lang: SupportedLang = 'en'): string {
  const isZh = lang === 'zh-CN'
  const title = isZh ? '💡 快捷操作（输入数字执行）：' : '💡 Quick Actions (type number to execute):'

  const lines = [
    title,
    '┌─────────────────────────────────────────┐',
  ]

  for (const action of QUICK_ACTIONS) {
    const name = isZh ? action.nameZh : action.name
    const desc = isZh ? action.descriptionZh : action.description
    const line = `│  ${action.id}. ${action.icon} ${name.padEnd(10)} - ${desc.padEnd(16)} │`
    lines.push(line)
  }

  lines.push('└─────────────────────────────────────────┘')
  lines.push(isZh ? '输入数字 (1-8) 或描述你的任务...' : 'Type number (1-8) or describe your task...')

  return lines.join('\n')
}

/**
 * Generate skill reference card
 */
export function generateSkillReferenceCard(lang: SupportedLang = 'en'): string {
  const isZh = lang === 'zh-CN'

  const header = isZh
    ? '╔══════════════════════════════════════════════════════════════╗\n║                    CCJK 技能速查卡                            ║\n╠══════════════════════════════════════════════════════════════╣'
    : '╔══════════════════════════════════════════════════════════════╗\n║                    CCJK Skills Reference                      ║\n╠══════════════════════════════════════════════════════════════╣'

  const lines = [header]

  for (const action of QUICK_ACTIONS) {
    const name = isZh ? action.nameZh : action.name
    const line = `║  ${action.icon} ${name.padEnd(10)}    ${isZh ? '输入' : 'Type'}: ${action.id} ${isZh ? '或' : 'or'} ${action.command.padEnd(12)}            ║`
    lines.push(line)
  }

  lines.push('╠══════════════════════════════════════════════════════════════╣')
  lines.push(isZh
    ? '║  💡 提示: 直接输入数字，Claude 会自动执行对应操作              ║'
    : '║  💡 Tip: Just type a number, Claude will execute automatically ║')
  lines.push('╚══════════════════════════════════════════════════════════════╝')

  return lines.join('\n')
}

/**
 * Get action by number input
 */
export function getActionByNumber(num: number): QuickAction | undefined {
  return QUICK_ACTIONS.find(a => a.id === num)
}

/**
 * Detect suggested action based on user input
 */
export function detectSuggestedAction(input: string): QuickAction | undefined {
  const lowerInput = input.toLowerCase()

  for (const action of QUICK_ACTIONS) {
    for (const trigger of action.triggers) {
      if (lowerInput.includes(trigger.toLowerCase())) {
        return action
      }
    }
  }

  return undefined
}

/**
 * Generate smart guide content for CLAUDE.md injection
 */
export function generateSmartGuideDirective(lang: SupportedLang = 'en'): string {
  const isZh = lang === 'zh-CN'

  const directive = isZh
    ? `
## 🎯 CCJK 智能助手模式

### 对话开始时
在每次对话开始时，显示快捷操作面板：

\`\`\`
${generateQuickActionsPanel('zh-CN')}
\`\`\`

### 数字输入处理
当用户输入单个数字 (1-8) 时，自动执行对应技能：
${QUICK_ACTIONS.map(a => `- **${a.id}** → 执行 ${a.command} (${a.nameZh})`).join('\n')}

### 智能场景感知
根据用户输入自动推荐：
- 提到"提交/commit/push" → 推荐输入 **1**
- 提到"审查/review/检查" → 推荐输入 **2**
- 提到"测试/test/tdd" → 推荐输入 **3**
- 提到"功能/feature/实现" → 推荐输入 **4**
- 提到"bug/错误/修复" → 推荐输入 **5**
- 提到"想法/设计/方案" → 推荐输入 **6**

### 帮助命令
- 用户说"更多"或"帮助" → 显示完整技能列表
- 用户说"?" → 显示快捷操作面板
`
    : `
## 🎯 CCJK Smart Assistant Mode

### At Conversation Start
Display quick actions panel at the start of each conversation:

\`\`\`
${generateQuickActionsPanel('en')}
\`\`\`

### Number Input Handling
When user types a single number (1-8), automatically execute the corresponding skill:
${QUICK_ACTIONS.map(a => `- **${a.id}** → Execute ${a.command} (${a.name})`).join('\n')}

### Intelligent Context Detection
Auto-suggest based on user input:
- Mentions "commit/push/save" → Suggest typing **1**
- Mentions "review/check/pr" → Suggest typing **2**
- Mentions "test/tdd/spec" → Suggest typing **3**
- Mentions "feature/implement/build" → Suggest typing **4**
- Mentions "bug/error/fix" → Suggest typing **5**
- Mentions "idea/design/explore" → Suggest typing **6**

### Help Commands
- User says "more" or "help" → Show full skill list
- User says "?" → Show quick actions panel
`

  return directive
}

/**
 * Path to CLAUDE.md file
 */
function getClaudeMdPath(): string {
  return join(homedir(), '.claude', 'CLAUDE.md')
}

/**
 * Inject smart guide into CLAUDE.md
 */
export async function injectSmartGuide(lang: SupportedLang = 'en'): Promise<boolean> {
  const claudeMdPath = getClaudeMdPath()

  try {
    let content = ''

    if (existsSync(claudeMdPath)) {
      content = await readFile(claudeMdPath, 'utf-8')

      // Check if already injected
      if (content.includes('CCJK 智能助手模式') || content.includes('CCJK Smart Assistant Mode')) {
        // Remove existing smart guide section
        content = content.replace(/\n## 🎯 CCJK (智能助手模式|Smart Assistant Mode)[\s\S]*?(?=\n## |$)/g, '')
      }
    }

    // Add smart guide directive
    const directive = generateSmartGuideDirective(lang)
    content = `${content.trim()}\n${directive}`

    await writeFile(claudeMdPath, content, 'utf-8')
    return true
  }
  catch (error) {
    console.error('Failed to inject smart guide:', error)
    return false
  }
}

/**
 * Remove smart guide from CLAUDE.md
 */
export async function removeSmartGuide(): Promise<boolean> {
  const claudeMdPath = getClaudeMdPath()

  try {
    if (!existsSync(claudeMdPath)) {
      return true
    }

    let content = await readFile(claudeMdPath, 'utf-8')

    // Remove smart guide section
    content = content.replace(/\n## 🎯 CCJK (智能助手模式|Smart Assistant Mode)[\s\S]*?(?=\n## |$)/g, '')

    await writeFile(claudeMdPath, content.trim(), 'utf-8')
    return true
  }
  catch {
    return false
  }
}

/**
 * Check if smart guide is installed
 */
export async function isSmartGuideInstalled(): Promise<boolean> {
  const claudeMdPath = getClaudeMdPath()

  try {
    if (!existsSync(claudeMdPath)) {
      return false
    }

    const content = await readFile(claudeMdPath, 'utf-8')
    return content.includes('CCJK 智能助手模式') || content.includes('CCJK Smart Assistant Mode')
  }
  catch {
    return false
  }
}

/**
 * Get localized action name
 */
export function getActionName(action: QuickAction, lang: SupportedLang = 'en'): string {
  return lang === 'zh-CN' ? action.nameZh : action.name
}

/**
 * Get localized action description
 */
export function getActionDescription(action: QuickAction, lang: SupportedLang = 'en'): string {
  return lang === 'zh-CN' ? action.descriptionZh : action.description
}

/**
 * Format action for menu display
 */
export function formatActionForMenu(action: QuickAction, lang: SupportedLang = 'en'): string {
  const name = getActionName(action, lang)
  const desc = getActionDescription(action, lang)
  return `${action.icon} ${action.id}. ${name} - ${desc}`
}

/**
 * Get all actions formatted for menu
 */
export function getAllActionsForMenu(lang: SupportedLang = 'en'): Array<{ name: string, value: number }> {
  return QUICK_ACTIONS.map(action => ({
    name: formatActionForMenu(action, lang),
    value: action.id,
  }))
}

/**
 * Show Quick Actions menu
 */
export async function showQuickActionsMenu(): Promise<void> {
  const { default: inquirer } = await import('inquirer')
  const { default: ansis } = await import('ansis')

  console.log(ansis.cyan('\n📋 Quick Actions'))
  console.log(generateQuickActionsPanel('en'))

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select an action:',
    choices: [
      ...getAllActionsForMenu('en'),
      { name: '← Back', value: 0 },
    ],
  }])

  if (action === 0)
    return

  const selectedAction = getActionByNumber(action)
  if (selectedAction) {
    console.log(ansis.green(`\nExecuting: ${selectedAction.command}`))
    // The command would be executed by the skill system
  }
}

/**
 * Show Smart Guide configuration menu
 */
export async function showSmartGuideMenu(): Promise<void> {
  const { default: inquirer } = await import('inquirer')
  const { default: ansis } = await import('ansis')

  const installed = await isSmartGuideInstalled()

  console.log(ansis.cyan('\n🎯 Smart Guide Configuration'))
  console.log(`Status: ${installed ? ansis.green('Installed') : ansis.yellow('Not installed')}`)

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select an action:',
    choices: [
      { name: installed ? '🔄 Reinstall Smart Guide' : '📥 Install Smart Guide', value: 'install' },
      { name: '🗑️  Remove Smart Guide', value: 'remove', disabled: !installed },
      { name: '📖 View Reference Card', value: 'view' },
      { name: '← Back', value: 'back' },
    ],
  }])

  switch (action) {
    case 'install':
      await injectSmartGuide('en')
      console.log(ansis.green('✓ Smart Guide installed'))
      break
    case 'remove':
      await removeSmartGuide()
      console.log(ansis.green('✓ Smart Guide removed'))
      break
    case 'view':
      console.log(generateSkillReferenceCard('en'))
      break
  }
}

/**
 * Show Workflows and Skills menu
 */
export async function showWorkflowsAndSkillsMenu(): Promise<void> {
  const { default: inquirer } = await import('inquirer')
  const { default: ansis } = await import('ansis')

  console.log(ansis.cyan('\n📋 Workflows & Skills'))

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select a category:',
    choices: [
      { name: '📝 Development Workflows', value: 'dev' },
      { name: '🔍 Code Review Skills', value: 'review' },
      { name: '🧪 Testing Skills', value: 'test' },
      { name: '📖 Documentation Skills', value: 'docs' },
      { name: '← Back', value: 'back' },
    ],
  }])

  if (action === 'back')
    return

  // Show skills in selected category
  const categorySkills = QUICK_ACTIONS.filter((a) => {
    switch (action) {
      case 'dev': return [4, 6].includes(a.id) // Plan, Brainstorm
      case 'review': return [2, 7].includes(a.id) // Review, Verify
      case 'test': return [3, 5].includes(a.id) // Test, Debug
      case 'docs': return [1, 8].includes(a.id) // Commit, Docs
      default: return false
    }
  })

  console.log(ansis.dim('\nAvailable skills:'))
  for (const skill of categorySkills) {
    console.log(`  ${skill.icon} ${skill.name} - ${skill.description}`)
  }
}

/**
 * Show Output Styles menu
 */
export async function showOutputStylesMenu(): Promise<void> {
  const { default: inquirer } = await import('inquirer')
  const { default: ansis } = await import('ansis')

  console.log(ansis.cyan('\n🎨 Output Styles'))

  const { style } = await inquirer.prompt([{
    type: 'list',
    name: 'style',
    message: 'Select output style:',
    choices: [
      { name: '📝 Standard - Clear and concise', value: 'standard' },
      { name: '📋 Detailed - Comprehensive explanations', value: 'detailed' },
      { name: '⚡ Minimal - Brief responses only', value: 'minimal' },
      { name: '🎯 Technical - Code-focused output', value: 'technical' },
      { name: '← Back', value: 'back' },
    ],
  }])

  if (style === 'back')
    return

  console.log(ansis.green(`\n✓ Output style set to: ${style}`))
}
