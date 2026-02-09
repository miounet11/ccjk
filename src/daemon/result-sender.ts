/**
 * Result Sender
 * Sends task results via email
 */

import type { EmailConfig, TaskResult } from './types/index.js'

export class ResultSender {
  private transporter: any
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      tls: true,
      ...config,
    }

    // Lazy load nodemailer package
    try {
      const nodemailer = require('nodemailer')
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false, // Use STARTTLS
        auth: {
          user: this.config.email,
          pass: this.config.password,
        },
      })
    }
    catch (_error) {
      throw new Error('nodemailer package is not installed. Install it with: pnpm add nodemailer @types/nodemailer')
    }
  }

  /**
   * Send task result email
   */
  async send(to: string, result: TaskResult, command: string): Promise<void> {
    try {
      const subject = result.success
        ? `✅ Task Completed: ${this.truncate(command, 50)}`
        : `❌ Task Failed: ${this.truncate(command, 50)}`

      const html = this.generateHtml(result, command)
      const text = this.generateText(result, command)

      await this.transporter.sendMail({
        from: `CCJK Daemon <${this.config.email}>`,
        to,
        subject,
        text,
        html,
      })

      console.log(`📧 Result email sent to ${to}`)
    }
    catch (error) {
      console.error('Failed to send result email:', error)
      throw error
    }
  }

  /**
   * Generate HTML email content
   */
  private generateHtml(result: TaskResult, command: string): string {
    const statusIcon = result.success ? '✅' : '❌'
    const statusText = result.success ? 'Completed' : 'Failed'
    const statusColor = result.success ? '#10b981' : '#ef4444'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: ${statusColor};
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .section {
      margin-bottom: 20px;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .value {
      background: white;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .error {
      color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${statusIcon} Task ${statusText}</h1>
  </div>
  <div class="content">
    <div class="section">
      <div class="label">Command</div>
      <div class="value">${this.escapeHtml(command)}</div>
    </div>

    ${result.output
      ? `
    <div class="section">
      <div class="label">Output</div>
      <div class="value">${this.escapeHtml(result.output)}</div>
    </div>
    `
      : ''}

    ${result.error
      ? `
    <div class="section">
      <div class="label error">Error</div>
      <div class="value error">${this.escapeHtml(result.error)}</div>
    </div>
    `
      : ''}

    <div class="meta">
      <span>Duration: ${this.formatDuration(result.duration)}</span>
      <span>Exit Code: ${result.exitCode || 0}</span>
      <span>Task ID: ${result.taskId}</span>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text email content
   */
  private generateText(result: TaskResult, command: string): string {
    const statusIcon = result.success ? '✅' : '❌'
    const statusText = result.success ? 'Completed' : 'Failed'

    let text = `${statusIcon} Task ${statusText}\n\n`
    text += `Command:\n${command}\n\n`

    if (result.output) {
      text += `Output:\n${result.output}\n\n`
    }

    if (result.error) {
      text += `Error:\n${result.error}\n\n`
    }

    text += `---\n`
    text += `Duration: ${this.formatDuration(result.duration)}\n`
    text += `Exit Code: ${result.exitCode || 0}\n`
    text += `Task ID: ${result.taskId}\n`

    return text
  }

  /**
   * Truncate string
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str
    }
    return `${str.substring(0, maxLength)}...`
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    }
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#039;',
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    }
    catch (error) {
      console.error('Email connection test failed:', error)
      return false
    }
  }
}
