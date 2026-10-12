/** 界面能单独切换、也能写入配置的工具。 */
export const PROXY_TOOL_IDS = ['clavue', 'claude-code', 'codex', 'grok', 'opencode', 'claudework'] as const
export type ProxyToolId = (typeof PROXY_TOOL_IDS)[number]

export function isProxyToolId(value: string): value is ProxyToolId {
  return (PROXY_TOOL_IDS as readonly string[]).includes(value)
}

/** 入站或上游协议。互转只在这五种之间进行。 */
export type UpstreamProtocol
  = | 'anthropic-messages'
    | 'openai-chat'
    | 'openai-responses'
    | 'gemini'
    | 'xai'

export type ProxyMode = 'direct' | 'routing' | 'aggregation'

export type AccountKind = 'chatgpt' | 'copilot' | 'xai'

/** 写入客户端、可出现在界面上的供应商。密钥不在这里。 */
export interface ProxyProvider {
  id: string
  name: string
  protocol: UpstreamProtocol
  baseUrl: string
  models: string[]
  /** 账号槽 id。有值时用账号令牌，不用单独的密钥。 */
  accountId?: string
  headers?: Record<string, string>
}

export interface ToolRoute {
  mode: ProxyMode
  /** 路由模式的默认上游，也是聚合里未带前缀请求的默认成员。 */
  providerId?: string
  /** 故障转移顺序。默认上游会自动排在最前。 */
  failover: string[]
  /** 聚合成员。默认上游必须在里面。 */
  members: string[]
}

export interface ProxyConfig {
  listenHost: '127.0.0.1'
  port: number
  providers: ProxyProvider[]
  tools: Record<ProxyToolId, ToolRoute>
}

export interface AccountPublic {
  id: string
  kind: AccountKind
  label: string
  createdAt: string
  /** 用户自己填写的额度查询地址。没有就不代查。 */
  quotaUrl?: string
}

export interface CanonicalToolCall {
  id: string
  name: string
  arguments: string
}

export interface CanonicalMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  text?: string
  toolCalls?: CanonicalToolCall[]
  toolCallId?: string
  images?: string[]
}

export interface CanonicalTool {
  name: string
  description?: string
  parameters: Record<string, unknown>
}

export interface CanonicalRequest {
  model: string
  messages: CanonicalMessage[]
  tools?: CanonicalTool[]
  maxTokens?: number
  stream?: boolean
  temperature?: number
}

export interface CanonicalUsage {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface CanonicalResponse {
  text: string
  toolCalls: CanonicalToolCall[]
  usage?: CanonicalUsage
  finishReason?: string
}

export const ACCOUNT_TOS_WARNING
  = '在官方客户端之外使用 ChatGPT、Copilot 或 xAI 订阅，可能违反厂商条款。ccjk 只保存你自己粘贴的凭证，不用官方客户端的身份去登录。'

export const PROXY_USER_AGENT = 'ccjk-proxy'
export const PROXY_TOKEN_HEADER = 'ccjk-local'
export const DEFAULT_PROXY_PORT = 15721
