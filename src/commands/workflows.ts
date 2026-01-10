/**
 * CCJK Workflows Command
 * Visual workflow management
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { CLAUDE_DIR } from '../constants'

interface WorkflowInfo {
  name: string
  path: string
  description?: string
  installed: boolean
  tags?: string[]
}

// Known workflows with metadata
const WORKFLOW_METADATA: Record<string, { description: string, tags: string[] }> = {
  'workflow': { description: '六阶段开发流程', tags: ['推荐', '核心'] },
  'feat': { description: '功能规划流程', tags: ['推荐'] },
  'git-commit': { description: '智能 Git 提交', tags: ['热门', 'Git'] },
  'git-rollback': { description: '回滚更改', tags: ['Git'] },
  'git-cleanup': { description: '清理分支', tags: ['Git'] },
  'git-worktree': { description: '工作树管理', tags: ['Git'] },
  'bmad': { description: 'BMad 敏捷流程', tags: ['敏捷'] },
  'spec': { description: '规格驱动开发', tags: ['规划'] },
}

function getInstalledWorkflows(): WorkflowInfo[] {
  const commandsDir = join(CLAUDE_DIR, 'commands')
  const workflows: WorkflowInfo[] = []

  if (!existsSync(commandsDir)) {
    return workflows
  }

  function scanDir(dir: string, prefix: string = ''): void {
    try {
      const items = readdirSync(dir, { withFileTypes: true })
      for (const item of items) {
        if (item.isDirectory()) {
          scanDir(join(dir, item.name), `${prefix}${item.name}/`)
        }
        else if (item.name.endsWith('.md')) {
          const name = item.name.replace('.md', '')
          const fullName = prefix ? `${prefix.replace(/\/$/, '')}:${name}` : name
          const meta = WORKFLOW_METADATA[name] || {}
          workflows.push({
            name: `/${fullName}`,
            path: join(dir, item.name),
            description: meta.description,
            installed: true,
            tags: meta.tags,
          })
        }
      }
    }
    catch {
      // Ignore errors
    }
  }

  scanDir(commandsDir)
  return workflows
}

function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0)
    return ''

  return tags.map((tag) => {
    switch (tag) {
      case '推荐': return ansis.bgGreen.black(` ${tag} `)
      case '热门': return ansis.bgYellow.black(` ${tag} `)
      case '核心': return ansis.bgBlue.white(` ${tag} `)
      case 'Git': return ansis.bgMagenta.white(` ${tag} `)
      default: return ansis.bgGray.white(` ${tag} `)
    }
  }).join(' ')
}

export async function showWorkflows(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('┌─────────────────────────────────────────────────────────────┐'))
  console.log(ansis.bold.cyan('│') + ansis.bold.white('  📋 CCJK 工作流管理                                         ') + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  const workflows = getInstalledWorkflows()

  if (workflows.length === 0) {
    console.log(ansis.bold.cyan('│') + ansis.yellow('  ⚠️ 未安装任何工作流                                        ') + ansis.bold.cyan('│'))
    console.log(ansis.bold.cyan('│') + ansis.dim('  运行 npx ccjk init 或 npx ccjk update 安装工作流           ') + ansis.bold.cyan('│'))
  }
  else {
    console.log(ansis.bold.cyan('│') + ansis.bold.green(`  ✅ 已安装工作流 (${workflows.length})`) + ' '.repeat(42 - String(workflows.length).length) + ansis.bold.cyan('│'))
    console.log(`${ansis.bold.cyan('│')}                                                             ${ansis.bold.cyan('│')}`)

    for (const wf of workflows) {
      const tags = formatTags(wf.tags)
      const desc = wf.description || ''
      const nameCol = ansis.green(wf.name.padEnd(20))
      const descCol = ansis.dim(desc.padEnd(25))
      console.log(ansis.bold.cyan('│') + `  ${nameCol} ${descCol} ${tags}`.padEnd(60) + ansis.bold.cyan('│'))
    }
  }

  console.log(`${ansis.bold.cyan('│')}                                                             ${ansis.bold.cyan('│')}`)
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))
  console.log(ansis.bold.cyan('│') + ansis.dim('  💡 在 Claude Code 中输入工作流名称即可使用                 ') + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('│') + ansis.dim('  例如: /ccjk:workflow 实现用户登录功能                      ') + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('└─────────────────────────────────────────────────────────────┘'))
  console.log('')
}

export async function manageWorkflows(): Promise<void> {
  await showWorkflows()

  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: '选择操作：',
    choices: [
      { name: '📋 查看工作流详情', value: 'view' },
      { name: '🔄 更新所有工作流', value: 'update' },
      { name: '🔙 返回', value: 'back' },
    ],
  })

  if (action === 'update') {
    const { update } = await import('./update')
    await update()
  }
  else if (action === 'view') {
    const workflows = getInstalledWorkflows()
    if (workflows.length > 0) {
      const { selected } = await inquirer.prompt<{ selected: string }>({
        type: 'list',
        name: 'selected',
        message: '选择要查看的工作流：',
        choices: workflows.map(wf => ({
          name: `${wf.name} - ${wf.description || '无描述'}`,
          value: wf.path,
        })),
      })

      if (selected && existsSync(selected)) {
        const content = readFileSync(selected, 'utf-8')
        console.log('')
        console.log(ansis.bold.cyan('─'.repeat(60)))
        console.log(content.slice(0, 1000))
        if (content.length > 1000) {
          console.log(ansis.dim('... (内容已截断)'))
        }
        console.log(ansis.bold.cyan('─'.repeat(60)))
      }
    }
  }
}
