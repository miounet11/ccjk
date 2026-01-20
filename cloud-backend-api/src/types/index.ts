// CCJK Cloud API - Types
// 与 src/daemon/types/index.ts 对接

export interface RegisterRequest {
  device_key: string
  device_name?: string
  os_type?: string
  os_version?: string
  ccjk_version?: string
}

export interface HeartbeatRequest {
  status: 'online' | 'offline' | 'busy'
  current_tasks?: string[]
  system_info?: {
    cpu?: number
    memory?: number
    disk?: number
  }
}

export interface TaskResult {
  success: boolean
  exit_code?: number
  stdout?: string
  stderr?: string
  error?: string
  started_at?: string
  completed_at?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface TaskData {
  id: string
  type: string
  commands: string[]
  timeout: number
}

export interface ConfigData {
  heartbeat_interval: number
  task_check_interval: number
  log_upload_enabled: boolean
  max_concurrent_tasks: number
  config?: Record<string, unknown>
}
