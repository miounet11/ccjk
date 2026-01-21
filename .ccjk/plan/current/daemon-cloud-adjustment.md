# CCJK Daemon 云端对接调整清单

**目标**: 让 `src/daemon/` 支持 api.claudehome.cn 云端 API

---

## 📋 需要新增的模块

### 1. 云端通信模块 (新增)

创建 `src/daemon/cloud-client.ts`，用于与云端 API 通信：

```typescript
/**
 * Cloud Client - 云端 API 通信客户端
 */

const CLOUD_API_BASE = 'https://api.claudehome.cn/api/control'

export interface CloudClientConfig {
  deviceToken: string
  heartbeatInterval?: number
}

export class CloudClient {
  private config: CloudClientConfig
  private pollingInterval?: NodeJS.Timeout

  constructor(config: CloudClientConfig) {
    this.config = config
  }

  /**
   * 注册设备到云端
   */
  async register(deviceInfo: {
    name: string
    platform: string
    hostname: string
    version: string
  }) {
    const response = await fetch(`${CLOUD_API_BASE}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.config.deviceToken,
      },
      body: JSON.stringify(deviceInfo),
    })

    const result = await response.json()
    return result
  }

  /**
   * 发送心跳到云端
   */
  async heartbeat(status: 'online' | 'offline' | 'busy', currentTasks: string[] = []) {
    const response = await fetch(`${CLOUD_API_BASE}/devices/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.config.deviceToken,
      },
      body: JSON.stringify({
        status,
        currentTasks,
        timestamp: new Date().toISOString(),
      }),
    })

    return response.json()
  }

  /**
   * 从云端拉取待执行的任务
   */
  async pullTasks() {
    const response = await fetch(`${CLOUD_API_BASE}/devices/pending`, {
      method: 'GET',
      headers: {
        'X-Device-Token': this.config.deviceToken,
      },
    })

    const result = await response.json()
    return result
  }

  /**
   * 上报命令执行结果
   */
  async reportResult(commandId: string, result: {
    exitCode: number
    stdout: string
    stderr: string
    success: boolean
    duration: number
  }) {
    const response = await fetch(`${CLOUD_API_BASE}/commands/${commandId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.config.deviceToken,
      },
      body: JSON.stringify(result),
    })

    return response.json()
  }

  /**
   * 启动心跳循环
   */
  startHeartbeat() {
    this.stopHeartbeat()

    this.pollingInterval = setInterval(async () => {
      try {
        // 从本地任务队列获取当前状态
        // const status = this.getCurrentStatus()

        // await this.heartbeat(status)
      }
      catch (error) {
        console.error('Heartbeat failed:', error)
      }
    }, this.config.heartbeatInterval || 30000)
  }

  /**
   * 停止心跳循环
   */
  stopHeartbeat() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = undefined
    }
  }
}
```

---

### 2. 修改 Daemon 类型定义

在 `src/daemon/types/index.ts` 添加云端相关类型：

```typescript
// 云端 API 对接类型

export interface CloudDeviceInfo {
  id: string
  name: string
  platform: 'darwin' | 'linux' | 'windows'
  hostname: string
  version: string
  status: 'online' | 'offline' | 'busy'
}

export interface CloudCommandRequest {
  deviceId: string
  commandType: 'shell' | 'script' | 'file' | 'system'
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export interface CloudCommandResult {
  commandId: string
  status: 'completed' | 'failed'
  result: {
    exitCode: number
    stdout: string
    stderr: string
    duration: number
  }
}
```

---

### 3. 修改 Daemon 主类

在 `src/daemon/index.ts` 中集成云端客户端：

```typescript
import { CloudClient } from './cloud-client'

export class CcjkDaemon {
  private cloudClient?: CloudClient
  private mode: 'email' | 'cloud' | 'hybrid' = 'email'

  async start(config: DaemonConfig) {
    // ... 现有代码 ...

    // 如果配置了 deviceToken，启动云端模式
    if (config.cloudToken) {
      this.mode = 'cloud'
      this.cloudClient = new CloudClient({
        deviceToken: config.cloudToken,
        heartbeatInterval: config.heartbeatInterval || 30000,
      })

      // 注册设备
      await this.cloudClient.register({
        name: config.deviceName || 'CCJK Device',
        platform: os.platform(),
        hostname: os.hostname(),
        version: config.ccjkVersion || '3.7.0',
      })

      // 启动心跳
      this.cloudClient.startHeartbeat()
    }

    // 现有的邮件检查逻辑...
  }

  async checkAndExecute() {
    // 如果是云端或混合模式，优先从云端拉取任务
    if (this.mode === 'cloud' || this.mode === 'hybrid') {
      const cloudTasks = await this.cloudClient?.pullTasks()

      if (cloudTasks && cloudTasks.length > 0) {
        // 执行云端任务
        for (const task of cloudTasks) {
          await this.executeCloudTask(task)
        }
        return
      }
    }

    // 原有的邮件任务获取逻辑...
  }

  private async executeCloudTask(task: any) {
    // 执行命令
    const result = await this.taskExecutor.execute(task)

    // 上报结果到云端
    await this.cloudClient?.reportResult(task.id, {
      exitCode: result.exitCode || 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      success: result.exitCode === 0,
      duration: result.duration || 0,
    })
  }
}
```

---

### 4. 修改配置结构

在 `src/daemon/types/index.ts` 中扩展 DaemonConfig：

```typescript
export interface DaemonConfig {
  // 现有字段...
  email: EmailConfig

  // 新增云端配置
  cloudToken?: string           // 云端设备 Token
  cloudApiUrl?: string          // 云端 API 地址（可选，默认官方）
  heartbeatInterval?: number   // 心跳间隔（毫秒）
  mode?: 'email' | 'cloud' | 'hybrid'  // 运行模式
}
```

---

### 5. 修改 CLI 接口

在 `src/daemon/cli.ts` 的 setup 命令中添加云端配置：

```typescript
async function setupDaemon() {
  const { cloudToken } = await prompt([
    {
      type: 'confirm',
      name: 'enableCloud',
      message: '是否启用云端控制模式？(可以远程控制，无需邮箱)',
      initial: false,
    },
  ])

  const config: DaemonConfig = {
    // ... 现有配置
  }

  if (enableCloud) {
    const { cloudToken } = await prompt([
      {
        type: 'text',
        name: 'cloudToken',
        message: '请输入云端设备 Token:',
        validate: (v) => v.length > 0,
      },
    ])

    config.cloudToken = cloudToken
    config.mode = 'cloud'
  }

  // 保存配置...
}
```

---

## 📝 更新文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/daemon/cloud-client.ts` | 新建 | 云端通信客户端 |
| `src/daemon/types/index.ts` | 修改 | 添加云端类型定义 |
| `src/daemon/index.ts` | 修改 | 集成云端客户端 |
| `src/daemon/cli.ts` | 修改 | CLI 添加云端配置选项 |
| `.ccjk/plan/current/daemon-cloud-integration.md` | 新建 | 集成文档 |

---

## 🔧 实现优先级

### P0 - 核心功能 (本周)

1. ✅ 创建 `src/daemon/cloud-client.ts`
2. ✅ 修改 `src/daemon/types/index.ts` 添加类型
3. ✅ 修改 `src/daemon/index.ts` 集成云端客户端
4. ✅ 修改 `src/daemon/cli.ts` 添加配置

### P1 - 增强功能 (下周)

5. ⏳ WebSocket 日志流对接
6. ⏳ 移动端控制卡片发送
7. ⏳ 快捷指令模板

### P2 - 可选功能

8. ⏳ 错误重试机制
9. ⏳ 离线缓存（云端不可用时回退到邮件）

---

## 🧪 测试联调

```bash
# 1. 本地测试云端通信
curl https://api.claudehome.cn/api/control/devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 启动 Daemon 云端模式
ccjk daemon start

# 3. 发送测试命令
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "YOUR_DEVICE_ID",
    "commandType": "shell",
    "command": "echo hello"
  }'
```

---

**优先级确认**：

1. ✅ 实现核心云端通信 - **本周完成**
2. ⏳ WebSocket 日志流 - **下周**
3. ⏳ 移动端控制卡片 - **下周**

需要我现在开始实现吗？还是先确认优先级？
