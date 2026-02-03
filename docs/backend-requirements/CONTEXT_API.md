# Context Management API

CCJK Cloud Service v8 上下文管理 API，提供会话消息、摘要、归档和上下文统计功能。

## 基础信息

- **Base URL**: `https://api.claudehome.cn/api/v8`
- **认证**: Bearer Token (Authorization header)
- **响应格式**: JSON

## API 端点

### 会话消息 (Session Messages)

#### 获取会话消息
```http
GET /sessions/{sessionId}/messages
```

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回数量限制，默认 100 |
| offset | number | 否 | 偏移量，默认 0 |
| min_importance | number | 否 | 最小重要性分数，默认 0 |
| since | string | 否 | 起始时间 (ISO 8601) |

**响应**:
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "msg-xxx",
        "session_id": "session-xxx",
        "type": "user",
        "role": "user",
        "content": "消息内容",
        "importance_score": 50,
        "token_estimate": 100,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "limit": 100,
    "offset": 0
  }
}
```

#### 添加消息
```http
POST /sessions/{sessionId}/messages
```

**请求体**:
```json
{
  "type": "user",
  "role": "user",
  "content": "消息内容或 ContentBlock 数组",
  "tool_use_result": {},
  "metadata": {}
}
```

**响应**:
```json
{
  "code": 0,
  "message": "Message added",
  "data": {
    "message": { ... },
    "warning": "WARNING: Context usage at 80%+. Consider compacting soon."
  }
}
```

### 会话摘要 (Session Summary)

#### 获取最新摘要
```http
GET /sessions/{sessionId}/summary
```

**响应**:
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "id": "sum-xxx",
    "session_id": "session-xxx",
    "message_count": 50,
    "token_estimate": 5000,
    "key_decisions": ["使用 TypeScript", "采用 Hono 框架"],
    "code_changes": [
      { "file": "src/index.ts", "action": "update" }
    ],
    "topics": ["typescript", "api", "hono"],
    "summary": "主要话题: typescript, api\n关键决策: 使用 TypeScript\n...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 获取所有摘要
```http
GET /sessions/{sessionId}/summaries
```

### 会话压缩 (Session Compact)

#### 压缩会话
```http
POST /sessions/{sessionId}/compact
```

**请求体**:
```json
{
  "keep_last_n": 20,
  "archive_threshold": 200,
  "preserve_decisions": true,
  "preserve_code_changes": true
}
```

**响应**:
```json
{
  "code": 0,
  "message": "Session compacted",
  "data": {
    "success": true,
    "messages_archived": 100,
    "messages_kept": 25,
    "tokens_before": 50000,
    "tokens_after": 10000,
    "tokens_saved": 40000,
    "summary_id": "sum-xxx",
    "archive_id": "arch-xxx"
  }
}
```

### 上下文统计 (Context Stats)

#### 获取上下文统计
```http
GET /context/stats?session_id={sessionId}
```

**响应**:
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "estimated_tokens": 50000,
    "max_tokens": 200000,
    "usage_percentage": 25,
    "turn_count": 50,
    "message_count": 100,
    "last_compacted_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 获取会话统计
```http
GET /sessions/{sessionId}/stats
```

### Token 估算

#### 估算 Token 数量
```http
POST /context/estimate
```

**请求体**:
```json
{
  "text": "要估算的文本"
}
```

或

```json
{
  "messages": [
    { "role": "user", "content": "消息1" },
    { "role": "assistant", "content": "消息2" }
  ]
}
```

**响应**:
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "estimated_tokens": 100,
    "char_count": 400,
    "chars_per_token": 4
  }
}
```

### 会话归档 (Session Archives)

#### 获取归档列表
```http
GET /sessions/{sessionId}/archives
```

### 崩溃恢复 (Crash Recovery)

#### 获取未恢复的数据
```http
GET /recovery
```

#### 保存恢复数据
```http
POST /recovery/save
```

**请求体**:
```json
{
  "session_id": "session-xxx",
  "pending_messages": [...],
  "context_snapshot": {}
}
```

#### 标记为已恢复
```http
POST /recovery/{id}/recover
```

#### 清理旧数据
```http
DELETE /recovery/cleanup?days=7
```

### 自动保存 (Auto Save)

#### 触发自动保存
```http
POST /sessions/{sessionId}/auto-save
```

**请求体**:
```json
{
  "trigger": "interval"
}
```

## 重要性评分算法

消息重要性评分 (0-100) 基于以下规则：

| 条件 | 分数 |
|------|------|
| 用户消息 | +10 |
| 助手消息 | +5 |
| 包含决策关键词 | +30 |
| 包含代码块或文件操作 | +40 |
| 包含错误/修复关键词 | +20 |

## Token 估算算法

- 基础估算：字符数 / 4
- 代码块调整：+5%
- URL 密集调整：+10%

## 上下文警告阈值

| 使用率 | 状态 |
|--------|------|
| < 80% | 正常 |
| 80-90% | 警告 (warning_triggered) |
| >= 90% | 严重 (critical_triggered) |

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| -1 | 失败 |

| error | 说明 |
|-------|------|
| AUTH_REQUIRED | 需要认证 |
| INVALID_REQUEST | 请求参数无效 |
| NOT_FOUND | 资源不存在 |
