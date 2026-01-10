# CCJK Cloud 项目交付文档

> 生成时间: 2026-01-11
> 版本: 2.1.0

---

## 📦 项目概览

CCJK Cloud 是一个为 Claude Code 用户提供的云服务平台，支持设备绑定、多渠道通知推送和消息回复功能。

### 已部署服务

| 服务 | 地址 | 状态 |
|------|------|------|
| 官方网站 | https://www.claudehome.cn | ✅ 运行中 |
| API 服务 | https://api.claudehome.cn | ✅ 运行中 |

---

## 🏗️ 项目结构

```
/www/wwwroot/www.claudehome.cn/
├── ccjk-website/          # 官方网站 (Next.js)
│   ├── src/
│   │   ├── app/           # 页面路由
│   │   ├── components/    # React 组件
│   │   └── i18n/          # 国际化配置
│   └── public/            # 静态资源
│
├── ccjk-cloud/            # 云服务后端 (Hono + Bun)
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务服务
│   │   ├── db/            # 数据库层
│   │   └── middleware/    # 中间件
│   ├── docs/              # API 文档
│   │   ├── API-REFERENCE.md
│   │   └── QUICK-START.md
│   ├── sdk/               # TypeScript SDK
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── README.md
│   └── data/              # SQLite 数据库
│       └── ccjk.db
│
└── ecosystem.config.js    # PM2 配置
```

---

## 🔌 API 端点汇总

### 认证相关
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/auth/login` | 发送验证码 |
| POST | `/auth/verify` | 验证并登录 |
| GET | `/auth/me` | 获取当前用户 |
| POST | `/auth/logout` | 登出 |

### 设备绑定
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/bind/generate` | 生成绑定码 |
| POST | `/bind/use` | 使用绑定码 |
| GET | `/bind/status/:code` | 查询绑定码状态 |
| GET | `/bind/devices` | 获取设备列表 |
| DELETE | `/bind/devices/:id` | 删除设备 |

### 设备管理
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/device/info` | 获取设备信息 |
| GET | `/device/channels` | 获取渠道配置 |
| PUT | `/device/channels` | 更新渠道配置 |
| POST | `/device/regenerate-token` | 重新生成 Token |
| DELETE | `/device` | 删除设备 |

### 通知发送
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/notify` | 发送通知 |
| POST | `/notify/test` | 发送测试通知 |
| GET | `/notify/history` | 获取通知历史 |

### 消息回复
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/reply/poll` | 长轮询等待回复 |
| GET | `/reply/:notificationId` | 获取特定通知回复 |
| POST | `/reply/manual` | 手动提交回复 |

### Webhook 回调
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/webhook/feishu` | 飞书回调 |
| POST | `/webhook/dingtalk` | 钉钉回调 |
| POST | `/webhook/wechat` | 企业微信回调 |

---

## 🔐 认证方式

### 1. 用户 Session (网页端)
```
Authorization: Bearer sess_xxx
```

### 2. 设备 Token (CLI 端)
```
X-Device-Token: ccjk_xxx
```

---

## 📱 支持的通知渠道

| 渠道 | 类型标识 | 配置项 |
|------|----------|--------|
| 飞书 | `feishu` | `webhookUrl` |
| 钉钉 | `dingtalk` | `webhookUrl`, `secret` |
| 企业微信 | `wechat` | `webhookUrl` |
| 邮件 | `email` | SMTP 配置 |
| 短信 | `sms` | 服务商配置 |

---

## 🧪 测试验证

### API 健康检查
```bash
curl https://api.claudehome.cn/health
# {"status":"healthy","timestamp":"...","uptime":...}
```

### 完整绑定流程测试
```bash
# 1. 登录获取 Session
curl -X POST https://api.claudehome.cn/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. 验证获取 Token
curl -X POST https://api.claudehome.cn/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# 3. 生成绑定码
curl -X POST https://api.claudehome.cn/bind/generate \
  -H "Authorization: Bearer sess_xxx"

# 4. CLI 使用绑定码
curl -X POST https://api.claudehome.cn/bind/use \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","deviceInfo":{"name":"Test"}}'

# 5. 发送通知
curl -X POST https://api.claudehome.cn/notify \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: ccjk_xxx" \
  -d '{"type":"custom","title":"Test","body":"Hello"}'
```

---

## 📚 文档清单

| 文档 | 路径 | 说明 |
|------|------|------|
| API 参考 | `ccjk-cloud/docs/API-REFERENCE.md` | 完整 API 文档 |
| 快速开始 | `ccjk-cloud/docs/QUICK-START.md` | 5 分钟入门指南 |
| SDK 文档 | `ccjk-cloud/sdk/README.md` | TypeScript SDK 使用说明 |

---

## 🚀 部署信息

### PM2 进程管理
```bash
# 查看状态
pm2 status

# 重启服务
pm2 restart ccjk-cloud

# 查看日志
pm2 logs ccjk-cloud
```

### Nginx 配置
- 网站: `/www/server/panel/vhost/nginx/www.claudehome.cn.conf`
- API: `/www/server/panel/vhost/nginx/api.claudehome.cn.conf`

### 数据库
- 类型: SQLite
- 路径: `/www/wwwroot/www.claudehome.cn/ccjk-cloud/data/ccjk.db`

---

## 📋 后续开发建议

### 短期 (1-2 周)
- [ ] 完善邮件发送服务 (SMTP 配置)
- [ ] 添加用户管理后台
- [ ] 实现通知模板功能

### 中期 (1 个月)
- [ ] 开发 CLI 工具 (`ccjk` 命令)
- [ ] 添加 WebSocket 实时通知
- [ ] 支持更多通知渠道 (Telegram, Slack)

### 长期
- [ ] 开发移动端 App
- [ ] 添加团队协作功能
- [ ] 实现通知统计分析

---

## 📞 联系方式

- 网站: https://www.claudehome.cn
- API: https://api.claudehome.cn
- 邮箱: support@claudehome.cn

---

*文档生成于 2026-01-11*
