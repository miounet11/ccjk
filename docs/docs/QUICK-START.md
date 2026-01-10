# CCJK Cloud 快速开始指南

> 5 分钟完成设备绑定和通知配置

---

## 🚀 三步完成绑定

### Step 1: 获取绑定码

1. 访问 [claudehome.cn](https://www.claudehome.cn)
2. 使用邮箱登录（输入邮箱 → 收取验证码 → 登录）
3. 进入「设备管理」页面
4. 点击「生成绑定码」
5. 复制 6 位绑定码（如：`9RQ6DL`）

> ⏰ 绑定码有效期 5 分钟

### Step 2: CLI 绑定设备

```bash
# 方式一：使用 curl
curl -X POST https://api.claudehome.cn/bind/use \
  -H "Content-Type: application/json" \
  -d '{
    "code": "你的绑定码",
    "deviceInfo": {
      "name": "我的电脑",
      "platform": "linux"
    }
  }'

# 返回结果中的 deviceToken 就是你的设备凭证
# 请妥善保存！
```

```bash
# 方式二：使用 CCJK CLI（即将推出）
ccjk bind 9RQ6DL
```

### Step 3: 配置通知渠道

```bash
# 配置飞书通知
curl -X PUT https://api.claudehome.cn/device/channels \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: 你的deviceToken" \
  -d '{
    "channels": [{
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhookUrl": "你的飞书机器人Webhook地址"
      }
    }]
  }'
```

---

## 📱 获取通知渠道 Webhook

### 飞书

1. 打开飞书 → 进入群聊 → 设置 → 群机器人
2. 添加「自定义机器人」
3. 复制 Webhook 地址

### 钉钉

1. 打开钉钉 → 进入群聊 → 设置 → 智能群助手
2. 添加「自定义机器人」
3. 安全设置选择「加签」，记录 Secret
4. 复制 Webhook 地址

### 企业微信

1. 打开企业微信 → 进入群聊 → 设置 → 群机器人
2. 添加「群机器人」
3. 复制 Webhook 地址

---

## 📤 发送通知

```bash
# 发送一条通知
curl -X POST https://api.claudehome.cn/notify \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: 你的deviceToken" \
  -d '{
    "type": "task_completed",
    "title": "✅ 任务完成",
    "body": "你的代码已成功部署！"
  }'
```

### 通知类型

| type | 用途 | 示例场景 |
|------|------|----------|
| `task_progress` | 进度更新 | 构建进度 50% |
| `task_completed` | 任务完成 | 部署成功 |
| `task_failed` | 任务失败 | 测试失败 |
| `ask_user` | 询问用户 | 是否继续？ |
| `custom` | 自定义 | 任意通知 |

---

## 💬 接收用户回复

```bash
# 发送询问
curl -X POST https://api.claudehome.cn/notify \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: 你的deviceToken" \
  -d '{
    "type": "ask_user",
    "title": "❓ 需要确认",
    "body": "是否部署到生产环境？",
    "waitReply": true
  }'

# 等待回复（长轮询，最长 60 秒）
curl "https://api.claudehome.cn/reply/poll?timeout=60000" \
  -H "X-Device-Token: 你的deviceToken"
```

---

## 🔧 常用命令

```bash
# 查看设备信息
curl https://api.claudehome.cn/device/info \
  -H "X-Device-Token: 你的deviceToken"

# 发送测试通知
curl -X POST https://api.claudehome.cn/notify/test \
  -H "X-Device-Token: 你的deviceToken"

# 查看通知历史
curl https://api.claudehome.cn/notify/history \
  -H "X-Device-Token: 你的deviceToken"

# 健康检查
curl https://api.claudehome.cn/health
```

---

## 📚 更多资源

- [完整 API 文档](./API-REFERENCE.md)
- [官方网站](https://www.claudehome.cn)
- [问题反馈](mailto:support@claudehome.cn)

---

## ❓ 常见问题

**Q: 绑定码过期了怎么办？**
A: 重新在网页端生成一个新的绑定码即可。

**Q: deviceToken 丢失了怎么办？**
A: 在网页端删除该设备，重新绑定获取新 Token。

**Q: 通知发送失败？**
A: 检查通知渠道配置是否正确，可以用 `/notify/test` 测试。

**Q: 如何更换通知渠道？**
A: 使用 `PUT /device/channels` 更新配置即可。
