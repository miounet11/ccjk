/**
 * CCJK Notification Command
 *
 * CLI command for managing task completion notifications.
 * Supports configuration, status display, testing, and channel management.
 */

import type {
  EmailConfig,
  FeishuConfig,
  NotificationChannel,
  SmsConfig,
  WechatConfig,
} from '../utils/notification'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import {
  CloudClient,
  disableChannel,
  disableNotifications,
  enableChannel,
  enableNotifications,
  getConfigSummary,
  getEnabledChannels,
  initializeNotificationConfig,
  loadNotificationConfig,
  maskToken,
  setThreshold,
  THRESHOLD_OPTIONS,
  updateNotificationConfig,
  validateCurrentConfig,
} from '../utils/notification'

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Notification command entry point
 *
 * @param action - Subcommand action
 */
export async function notificationCommand(
  action: string = 'menu',
): Promise<void> {
  switch (action) {
    case 'config':
    case 'configure':
      await runConfigWizard()
      break
    case 'status':
      await showStatus()
      break
    case 'test':
      await sendTestNotification()
      break
    case 'enable':
      await enableNotifications()
      console.log(ansis.green(`✅ ${i18n.t('notification:status.enabled')}`))
      break
    case 'disable':
      await disableNotifications()
      console.log(ansis.yellow(`⏸️ ${i18n.t('notification:status.disabled')}`))
      break
    case 'channels':
      await manageChannels()
      break
    case 'threshold':
      await configureThreshold()
      break
    case 'menu':
    default:
      await showNotificationMenu()
      break
  }
}

// ============================================================================
// Interactive Menu
// ============================================================================

/**
 * Show the notification settings menu
 */
async function showNotificationMenu(): Promise<void> {
  const config = await loadNotificationConfig()
  const enabledChannels = await getEnabledChannels()

  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:menu.title')))
  console.log('')

  // Show current status
  const statusText = config.enabled
    ? ansis.green(i18n.t('notification:status.enabled'))
    : ansis.yellow(i18n.t('notification:status.disabled'))
  console.log(`  ${ansis.dim('状态:')} ${statusText}`)

  if (enabledChannels.length > 0) {
    const channelNames = enabledChannels.map(ch => i18n.t(`notification:channels.${ch}`)).join(', ')
    console.log(`  ${ansis.dim('渠道:')} ${channelNames}`)
  }
  else {
    console.log(`  ${ansis.dim('渠道:')} ${ansis.yellow(i18n.t('notification:channels.noChannels'))}`)
  }

  console.log(`  ${ansis.dim('阈值:')} ${config.threshold} ${i18n.t('notification:config.threshold.minutes', { count: config.threshold })}`)
  console.log('')

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '选择操作:',
    choices: [
      {
        name: config.enabled ? '⏸️  禁用通知' : '▶️  启用通知',
        value: config.enabled ? 'disable' : 'enable',
      },
      { name: '⚙️  配置向导', value: 'config' },
      { name: '📱 管理渠道', value: 'channels' },
      { name: '⏱️  设置阈值', value: 'threshold' },
      { name: '📊 查看状态', value: 'status' },
      { name: '🧪 发送测试', value: 'test' },
      { name: '← 返回', value: 'back' },
    ],
  }])

  if (action === 'back') {
    return
  }

  await notificationCommand(action)
}

// ============================================================================
// Configuration Wizard
// ============================================================================

/**
 * Run the configuration wizard
 */
async function runConfigWizard(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:config.wizard.title')))
  console.log(ansis.dim(i18n.t('notification:config.wizard.welcome')))
  console.log('')

  // Step 1: Generate or confirm device token
  console.log(ansis.yellow(i18n.t('notification:config.wizard.step1')))
  const config = await initializeNotificationConfig()
  console.log(ansis.green(i18n.t('notification:config.wizard.tokenGenerated', { token: maskToken(config.deviceToken) })))
  console.log('')

  // Step 2: Select notification channels
  console.log(ansis.yellow(i18n.t('notification:config.wizard.step2')))
  const channels = await selectChannels()
  console.log('')

  // Step 3: Configure selected channels
  if (channels.length > 0) {
    console.log(ansis.yellow(i18n.t('notification:config.wizard.step3')))
    for (const channel of channels) {
      await configureChannel(channel)
    }
    console.log('')
  }

  // Step 4: Set threshold
  console.log(ansis.yellow(i18n.t('notification:config.wizard.step4')))
  await configureThreshold()
  console.log('')

  // Step 5: Enable and test
  console.log(ansis.yellow(i18n.t('notification:config.wizard.step5')))
  await updateNotificationConfig({ enabled: true })

  const { shouldTest } = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldTest',
    message: '是否发送测试通知?',
    default: true,
  }])

  if (shouldTest) {
    await sendTestNotification()
  }

  console.log('')
  console.log(ansis.bold.green(i18n.t('notification:config.wizard.complete')))
  console.log('')
}

/**
 * Select notification channels
 */
async function selectChannels(): Promise<NotificationChannel[]> {
  const choices = [
    { name: `📱 ${i18n.t('notification:channels.feishu')}`, value: 'feishu' as NotificationChannel },
    { name: `💬 ${i18n.t('notification:channels.wechat')}`, value: 'wechat' as NotificationChannel },
    { name: `📧 ${i18n.t('notification:channels.email')}`, value: 'email' as NotificationChannel },
    { name: `📲 ${i18n.t('notification:channels.sms')}`, value: 'sms' as NotificationChannel },
  ]

  const selected: NotificationChannel[] = []

  for (const choice of choices) {
    const { enable } = await inquirer.prompt([{
      type: 'confirm',
      name: 'enable',
      message: `启用 ${choice.name}?`,
      default: false,
    }])
    if (enable) {
      selected.push(choice.value)
    }
  }

  return selected
}

// ============================================================================
// Channel Configuration
// ============================================================================

/**
 * Configure a specific channel
 */
async function configureChannel(channel: NotificationChannel): Promise<void> {
  console.log('')
  console.log(ansis.cyan(`配置 ${i18n.t(`notification:channels.${channel}`)}:`))

  switch (channel) {
    case 'feishu':
      await configureFeishu()
      break
    case 'wechat':
      await configureWechat()
      break
    case 'email':
      await configureEmail()
      break
    case 'sms':
      await configureSms()
      break
  }
}

/**
 * Configure Feishu channel
 */
async function configureFeishu(): Promise<void> {
  const { webhookUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'webhookUrl',
    message: i18n.t('notification:feishu.webhookUrl'),
    validate: (value: string) => {
      if (!value.startsWith('https://')) {
        return i18n.t('notification:errors.invalidWebhook')
      }
      return true
    },
  }])

  const { secret } = await inquirer.prompt([{
    type: 'input',
    name: 'secret',
    message: `${i18n.t('notification:feishu.secret')} (可选，直接回车跳过):`,
  }])

  const config: FeishuConfig = {
    enabled: true,
    webhookUrl,
    ...(secret && { secret }),
  }

  await enableChannel('feishu', config)
  console.log(ansis.green(`✅ ${i18n.t('notification:channels.feishu')} ${i18n.t('notification:status.configured')}`))
}

/**
 * Configure WeChat Work channel
 */
async function configureWechat(): Promise<void> {
  const { corpId } = await inquirer.prompt([{
    type: 'input',
    name: 'corpId',
    message: i18n.t('notification:wechat.corpId'),
    validate: (value: string) => !!value || i18n.t('notification:errors.invalidWebhook'),
  }])

  const { agentId } = await inquirer.prompt([{
    type: 'input',
    name: 'agentId',
    message: i18n.t('notification:wechat.agentId'),
    validate: (value: string) => !!value || i18n.t('notification:errors.invalidWebhook'),
  }])

  const { secret } = await inquirer.prompt([{
    type: 'input',
    name: 'secret',
    message: i18n.t('notification:wechat.secret'),
    validate: (value: string) => !!value || i18n.t('notification:errors.invalidWebhook'),
  }])

  const config: WechatConfig = {
    enabled: true,
    corpId,
    agentId,
    secret,
  }

  await enableChannel('wechat', config)
  console.log(ansis.green(`✅ ${i18n.t('notification:channels.wechat')} ${i18n.t('notification:status.configured')}`))
}

/**
 * Configure Email channel
 */
async function configureEmail(): Promise<void> {
  const { address } = await inquirer.prompt([{
    type: 'input',
    name: 'address',
    message: i18n.t('notification:email.address'),
    validate: (value: string) => {
      if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value)) {
        return i18n.t('notification:errors.invalidEmail')
      }
      return true
    },
  }])

  const config: EmailConfig = {
    enabled: true,
    address,
  }

  await enableChannel('email', config)
  console.log(ansis.green(`✅ ${i18n.t('notification:channels.email')} ${i18n.t('notification:status.configured')}`))
}

/**
 * Configure SMS channel
 */
async function configureSms(): Promise<void> {
  const { phone } = await inquirer.prompt([{
    type: 'input',
    name: 'phone',
    message: i18n.t('notification:sms.phone'),
    validate: (value: string) => {
      if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) {
        return i18n.t('notification:errors.invalidPhone')
      }
      return true
    },
  }])

  const { countryCode } = await inquirer.prompt([{
    type: 'input',
    name: 'countryCode',
    message: i18n.t('notification:sms.countryCode'),
    default: '+86',
  }])

  const config: SmsConfig = {
    enabled: true,
    phone,
    countryCode,
  }

  await enableChannel('sms', config)
  console.log(ansis.green(`✅ ${i18n.t('notification:channels.sms')} ${i18n.t('notification:status.configured')}`))
}

/**
 * Manage notification channels
 */
async function manageChannels(): Promise<void> {
  const enabledChannels = await getEnabledChannels()

  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:channels.title')))
  console.log('')

  if (enabledChannels.length === 0) {
    console.log(ansis.yellow(i18n.t('notification:channels.noChannels')))
  }
  else {
    console.log(i18n.t('notification:channels.enabledCount', { count: enabledChannels.length }))
    for (const channel of enabledChannels) {
      console.log(`  ✅ ${i18n.t(`notification:channels.${channel}`)}`)
    }
  }

  console.log('')

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '选择操作:',
    choices: [
      { name: '➕ 添加渠道', value: 'add' },
      { name: '➖ 移除渠道', value: 'remove' },
      { name: '← 返回', value: 'back' },
    ],
  }])

  if (action === 'back') {
    return
  }

  if (action === 'add') {
    const allChannels: NotificationChannel[] = ['feishu', 'wechat', 'email', 'sms']
    const availableChannels = allChannels.filter(ch => !enabledChannels.includes(ch))

    if (availableChannels.length === 0) {
      console.log(ansis.yellow('所有渠道都已启用'))
      return
    }

    const { channel } = await inquirer.prompt([{
      type: 'list',
      name: 'channel',
      message: '选择要添加的渠道:',
      choices: availableChannels.map(ch => ({
        name: i18n.t(`notification:channels.${ch}`),
        value: ch,
      })),
    }])

    await configureChannel(channel)
  }
  else if (action === 'remove') {
    if (enabledChannels.length === 0) {
      console.log(ansis.yellow('没有已启用的渠道'))
      return
    }

    const { channel } = await inquirer.prompt([{
      type: 'list',
      name: 'channel',
      message: '选择要移除的渠道:',
      choices: enabledChannels.map(ch => ({
        name: i18n.t(`notification:channels.${ch}`),
        value: ch,
      })),
    }])

    await disableChannel(channel)
    console.log(ansis.green(`✅ 已移除 ${i18n.t(`notification:channels.${channel}`)}`))
  }
}

// ============================================================================
// Threshold Configuration
// ============================================================================

/**
 * Configure notification threshold
 */
async function configureThreshold(): Promise<void> {
  const config = await loadNotificationConfig()

  console.log('')
  console.log(ansis.dim(i18n.t('notification:config.threshold.description')))
  console.log('')

  const { threshold } = await inquirer.prompt([{
    type: 'list',
    name: 'threshold',
    message: i18n.t('notification:config.threshold.title'),
    choices: [
      ...THRESHOLD_OPTIONS.map(opt => ({
        name: opt.label,
        value: opt.value,
      })),
      { name: i18n.t('notification:config.threshold.custom'), value: -1 },
    ],
    default: config.threshold,
  }])

  let finalThreshold = threshold

  if (threshold === -1) {
    const { customValue } = await inquirer.prompt([{
      type: 'input',
      name: 'customValue',
      message: '输入自定义阈值（分钟）:',
      validate: (value: string) => {
        const num = Number.parseInt(value, 10)
        if (Number.isNaN(num) || num < 1) {
          return '请输入大于 0 的数字'
        }
        return true
      },
    }])
    finalThreshold = Number.parseInt(customValue, 10)
  }

  await setThreshold(finalThreshold)
  console.log(ansis.green(`✅ 阈值已设置为 ${finalThreshold} 分钟`))
}

// ============================================================================
// Status Display
// ============================================================================

/**
 * Show notification status
 */
async function showStatus(): Promise<void> {
  const summary = await getConfigSummary()
  const validation = await validateCurrentConfig()

  console.log('')
  console.log(ansis.bold.cyan('📊 通知系统状态'))
  console.log('')

  // Status
  const statusIcon = summary.enabled ? '✅' : '⏸️'
  const statusText = summary.enabled
    ? ansis.green(i18n.t('notification:status.enabled'))
    : ansis.yellow(i18n.t('notification:status.disabled'))
  console.log(`  ${statusIcon} 状态: ${statusText}`)

  // Device token
  console.log(`  🔑 设备令牌: ${ansis.dim(summary.deviceToken)}`)

  // Threshold
  console.log(`  ⏱️  阈值: ${summary.threshold} 分钟`)

  // Channels
  console.log('')
  console.log(ansis.bold('  📱 通知渠道:'))
  if (summary.enabledChannels.length === 0) {
    console.log(`     ${ansis.yellow(i18n.t('notification:channels.noChannels'))}`)
  }
  else {
    for (const channel of summary.enabledChannels) {
      console.log(`     ✅ ${i18n.t(`notification:channels.${channel}`)}`)
    }
  }

  // Quiet hours
  if (summary.quietHours.enabled) {
    console.log('')
    console.log(`  🌙 免打扰: ${summary.quietHours.hours}`)
  }

  // Validation
  if (!validation.valid) {
    console.log('')
    console.log(ansis.bold.red('  ⚠️ 配置问题:'))
    for (const error of validation.errors) {
      console.log(`     ❌ ${error.message}`)
    }
  }

  if (validation.warnings.length > 0) {
    console.log('')
    console.log(ansis.bold.yellow('  ⚠️ 警告:'))
    for (const warning of validation.warnings) {
      console.log(`     ⚠️ ${warning}`)
    }
  }

  console.log('')
}

// ============================================================================
// Test Notification
// ============================================================================

/**
 * Send a test notification
 */
async function sendTestNotification(): Promise<void> {
  const enabledChannels = await getEnabledChannels()

  if (enabledChannels.length === 0) {
    console.log(ansis.yellow(i18n.t('notification:errors.noChannels')))
    return
  }

  console.log('')
  console.log(ansis.cyan(i18n.t('notification:test.sending')))

  try {
    // Initialize cloud client
    const client = CloudClient.getInstance()
    await client.initialize()

    // Send test notification via cloud service
    const results = await client.sendTestNotification()

    console.log('')

    // Display results for each channel
    let hasSuccess = false
    let hasFailure = false

    for (const result of results) {
      const channelName = i18n.t(`notification:channels.${result.channel}`)

      if (result.success) {
        console.log(ansis.green(`✅ ${channelName}: ${i18n.t('notification:test.success')}`))
        hasSuccess = true
      }
      else {
        console.log(ansis.red(`❌ ${channelName}: ${result.error || i18n.t('notification:test.failed')}`))
        hasFailure = true
      }
    }

    console.log('')

    if (hasSuccess) {
      console.log(ansis.dim(i18n.t('notification:test.checkDevice')))
    }

    if (hasFailure) {
      console.log(ansis.yellow(i18n.t('notification:test.partialFailure')))
    }
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(`❌ ${i18n.t('notification:errors.sendFailed')}`))

    if (error instanceof Error) {
      console.log(ansis.dim(error.message))
    }

    console.log('')
    console.log(ansis.yellow(i18n.t('notification:test.troubleshooting')))
    console.log(ansis.dim(`  1. ${i18n.t('notification:test.checkConnection')}`))
    console.log(ansis.dim(`  2. ${i18n.t('notification:test.checkConfig')}`))
    console.log(ansis.dim(`  3. ${i18n.t('notification:test.checkToken')}`))
  }

  console.log('')
}
