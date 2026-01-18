# Token 统计问题深度分析

## 🔍 问题现象

**观察到的情况**：
- 显示：`5.5% · 10.9k tokens`
- 实际：已进行大量对话（100+ 轮）
- 预期：应该显示 50k-100k+ tokens
- 差距：显示值可能只有实际值的 **10-20%**

---

## 🎯 可能的原因分析

### 原因 1：后端 API 返回的 token 数不准确 ⚠️

**可能性**：**高**

**分析**：
你使用的是第三方 API 代理（`https://ttkk.inping.com/`），可能存在以下问题：

1. **API 代理未正确转发 usage 信息**
   ```json
   // 标准 Anthropic API 响应应该包含：
   {
     "usage": {
       "input_tokens": 1234,
       "output_tokens": 5678
     }
   }
   ```

   如果代理没有正确转发这个字段，Claude Code CLI 就无法获取准确的 token 数。

2. **代理返回的 token 数被截断或重置**
   - 某些代理为了节省成本，可能会修改 usage 信息
   - 或者只返回当前请求的 token，而不是累计值

3. **代理使用了不同的 token 计算方式**
   - 可能使用简化的估算算法
   - 与 Anthropic 官方计算方式不一致

**验证方法**：
```bash
# 检查后端日志中的 token 信息
tail -f logs/gunicorn.log | grep -E "input_tokens|output_tokens|usage"
```

---

### 原因 2：Claude Code CLI 的 token 计算逻辑问题 ⚠️

**可能性**：**中**

**分析**：

1. **客户端缓存问题**
   - Claude Code CLI 可能缓存了旧的 token 数据
   - 重启后没有正确加载历史 token 统计

2. **累计计算错误**
   - 每次请求的 token 没有正确累加
   - 或者累加逻辑有 bug

3. **会话管理问题**
   - 多个会话的 token 没有正确合并
   - 或者会话切换时 token 计数被重置

**验证方法**：
```bash
# 检查 Claude Code CLI 的日志
# 通常在 ~/.claude/logs/ 或类似位置
```

---

### 原因 3：`/compact` 执行后 token 被重置 ⚠️

**可能性**：**中**

**分析**：

如果 `/compact` 命令执行后，token 计数被重置为压缩后的值，而不是保留原始累计值，就会导致显示的 token 数偏低。

**正常行为**：
- `/compact` 前：100k tokens
- `/compact` 后：压缩到 20k tokens
- **显示应该**：仍然显示 100k（或标注已压缩）

**异常行为**：
- `/compact` 后：直接显示 20k tokens
- 用户误以为只用了 20k

---

### 原因 4：第三方 API 的 token 限制策略 ⚠️

**可能性**：**高**

**分析**：

某些第三方 API 提供商为了控制成本，可能会：

1. **限制单次请求的上下文长度**
   - 即使你发送了 100k tokens 的历史
   - 后端只处理最近的 10k tokens
   - 返回的 usage 也只计算这 10k

2. **强制截断历史消息**
   - 自动丢弃旧的对话历史
   - 只保留最近 N 条消息

3. **使用不同的计费模型**
   - 可能按"有效 token"计费
   - 而不是按实际发送的 token 计费

---

## 🔬 诊断步骤

### 步骤 1：检查 API 响应

在 Claude Code CLI 中执行一个简单的请求，然后检查后端日志：

```bash
# 查看最近的 API 请求和响应
tail -100 logs/gunicorn.log | grep -A 10 -B 10 "usage"
```

**期望看到**：
```json
{
  "usage": {
    "input_tokens": 50000,   // 应该是累计值
    "output_tokens": 30000
  }
}
```

**如果看到的是**：
```json
{
  "usage": {
    "input_tokens": 1000,    // 只有当前请求的值
    "output_tokens": 500
  }
}
```

说明问题在**后端 API**。

---

### 步骤 2：测试官方 API

临时切换到 Anthropic 官方 API 测试：

```json
// ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",  // 官方 API
    "ANTHROPIC_API_KEY": "sk-ant-xxx",                   // 官方 key
    // ... 其他配置
  }
}
```

如果切换到官方 API 后 token 统计正常，说明问题在**第三方代理**。

---

### 步骤 3：检查历史消息数量

```bash
# 检查后端日志中转发的历史消息数量
tail -100 logs/gunicorn.log | grep "转发客户端历史"
```

**正常情况**：
```
[Session] xxx: 转发客户端历史 80 条
```

**异常情况**：
```
[Session] xxx: 转发客户端历史 500 条  // 过多，说明没有正确压缩
```

---

### 步骤 4：手动计算 token

使用 token 计算工具估算：

```python
# 粗略估算
# 中文：1.5 字符 ≈ 1 token
# 英文：4 字符 ≈ 1 token

# 假设我们的对话：
# - 100 轮对话
# - 每轮平均 500 tokens（用户 + AI）
# 预期总 token：100 × 500 = 50,000 tokens

# 但显示只有 10,900 tokens
# 差距：50,000 - 10,900 = 39,100 tokens (78% 缺失)
```

---

## 🎯 最可能的原因

基于你的情况（使用第三方 API `ttkk.inping.com`），**最可能的原因是**：

### ⚠️ 第三方 API 代理的 token 统计不准确

**具体表现**：
1. API 代理只返回**当前请求**的 token 数，而不是**累计值**
2. 或者代理**截断了历史消息**，只处理最近的部分
3. 或者代理使用了**不同的计费模型**

**证据**：
- 你的后端日志显示"转发客户端历史 216-892 条"（过多）
- 但 Claude Code CLI 显示的 token 数很少（10.9k）
- 说明：大量历史被发送，但 token 统计没有正确累加

---

## 💡 解决方案

### 方案 1：联系 API 提供商 ⭐⭐⭐

**推荐指数**：⭐⭐⭐⭐⭐

询问 `ttkk.inping.com` 的技术支持：
1. 你们的 API 是否正确返回 `usage.input_tokens` 和 `usage.output_tokens`？
2. 返回的是**累计值**还是**单次请求值**？
3. 是否有**历史消息截断**机制？
4. 是否支持 Claude Code CLI 的 token 统计功能？

---

### 方案 2：切换到官方 API 测试 ⭐⭐⭐

**推荐指数**：⭐⭐⭐⭐

临时切换到 Anthropic 官方 API，验证是否是代理问题：

```bash
# 1. 备份当前配置
cp ~/.claude/settings.json ~/.claude/settings.json.backup-proxy

# 2. 修改为官方 API
# 编辑 ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "ANTHROPIC_API_KEY": "sk-ant-your-official-key",
    // ...
  }
}

# 3. 重启 Claude Code CLI 测试
# 4. 观察 token 统计是否正常
```

---

### 方案 3：修改后端代理逻辑 ⭐⭐

**推荐指数**：⭐⭐⭐

如果你控制后端代理（`ttkk.inping.com`），可以修改代理逻辑：

1. **正确转发 usage 信息**
   ```python
   # 确保代理返回完整的 usage 字段
   response = {
       "usage": {
           "input_tokens": total_input_tokens,    # 累计值
           "output_tokens": total_output_tokens   # 累计值
       }
   }
   ```

2. **不要截断历史消息**
   - 保留完整的对话历史
   - 或者至少保留足够的上下文（50k+ tokens）

3. **使用与 Anthropic 一致的 token 计算方式**

---

### 方案 4：客户端补偿计算 ⭐

**推荐指数**：⭐⭐

如果 API 无法修复，可以在客户端做补偿：

```javascript
// 在 Claude Code CLI 中添加客户端 token 估算
// 但这只是权宜之计，不如修复 API
```

**缺点**：
- 不准确（只是估算）
- 无法触发正确的 `/compact` 时机
- 治标不治本

---

## 🔍 下一步行动

### 立即执行

1. **检查后端日志**
   ```bash
   tail -100 logs/gunicorn.log | grep -E "usage|input_tokens|output_tokens"
   ```

2. **测试官方 API**（如果有官方 key）
   - 临时切换到官方 API
   - 观察 token 统计是否正常

3. **联系 API 提供商**
   - 询问 token 统计机制
   - 要求修复或提供解决方案

---

## 📊 预期结果

### 如果是 API 问题

**修复后**：
- Token 统计准确反映实际使用量
- `/compact` 在合适的时机自动触发
- 后端负载正常

### 如果不是 API 问题

需要进一步诊断：
- Claude Code CLI 的 bug
- 配置问题
- 其他未知因素

---

**结论**：基于现有信息，**最可能是第三方 API 代理的 token 统计不准确**。建议先联系 API 提供商确认。
