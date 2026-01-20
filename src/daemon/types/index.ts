/**
 * CCJK Daemon Types
 * Remote control system type definitions
 */

/**
 * Email configuration for IMAP/SMTP
 */
export interface EmailConfig {
  /** Email address */
  email: string
  /** Email password or app-specific password */
  password: string
  /** IMAP host (default: imap.gmail.com) */
  imapHost?: string
  /** IMAP port (default: 993) */
  imapPort?: number
  /** SMTP host (default: smtp.gmail.com) */
  smtpHost?: string
  /** SMTP port (default: 587) */
  smtpPort?: number
  /** Use TLS (default: true) */
  tls?: boolean
}

/**
 * Daemon configuration
 */
export interface DaemonConfig {
  /** Email configuration */
  email: EmailConfig
  /** Allowed sender email addresses (whitelist) */
  allowedSenders: string[]
  /** Allowed commands (whitelist) */
  allowedCommands?: string[]
  /** Blocked commands (blacklist) */
  blockedCommands?: string[]
  /** Check interval in milliseconds (default: 30000) */
  checkInterval?: number
  /** Command timeout in milliseconds (default: 300000) */
  commandTimeout?: number
  /** Project path (default: current directory) */
  projectPath?: string
  /** Enable debug logging */
  debug?: boolean

  // Cloud configuration
  /** Cloud device token for API authentication */
  cloudToken?: string
  /** Cloud API base URL (default: https://api.claudehome.cn/api/control) */
  cloudApiUrl?: string
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number
  /** Daemon mode: email, cloud, or hybrid */
  mode?: 'email' | 'cloud' | 'hybrid'
  /** Device name for cloud registration */
  deviceName?: string
}

/**
 * Parsed email message
 */
export interface Email {
  /** Message ID */
  id?: string
  /** Sender email address */
  from: string
  /** Email subject */
  subject: string
  /** Email body (plain text) */
  body: string
  /** Email date */
  date: Date
  /** Raw email data */
  raw?: any
}

/**
 * Task to be executed
 */
export interface Task {
  /** Task ID */
  id: string
  /** Command to execute */
  command: string
  /** Sender email */
  sender: string
  /** Project path */
  projectPath: string
  /** Task creation time */
  createdAt: Date
  /** Task start time */
  startTime?: number
  /** Task status */
  status: 'pending' | 'running' | 'completed' | 'failed'
}

/**
 * Task execution result
 */
export interface TaskResult {
  /** Task ID */
  taskId: string
  /** Execution success */
  success: boolean
  /** Command output (stdout) */
  output: string | null
  /** Error message (stderr) */
  error: string | null
  /** Execution duration in milliseconds */
  duration: number
  /** Exit code */
  exitCode?: number
}

/**
 * Daemon status
 */
export interface DaemonStatus {
  /** Is daemon running */
  running: boolean
  /** Process ID */
  pid?: number
  /** Start time */
  startTime?: Date
  /** Uptime in milliseconds */
  uptime?: number
  /** Total tasks executed */
  tasksExecuted?: number
  /** Last check time */
  lastCheckTime?: Date
  /** Configuration */
  config?: Partial<DaemonConfig>
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  /** Is allowed */
  allowed: boolean
  /** Reason if not allowed */
  reason?: string
}

/**
 * Cloud device information
 */
export interface CloudDeviceInfo {
  id: string
  name: string
  platform: 'darwin' | 'linux' | 'windows'
  hostname: string
  version: string
  status: 'online' | 'offline' | 'busy'
}

/**
 * Cloud command from API
 */
export interface CloudCommand {
  id: string
  deviceId: string
  commandType: 'shell' | 'script' | 'file' | 'system'
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  requireConfirm?: boolean
  priority?: number
}

/**
 * Cloud command execution result
 */
export interface CloudCommandResult {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  duration: number
}
