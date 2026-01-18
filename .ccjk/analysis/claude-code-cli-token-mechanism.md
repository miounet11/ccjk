# 🧠 Claude Code CLI Token 统计机制 - 最强大脑分析

## 📋 问题现状

**观察到的异常**：
- 显示：`5.5% · 10.9k tokens`
- 实际：进行了 100+ 轮对话
- 预期：应该显示 50k-100k+ tokens
- 配置：已修复（移除 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`，MCP_TIMEOUT=15000）
- 结论：**配置正确，但 token 统计仍然不准确**

---

## 🔍 Claude Code CLI Token 统计机制深度解析

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  用户输入     │ ───> │  消息管理器   │                   │
│  └──────────────┘      └──────────────┘                   │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  上下文构建器     │                    │
│                    │  - 历史消息       │                    │
│                    │  - 系统提示       │                    │
│                    │  - 工具定义       │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  Token 估算器     │ ← 客户端估算       │
│                    │  (可选)          │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  API 请求构建器   │                    │
│                    └──────────────────┘                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  HTTPS 请求      │
                    │  POST /v1/messages│
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              你的后端代理 (ttkk.inping.com)                  │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  请求接收     │ ───> │  请求转发     │                   │
│  └──────────────┘      └──────────────┘                   │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  Anthropic API   │                    │
│                    │  (官方)          │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  响应处理         │                    │
│                    │  - 提取 usage    │ ← 关键点！         │
│                    │  - 计算 tokens   │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  响应返回         │                    │
│                    └──────────────────┘                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
│                                                             │
│                    ┌──────────────────┐                    │
│                    │  响应解析器       │                    │
│                    │  - 提取 content  │                    │
│                    │  - 提取 usage    │ ← 关键点！         │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  Token 累加器     │ ← 关键点！         │
│                    │  - 累计 input    │                    │
│                    │  - 累计 output   │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │  UI 显示          │                    │
│                    │  "5.5% · 10.9k"  │ ← 你看到的         │
│                    └──────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 关键点分析

### 关键点 1：Anthropic API 的 Usage 字段

**标准 Anthropic API 响应格式**：
```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "响应内容..."
    }
  ],
  "model": "claude-opus-4-5-20251101",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {                          // ← 关键！
    "input_tokens": 1234,             // 本次请求的输入 token
    "output_tokens": 5678             // 本次请求的输出 token
  }
}
```

**重要特性**：
- `usage.input_tokens`：包含**所有发送的内容**（历史消息 + 系统提示 + 工具定义 + 当前输入）
- `usage.output_tokens`：本次 AI 响应的 token 数
- **这是单次请求的值，不是累计值**

---

### 关键点 2：Claude Code CLI 的 Token 累加逻辑

**正常工作流程**：

```javascript
// 伪代码
class TokenTracker {
  constructor() {
    this.totalInputTokens = 0
    this.totalOutputTokens = 0
  }

  async sendMessage(message) {
    // 1. 构建请求（包含历史消息）
    const request = {
      messages: this.history,  // 所有历史消息
      // ...
    }

    // 2. 发送到 API
    const response = await api.post('/v1/messages', request)

    // 3. 提取 usage
    const { input_tokens, output_tokens } = response.usage

    // 4. 累加 token（关键！）
    this.totalInputTokens += input_tokens
    this.totalOutputTokens += output_tokens

    // 5. 更新 UI
    this.updateUI(this.totalInputTokens + this.totalOutputTokens)
  }
}
```

**问题可能出现的地方**：
1. ❌ API 响应中没有 `usage` 字段
2. ❌ `usage` 字段的值不正确
3. ❌ 累加逻辑有 bug
4. ❌ 会话切换时 token 被重置

---

### 关键点 3：你的后端代理可能的问题

**场景 A：代理没有正确转发 usage 字段**

```python
# 错误的代理实现
def proxy_request(request):
    # 转发到 Anthropic
    response = anthropic_api.post('/v1/messages', request)

    # ❌ 错误：只返回 content，丢失了 usage
    return {
        "content": response["content"]
        # 缺少 "usage" 字段！
    }
```

**结果**：Claude Code CLI 无法获取 token 信息

---

**场景 B：代理返回了错误的 usage 值**

```python
# 错误的代理实现
def proxy_request(request):
    response = anthropic_api.post('/v1/messages', request)

    # ❌ 错误：只计算当前消息的 token，忽略历史
    current_message_tokens = estimate_tokens(request["messages"][-1])

    return {
        "content": response["content"],
        "usage": {
            "input_tokens": current_message_tokens,  # 只有当前消息！
            "output_tokens": response["usage"]["output_tokens"]
        }
    }
```

**结果**：显示的 token 数远小于实际值

---

**场景 C：代理截断了历史消息**

```python
# 错误的代理实现
def proxy_request(request):
    # ❌ 错误：只保留最近 10 条消息
    request["messages"] = request["messages"][-10:]

    response = anthropic_api.post('/v1/messages', request)

    # usage 只反映这 10 条消息的 token
    return response
```

**结果**：
- 后端日志显示"转发客户端历史 10 条"（正常）
- 但实际上客户端发送了 100 条（被截断了）
- token 统计只反映 10 条消息

---

## 🔬 诊断方法

### 方法 1：抓包分析 API 请求和响应

**使用 mitmproxy 或 Charles 抓包**：

```bash
# 安装 mitmproxy
brew install mitmproxy

# 启动代理
mitmproxy -p 8888

# 配置 Claude Code CLI 使用代理
export HTTPS_PROXY=http://localhost:8888
claude
```

**观察**：
1. 请求中发送了多少条历史消息？
2. 响应中是否包含 `usage` 字段？
3. `usage.input_tokens` 的值是多少？

---

### 方法 2：检查后端日志

```bash
# 查看后端日志中的 token 信息
tail -100 logs/gunicorn.log | grep -E "usage|input_tokens|output_tokens|转发客户端历史"
```

**期望看到**：
```
[Session] xxx: 转发客户端历史 80 条
[API Response] usage: {"input_tokens": 45000, "output_tokens": 12000}
```

**如果看到**：
```
[Session] xxx: 转发客户端历史 80 条
[API Response] usage: {"input_tokens": 1200, "output_tokens": 500}
```

说明：发送了 80 条消息，但 token 统计只有 1200（明显不对）

---

### 方法 3：对比官方 API

**临时切换到官方 API 测试**：

```json
// ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "ANTHROPIC_API_KEY": "sk-ant-your-key",
    // ...
  }
}
```

**测试步骤**：
1. 重启 Claude Code CLI
2. 进行 10 轮对话
3. 观察 token 统计

**如果官方 API 正常**：
- 说明问题在你的代理
- 需要修复代理的 usage 转发逻辑

**如果官方 API 也不正常**：
- 说明问题在 Claude Code CLI 本身
- 或者配置还有其他问题

---

## 💡 解决方案

### 方案 1：修复后端代理（推荐）⭐⭐⭐⭐⭐

**如果你控制后端代理**，修改代理逻辑：

```python
# 正确的代理实现
def proxy_request(request):
    # 1. 完整转发请求（不要截断历史）
    response = anthropic_api.post('/v1/messages', request)

    # 2. 完整转发响应（包括 usage）
    return {
        "id": response["id"],
        "type": response["type"],
        "role": response["role"],
        "content": response["content"],
        "model": response["model"],
        "stop_reason": response["stop_reason"],
        "stop_sequence": response["stop_sequence"],
        "usage": response["usage"]  # ← 关键：完整转发 usage
    }
```

**验证**：
```bash
# 检查代理返回的响应
curl -X POST https://ttkk.inping.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"model":"claude-opus-4-5-20251101","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}' \
  | jq '.usage'

# 应该看到：
# {
#   "input_tokens": 123,
#   "output_tokens": 456
# }
```

---

### 方案 2：在代理中添加 Token 累加逻辑 ⭐⭐⭐

**如果 Anthropic API 返回的 usage 不准确**，在代理中手动累加：

```python
# 会话级别的 token 跟踪
session_tokens = {}

def proxy_request(request, session_id):
    # 1. 转发到 Anthropic
    response = anthropic_api.post('/v1/messages', request)

    # 2. 累加 token
    if session_id not in session_tokens:
        session_tokens[session_id] = {"input": 0, "output": 0}

    session_tokens[session_id]["input"] += response["usage"]["input_tokens"]
    session_tokens[session_id]["output"] += response["usage"]["output_tokens"]

    # 3. 返回累计值
    response["usage"] = {
        "input_tokens": session_tokens[session_id]["input"],
        "output_tokens": session_tokens[session_id]["output"]
    }

    return response
```

**注意**：这需要会话管理，确保不同会话的 token 不会混淆。

---

### 方案 3：在 Claude Code CLI 中添加客户端估算 ⭐⭐

**如果无法修复后端**，在客户端做补偿：

```javascript
// 客户端 token 估算
function estimateTokens(text) {
  // 简单估算：
  // - 中文：1.5 字符 ≈ 1 token
  // - 英文：4 字符 ≈ 1 token

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars

  return Math.ceil(chineseChars / 1.5) + Math.ceil(otherChars / 4)
}

// 在发送请求前估算
const estimatedInputTokens = estimateTokens(JSON.stringify(request.messages))
```

**缺点**：
- 不准确（只是估算）
- 无法替代真实的 API usage
- 治标不治本

---

### 方案 4：联系 API 提供商 ⭐⭐⭐⭐

**如果你不控制后端代理**，联系 `ttkk.inping.com` 的技术支持：

**问题清单**：
1. 你们的 API 是否完整返回 Anthropic 的 `usage` 字段？
2. `usage.input_tokens` 是否包含所有历史消息的 token？
3. 是否有历史消息截断机制？如果有，阈值是多少？
4. 是否支持 Claude Code CLI 的 token 统计功能？
5. 能否提供一个测试接口，让我验证 usage 返回是否正确？

---

## 🎯 最可能的根本原因

基于你的情况分析，**最可能的原因是**：

### ⚠️ 后端代理的 `usage.input_tokens` 只计算当前消息，不包含历史

**证据链**：
1. ✅ 配置已修复（`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 已删除）
2. ✅ 后端日志显示"转发客户端历史 216-892 条"（说明历史被发送）
3. ❌ Claude Code CLI 显示 token 很少（10.9k）
4. ❌ 实际对话轮数很多（100+ 轮）

**推理**：
- 如果历史消息被正确发送（证据 2）
- 但 token 统计很少（证据 3）
- 说明：**后端返回的 `usage.input_tokens` 不包含历史消息的 token**

**验证方法**：
```bash
# 在后端日志中查找
tail -100 logs/gunicorn.log | grep -A 5 "转发客户端历史"

# 应该能看到类似：
# [Session] xxx: 转发客户端历史 80 条
# [API Request] messages count: 80
# [API Response] usage: {"input_tokens": ???, "output_tokens": ???}

# 如果 input_tokens 只有几百或几千，而不是几万
# 说明 usage 计算有问题
```

---

## 📊 预期修复效果

### 修复前
```
显示：5.5% · 10.9k tokens
实际：100+ 轮对话，真实 token 可能 50k-100k
差距：显示值只有实际值的 10-20%
```

### 修复后
```
显示：25% · 50k tokens（或更高）
实际：100+ 轮对话，真实 token 50k-100k
差距：显示值接近实际值（误差 < 10%）
```

---

## 🚀 立即行动计划

### 步骤 1：确认问题（5 分钟）
```bash
# 检查后端日志
tail -100 logs/gunicorn.log | grep -E "转发客户端历史|usage|input_tokens"
```

### 步骤 2：联系 API 提供商（1 天）
- 发送问题清单
- 要求技术支持协助诊断

### 步骤 3：测试官方 API（10 分钟）
- 临时切换到官方 API
- 验证是否是代理问题

### 步骤 4：修复代理（如果可控）（1-2 小时）
- 修改代理逻辑
- 确保完整转发 usage
- 测试验证

---

**结论**：问题很可能在**后端代理的 usage 计算逻辑**，需要修复代理或联系 API 提供商。
