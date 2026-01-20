# CCJK 云控系统 - 测试文档

> **版本**: v3.0.0
> **测试环境**: https://api.claudehome.cn
> **文档版本**: 1.0
> **创建时间**: 2026-01-20

---

## 目录

- [1. 测试环境准备](#1-测试环境准备)
- [2. 设备控制测试](#2-设备控制测试)
- [3. 命令执行测试](#3-命令执行测试)
- [4. 邮件控制测试](#4-邮件控制测试)
- [5. 移动端控制测试](#5-移动端控制测试)
- [6. WebSocket 实时通信测试](#6-websocket-实时通信测试)
- [7. 异常场景测试](#7-异常场景测试)
- [8. 安全测试](#8-安全测试)
- [9. 性能测试](#9-性能测试)
- [10. 测试报告模板](#10-测试报告模板)

---

## 1. 测试环境准备

### 1.1 环境信息

| 项目 | 值 |
|------|-----|
| 测试环境 | https://api.claudehome.cn |
| 数据库 | SQLite (测试库) |
| 测试账号 | test@example.com |
| 测试设备 | 需准备至少 2 台测试设备 |

### 1.2 工具准备

- **API 测试**: Postman / curl / HTTPie
- **WebSocket 测试**: wscat / 浏览器控制台
- **邮件测试**: 可用邮箱账号（支持 IMAP）
- **移动端测试**: 飞书 / 钉钉 / 企业微信 App

### 1.3 获取测试 Token

```bash
# 1. 请求验证码
curl -X POST https://api.claudehome.cn/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. 验证并获取 Token (从邮件获取验证码)
curl -X POST https://api.claudehome.cn/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'

# 保存返回的 token，后续请求使用
TOKEN="返回的token值"
```

### 1.4 测试设备准备

确保至少有 1 台设备已在线，可通过以下命令检查：

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices
```

---

## 2. 设备控制测试

### 2.1 获取设备列表

**测试用例 TC-001**

```bash
# 测试命令
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "dev_xxx",
        "name": "测试设备",
        "platform": "darwin",
        "status": "online"
      }
    ],
    "total": 1
  }
}
```

**验证点**:
- [ ] HTTP 状态码为 200
- [ ] success 字段为 true
- [ ] devices 数组正确返回
- [ ] 在线设备 status 为 "online"

### 2.2 获取设备详情

**测试用例 TC-002**

```bash
# 替换 DEVICE_ID 为实际设备 ID
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices/$DEVICE_ID
```

**预期结果**:
- [ ] 返回设备完整信息
- [ ] 包含 platform、osVersion、ccjkVersion 字段
- [ ] controlEnabled 字段存在

### 2.3 获取离线设备

**测试用例 TC-003**

```bash
# 请求不存在的设备 ID
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices/dev_notexist
```

**预期结果**:
```json
{
  "success": false,
  "error": "Device not found"
}
```

---

## 3. 命令执行测试

### 3.1 执行简单命令

**测试用例 TC-101**

```bash
# 执行 ls 命令
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "ls -la"
  }'
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "commandId": "cmd_xxx",
    "status": "pending",
    "message": "命令已提交，等待执行"
  }
}
```

**验证点**:
- [ ] 返回 commandId
- [ ] status 初始为 "pending"
- [ ] 保存 commandId 供后续查询

### 3.2 查询命令状态

**测试用例 TC-102**

```bash
# 替换 COMMAND_ID 为上一步返回的 ID
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/commands/$COMMAND_ID
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "command": {
      "id": "cmd_xxx",
      "status": "completed",
      "result": {
        "exitCode": 0,
        "stdout": "total 128...",
        "stderr": ""
      }
    }
  }
}
```

**验证点**:
- [ ] 命令状态最终变为 "completed"
- [ ] result.exitCode 为 0
- [ ] result.stdout 包含输出内容

### 3.3 执行带参数的命令

**测试用例 TC-103**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "echo",
    "args": ["Hello, World!"]
  }'
```

**验证点**:
- [ ] 命令成功执行
- [ ] 输出包含 "Hello, World!"

### 3.4 执行长时间运行命令

**测试用例 TC-104**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "sleep",
    "args": ["5"],
    "timeout": 10000
  }'
```

**验证点**:
- [ ] 命令状态变为 "running"
- [ ] 5 秒后变为 "completed"

### 3.5 取消命令

**测试用例 TC-105**

```bash
# 先提交一个长时间命令
COMMAND_ID=$(curl -s -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "sleep",
    "args": ["30"]
  }' | jq -r '.data.commandId')

# 立即取消
curl -X DELETE https://api.claudehome.cn/api/control/commands/$COMMAND_ID \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "commandId": "cmd_xxx",
    "status": "cancelled"
  }
}
```

### 3.6 获取命令历史

**测试用例 TC-106**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.claudehome.cn/api/control/commands?deviceId=$DEVICE_ID&limit=10"
```

**验证点**:
- [ ] 返回命令列表
- [ ] 按时间倒序排列
- [ ] 包含之前执行的命令

---

## 4. 邮件控制测试

### 4.1 配置邮件监听

**测试用例 TC-201**

**前置条件**: 准备一个支持 IMAP 的邮箱账号（如 Gmail）

```bash
curl -X POST https://api.claudehome.cn/api/control/email/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceKey": "测试设备的device_key",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapUser": "your-email@gmail.com",
    "imapPassword": "app_password",
    "imapTls": true,
    "markAsRead": true,
    "folder": "INBOX",
    "enabled": true
  }'
```

**验证点**:
- [ ] 返回 success: true
- [ ] 邮件配置已保存

### 4.2 测试邮件连接

**测试用例 TC-202**

```bash
curl -X POST https://api.claudehome.cn/api/control/email/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapUser": "your-email@gmail.com",
    "imapPassword": "app_password",
    "imapTls": true
  }'
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "message": "Successfully connected to IMAP server"
  }
}
```

### 4.3 邮件控制命令测试

**测试用例 TC-203**

**操作步骤**:
1. 从配置的邮箱发送一封邮件
2. 收件人: 自己（或配置的监听邮箱）
3. 主题格式: `CCJK:device_key:status`
4. 正文: (可选)

```bash
# 使用 mail 命令或通过邮箱客户端发送
echo "" | mail -s "CCJK:your_device_key:status" your-email@gmail.com
```

**验证点**:
- [ ] 邮件被正确解析
- [ ] 命令被执行
- [ ] 收到执行结果回复邮件

### 4.4 邮件指令格式测试

**测试用例 TC-204**

测试各种邮件指令格式：

| 主题格式 | 预期行为 | 结果 |
|----------|----------|------|
| `CCJK:key:exec` | 执行 shell 命令 | 正文为命令内容 |
| `CCJK:key:deploy` | 执行部署 | 正文为 JSON 参数 |
| `CCJK:key:status` | 获取状态 | 返回设备状态 |
| `CCJK:key:restart` | 重启服务 | 需要确认 |

### 4.5 获取邮件监听状态

**测试用例 TC-205**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/email/status
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "activeConnections": 1,
    "totalConfigs": 1
  }
}
```

---

## 5. 移动端控制测试

### 5.1 获取快捷指令模板

**测试用例 TC-301**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/mobile/templates
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "deploy",
        "name": "部署",
        "actions": [
          {"id": "deploy", "label": "🚀 部署", "command": "npm run deploy", "confirm": true},
          {"id": "restart", "label": "🔄 重启", "command": "pm2 restart all", "confirm": true},
          {"id": "status", "label": "📊 状态", "command": "pm2 status", "confirm": false}
        ]
      }
    ]
  }
}
```

### 5.2 发送控制卡片到飞书

**测试用例 TC-302**

**前置条件**: 设备已配置飞书通知渠道

```bash
curl -X POST https://api.claudehome.cn/api/control/mobile/send-card \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "channel": "feishu",
    "templateId": "deploy"
  }'
```

**验证点**:
- [ ] 飞书收到控制卡片
- [ ] 卡片包含按钮: 🚀 部署、🔄 重启、📊 状态
- [ ] 点击按钮有响应

### 5.3 飞书卡片交互测试

**测试用例 TC-303**

**操作步骤**:
1. 在飞书中点击 "📊 状态" 按钮
2. 观察返回结果

**验证点**:
- [ ] 按钮点击有响应
- [ ] 命令被执行
- [ ] 卡片更新显示执行结果

### 5.4 敏感操作二次确认

**测试用例 TC-304**

**操作步骤**:
1. 在飞书中点击 "🚀 部署" 按钮
2. 观察是否弹出确认提示

**验证点**:
- [ ] 部署操作需要二次确认
- [ ] 确认后命令才执行
- [ ] 取消则不执行

### 5.5 钉钉控制卡片测试

**测试用例 TC-305**

```bash
curl -X POST https://api.claudehome.cn/api/control/mobile/send-card \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "channel": "dingtalk",
    "templateId": "deploy"
  }'
```

**验证点**:
- [ ] 钉钉收到控制卡片
- [ ] 卡片交互正常

### 5.6 企业微信控制卡片测试

**测试用例 TC-306**

```bash
curl -X POST https://api.claudehome.cn/api/control/mobile/send-card \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "channel": "wechat",
    "templateId": "deploy"
  }'
```

**验证点**:
- [ ] 企业微信收到控制卡片
- [ ] 卡片交互正常

---

## 6. WebSocket 实时通信测试

### 6.1 建立 WebSocket 连接

**测试用例 TC-401**

```bash
# 使用 wscat 工具
wscat -c "wss://api.claudehome.cn/api/control/logs/$DEVICE_ID?token=$TOKEN"
```

**验证点**:
- [ ] 连接成功建立
- [ ] 收到 status 消息: `{"type":"status","status":"connected"}`

### 6.2 订阅日志流

**测试用例 TC-402**

**连接后发送**:
```json
{"type": "subscribe", "deviceId": "$DEVICE_ID"}
```

**验证点**:
- [ ] 订阅成功
- [ ] 开始接收日志消息

### 6.3 接收命令执行日志

**测试用例 TC-403**

**操作步骤**:
1. 保持 WebSocket 连接
2. 通过 API 执行一个输出命令: `echo "Hello WebSocket"`
3. 观察 WebSocket 消息

**验证点**:
- [ ] 收到 log 类型的消息
- [ ] 消息包含命令输出

### 6.4 心跳测试

**测试用例 TC-404**

**每 30 秒发送**:
```json
{"type": "ping"}
```

**验证点**:
- [ ] 收到 pong 响应
- [ ] 连接保持活跃

### 6.5 异常断开测试

**测试用例 TC-405**

**操作步骤**:
1. 断开网络连接
2. 等待 30 秒
3. 恢复网络

**验证点**:
- [ ] 断开后收到错误消息
- [ ] 支持自动重连

---

## 7. 异常场景测试

### 7.1 Token 过期测试

**测试用例 TC-501**

```bash
# 使用过期的 Token
curl -H "Authorization: Bearer invalid_token" \
  https://api.claudehome.cn/api/control/devices
```

**预期结果**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "INVALID_TOKEN"
}
```

### 7.2 设备离线测试

**测试用例 TC-502**

**操作步骤**:
1. 关闭测试设备
2. 等待设备变为离线状态
3. 尝试执行命令

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "'$DEVICE_ID'", "commandType": "shell", "command": "ls"}'
```

**预期结果**:
```json
{
  "success": false,
  "error": "Device is offline",
  "code": "DEVICE_OFFLINE"
}
```

### 7.3 命令执行超时测试

**测试用例 TC-503**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "sleep",
    "args": ["100"],
    "timeout": 5000
  }'
```

**验证点**:
- [ ] 命令在 5 秒后超时
- [ ] 状态变为 "timeout"

### 7.4 危险命令拦截测试

**测试用例 TC-504**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID",
    "commandType": "shell",
    "command": "rm -rf /"
  }'
```

**预期结果**:
```json
{
  "success": false,
  "error": "Dangerous command detected",
  "code": "DANGEROUS_COMMAND"
}
```

### 7.5 无效设备 ID 测试

**测试用例 TC-505**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices/invalid_device_id
```

**预期结果**: HTTP 404

### 7.6 参数缺失测试

**测试用例 TC-506**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "'$DEVICE_ID'"}'
```

**预期结果**:
```json
{
  "success": false,
  "error": "Missing required fields: commandType, command"
}
```

### 7.7 并发命令测试

**测试用例 TC-507**

```bash
# 同时提交多个命令
for i in {1..10}; do
  curl -s -X POST https://api.claudehome.cn/api/control/execute \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "deviceId": "'$DEVICE_ID'",
      "commandType": "shell",
      "command": "echo '$i'"
    }' &
done
wait
```

**验证点**:
- [ ] 所有命令都被正确处理
- [ ] 命令按优先级执行
- [ ] 无命令丢失

---

## 8. 安全测试

### 8.1 SQL 注入测试

**测试用例 TC-601**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'; DROP TABLE devices; --",
    "commandType": "shell",
    "command": "ls"
  }'
```

**验证点**:
- [ ] 请求被拒绝
- [ ] 数据库未受影响

### 8.2 命令注入测试

**测试用例 TC-602**

```bash
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "commandType": "shell",
    "command": "ls; rm -rf /tmp/*"
  }'
```

**验证点**:
- [ ] 命令被拦截或转义
- [ ] 只有 ls 被执行

### 8.3 跨设备访问测试

**测试用例 TC-603**

**场景**: 用户 A 尝试控制用户 B 的设备

```bash
# 使用用户 A 的 Token 尝试控制用户 B 的设备
curl -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "user_b_device_id",
    "commandType": "shell",
    "command": "ls"
  }'
```

**验证点**:
- [ ] 请求被拒绝
- [ ] 返回 403 Forbidden

### 8.4 权限等级测试

**测试用例 TC-604**

**场景**: 不同权限用户执行不同级别命令

| 用户等级 | 危险命令 | 预期结果 |
|----------|----------|----------|
| GUEST (0) | 任何命令 | 拒绝 |
| USER (1) | ls | 允许 |
| USER (1) | rm -rf | 拒绝 |
| ADMIN (3) | 任何命令 | 允许 |

### 8.5 签名验证测试

**测试用例 TC-605**

**场景**: 飞书/钉钉回调签名验证

```bash
# 发送不带签名的回调请求
curl -X POST https://api.claudehome.cn/api/control/webhook/feishu \
  -H "Content-Type: application/json" \
  -d '{"action": {"value": {"action_id": "deploy"}}}'
```

**验证点**:
- [ ] 请求被拒绝（如果配置了签名验证）
- [ ] 返回 401 Unauthorized

---

## 9. 性能测试

### 9.1 响应时间测试

**测试用例 TC-701**

```bash
# 测试 API 响应时间
time curl -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices
```

**性能要求**:
- [ ] 设备列表 API < 500ms
- [ ] 命令提交 API < 200ms
- [ ] 命令状态查询 < 300ms

### 9.2 并发请求测试

**测试用例 TC-702**

使用 Apache Bench 或类似工具:

```bash
# 100 个并发用户，共 1000 次请求
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
  https://api.claudehome.cn/api/control/devices
```

**性能要求**:
- [ ] 无请求失败
- [ ] 95% 请求响应时间 < 1s
- [ ] 无内存泄漏

### 9.3 命令执行性能测试

**测试用例 TC-703**

```bash
# 提交命令到执行的时间差
START=$(date +%s%3N)
COMMAND_ID=$(curl -s -X POST https://api.claudehome.cn/api/control/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "'$DEVICE_ID'", "commandType": "shell", "command": "echo test"}' \
  | jq -r '.data.commandId')

# 等待命令完成
while true; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    https://api.claudehome.cn/api/control/commands/$COMMAND_ID \
    | jq -r '.data.command.status')
  if [ "$STATUS" = "completed" ]; then
    END=$(date +%s%3N)
    echo "Total time: $((END - START))ms"
    break
  fi
  sleep 0.5
done
```

**性能要求**:
- [ ] 简单命令 (echo) < 2s
- [ ] 中等命令 (npm status) < 5s

### 9.4 WebSocket 连接数测试

**测试用例 TC-704**

**场景**: 多个客户端同时连接 WebSocket

**验证点**:
- [ ] 支持 50+ 并发 WebSocket 连接
- [ ] 消息延迟 < 100ms
- [ ] 无连接断开

---

## 10. 测试报告模板

### 10.1 测试执行记录

| 用例编号 | 用例名称 | 测试人 | 执行时间 | 测试结果 | 备注 |
|----------|----------|--------|----------|----------|------|
| TC-001 | 获取设备列表 | 张三 | 2026-01-20 | ✅ 通过 | |
| TC-101 | 执行简单命令 | 张三 | 2026-01-20 | ✅ 通过 | |
| TC-504 | 危险命令拦截 | 张三 | 2026-01-20 | ❌ 失败 | 需修复 |

### 10.2 缺陷报告

| 缺陷编号 | 严重程度 | 标题 | 复现步骤 | 实际结果 | 预期结果 | 状态 |
|----------|----------|------|----------|----------|----------|------|
| BUG-001 | 高 | 危险命令未拦截 | 见 TC-504 | 命令被执行 | 命令被拒绝 | 待修复 |
| BUG-002 | 中 | WebSocket 断线不重连 | 见 TC-405 | 无法恢复 | 自动重连 | 待修复 |

**严重程度定义**:
- **严重**: 系统崩溃、数据丢失、安全漏洞
- **高**: 核心功能无法使用
- **中**: 功能异常但有绕过方案
- **低**: UI 问题、提示不准确

### 10.3 测试总结

```
==================== 测试总结 ====================

测试周期: 2026-01-20 至 2026-01-XX
测试版本: v3.0.0
测试人员: 测试组

【用例统计】
- 总用例数: 80
- 通过数: 75
- 失败数: 3
- 阻塞数: 2
- 通过率: 93.75%

【缺陷统计】
- 严重: 0
- 高: 1
- 中: 2
- 低: 5
- 总计: 8

【风险评级】
- 整体风险: 中等
- 发布建议: 修复高、中级缺陷后发布

【遗留问题】
1. 邮件解析某些格式不支持
2. WebSocket 大量连接下性能下降

==================================================
```

---

## 附录

### A. 快速测试脚本

```bash
#!/bin/bash
# CCJK 云控系统快速测试脚本

# 配置
API_BASE="https://api.claudehome.cn"
TOKEN="your_token_here"
DEVICE_ID="your_device_id_here"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 测试函数
test_case() {
  local name=$1
  local cmd=$2
  local expected=$3

  echo "Testing: $name"
  result=$(eval $cmd)

  if echo $result | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}: $name"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $name"
    echo "Expected: $expected"
    echo "Got: $result"
    return 1
  fi
}

# 执行测试
passed=0
failed=0

test_case "获取设备列表" \
  "curl -s -H \"Authorization: Bearer $TOKEN\" $API_BASE/api/control/devices" \
  "success"

test_case "获取快捷指令模板" \
  "curl -s -H \"Authorization: Bearer $TOKEN\" $API_BASE/api/control/mobile/templates" \
  "success"

# 输出结果
echo ""
echo "==================== 测试结果 ===================="
echo "通过: $passed"
echo "失败: $failed"
echo "================================================="
```

### B. Postman 测试集合

```json
{
  "info": {
    "name": "CCJK Cloud Control API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "设备控制",
      "item": [
        {
          "name": "获取设备列表",
          "request": {
            "method": "GET",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"}
            ],
            "url": "{{baseUrl}}/api/control/devices"
          }
        },
        {
          "name": "执行命令",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"deviceId\": \"{{deviceId}}\",\n  \"commandType\": \"shell\",\n  \"command\": \"ls -la\"\n}"
            },
            "url": "{{baseUrl}}/api/control/execute"
          }
        }
      ]
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "https://api.claudehome.cn"},
    {"key": "token", "value": "your_token_here"},
    {"key": "deviceId", "value": "your_device_id_here"}
  ]
}
```

### C. 联系方式

- **技术支持**: support@claudehome.cn
- **Bug 反馈**: https://github.com/ccjk-cloud/issues
- **测试负责人**: testing@claudehome.cn

---

**文档版本**: 1.0
**最后更新**: 2026-01-20
