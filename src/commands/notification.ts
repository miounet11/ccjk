/**
 * CCJK Notification Command
 *
 * CLI command for managing task completion notifications.
 * Supports configuration, status display, testing, channel management,
 * and cloud device binding.
 */

import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import {
    bindDevice,
    getBindingStatus,
    isDeviceBound,
    sendNotification,
    unbindDevice,
} from '../services/cloud-notification'
import {
    getLocalNotificationService,
    isShortcutsAvailable,
    isValidBarkUrl,
    listShortcuts,
    loadLocalNotificationConfig,
    saveLocalNotificationConfig,
} from '../services/local-notification'
import type {
    EmailConfig,
    FeishuConfig,
    NotificationChannel,
    SmsConfig,
    WechatConfig,
} from '../utils/notification'
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
 * @param args - Additional arguments (e.g., binding code)
 */
export async function notificationCommand(
  action: string = 'menu',
  args?: string[],
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
    case 'bind':
      console.log(ansis.yellow(i18n.t('notification:cloud.migrateToRemoteSetup')))
      await handleBind(args?.[0])
      break
    case 'unbind':
      await handleUnbind()
      break
    case 'cloud-status':
      await showCloudStatus()
      break
    case 'local-config':
      await configureLocalNotification()
      break
    case 'local-test':
      await testLocalNotification()
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
  const cloudBound = isDeviceBound()

  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:menu.title')))
  console.log('')

  // Show current status
  const statusText = config.enabled
    ? ansis.green(i18n.t('notification:status.enabled'))
    : ansis.yellow(i18n.t('notification:status.disabled'))
  console.log(`  ${ansis.dim(i18n.t('notification:menu.statusLabel'))} ${statusText}`)

  // Show cloud binding status
  const cloudStatusText = cloudBound
    ? ansis.green(i18n.t('notification:cloud.bound'))
    : ansis.yellow(i18n.t('notification:cloud.notBound'))
  console.log(`  ${ansis.dim(i18n.t('notification:cloud.statusLabel'))} ${cloudStatusText}`)

  if (enabledChannels.length > 0) {
    const channelNames = enabledChannels.map(ch => i18n.t(`notification:channels.${ch}`)).join(', ')
    console.log(`  ${ansis.dim(i18n.t('notification:menu.channelsLabel'))} ${channelNames}`)
  }
  else {
    console.log(`  ${ansis.dim(i18n.t('notification:menu.channelsLabel'))} ${ansis.yellow(i18n.t('notification:channels.noChannels'))}`)
  }

  console.log(`  ${ansis.dim(i18n.t('notification:menu.thresholdLabel'))} ${config.threshold} ${i18n.t('notification:config.threshold.minutes', { count: config.threshold })}`)
  console.log('')

  // Build menu choices based on current state
  const choices = []

  // Cloud binding option (prioritized)
  if (!cloudBound) {
    choices.push({ name: `🔗 ${i18n.t('notification:cloud.bindDevice')}`, value: 'bind' })
  }
  else {
    choices.push({ name: `☁️  ${i18n.t('notification:cloud.viewStatus')}`, value: 'cloud-status' })
  }

  // Enable/disable toggle
  choices.push({
    name: config.enabled
      ? `⏸️  ${i18n.t('notification:menu.disable')}`
      : `▶️  ${i18n.t('notification:menu.enable')}`,
    value: config.enabled ? 'disable' : 'enable',
  })

  // Other options
  choices.push(
    { name: `⚙️  ${i18n.t('notification:menu.configWizard')}`, value: 'config' },
    { name: `📱 ${i18n.t('notification:menu.manageChannels')}`, value: 'channels' },
    { name: `🔔 ${i18n.t('notification:local.menuTitle')}`, value: 'local-config' },
    { name: `⏱️  ${i18n.t('notification:menu.setThreshold')}`, value: 'threshold' },
    { name: `📊 ${i18n.t('notification:menu.viewStatus')}`, value: 'status' },
    { name: `🧪 ${i18n.t('notification:menu.sendTest')}`, value: 'test' },
  )

  // Unbind option if bound
  if (cloudBound) {
    choices.push({ name: `🔓 ${i18n.t('notification:cloud.unbindDevice')}`, value: 'unbind' })
  }

  choices.push({ name: `← ${i18n.t('notification:menu.back')}`, value: 'back' })

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: i18n.t('notification:menu.selectAction'),
    choices,
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
  console.log(ansis.green(`配置 ${i18n.t(`notification:channels.${channel}`)}:`))

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
  console.log(ansis.green(i18n.t('notification:test.sending')))

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

// ============================================================================
// Cloud Device Binding
// ============================================================================

/**
 * Handle device binding with cloud service
 *
 * @param code - Optional binding code (will prompt if not provided)
 */
async function handleBind(code?: string): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:cloud.bindTitle')))
  console.log('')

  // Check if already bound
  if (isDeviceBound()) {
    console.log(ansis.yellow(i18n.t('notification:cloud.alreadyBound')))
    console.log('')

    const { confirmRebind } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmRebind',
      message: i18n.t('notification:cloud.confirmRebind'),
      default: false,
    }])

    if (!confirmRebind) {
      return
    }

    // Unbind first
    unbindDevice()
  }

  // Get binding code if not provided
  let bindingCode = code
  if (!bindingCode) {
    console.log(ansis.dim(i18n.t('notification:cloud.bindInstructions')))
    console.log('')

    const { inputCode } = await inquirer.prompt([{
      type: 'input',
      name: 'inputCode',
      message: i18n.t('notification:cloud.enterCode'),
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return i18n.t('notification:cloud.codeRequired')
        }
        if (value.trim().length < 4) {
          return i18n.t('notification:cloud.codeInvalid')
        }
        return true
      },
    }])

    bindingCode = inputCode.trim()
  }

  console.log('')
  console.log(ansis.green(i18n.t('notification:cloud.binding')))

  try {
    const result = await bindDevice(bindingCode!)

    if (result.success) {
      console.log('')
      console.log(ansis.green(`✅ ${i18n.t('notification:cloud.bindSuccess')}`))
      console.log('')
      console.log(ansis.dim(i18n.t('notification:cloud.deviceId', { id: result.deviceId || 'N/A' })))
      console.log('')

      // Ask if user wants to send a test notification
      const { sendTest } = await inquirer.prompt([{
        type: 'confirm',
        name: 'sendTest',
        message: i18n.t('notification:cloud.sendTestAfterBind'),
        default: true,
      }])

      if (sendTest) {
        await sendCloudTestNotification()
      }
    }
    else {
      console.log('')
      console.log(ansis.red(`❌ ${i18n.t('notification:cloud.bindFailed')}`))
      console.log(ansis.dim(result.error || i18n.t('notification:cloud.unknownError')))
      console.log('')

      // Show troubleshooting tips
      console.log(ansis.yellow(i18n.t('notification:cloud.bindTroubleshooting')))
      console.log(ansis.dim(`  1. ${i18n.t('notification:cloud.checkCode')}`))
      console.log(ansis.dim(`  2. ${i18n.t('notification:cloud.checkExpiry')}`))
      console.log(ansis.dim(`  3. ${i18n.t('notification:cloud.checkNetwork')}`))
    }
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(`❌ ${i18n.t('notification:cloud.bindError')}`))
    if (error instanceof Error) {
      console.log(ansis.dim(error.message))
    }
  }

  console.log('')
}

/**
 * Handle device unbinding
 */
async function handleUnbind(): Promise<void> {
  console.log('')

  if (!isDeviceBound()) {
    console.log(ansis.yellow(i18n.t('notification:cloud.notBoundYet')))
    console.log('')
    return
  }

  const { confirmUnbind } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmUnbind',
    message: i18n.t('notification:cloud.confirmUnbind'),
    default: false,
  }])

  if (!confirmUnbind) {
    console.log(ansis.dim(i18n.t('notification:cloud.unbindCancelled')))
    console.log('')
    return
  }

  unbindDevice()
  console.log(ansis.green(`✅ ${i18n.t('notification:cloud.unbindSuccess')}`))
  console.log('')
}

/**
 * Show cloud binding status
 */
async function showCloudStatus(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:cloud.statusTitle')))
  console.log('')

  const status = await getBindingStatus()

  if (!status.bound) {
    console.log(`  ${ansis.yellow('⚠️')} ${i18n.t('notification:cloud.notBound')}`)
    console.log('')
    console.log(ansis.dim(i18n.t('notification:cloud.bindHint')))
    console.log('')
    return
  }

  console.log(`  ${ansis.green('✅')} ${i18n.t('notification:cloud.bound')}`)
  console.log('')

  if (status.deviceId) {
    console.log(`  ${ansis.dim(i18n.t('notification:cloud.deviceIdLabel'))} ${status.deviceId}`)
  }

  if (status.deviceInfo) {
    console.log(`  ${ansis.dim(i18n.t('notification:cloud.deviceNameLabel'))} ${status.deviceInfo.name}`)
    console.log(`  ${ansis.dim(i18n.t('notification:cloud.platformLabel'))} ${status.deviceInfo.platform}`)
  }

  if (status.lastUsed) {
    const lastUsedDate = new Date(status.lastUsed)
    console.log(`  ${ansis.dim(i18n.t('notification:cloud.lastUsedLabel'))} ${lastUsedDate.toLocaleString()}`)
  }

  console.log('')
}

/**
 * Send a test notification via cloud service
 */
async function sendCloudTestNotification(): Promise<void> {
  console.log('')
  console.log(ansis.green(i18n.t('notification:cloud.sendingTest')))

  try {
    const result = await sendNotification({
      title: i18n.t('notification:cloud.testTitle'),
      body: i18n.t('notification:cloud.testBody'),
      type: 'success',
    })

    if (result.success) {
      console.log(ansis.green(`✅ ${i18n.t('notification:cloud.testSuccess')}`))
      console.log(ansis.dim(i18n.t('notification:cloud.checkPhone')))
    }
    else {
      console.log(ansis.red(`❌ ${i18n.t('notification:cloud.testFailed')}`))
      console.log(ansis.dim(result.error || i18n.t('notification:cloud.unknownError')))
    }
  }
  catch (error) {
    console.log(ansis.red(`❌ ${i18n.t('notification:cloud.testError')}`))
    if (error instanceof Error) {
      console.log(ansis.dim(error.message))
    }
  }

  console.log('')
}

// ============================================================================
// Local Notification Configuration
// ============================================================================

/**
 * Configure local notification settings
 */
async function configureLocalNotification(): Promise<void> {
  const config = await loadLocalNotificationConfig()
  const shortcutsAvailable = await isShortcutsAvailable()

  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:local.title')))
  console.log(ansis.dim(i18n.t('notification:local.description')))
  console.log('')

  // Show current status
  console.log(ansis.bold(i18n.t('notification:local.currentStatus')))

  // Shortcuts status
  if (shortcutsAvailable) {
    const shortcutsStatus = config.shortcutName
      ? ansis.green(i18n.t('notification:status.enabled'))
      : ansis.yellow(i18n.t('notification:status.disabled'))
    console.log(`  🍎 ${i18n.t('notification:local.shortcuts.name')}: ${shortcutsStatus}`)
    if (config.shortcutName) {
      console.log(`     ${ansis.dim(i18n.t('notification:local.shortcuts.currentShortcut', { name: config.shortcutName }))}`)
    }
  }
  else {
    console.log(`  🍎 ${i18n.t('notification:local.shortcuts.name')}: ${ansis.dim(i18n.t('notification:local.shortcuts.notAvailable'))}`)
  }

  // Bark status
  const barkStatus = config.barkUrl
    ? ansis.green(i18n.t('notification:status.enabled'))
    : ansis.yellow(i18n.t('notification:status.disabled'))
  console.log(`  📱 ${i18n.t('notification:local.bark.name')}: ${barkStatus}`)
  if (config.barkUrl) {
    console.log(`     ${ansis.dim(i18n.t('notification:local.bark.currentServer', { url: config.barkUrl }))}`)
  }

  console.log('')

  // Build menu choices
  const choices: Array<{ name: string, value: string }> = []

  if (shortcutsAvailable) {
    choices.push({
      name: config.shortcutName
        ? `🍎 ${i18n.t('notification:local.shortcuts.configure')}`
        : `🍎 ${i18n.t('notification:local.shortcuts.enable')}`,
      value: 'shortcuts',
    })
  }

  choices.push({
    name: config.barkUrl
      ? `📱 ${i18n.t('notification:local.bark.configure')}`
      : `📱 ${i18n.t('notification:local.bark.enable')}`,
    value: 'bark',
  })

  choices.push(
    { name: `🧪 ${i18n.t('notification:local.testLocal')}`, value: 'test' },
    { name: `← ${i18n.t('notification:menu.back')}`, value: 'back' },
  )

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: i18n.t('notification:menu.selectAction'),
    choices,
  }])

  if (action === 'back') {
    return
  }

  switch (action) {
    case 'shortcuts':
      await configureShortcuts()
      break
    case 'bark':
      await configureBark()
      break
    case 'test':
      await testLocalNotification()
      break
  }
}

/**
 * Configure macOS Shortcuts
 */
async function configureShortcuts(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:local.shortcuts.title')))
  console.log(ansis.dim(i18n.t('notification:local.shortcuts.description')))
  console.log('')

  // List available shortcuts
  console.log(ansis.dim(i18n.t('notification:local.shortcuts.scanning')))
  const shortcuts = await listShortcuts()

  if (shortcuts.length === 0) {
    console.log(ansis.yellow(i18n.t('notification:local.shortcuts.noShortcuts')))
    console.log(ansis.dim(i18n.t('notification:local.shortcuts.createHint')))
    console.log('')
    return
  }

  console.log(ansis.green(i18n.t('notification:local.shortcuts.found', { count: shortcuts.length })))
  console.log('')

  const { shortcutName } = await inquirer.prompt([{
    type: 'list',
    name: 'shortcutName',
    message: i18n.t('notification:local.shortcuts.selectShortcut'),
    choices: [
      ...shortcuts.map(s => ({ name: s, value: s })),
      { name: i18n.t('notification:local.shortcuts.enterManually'), value: '__manual__' },
      { name: i18n.t('notification:local.shortcuts.disable'), value: '__disable__' },
    ],
  }])

  if (shortcutName === '__disable__') {
    await saveLocalNotificationConfig({ shortcutName: '' })
    console.log(ansis.yellow(`⏸️ ${i18n.t('notification:local.shortcuts.disabled')}`))
    return
  }

  let finalShortcutName = shortcutName

  if (shortcutName === '__manual__') {
    const { manualName } = await inquirer.prompt([{
      type: 'input',
      name: 'manualName',
      message: i18n.t('notification:local.shortcuts.enterName'),
      validate: (value: string) => !!value.trim() || i18n.t('notification:errors.required'),
    }])
    finalShortcutName = manualName.trim()
  }

  // Save configuration
  await saveLocalNotificationConfig({ shortcutName: finalShortcutName })

  console.log(ansis.green(`✅ ${i18n.t('notification:local.shortcuts.configured', { name: finalShortcutName })}`))

  // Offer to test
  const { shouldTest } = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldTest',
    message: i18n.t('notification:local.shortcuts.testNow'),
    default: true,
  }])

  if (shouldTest) {
    await testShortcutsNotification(finalShortcutName)
  }
}

/**
 * Configure Bark push notification
 */
async function configureBark(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('notification:local.bark.title')))
  console.log(ansis.dim(i18n.t('notification:local.bark.description')))
  console.log('')

  const config = await loadLocalNotificationConfig()

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: i18n.t('notification:menu.selectAction'),
    choices: [
      { name: i18n.t('notification:local.bark.configureServer'), value: 'configure' },
      { name: i18n.t('notification:local.bark.disable'), value: 'disable' },
      { name: `← ${i18n.t('notification:menu.back')}`, value: 'back' },
    ],
  }])

  if (action === 'back') {
    return
  }

  if (action === 'disable') {
    await saveLocalNotificationConfig({ barkUrl: '' })
    console.log(ansis.yellow(`⏸️ ${i18n.t('notification:local.bark.disabled')}`))
    return
  }

  // Configure Bark server
  const { barkUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'barkUrl',
    message: i18n.t('notification:local.bark.enterUrl'),
    default: config.barkUrl || 'https://api.day.app/your-key',
    validate: (value: string) => {
      if (!isValidBarkUrl(value)) {
        return i18n.t('notification:local.bark.invalidUrl')
      }
      return true
    },
  }])

  // Save configuration
  await saveLocalNotificationConfig({ barkUrl })

  console.log(ansis.green(`✅ ${i18n.t('notification:local.bark.configured')}`))

  // Offer to test
  const { shouldTest } = await inquirer.prompt([{
    type: 'confirm',
    name: 'shouldTest',
    message: i18n.t('notification:local.bark.testNow'),
    default: true,
  }])

  if (shouldTest) {
    await testBarkNotification(barkUrl)
  }
}

/**
 * Test local notification
 */
async function testLocalNotification(): Promise<void> {
  const config = await loadLocalNotificationConfig()

  console.log('')
  console.log(ansis.green(i18n.t('notification:local.testing')))
  console.log('')

  let hasAnyEnabled = false

  // Test Shortcuts if configured
  if (config.shortcutName) {
    hasAnyEnabled = true
    await testShortcutsNotification(config.shortcutName)
  }

  // Test Bark if configured
  if (config.barkUrl) {
    hasAnyEnabled = true
    await testBarkNotification(config.barkUrl)
  }

  if (!hasAnyEnabled) {
    console.log(ansis.yellow(i18n.t('notification:local.noLocalEnabled')))
    console.log(ansis.dim(i18n.t('notification:local.configureFirst')))
  }

  console.log('')
}

/**
 * Test Shortcuts notification
 */
async function testShortcutsNotification(shortcutName: string): Promise<void> {
  console.log(ansis.dim(`${i18n.t('notification:local.shortcuts.testing', { name: shortcutName })}...`))

  try {
    const service = await getLocalNotificationService()
    await service.sendShortcutNotification(shortcutName, {
      title: i18n.t('notification:local.testTitle'),
      body: i18n.t('notification:local.testBody'),
    })
    console.log(ansis.green(`✅ ${i18n.t('notification:local.shortcuts.name')}: ${i18n.t('notification:test.success')}`))
  }
  catch (error) {
    console.log(ansis.red(`❌ ${i18n.t('notification:local.shortcuts.name')}: ${error instanceof Error ? error.message : i18n.t('notification:test.failed')}`))
  }
}

/**
 * Test Bark notification
 */
async function testBarkNotification(barkUrl: string): Promise<void> {
  console.log(ansis.dim(`${i18n.t('notification:local.bark.testing')}...`))

  try {
    const service = await getLocalNotificationService()
    await service.sendBarkNotification(barkUrl, {
      title: i18n.t('notification:local.testTitle'),
      body: i18n.t('notification:local.testBody'),
    })
    console.log(ansis.green(`✅ ${i18n.t('notification:local.bark.name')}: ${i18n.t('notification:test.success')}`))
  }
  catch (error) {
    console.log(ansis.red(`❌ ${i18n.t('notification:local.bark.name')}: ${error instanceof Error ? error.message : i18n.t('notification:test.failed')}`))
  }
}
