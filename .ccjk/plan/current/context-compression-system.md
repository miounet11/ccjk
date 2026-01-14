# Feature Plan: CCJK Context Compression System

> **Version**: 1.0.0
> **Created**: 2026-01-13
> **Status**: Planning Complete, Ready for Implementation

---

## 📋 Overview

### Feature Objective
构建一个 **Zero-Config** 的上下文压缩系统，让用户在使用 Claude Code 时自动获得：
- 更长的有效对话（上下文不再爆炸）
- 更低的 token 成本（压缩后复用）
- 更好的连续性（session 切换无缝衔接）

### Expected Value

| 维度 | 当前痛点 | 解决后 |
|------|----------|--------|
| **上下文** | 对话长了就乱，AI 忘记之前做了什么 | 自动压缩，关键信息保留 |
| **成本** | 长对话 token 消耗巨大 | 压缩后减少 60-80% token |
| **体验** | 手动总结、开新会话很麻烦 | 自动检测、一键切换 |
| **数据** | 对话结束就丢失 | 本地存储 + 云同步，可追溯 |

### Impact Scope
- **用户侧**: 安装 CCJK 后自动生效，无需任何配置
- **技术侧**: 新增 CLI wrapper、总结引擎、存储系统、云同步模块
- **商业侧**: 为未来云服务、数据训练铺路

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CCJK Context Compression System                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        User Layer                                 │   │
│  │  $ claude "help me refactor this code"                           │   │
│  │       ↓ (透明拦截)                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     CCJK Wrapper Layer                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ Shell Hook  │  │ CLI Proxy   │  │ IO Capture  │               │   │
│  │  │ (自动激活)   │  │ (透传命令)   │  │ (流拦截)    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Processing Layer                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ FC Parser   │  │ Summarizer  │  │ Session Mgr │               │   │
│  │  │ (解析FC输出) │  │ (Haiku总结) │  │ (会话管理)  │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Storage Layer                                 │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐        │   │
│  │  │ Local Storage           │  │ Cloud Sync              │        │   │
│  │  │ ~/.ccjk/context/        │  │ (可选上传)               │        │   │
│  │  │ ├── sessions/           │  │                         │        │   │
│  │  │ ├── logs/               │  │  ┌─────────────────┐    │        │   │
│  │  │ └── summaries/          │  │  │ CCJK Cloud API  │    │        │   │
│  │  └─────────────────────────┘  │  └─────────────────┘    │        │   │
│  │                               └─────────────────────────┘        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Breakdown

### Phase 1: 自动激活机制
- [ ] 设计 shell hook 机制（bash/zsh/fish 支持）
- [ ] `npx ccjk` 安装时自动注入 hook
- [ ] 实现 `claude` 命令透明重定向到 `ccjk-claude-wrapper`
- [ ] 支持 `codex` 命令同样处理

### Phase 2: CLI Wrapper 核心
- [ ] 实现 `ccjk-claude-wrapper` 可执行文件
- [ ] 透传所有命令行参数
- [ ] 透传 stdin/stdout/stderr
- [ ] 保持 TTY 特性（颜色、交互式输入）

### Phase 3: FC 输出解析
- [ ] 研究 Claude Code 输出格式
- [ ] 实现流式输出解析器
- [ ] 识别 function call 开始/结束
- [ ] 提取 FC 名称、参数、结果

### Phase 4: 智能总结器
- [ ] 实现 Haiku API 调用
- [ ] 设计总结 prompt 模板
- [ ] 实现用户模型降级策略
- [ ] 后台异步总结（不阻塞用户）

### Phase 5: Session 管理
- [ ] 实现 token 估算算法
- [ ] 设计阈值检测逻辑（默认 80% 上下文）
- [ ] 实现新会话提示 UI
- [ ] 支持 `--continue` 从上次 summary 继续

### Phase 6: 本地存储
- [ ] 设计存储目录结构
- [ ] 实现 session 元数据管理
- [ ] 实现 log 写入（增量追加）
- [ ] 实现 summary 存储与索引

### Phase 7: 云同步 API
- [ ] 设计云同步数据格式
- [ ] 实现上传队列机制
- [ ] 编写后端 API 对接文档
- [ ] 实现可选的自动同步

### Phase 8: Zero-Config 优化
- [ ] 确保默认配置开箱即用
- [ ] 添加 `ccjk context` 管理命令
- [ ] 实现 `ccjk context status` 查看状态
- [ ] 实现 `ccjk context clean` 清理旧数据

---

## 📐 Technical Approach

### 1. Shell Hook 机制

```bash
# ~/.bashrc 或 ~/.zshrc 中注入
# CCJK Context Compression Hook
if command -v ccjk-claude-wrapper &> /dev/null; then
  alias claude='ccjk-claude-wrapper'
  alias codex='ccjk-codex-wrapper'
fi
```

**安装时机**: `npx ccjk` 或 `ccjk init` 时自动添加

### 2. Wrapper 实现方案

```typescript
// src/commands/claude-wrapper.ts
import { spawn } from 'node:child_process'
import { ContextManager } from '../utils/context/manager'

export async function claudeWrapper(args: string[]) {
  const contextMgr = new ContextManager()

  // 启动原生 claude 进程
  const claude = spawn('claude', args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, CCJK_WRAPPED: '1' }
  })

  // 流式处理输出
  const parser = new FCOutputParser()

  claude.stdout.on('data', (chunk) => {
    // 1. 透传给用户
    process.stdout.write(chunk)

    // 2. 解析 FC 调用
    const fcResults = parser.parse(chunk)
    for (const fc of fcResults) {
      // 3. 后台异步总结
      contextMgr.summarizeFC(fc)
    }
  })

  // 检测上下文阈值
  contextMgr.on('threshold', () => {
    showNewSessionPrompt()
  })
}
```

### 3. FC 输出解析

Claude Code 的输出格式（需要实际测试确认）：

```
[Tool: Read] Reading file: src/index.ts
... file content ...
[Tool Complete]

[Tool: Edit] Editing file: src/index.ts
... edit details ...
[Tool Complete]
```

解析器状态机：

```typescript
enum ParserState {
  IDLE,
  IN_TOOL_CALL,
  IN_TOOL_OUTPUT,
}

class FCOutputParser {
  private state = ParserState.IDLE
  private currentFC: FCCall | null = null

  parse(chunk: Buffer): FCCall[] {
    // 状态机解析逻辑
  }
}
```

### 4. 总结 Prompt 模板

```typescript
const SUMMARIZE_PROMPT = `
You are a context compression assistant. Summarize the following function call result concisely.

Function: {fc_name}
Arguments: {fc_args}
Result: {fc_result}

Provide a one-line summary (max 100 chars) capturing:
1. What action was performed
2. Key outcome or finding
3. Any important details for future reference

Summary:
`
```

### 5. Token 估算

```typescript
// 简单估算：1 token ≈ 4 characters (英文) / 1.5 characters (中文)
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.5 + otherChars / 4)
}

// 阈值检测
const CONTEXT_THRESHOLD = 0.8 // 80% of max context
const MAX_CONTEXT = 200000 // Claude's context window

function shouldStartNewSession(totalTokens: number): boolean {
  return totalTokens > MAX_CONTEXT * CONTEXT_THRESHOLD
}
```

### 6. 存储结构

```
~/.ccjk/context/
├── config.json                    # 全局配置
├── sessions/
│   └── {project-hash}/
│       ├── current.json           # 当前会话元数据
│       ├── session-001/
│       │   ├── meta.json          # 会话元数据
│       │   ├── fc-log.jsonl       # FC 日志 (JSON Lines)
│       │   └── summary.md         # 压缩摘要
│       └── session-002/
│           └── ...
└── sync-queue/                    # 待同步队列
    └── {timestamp}-{hash}.json
```

**Session 元数据格式**:

```json
{
  "id": "session-001",
  "projectPath": "/Users/lu/my-project",
  "projectHash": "a1b2c3d4",
  "startTime": "2026-01-13T10:00:00Z",
  "endTime": null,
  "status": "active",
  "tokenCount": 45000,
  "fcCount": 23,
  "summaryTokens": 2000
}
```

**FC Log 格式 (JSONL)**:

```jsonl
{"ts":"2026-01-13T10:01:00Z","fc":"Read","args":{"file":"src/index.ts"},"tokens":500,"summary":"Read main entry file, exports App component"}
{"ts":"2026-01-13T10:01:30Z","fc":"Edit","args":{"file":"src/index.ts"},"tokens":800,"summary":"Added error handling to App component"}
```

---

## ☁️ Cloud Sync API Specification

> **此文档供后端开发使用**

### Base URL
```
https://api.api.claudehome.cn/v1/context
```

### Authentication
```
Authorization: Bearer {user_api_key}
```

### Endpoints

#### 1. Upload Session Summary

**POST** `/sessions`

上传一个完整的会话摘要。

**Request Body**:
```json
{
  "session": {
    "id": "session-001",
    "projectHash": "a1b2c3d4",
    "projectName": "my-awesome-project",
    "startTime": "2026-01-13T10:00:00Z",
    "endTime": "2026-01-13T12:30:00Z",
    "tokenCount": 45000,
    "summaryTokens": 2000,
    "fcCount": 23
  },
  "summary": {
    "content": "## Session Summary\n\n### Completed Tasks\n- Refactored auth module\n- Added error handling\n...",
    "format": "markdown",
    "language": "zh-CN"
  },
  "fcLogs": [
    {
      "timestamp": "2026-01-13T10:01:00Z",
      "functionName": "Read",
      "arguments": {"file": "src/index.ts"},
      "tokenCount": 500,
      "summary": "Read main entry file"
    }
  ],
  "metadata": {
    "ccjkVersion": "3.5.0",
    "claudeModel": "claude-sonnet-4-20250514",
    "summaryModel": "claude-haiku",
    "platform": "darwin",
    "timezone": "Asia/Shanghai"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "cloud-session-uuid",
    "uploadedAt": "2026-01-13T12:31:00Z",
    "storageUsed": 15000,
    "quotaRemaining": 985000
  }
}
```

#### 2. Get Session History

**GET** `/sessions?projectHash={hash}&limit={n}`

获取项目的历史会话列表。

**Response**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "cloud-session-uuid-1",
        "localId": "session-001",
        "startTime": "2026-01-13T10:00:00Z",
        "endTime": "2026-01-13T12:30:00Z",
        "summaryPreview": "Refactored auth module, added error handling...",
        "fcCount": 23,
        "tokenCount": 45000
      }
    ],
    "total": 15,
    "hasMore": true
  }
}
```

#### 3. Get Session Detail

**GET** `/sessions/{sessionId}`

获取单个会话的完整详情。

**Response**:
```json
{
  "success": true,
  "data": {
    "session": { /* same as upload */ },
    "summary": { /* same as upload */ },
    "fcLogs": [ /* same as upload */ ]
  }
}
```

#### 4. Sync Status

**GET** `/sync/status`

获取同步状态和配额信息。

**Response**:
```json
{
  "success": true,
  "data": {
    "syncEnabled": true,
    "lastSyncAt": "2026-01-13T12:31:00Z",
    "pendingUploads": 0,
    "storage": {
      "used": 150000,
      "quota": 1000000,
      "unit": "tokens"
    },
    "plan": "free"
  }
}
```

#### 5. Delete Session

**DELETE** `/sessions/{sessionId}`

删除云端会话数据。

**Response**:
```json
{
  "success": true,
  "data": {
    "deletedAt": "2026-01-13T13:00:00Z",
    "storageFreed": 15000
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Storage quota exceeded. Please upgrade your plan.",
    "details": {
      "used": 1000000,
      "quota": 1000000
    }
  }
}
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `QUOTA_EXCEEDED` | 403 | Storage quota exceeded |
| `SESSION_NOT_FOUND` | 404 | Session does not exist |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

### Webhook (Optional)

后端可以配置 webhook 接收实时同步事件：

**POST** `{user_webhook_url}`

```json
{
  "event": "session.uploaded",
  "timestamp": "2026-01-13T12:31:00Z",
  "data": {
    "sessionId": "cloud-session-uuid",
    "projectHash": "a1b2c3d4",
    "summaryPreview": "Refactored auth module..."
  }
}
```

---

## ✅ Acceptance Criteria

### Functional Acceptance

- [ ] `npx ccjk` 安装后，`claude` 命令自动启用压缩功能
- [ ] 用户无需任何配置即可使用
- [ ] FC 调用后 3 秒内完成总结（后台异步）
- [ ] 达到 80% 上下文时提示用户开新会话
- [ ] 新会话可以从上次 summary 继续
- [ ] 本地日志可通过 `ccjk context` 命令管理
- [ ] 云同步可选开启，数据格式符合 API 规范

### Performance Metrics

| 指标 | 目标 |
|------|------|
| Wrapper 启动延迟 | < 100ms |
| FC 总结延迟 | < 3s (后台) |
| 存储开销 | < 1MB/session |
| 内存占用 | < 50MB |

### Test Coverage

- [ ] CLI Wrapper 单元测试 > 80%
- [ ] FC Parser 单元测试 > 90%
- [ ] Session Manager 集成测试
- [ ] 云同步 E2E 测试

---

## ⏱️ Implementation Plan

### Milestone 1: Core Foundation (Week 1)
- Phase 1: 自动激活机制
- Phase 2: CLI Wrapper 核心

### Milestone 2: Intelligence Layer (Week 2)
- Phase 3: FC 输出解析
- Phase 4: 智能总结器

### Milestone 3: Session & Storage (Week 3)
- Phase 5: Session 管理
- Phase 6: 本地存储

### Milestone 4: Cloud & Polish (Week 4)
- Phase 7: 云同步 API
- Phase 8: Zero-Config 优化

---

## 📝 Decision Log

### v1 - 2026-01-13
- **启动方式**: 选择自动激活（shell hook），而非显式 `ccjk claude`
- **总结模型**: Haiku 优先，降级到用户当前模型
- **存储策略**: 本地 + 可选云同步
- **MVP 范围**: 全功能 MVP，包含云同步

---

## 🔗 Related Documents

- [CCJK Main CLAUDE.md](../../../CLAUDE.md)
- [Cloud API Backend Spec](#cloud-sync-api-specification) (本文档内)

---

**Status**: ✅ Planning Complete
**Next Step**: 开始 Phase 1 实现
