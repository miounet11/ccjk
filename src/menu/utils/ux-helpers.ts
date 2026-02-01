/**
 * 用户体验优化工具
 *
 * 提供各种 UX 增强功能：
 * - 进度指示器
 * - 加载动画
 * - 成功/错误提示
 * - 确认对话框
 * - 帮助提示
 */

import ansis from 'ansis'

/**
 * 显示加载动画
 */
export function createSpinner(message: string): {
  start: () => void
  stop: (success?: boolean, finalMessage?: string) => void
  update: (newMessage: string) => void
} {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let frameIndex = 0
  let intervalId: NodeJS.Timeout | null = null
  let currentMessage = message

  return {
    start() {
      process.stdout.write('\x1B[?25l') // 隐藏光标
      intervalId = setInterval(() => {
        process.stdout.write(`\r${ansis.cyan(frames[frameIndex])} ${currentMessage}`)
        frameIndex = (frameIndex + 1) % frames.length
      }, 80)
    },

    stop(success = true, finalMessage?: string) {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      process.stdout.write('\r\x1B[K') // 清除当前行
      process.stdout.write('\x1B[?25h') // 显示光标

      const icon = success ? ansis.green('✓') : ansis.red('✗')
      const msg = finalMessage || currentMessage
      console.log(`${icon} ${msg}`)
    },

    update(newMessage: string) {
      currentMessage = newMessage
    },
  }
}

/**
 * 显示进度条
 */
export function showProgress(current: number, total: number, label?: string): void {
  const width = 30
  const percentage = Math.round((current / total) * 100)
  const filled = Math.round((current / total) * width)
  const empty = width - filled

  const bar = ansis.green('█'.repeat(filled)) + ansis.dim('░'.repeat(empty))
  const text = label ? `${label} ` : ''

  process.stdout.write(`\r${text}[${bar}] ${percentage}%`)

  if (current >= total) {
    console.log('') // 换行
  }
}

/**
 * 显示成功消息
 */
export function showSuccess(message: string, details?: string): void {
  console.log('')
  console.log(ansis.green.bold(`✓ ${message}`))
  if (details) {
    console.log(ansis.dim(`  ${details}`))
  }
  console.log('')
}

/**
 * 显示错误消息
 */
export function showError(message: string, details?: string, suggestions?: string[]): void {
  console.log('')
  console.log(ansis.red.bold(`✗ ${message}`))
  if (details) {
    console.log(ansis.dim(`  ${details}`))
  }
  if (suggestions && suggestions.length > 0) {
    console.log('')
    console.log(ansis.yellow('建议:'))
    suggestions.forEach(s => console.log(ansis.dim(`  • ${s}`)))
  }
  console.log('')
}

/**
 * 显示警告消息
 */
export function showWarning(message: string, details?: string): void {
  console.log('')
  console.log(ansis.yellow.bold(`⚠ ${message}`))
  if (details) {
    console.log(ansis.dim(`  ${details}`))
  }
  console.log('')
}

/**
 * 显示信息消息
 */
export function showInfo(message: string, details?: string): void {
  console.log('')
  console.log(ansis.cyan.bold(`ℹ ${message}`))
  if (details) {
    console.log(ansis.dim(`  ${details}`))
  }
  console.log('')
}

/**
 * 显示提示框
 */
export function showTip(title: string, content: string): void {
  const width = 50
  const border = '─'.repeat(width - 2)

  console.log('')
  console.log(ansis.cyan(`╭${border}╮`))
  console.log(ansis.cyan('│') + ansis.yellow.bold(` 💡 ${title}`.padEnd(width - 2)) + ansis.cyan('│'))
  console.log(ansis.cyan(`├${border}┤`))

  // 分割内容为多行
  const words = content.split(' ')
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).length > width - 4) {
      console.log(ansis.cyan('│') + ` ${line}`.padEnd(width - 2) + ansis.cyan('│'))
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) {
    console.log(ansis.cyan('│') + ` ${line}`.padEnd(width - 2) + ansis.cyan('│'))
  }

  console.log(ansis.cyan(`╰${border}╯`))
  console.log('')
}

/**
 * 显示分隔线
 */
export function showDivider(char: string = '─', width: number = 50): void {
  console.log(ansis.dim(char.repeat(width)))
}

/**
 * 显示标题
 */
export function showTitle(title: string, subtitle?: string): void {
  console.log('')
  console.log(ansis.bold.white(title))
  if (subtitle) {
    console.log(ansis.dim(subtitle))
  }
  console.log('')
}

/**
 * 显示列表
 */
export function showList(items: Array<{ label: string; value?: string; icon?: string }>): void {
  items.forEach(item => {
    const icon = item.icon || '•'
    const value = item.value ? ansis.dim(` - ${item.value}`) : ''
    console.log(`  ${icon} ${item.label}${value}`)
  })
}

/**
 * 显示键值对
 */
export function showKeyValue(pairs: Array<{ key: string; value: string }>): void {
  const maxKeyLength = Math.max(...pairs.map(p => p.key.length))

  pairs.forEach(pair => {
    const key = pair.key.padEnd(maxKeyLength)
    console.log(`  ${ansis.dim(key)}  ${pair.value}`)
  })
}

/**
 * 确认对话框
 */
export async function confirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const inquirer = (await import('inquirer')).default

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ])

  return confirmed
}

/**
 * 输入对话框
 */
export async function input(
  message: string,
  options?: {
    default?: string
    validate?: (value: string) => boolean | string
    mask?: string
  }
): Promise<string> {
  const inquirer = (await import('inquirer')).default

  const promptType = options?.mask ? 'password' : 'input'

  const { value } = await inquirer.prompt<{ value: string }>([
    {
      type: promptType,
      name: 'value',
      message,
      default: options?.default,
      validate: options?.validate,
      mask: options?.mask,
    },
  ])

  return value
}

/**
 * 选择对话框
 */
export async function select<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; description?: string }>
): Promise<T> {
  const inquirer = (await import('inquirer')).default

  const formattedChoices = choices.map(c => ({
    name: c.description ? `${c.name}\n   ${ansis.dim(c.description)}` : c.name,
    value: c.value,
    short: c.name,
  }))

  const { selection } = await inquirer.prompt<{ selection: T }>([
    {
      type: 'list',
      name: 'selection',
      message,
      choices: formattedChoices,
      pageSize: 10,
    },
  ])

  return selection
}

/**
 * 多选对话框
 */
export async function multiSelect<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; checked?: boolean }>
): Promise<T[]> {
  const inquirer = (await import('inquirer')).default

  const { selections } = await inquirer.prompt<{ selections: T[] }>([
    {
      type: 'checkbox',
      name: 'selections',
      message,
      choices,
      pageSize: 10,
    },
  ])

  return selections
}

/**
 * 清屏
 */
export function clearScreen(): void {
  console.clear()
}

/**
 * 暂停等待用户按键
 */
export async function pause(message: string = '按 Enter 继续...'): Promise<void> {
  const inquirer = (await import('inquirer')).default

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: ansis.dim(message),
    },
  ])
}
