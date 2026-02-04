/**
 * CCJK Daemon
 * Main daemon class that orchestrates email checking, cloud API communication,
 * task execution, result sending, WebSocket log streaming, and mobile control
 *
 * Supports three modes:
 * - email: Traditional email-based remote control
 * - cloud: Cloud API-based remote control via api.claudehome.cn
 * - hybrid: Both email and cloud control
 */

import type { CloudCommand, CloudCommandResult, DaemonConfig, DaemonStatus, Task } from './types'
import process from 'node:process'
import { nanoid } from 'nanoid'
import { CloudClient } from './cloud-client'
import { EmailChecker } from './email-checker.js'
import { MobileControlClient } from './mobile-control.js'
import { ResultSender } from './result-sender.js'
import { TaskExecutor } from './task-executor'
import { SecurityManager } from './utils/security'
import { DaemonLogStreamer } from './ws-log-streamer'

export type DaemonMode = 'email' | 'cloud' | 'hybrid'

export class CcjkDaemon {
  private config: DaemonConfig
  private emailChecker: EmailChecker
  private taskExecutor: TaskExecutor
  private resultSender: ResultSender
  private securityManager: SecurityManager
  private cloudClient?: CloudClient
  private logStreamer?: DaemonLogStreamer
  private mobileControl?: MobileControlClient
  private mode: DaemonMode
  private running: boolean = false
  private checkInterval: NodeJS.Timeout | null = null
  private startTime: Date | null = null
  private tasksExecuted: number = 0
  private lastCheckTime: Date | null = null

  constructor(config: DaemonConfig) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      commandTimeout: 300000, // 5 minutes
      projectPath: process.cwd(),
      debug: false,
      mode: 'email',
      ...config,
    }

    // Determine mode
    this.mode = this.config.mode || (this.config.cloudToken ? 'cloud' : 'email')

    // Initialize email components
    this.emailChecker = new EmailChecker(this.config.email)
    this.taskExecutor = new TaskExecutor(this.config.commandTimeout)
    this.resultSender = new ResultSender(this.config.email)
    this.securityManager = new SecurityManager(this.config)

    // Initialize cloud client if cloud token is provided
    if (this.config.cloudToken && (this.mode === 'cloud' || this.mode === 'hybrid')) {
      this.cloudClient = new CloudClient({
        deviceToken: this.config.cloudToken,
        apiUrl: this.config.cloudApiUrl,
        heartbeatInterval: this.config.heartbeatInterval || 30000,
        debug: this.config.debug,
      })

      // Initialize log streamer for real-time log streaming
      const deviceInfo = this.cloudClient.getDeviceInfo()
      if (deviceInfo) {
        this.logStreamer = new DaemonLogStreamer({
          deviceId: deviceInfo.device.id,
          token: this.config.cloudToken,
          debug: this.config.debug,
        })
      }

      // Initialize mobile control client
      this.mobileControl = new MobileControlClient({
        userToken: this.config.cloudToken,
        debug: this.config.debug,
      })
    }
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('⚠️  Daemon is already running')
      return
    }

    console.log('🚀 CCJK Daemon starting...')
    console.log(`📡 Mode: ${this.mode.toUpperCase()}`)

    // Start cloud client if in cloud or hybrid mode
    if (this.cloudClient && (this.mode === 'cloud' || this.mode === 'hybrid')) {
      console.log('☁️  Connecting to cloud API...')

      const registrationResult = await this.cloudClient.register({
        name: this.config.deviceName,
      })

      if (registrationResult.success) {
        const deviceInfo = this.cloudClient.getDeviceInfo()
        console.log(`✅ Cloud connected - Device ID: ${deviceInfo?.device.id}`)
        console.log(`   Device name: ${deviceInfo?.device.name}`)

        // Initialize log streamer after we have device info
        if (!this.logStreamer && deviceInfo) {
          this.logStreamer = new DaemonLogStreamer({
            deviceId: deviceInfo.device.id,
            token: this.config.cloudToken!,
            debug: this.config.debug,
          })
        }

        // Start log streaming
        if (this.logStreamer) {
          this.logStreamer.start().catch((err) => {
            console.warn('⚠️  Log streaming failed to start:', err.message)
          })
        }

        // Start heartbeat with task callback
        this.cloudClient.startHeartbeat((tasks) => {
          this.processCloudTasks(tasks).catch((err) => {
            console.error('Error processing cloud tasks:', err)
          })
        })
      }
      else {
        console.error(`❌ Cloud registration failed: ${registrationResult.error}`)

        // If cloud-only mode, fail to start
        if (this.mode === 'cloud') {
          throw new Error(`Cloud registration failed: ${registrationResult.error}`)
        }
        // Hybrid mode continues with email only
        console.log('⚠️  Continuing with email mode only...')
      }
    }

    // Test email connection for email or hybrid mode
    if (this.mode === 'email' || this.mode === 'hybrid') {
      console.log('📧 Testing email connection...')
      const emailOk = await this.resultSender.testConnection()
      if (!emailOk) {
        throw new Error('Failed to connect to email server. Please check your email configuration.')
      }
      console.log(`✅ Email connected - Monitoring: ${this.config.email.email}`)
    }

    this.running = true
    this.startTime = new Date()

    console.log(`✅ CCJK Daemon started`)
    console.log(`📂 Project: ${this.config.projectPath}`)

    if (this.mode === 'email' || this.mode === 'hybrid') {
      console.log(`⏱️  Check interval: ${this.config.checkInterval}ms`)
      console.log(`👥 Allowed senders: ${this.config.allowedSenders.join(', ')}`)
    }

    // Start checking emails (if in email or hybrid mode)
    if (this.mode === 'email' || this.mode === 'hybrid') {
      this.scheduleCheck()
    }
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    if (!this.running) {
      console.log('⚠️  Daemon is not running')
      return
    }

    console.log('🛑 Stopping CCJK Daemon...')

    // Stop log streaming
    if (this.logStreamer) {
      console.log('📡 Stopping log streaming...')
      this.logStreamer.stop()
    }

    // Stop cloud heartbeat
    if (this.cloudClient) {
      console.log('☁️  Disconnecting from cloud...')
      await this.cloudClient.goOffline()
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.emailChecker.disconnect()
    this.running = false
    this.startTime = null

    console.log('✅ CCJK Daemon stopped')
  }

  /**
   * Schedule periodic email checks
   */
  private scheduleCheck(): void {
    // Run first check immediately
    this.checkAndExecute().catch((err) => {
      console.error('Error in check cycle:', err)
    })

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAndExecute().catch((err) => {
        console.error('Error in check cycle:', err)
      })
    }, this.config.checkInterval)
  }

  /**
   * Check for new emails and execute tasks
   */
  private async checkAndExecute(): Promise<void> {
    if (!this.running) {
      return
    }

    try {
      this.lastCheckTime = new Date()

      if (this.config.debug) {
        console.log(`🔍 Checking for new emails... (${this.lastCheckTime.toISOString()})`)
      }

      // Fetch new emails
      const emails = await this.emailChecker.fetchNew()

      if (emails.length === 0) {
        if (this.config.debug) {
          console.log('📭 No new emails')
        }
        return
      }

      console.log(`📬 Found ${emails.length} new email(s)`)

      // Process each email
      for (const email of emails) {
        await this.processEmail(email)
      }
    }
    catch (error) {
      console.error('❌ Error checking emails:', error)
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(email: any): Promise<void> {
    try {
      // Extract sender email
      const sender = this.emailChecker.extractSenderEmail(email.from)
      console.log(`📧 Processing email from: ${sender}`)

      // Parse command
      const command = this.emailChecker.parseCommand(email)
      if (!command) {
        console.log('⚠️  No command found in email')
        return
      }

      console.log(`📝 Command: ${command}`)

      // Security check
      const securityCheck = this.securityManager.performSecurityCheck(sender, command)
      if (!securityCheck.allowed) {
        console.log(`🚫 Security check failed: ${securityCheck.reason}`)
        await this.sendSecurityError(sender, command, securityCheck.reason!)
        return
      }

      // Create task
      const task: Task = {
        id: nanoid(10),
        command,
        sender,
        projectPath: this.config.projectPath!,
        createdAt: new Date(),
        status: 'pending',
      }

      // Execute task
      task.status = 'running'
      task.startTime = Date.now()

      const result = await this.taskExecutor.execute(task)

      task.status = result.success ? 'completed' : 'failed'
      this.tasksExecuted++

      // Send result
      await this.resultSender.send(sender, result, command)

      console.log(`✅ Task ${task.id} processed successfully`)
    }
    catch (error) {
      console.error('❌ Error processing email:', error)
    }
  }

  /**
   * Send security error email
   */
  private async sendSecurityError(to: string, command: string, reason: string): Promise<void> {
    try {
      await this.resultSender.send(to, {
        taskId: 'security-error',
        success: false,
        output: null,
        error: `Security check failed: ${reason}`,
        duration: 0,
        exitCode: 403,
      }, command)
    }
    catch (error) {
      console.error('Failed to send security error email:', error)
    }
  }

  /**
   * Process cloud tasks from API
   */
  private async processCloudTasks(tasks: CloudCommand[]): Promise<void> {
    if (!this.running || tasks.length === 0) {
      return
    }

    console.log(`☁️  Processing ${tasks.length} cloud task(s)`)

    for (const cloudTask of tasks) {
      await this.executeCloudTask(cloudTask)
    }
  }

  /**
   * Execute a single cloud task
   */
  private async executeCloudTask(cloudTask: CloudCommand): Promise<void> {
    try {
      console.log(`☁️  Executing cloud command: ${cloudTask.id}`)
      console.log(`   Type: ${cloudTask.commandType}`)
      console.log(`   Command: ${cloudTask.command}`)

      // Build command string with args
      let commandString = cloudTask.command
      if (cloudTask.args && cloudTask.args.length > 0) {
        commandString = `${cloudTask.command} ${cloudTask.args.join(' ')}`
      }

      // Create task from cloud command
      const task: Task = {
        id: cloudTask.id,
        command: commandString,
        sender: 'cloud-api',
        projectPath: cloudTask.cwd || this.config.projectPath!,
        createdAt: new Date(),
        status: 'pending',
      }

      // Add to cloud client's active tasks
      this.cloudClient?.addTask(cloudTask.id)

      // Execute task
      task.status = 'running'
      task.startTime = Date.now()

      const startTime = Date.now()
      let result: any

      try {
        result = await this.taskExecutor.execute(task)
      }
      catch (error) {
        result = {
          success: false,
          output: null,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
          exitCode: 1,
        }
      }

      task.status = result.success ? 'completed' : 'failed'
      this.tasksExecuted++

      // Report result to cloud
      const cloudResult: CloudCommandResult = {
        exitCode: result.exitCode || (result.success ? 0 : 1),
        stdout: result.output || '',
        stderr: result.error || '',
        success: result.success,
        duration: result.duration,
      }

      await this.cloudClient?.reportResult(cloudTask.id, cloudResult)

      console.log(`✅ Cloud task ${cloudTask.id} processed: ${result.success ? 'success' : 'failed'}`)
    }
    catch (error) {
      console.error(`❌ Error executing cloud task ${cloudTask.id}:`, error)

      // Report failure to cloud
      await this.cloudClient?.reportResult(cloudTask.id, {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        success: false,
        duration: 0,
      })
    }
  }

  /**
   * Get daemon status
   */
  getStatus(): DaemonStatus {
    const deviceInfo = this.cloudClient?.getDeviceInfo()

    return {
      running: this.running,
      pid: process.pid,
      startTime: this.startTime || undefined,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : undefined,
      tasksExecuted: this.tasksExecuted,
      lastCheckTime: this.lastCheckTime || undefined,
      config: {
        email: {
          email: this.config.email.email,
          password: '***',
          imapHost: this.config.email.imapHost,
          smtpHost: this.config.email.smtpHost,
        },
        allowedSenders: this.config.allowedSenders,
        checkInterval: this.config.checkInterval,
        commandTimeout: this.config.commandTimeout,
        projectPath: this.config.projectPath,
        mode: this.mode,
        cloudConnected: this.cloudClient?.isConnected() ?? false,
        cloudDeviceId: deviceInfo?.device.id,
        cloudDeviceName: deviceInfo?.device.name,
        activeTasksCount: this.cloudClient?.getActiveTasksCount(),
      },
    }
  }

  /**
   * Get current mode
   */
  getMode(): DaemonMode {
    return this.mode
  }

  /**
   * Get mobile control client
   */
  getMobileControl(): MobileControlClient | undefined {
    return this.mobileControl
  }

  /**
   * Get log streamer
   */
  getLogStreamer(): DaemonLogStreamer | undefined {
    return this.logStreamer
  }

  /**
   * Get cloud client
   */
  getCloudClient(): CloudClient | undefined {
    return this.cloudClient
  }

  /**
   * Send mobile control card
   */
  async sendMobileCard(
    channel: 'feishu' | 'dingtalk' | 'wechat' | 'telegram',
    templateId: string,
    message?: string,
  ): Promise<any> {
    const deviceInfo = this.cloudClient?.getDeviceInfo()
    if (!deviceInfo || !this.mobileControl) {
      throw new Error('Cloud client not connected or mobile control not available')
    }

    return this.mobileControl.sendCard({
      deviceId: deviceInfo.device.id,
      channel,
      templateId,
      message,
    })
  }

  /**
   * Check if daemon is running
   */
  isRunning(): boolean {
    return this.running
  }
}
