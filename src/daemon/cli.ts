/**
 * Daemon CLI Commands
 * Commands for managing the CCJK daemon
 */

import type { DaemonConfig } from './types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import inquirer from 'inquirer'
import ora from 'ora'
import { join } from 'pathe'
import { CcjkDaemon } from './index'

const CONFIG_DIR = join(homedir(), '.ccjk')
const CONFIG_FILE = join(CONFIG_DIR, 'daemon-config.json')
const PID_FILE = join(CONFIG_DIR, 'daemon.pid')

/**
 * Setup daemon configuration
 */
export async function setupDaemon(): Promise<void> {
  console.log('🔧 CCJK Daemon Setup\n')

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select daemon mode:',
      choices: [
        { name: '📧 Email (traditional email-based control)', value: 'email' },
        { name: '☁️  Cloud (cloud API control via api.claudehome.cn)', value: 'cloud' },
        { name: '🔄 Hybrid (both email and cloud control)', value: 'hybrid' },
      ],
      default: 'email',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your email address:',
      validate: (input: string) => {
        if (!input.includes('@')) {
          return 'Please enter a valid email address'
        }
        return true
      },
      when: (answers: any) => answers.mode === 'email' || answers.mode === 'hybrid',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Email password (or app-specific password):',
      mask: '*',
      validate: (input: string) => {
        if (!input) {
          return 'Password is required'
        }
        return true
      },
      when: (answers: any) => answers.mode === 'email' || answers.mode === 'hybrid',
    },
    {
      type: 'input',
      name: 'cloudToken',
      message: 'Cloud device token (from api.claudehome.cn):',
      validate: (input: string) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid cloud token'
        }
        return true
      },
      when: (answers: any) => answers.mode === 'cloud' || answers.mode === 'hybrid',
    },
    {
      type: 'input',
      name: 'deviceName',
      message: 'Device name (for cloud registration):',
      default: () => {
        const os = require('node:os')
        return `CCJK Device (${os.hostname()})`
      },
      when: (answers: any) => answers.mode === 'cloud' || answers.mode === 'hybrid',
    },
    {
      type: 'input',
      name: 'allowedSenders',
      message: 'Allowed sender emails (comma-separated):',
      default: (answers: any) => answers.email || '',
      filter: (input: string) => input.split(',').map(s => s.trim()).filter(Boolean),
      when: (answers: any) => answers.mode === 'email' || answers.mode === 'hybrid',
    },
    {
      type: 'input',
      name: 'projectPath',
      message: 'Project path:',
      default: process.cwd(),
    },
    {
      type: 'number',
      name: 'checkInterval',
      message: 'Check interval (seconds):',
      default: 30,
      filter: (input: number) => input * 1000,
      when: (answers: any) => answers.mode === 'email' || answers.mode === 'hybrid',
    },
    {
      type: 'number',
      name: 'heartbeatInterval',
      message: 'Heartbeat interval (seconds):',
      default: 30,
      filter: (input: number) => input * 1000,
      when: (answers: any) => answers.mode === 'cloud' || answers.mode === 'hybrid',
    },
    {
      type: 'confirm',
      name: 'debug',
      message: 'Enable debug logging?',
      default: false,
    },
  ])

  const config: DaemonConfig = {
    email: {
      email: answers.email || 'noreply@example.com',
      password: answers.password || '',
    },
    allowedSenders: answers.allowedSenders || [],
    projectPath: answers.projectPath,
    checkInterval: answers.checkInterval || 30000,
    heartbeatInterval: answers.heartbeatInterval || 30000,
    debug: answers.debug,
    mode: answers.mode,
    cloudToken: answers.cloudToken,
    deviceName: answers.deviceName,
  }

  // Create config directory if not exists
  if (!existsSync(CONFIG_DIR)) {
    const fs = await import('node:fs/promises')
    await fs.mkdir(CONFIG_DIR, { recursive: true })
  }

  // Save config
  // Note: In production, passwords should be encrypted
  const configToSave = { ...config }
  if (config.mode === 'cloud') {
    // Don't save empty email config for cloud-only mode
    configToSave.email = {
      email: 'noreply@example.com',
      password: '',
    }
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2))

  console.log('\n✅ Configuration saved to:', CONFIG_FILE)
  console.log(`\n📡 Mode: ${answers.mode.toUpperCase()}`)

  if (answers.mode === 'email' || answers.mode === 'hybrid') {
    console.log('\n💡 Email control:')
    console.log('   Send an email to test:')
    console.log(`      To: ${answers.email}`)
    console.log('      Subject: [CCJK] Test')
    console.log('      Body: echo "Hello CCJK!"')
  }

  if (answers.mode === 'cloud' || answers.mode === 'hybrid') {
    console.log('\n💡 Cloud control:')
    console.log('   1. Device registered to api.claudehome.cn')
    console.log('   2. Use the web interface to send commands')
    console.log(`   3. Device name: ${answers.deviceName}`)
  }

  console.log('\n💡 Next steps:')
  console.log('   Run: ccjk daemon start')
}

/**
 * Start daemon
 */
export async function startDaemon(): Promise<void> {
  // Check if config exists
  if (!existsSync(CONFIG_FILE)) {
    console.error('❌ Configuration not found. Please run: ccjk daemon setup')
    process.exit(1)
  }

  // Check if already running
  if (existsSync(PID_FILE)) {
    const pid = readFileSync(PID_FILE, 'utf-8').trim()
    console.error(`❌ Daemon is already running (PID: ${pid})`)
    console.log('   Run: ccjk daemon stop')
    process.exit(1)
  }

  // Load config
  const config: DaemonConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))

  // Create daemon
  const daemon = new CcjkDaemon(config)

  // Start daemon
  const spinner = ora('Starting CCJK Daemon...').start()

  try {
    await daemon.start()
    spinner.succeed('CCJK Daemon started successfully')

    // Save PID
    writeFileSync(PID_FILE, process.pid.toString())

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, stopping daemon...')
      await daemon.stop()
      if (existsSync(PID_FILE)) {
        const fs = require('node:fs')
        fs.unlinkSync(PID_FILE)
      }
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, stopping daemon...')
      await daemon.stop()
      if (existsSync(PID_FILE)) {
        const fs = require('node:fs')
        fs.unlinkSync(PID_FILE)
      }
      process.exit(0)
    })

    // Keep process alive
    console.log('\n💡 Press Ctrl+C to stop the daemon')
  }
  catch (error: any) {
    spinner.fail('Failed to start daemon')
    console.error(error.message)
    process.exit(1)
  }
}

/**
 * Stop daemon
 */
export async function stopDaemon(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    console.log('⚠️  Daemon is not running')
    return
  }

  const pid = readFileSync(PID_FILE, 'utf-8').trim()
  const spinner = ora(`Stopping daemon (PID: ${pid})...`).start()

  try {
    // Send SIGTERM to process
    process.kill(Number.parseInt(pid), 'SIGTERM')

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Remove PID file
    if (existsSync(PID_FILE)) {
      const fs = require('node:fs')
      fs.unlinkSync(PID_FILE)
    }

    spinner.succeed('Daemon stopped successfully')
  }
  catch (error: any) {
    spinner.fail('Failed to stop daemon')
    console.error(error.message)
    process.exit(1)
  }
}

/**
 * Show daemon status
 */
export async function showStatus(): Promise<void> {
  console.log('📊 CCJK Daemon Status\n')

  // Check if running
  if (!existsSync(PID_FILE)) {
    console.log('Status: ⚪ Not running')
    return
  }

  const pid = readFileSync(PID_FILE, 'utf-8').trim()

  // Check if process exists
  try {
    process.kill(Number.parseInt(pid), 0)
    console.log('Status: 🟢 Running')
    console.log(`PID: ${pid}`)
  }
  catch {
    console.log('Status: 🔴 Dead (PID file exists but process not found)')
    console.log('Run: ccjk daemon start')
    return
  }

  // Load config
  if (existsSync(CONFIG_FILE)) {
    const config: DaemonConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    console.log(`\nConfiguration:`)
    console.log(`  Mode: ${config.mode?.toUpperCase() || 'EMAIL'}`)

    if (config.mode === 'email' || config.mode === 'hybrid') {
      console.log(`  Email: ${config.email.email}`)
      console.log(`  Check Interval: ${config.checkInterval}ms`)
      console.log(`  Allowed Senders: ${config.allowedSenders.join(', ') || 'None'}`)
    }

    if (config.mode === 'cloud' || config.mode === 'hybrid') {
      console.log(`  Cloud API: ${config.cloudApiUrl || 'https://api.claudehome.cn/api/control'}`)
      console.log(`  Device Name: ${config.deviceName || 'N/A'}`)
      console.log(`  Heartbeat Interval: ${config.heartbeatInterval}ms`)
    }

    console.log(`  Project: ${config.projectPath}`)
    console.log(`  Debug: ${config.debug ? 'Enabled' : 'Disabled'}`)
  }
}

/**
 * Show daemon logs
 */
export async function showLogs(): Promise<void> {
  console.log('📋 CCJK Daemon Logs\n')
  console.log('⚠️  Log viewing not implemented yet')
  console.log('💡 Logs are currently printed to stdout')
  console.log('   Run daemon in foreground to see logs: ccjk daemon start')
}
