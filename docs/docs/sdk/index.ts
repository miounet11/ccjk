/**
 * CCJK Cloud SDK
 * 轻量级客户端 SDK，用于设备绑定和通知发送
 *
 * @example
 * ```typescript
 * import { CCJKClient } from '@ccjk/cloud-sdk';
 *
 * // 绑定设备
 * const client = await CCJKClient.bind('9RQ6DL');
 *
 * // 发送通知
 * await client.notify({
 *   type: 'task_completed',
 *   title: '✅ 任务完成',
 *   body: '代码已成功部署'
 * });
 * ```
 */

export interface DeviceInfo {
  name?: string
  platform?: string
  hostname?: string
  version?: string
}

export interface NotifyOptions {
  type: 'task_progress' | 'task_completed' | 'task_failed' | 'ask_user' | 'custom'
  title: string
  body: string
  data?: Record<string, unknown>
  channels?: ('feishu' | 'dingtalk' | 'wechat' | 'email' | 'sms')[]
  waitReply?: boolean
}

export interface ChannelConfig {
  type: 'feishu' | 'dingtalk' | 'wechat' | 'email' | 'sms'
  enabled: boolean
  config: Record<string, unknown>
}

export interface NotificationResult {
  notificationId: string
  channels: Array<{
    type: string
    success: boolean
    error?: string
  }>
}

export interface ReplyResult {
  notificationId: string
  reply: {
    content: string
    channel: string
    timestamp: string
  }
}

export interface DeviceInfoResult {
  id: string
  name: string
  platform: string
  hostname: string
  version: string
  userId: string
  createdAt: string
  lastSeenAt: string
  channels: ChannelConfig[]
}

export interface CCJKClientOptions {
  baseUrl?: string
  timeout?: number
}

export class CCJKError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message)
    this.name = 'CCJKError'
  }
}

export class CCJKClient {
  private baseUrl: string
  private deviceToken: string
  private timeout: number

  /**
   * 创建 CCJK 客户端实例
   * @param deviceToken 设备 Token
   * @param options 配置选项
   */
  constructor(deviceToken: string, options: CCJKClientOptions = {}) {
    this.deviceToken = deviceToken
    this.baseUrl = options.baseUrl || 'https://api.claudehome.cn'
    this.timeout = options.timeout || 30000
  }

  /**
   * 使用绑定码绑定设备
   * @param code 6位绑定码
   * @param deviceInfo 设备信息
   * @param options 配置选项
   * @returns CCJKClient 实例
   */
  static async bind(
    code: string,
    deviceInfo?: DeviceInfo,
    options: CCJKClientOptions = {},
  ): Promise<CCJKClient> {
    const baseUrl = options.baseUrl || 'https://api.claudehome.cn'

    // 自动获取设备信息
    const info: DeviceInfo = {
      name: deviceInfo?.name || `Device-${Date.now().toString(36)}`,
      platform: deviceInfo?.platform || detectPlatform(),
      hostname: deviceInfo?.hostname || await getHostname(),
      version: deviceInfo?.version || '1.0.0',
    }

    const response = await fetch(`${baseUrl}/bind/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceInfo: info }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new CCJKError(data.error || 'Binding failed', response.status, data)
    }

    return new CCJKClient(data.data.deviceToken, options)
  }

  /**
   * 获取设备 Token
   */
  getToken(): string {
    return this.deviceToken
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const data = await response.json()

      if (!data.success) {
        throw new CCJKError(
          data.error || 'Request failed',
          response.status,
          data,
        )
      }

      return data.data as T
    }
    finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(): Promise<DeviceInfoResult> {
    return this.request<DeviceInfoResult>('GET', '/device/info')
  }

  /**
   * 获取通知渠道配置
   */
  async getChannels(): Promise<{ channels: ChannelConfig[] }> {
    return this.request<{ channels: ChannelConfig[] }>('GET', '/device/channels')
  }

  /**
   * 更新通知渠道配置
   * @param channels 渠道配置列表
   */
  async setChannels(channels: ChannelConfig[]): Promise<void> {
    await this.request('PUT', '/device/channels', { channels })
  }

  /**
   * 配置飞书通知
   * @param webhookUrl 飞书机器人 Webhook URL
   */
  async configureFeishu(webhookUrl: string): Promise<void> {
    const { channels } = await this.getChannels()
    const otherChannels = channels.filter(c => c.type !== 'feishu')
    await this.setChannels([
      ...otherChannels,
      { type: 'feishu', enabled: true, config: { webhookUrl } },
    ])
  }

  /**
   * 配置钉钉通知
   * @param webhookUrl 钉钉机器人 Webhook URL
   * @param secret 加签密钥（可选）
   */
  async configureDingtalk(webhookUrl: string, secret?: string): Promise<void> {
    const { channels } = await this.getChannels()
    const otherChannels = channels.filter(c => c.type !== 'dingtalk')
    await this.setChannels([
      ...otherChannels,
      { type: 'dingtalk', enabled: true, config: { webhookUrl, secret } },
    ])
  }

  /**
   * 配置企业微信通知
   * @param webhookUrl 企业微信机器人 Webhook URL
   */
  async configureWechat(webhookUrl: string): Promise<void> {
    const { channels } = await this.getChannels()
    const otherChannels = channels.filter(c => c.type !== 'wechat')
    await this.setChannels([
      ...otherChannels,
      { type: 'wechat', enabled: true, config: { webhookUrl } },
    ])
  }

  /**
   * 发送通知
   * @param options 通知选项
   * @returns 通知结果
   */
  async notify(options: NotifyOptions): Promise<NotificationResult> {
    return this.request<NotificationResult>('POST', '/notify', options)
  }

  /**
   * 发送测试通知
   */
  async testNotify(): Promise<NotificationResult> {
    return this.request<NotificationResult>('POST', '/notify/test')
  }

  /**
   * 发送进度通知
   * @param title 标题
   * @param body 内容
   * @param data 附加数据
   */
  async progress(title: string, body: string, data?: Record<string, unknown>): Promise<NotificationResult> {
    return this.notify({ type: 'task_progress', title, body, data })
  }

  /**
   * 发送完成通知
   * @param title 标题
   * @param body 内容
   * @param data 附加数据
   */
  async completed(title: string, body: string, data?: Record<string, unknown>): Promise<NotificationResult> {
    return this.notify({ type: 'task_completed', title, body, data })
  }

  /**
   * 发送失败通知
   * @param title 标题
   * @param body 内容
   * @param data 附加数据
   */
  async failed(title: string, body: string, data?: Record<string, unknown>): Promise<NotificationResult> {
    return this.notify({ type: 'task_failed', title, body, data })
  }

  /**
   * 等待用户回复
   * @param timeout 超时时间（毫秒），默认 30000
   * @returns 用户回复内容，超时返回 null
   */
  async waitForReply(timeout = 30000): Promise<string | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout + 5000)

    try {
      const response = await fetch(
        `${this.baseUrl}/reply/poll?timeout=${timeout}`,
        {
          headers: { 'X-Device-Token': this.deviceToken },
          signal: controller.signal,
        },
      )

      const data = await response.json()

      if (data.data?.reply?.content) {
        return data.data.reply.content
      }

      return null
    }
    catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null
      }
      throw error
    }
    finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 询问用户并等待回复
   * @param question 问题内容
   * @param title 标题（可选）
   * @param timeout 超时时间（毫秒），默认 60000
   * @returns 用户回复内容，超时返回 null
   */
  async ask(
    question: string,
    title = '❓ 需要您的确认',
    timeout = 60000,
  ): Promise<string | null> {
    await this.notify({
      type: 'ask_user',
      title,
      body: question,
      waitReply: true,
    })

    return this.waitForReply(timeout)
  }

  /**
   * 询问是/否问题
   * @param question 问题内容
   * @param timeout 超时时间（毫秒）
   * @returns true/false/null（超时）
   */
  async confirm(question: string, timeout = 60000): Promise<boolean | null> {
    const reply = await this.ask(
      `${question}\n\n请回复 "是" 或 "否"`,
      '❓ 确认',
      timeout,
    )

    if (reply === null)
      return null

    const normalized = reply.toLowerCase().trim()
    const yesPatterns = ['是', 'yes', 'y', '确认', '确定', 'ok', '好', '行', '可以']
    const noPatterns = ['否', 'no', 'n', '取消', '不', '算了', '不行']

    if (yesPatterns.some(p => normalized.includes(p)))
      return true
    if (noPatterns.some(p => normalized.includes(p)))
      return false

    // 默认为否
    return false
  }

  /**
   * 获取通知历史
   * @param limit 数量限制
   * @param offset 偏移量
   */
  async getHistory(limit = 20, offset = 0): Promise<{
    notifications: Array<{
      id: string
      type: string
      title: string
      body: string
      status: string
      createdAt: string
      reply?: string
    }>
    total: number
    hasMore: boolean
  }> {
    return this.request('GET', `/notify/history?limit=${limit}&offset=${offset}`)
  }

  /**
   * 重新生成设备 Token
   * @returns 新的 Token
   */
  async regenerateToken(): Promise<string> {
    const result = await this.request<{ token: string }>('POST', '/device/regenerate-token')
    this.deviceToken = result.token
    return result.token
  }

  /**
   * 删除设备
   */
  async deleteDevice(): Promise<void> {
    await this.request('DELETE', '/device')
  }
}

// 辅助函数 - 跨平台检测，需要检查 globalThis.process 是否存在
/* eslint-disable node/prefer-global/process */
function detectPlatform(): string {
  if (typeof globalThis !== 'undefined' && globalThis.process?.platform) {
    return globalThis.process.platform
  }
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('win'))
      return 'windows'
    if (ua.includes('mac'))
      return 'darwin'
    if (ua.includes('linux'))
      return 'linux'
  }
  return 'unknown'
}

async function getHostname(): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.process) {
    try {
      // Node.js 环境 - 使用动态导入
      const os = await import('node:os')
      return os.hostname()
    }
    catch {
      // 忽略错误
    }
  }
  if (typeof location !== 'undefined') {
    return location.hostname
  }
  return 'unknown'
}
/* eslint-enable node/prefer-global/process */

// 默认导出
export default CCJKClient
