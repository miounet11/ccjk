/**
 * CCJK Mobile Control Card
 * Support for sending control cards to mobile apps (Feishu, DingTalk, WeChat)
 *
 * API endpoint: POST /api/control/mobile/send-card
 */

/**
 * Control action style
 */
export enum ActionStyle {
  Primary = 'primary',
  Danger = 'danger',
  Default = 'default',
}

/**
 * Control action definition
 */
export interface ControlAction {
  /** Action ID */
  id: string
  /** Display label (emoji + text) */
  label: string
  /** Command to execute */
  command: string
  /** Require confirmation before execution */
  confirm?: boolean
  /** Button style */
  style?: ActionStyle
  /** Working directory */
  cwd?: string
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Control card template
 */
export interface ControlCardTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Description */
  description: string
  /** Category */
  category: string
  /** Actions in this template */
  actions: ControlAction[]
}

/**
 * Send card request
 */
export interface SendCardRequest {
  /** Device ID */
  deviceId: string
  /** Channel: feishu, dingtalk, wechat, telegram */
  channel: 'feishu' | 'dingtalk' | 'wechat' | 'telegram'
  /** Template ID to use */
  templateId: string
  /** Custom message */
  message?: string
}

/**
 * Send card response
 */
export interface SendCardResponse {
  success: boolean
  data?: {
    cardId: string
    sentAt: string
    channel: string
  }
  error?: string
}

/**
 * Mobile control client configuration
 */
export interface MobileControlConfig {
  /** API base URL */
  apiUrl?: string
  /** User token for authentication */
  userToken: string
  /** Debug logging */
  debug?: boolean
}

/**
 * Preset control card templates
 */
export const PRESET_TEMPLATES: Record<string, ControlCardTemplate> = {
  tpl_deploy: {
    id: 'tpl_deploy',
    name: '部署控制',
    description: '部署相关操作',
    category: 'deploy',
    actions: [
      {
        id: 'deploy',
        label: '🚀 部署',
        command: 'npm run deploy',
        confirm: true,
        style: ActionStyle.Primary,
      },
      {
        id: 'restart',
        label: '🔄 重启服务',
        command: 'pm2 restart all',
        confirm: true,
        style: ActionStyle.Default,
      },
      {
        id: 'status',
        label: '📊 服务状态',
        command: 'pm2 status',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'logs',
        label: '📋 查看日志',
        command: 'pm2 logs --lines 50 --nostream',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'stop',
        label: '⏹️ 停止服务',
        command: 'pm2 stop all',
        confirm: true,
        style: ActionStyle.Danger,
      },
    ],
  },
  tpl_database: {
    id: 'tpl_database',
    name: '数据库控制',
    description: '数据库相关操作',
    category: 'database',
    actions: [
      {
        id: 'migrate',
        label: '🔄 运行迁移',
        command: 'npm run db:migrate',
        confirm: true,
        style: ActionStyle.Primary,
      },
      {
        id: 'seed',
        label: '🌱 填充数据',
        command: 'npm run db:seed',
        confirm: true,
        style: ActionStyle.Default,
      },
      {
        id: 'backup',
        label: '💾 备份数据库',
        command: 'npm run db:backup',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'restore',
        label: '♻️  恢复数据库',
        command: 'npm run db:restore',
        confirm: true,
        style: ActionStyle.Danger,
      },
    ],
  },
  tpl_git: {
    id: 'tpl_git',
    name: 'Git 操作',
    description: 'Git 版本控制',
    category: 'git',
    actions: [
      {
        id: 'pull',
        label: '⬇️ 拉取更新',
        command: 'git pull',
        confirm: false,
        style: ActionStyle.Primary,
      },
      {
        id: 'status',
        label: '📊 状态检查',
        command: 'git status',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'log',
        label: '📋 提交历史',
        command: 'git log --oneline -10',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'push',
        label: '⬆️ 推送更改',
        command: 'git push',
        confirm: true,
        style: ActionStyle.Default,
      },
    ],
  },
  tpl_build: {
    id: 'tpl_build',
    name: '构建控制',
    description: '项目构建操作',
    category: 'build',
    actions: [
      {
        id: 'build',
        label: '🔨 构建',
        command: 'npm run build',
        confirm: true,
        style: ActionStyle.Primary,
      },
      {
        id: 'dev',
        label: '🛠️ 开发模式',
        command: 'npm run dev',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'test',
        label: '🧪 运行测试',
        command: 'npm run test',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'lint',
        label: '🔍 代码检查',
        command: 'npm run lint',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'clean',
        label: '🧹 清理构建',
        command: 'npm run clean',
        confirm: true,
        style: ActionStyle.Danger,
      },
    ],
  },
  tpl_docker: {
    id: 'tpl_docker',
    name: 'Docker 控制',
    description: 'Docker 容器操作',
    category: 'docker',
    actions: [
      {
        id: 'ps',
        label: '📊 容器列表',
        command: 'docker ps',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'restart',
        label: '🔄 重启容器',
        command: 'docker restart $(docker ps -q)',
        confirm: true,
        style: ActionStyle.Primary,
      },
      {
        id: 'logs',
        label: '📋 容器日志',
        command: 'docker logs --tail 100 $(docker ps -q | head -1)',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'stop',
        label: '⏹️ 停止容器',
        command: 'docker stop $(docker ps -q)',
        confirm: true,
        style: ActionStyle.Danger,
      },
    ],
  },
  tpl_system: {
    id: 'tpl_system',
    name: '系统控制',
    description: '系统级别操作',
    category: 'system',
    actions: [
      {
        id: 'uptime',
        label: '⏱️ 运行时间',
        command: 'uptime',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'disk',
        label: '💾 磁盘使用',
        command: 'df -h',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'memory',
        label: '🧠 内存使用',
        command: 'free -h',
        confirm: false,
        style: ActionStyle.Default,
      },
      {
        id: 'top',
        label: '📊 进程监控',
        command: 'top -b -n 1 | head -20',
        confirm: false,
        style: ActionStyle.Default,
      },
    ],
  },
}

/**
 * Mobile Control Client
 */
export class MobileControlClient {
  private config: MobileControlConfig
  private customTemplates: Map<string, ControlCardTemplate> = new Map()

  constructor(config: MobileControlConfig) {
    this.config = {
      apiUrl: 'https://api.claudehome.cn/api/control',
      debug: false,
      ...config,
    }
  }

  /**
   * Get API base URL
   */
  private getApiBase(): string {
    return this.config.apiUrl || 'https://api.claudehome.cn/api/control'
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.userToken}`,
    }
  }

  /**
   * Debug log
   */
  private debugLog(message: string): void {
    if (this.config.debug) {
      console.log(`[MobileControl] ${message}`)
    }
  }

  /**
   * Get all available templates (presets + custom)
   */
  getTemplates(): ControlCardTemplate[] {
    return [
      ...Object.values(PRESET_TEMPLATES),
      ...Array.from(this.customTemplates.values()),
    ]
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ControlCardTemplate | undefined {
    return PRESET_TEMPLATES[id] || this.customTemplates.get(id)
  }

  /**
   * Register custom template
   */
  registerTemplate(template: ControlCardTemplate): void {
    this.customTemplates.set(template.id, template)
    this.debugLog(`Registered custom template: ${template.id}`)
  }

  /**
   * Unregister custom template
   */
  unregisterTemplate(id: string): void {
    this.customTemplates.delete(id)
    this.debugLog(`Unregistered custom template: ${id}`)
  }

  /**
   * Send control card to mobile
   */
  async sendCard(request: SendCardRequest): Promise<SendCardResponse> {
    try {
      const template = this.getTemplate(request.templateId)
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${request.templateId}`,
        }
      }

      this.debugLog(`Sending card: ${request.templateId} to ${request.channel}`)

      const response = await fetch(`${this.getApiBase()}/mobile/send-card`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          template: {
            ...template,
            message: request.message,
          },
        }),
      })

      const result = await response.json() as SendCardResponse

      if (result.success) {
        this.debugLog(`Card sent: ${result.data?.cardId}`)
      }

      return result
    }
    catch (error) {
      this.debugLog(`Send card failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send quick action (single action card)
   */
  async sendQuickAction(
    deviceId: string,
    channel: SendCardRequest['channel'],
    action: ControlAction,
    message?: string,
  ): Promise<SendCardResponse> {
    // Create temporary template with single action
    const tempTemplate: ControlCardTemplate = {
      id: `temp_${Date.now()}`,
      name: action.label,
      description: message || action.label,
      category: 'quick',
      actions: [action],
    }

    return this.sendCard({
      deviceId,
      channel,
      templateId: tempTemplate.id,
      message,
    })
  }

  /**
   * List available templates by category
   */
  listTemplatesByCategory(category: string): ControlCardTemplate[] {
    const all = this.getTemplates()
    return all.filter(t => t.category === category)
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): ControlCardTemplate[] {
    const all = this.getTemplates()
    const lowerQuery = query.toLowerCase()

    return all.filter(t =>
      t.name.toLowerCase().includes(lowerQuery)
      || t.description.toLowerCase().includes(lowerQuery)
      || t.actions.some(a => a.label.toLowerCase().includes(lowerQuery)),
    )
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const all = this.getTemplates()
    return Array.from(new Set(all.map(t => t.category))).sort()
  }
}

/**
 * Helper to create a control action
 */
export function createAction(
  id: string,
  label: string,
  command: string,
  options?: Partial<ControlAction>,
): ControlAction {
  return {
    id,
    label,
    command,
    confirm: false,
    style: ActionStyle.Default,
    ...options,
  }
}

/**
 * Helper to create a custom template
 */
export function createTemplate(
  id: string,
  name: string,
  description: string,
  category: string,
  actions: ControlAction[],
): ControlCardTemplate {
  return {
    id,
    name,
    description,
    category,
    actions,
  }
}
