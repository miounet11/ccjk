# 📱 手机控制 Claude Code 指南

> 实现手机发任务、实时通知、随时随地编程的终极方案

---

## 🎯 方案概览

三种通知方案，满足不同场景需求：

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **CCJK Cloud** | 全平台通用 | 飞书/钉钉/企微一键配置 | 需要网络 |
| **macOS 快捷指令** | 电脑开着时 | 本地通知，无延迟 | 仅 macOS |
| **Bark 推送** | 锁屏/离开电脑 | iOS 原生推送 | 需要 iOS 设备 |
| **GitHub Action** | 手机控制 | 随时随地发任务 | 需要配置 Action |

---

## 方案一：CCJK Cloud 通知（推荐）

### 1. 绑定设备

```bash
# 1. 访问 claudehome.cn 获取绑定码
# 2. CLI 绑定
ccjk notification bind ABC123
```

### 2. 配置通知渠道

支持飞书、钉钉、企业微信：

```bash
ccjk notification config
```

### 3. 自动通知

任务完成后自动推送到你的手机！

---

## 方案二：macOS 快捷指令 + Bark 智能通知

### 原理

- **电脑开着时**：使用 macOS 快捷指令本地通知
- **锁屏/离开时**：自动切换到 Bark 推送

### 1. 安装 Bark App

从 App Store 下载 [Bark](https://apps.apple.com/app/bark-custom-notifications/id1403753865)

### 2. 获取 Bark Key

打开 Bark App，复制你的推送 URL：
```
https://api.day.app/YOUR_KEY/
```

### 3. 导入 macOS 快捷指令

点击导入：[Claude Code 通知快捷指令](https://www.icloud.com/shortcuts/6c1234a20d8b4ee2a1b33e5cb3e612db)

### 4. 配置 CCJK

```bash
ccjk notification local-config
```

按提示输入：
- 快捷指令名称：`ClaudeNotify`
- Bark URL：`https://api.day.app/YOUR_KEY`

### 5. 测试通知

```bash
ccjk notification local-test
```

### 工作原理

```
任务完成
    ↓
检测锁屏状态
    ↓
┌─────────────────┬─────────────────┐
│   未锁屏         │    已锁屏        │
│                 │                 │
│  shortcuts run  │   Bark 推送     │
│  "ClaudeNotify" │   到手机        │
└─────────────────┴─────────────────┘
```

---

## 方案三：GitHub Action + Bark（手机控制）

> 🔥 **终极方案**：手机发任务，自动执行，完成通知

### 原理

```
手机 Claude App
      ↓
  发送任务到仓库
      ↓
  Claude 执行任务
      ↓
  git push 触发 Action
      ↓
  Bark 推送到手机
      ↓
  手机继续对话
```

### 1. 创建 GitHub Action

在你的项目中创建 `.github/workflows/notify.yml`：

```yaml
name: Claude Code Notification

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Get commit info
        id: commit
        run: |
          echo "message=${{ github.event.head_commit.message }}" >> $GITHUB_OUTPUT
          echo "author=${{ github.event.head_commit.author.name }}" >> $GITHUB_OUTPUT

      - name: Send Bark notification
        run: |
          TITLE="🎉 Claude Code 任务完成"
          BODY="${{ steps.commit.outputs.message }}"
          BARK_URL="${{ secrets.BARK_URL }}"

          # URL encode
          ENCODED_TITLE=$(echo -n "$TITLE" | jq -sRr @uri)
          ENCODED_BODY=$(echo -n "$BODY" | jq -sRr @uri)

          curl -s "${BARK_URL}/${ENCODED_TITLE}/${ENCODED_BODY}?group=claude-code&sound=minuet"
```

### 2. 配置 Secrets

在 GitHub 仓库设置中添加：
- `BARK_URL`: `https://api.day.app/YOUR_KEY`

### 3. 配置 Claude Code Skill

在项目的 `.claude/skills/auto-push.md` 中添加：

```markdown
# Auto Push Skill

每次完成任务后，必须执行以下步骤：

1. 使用有意义的 commit message 提交代码
2. Push 到远程仓库
3. Commit message 格式：`[任务类型] 简短描述`

示例：
- `[feat] 添加用户登录功能`
- `[fix] 修复首页加载问题`
- `[docs] 更新 API 文档`
```

### 4. 手机端使用

1. 打开 Claude 手机 App
2. 开启 Code 功能，连接到你的仓库
3. 发送任务，例如："帮我实现用户登录功能"
4. Claude 完成后会自动 push
5. GitHub Action 触发 Bark 通知
6. 手机收到通知，继续对话

---

## 🔧 高级配置

### Bark 推送参数

```bash
# 基础推送
curl https://api.day.app/YOUR_KEY/标题/内容

# 带分组
curl "https://api.day.app/YOUR_KEY/标题/内容?group=claude-code"

# 带声音
curl "https://api.day.app/YOUR_KEY/标题/内容?sound=minuet"

# 时效性通知（突破勿扰模式）
curl "https://api.day.app/YOUR_KEY/标题/内容?level=timeSensitive"

# 关键警报（始终响铃）
curl "https://api.day.app/YOUR_KEY/标题/内容?level=critical"

# 自定义图标
curl "https://api.day.app/YOUR_KEY/标题/内容?icon=https://example.com/icon.png"

# 点击跳转
curl "https://api.day.app/YOUR_KEY/标题/内容?url=https://github.com/your/repo"
```

### 多设备通知

如果你有多台设备，可以配置多个 Bark Key：

```json
{
  "barkUrls": [
    "https://api.day.app/KEY1",
    "https://api.day.app/KEY2"
  ]
}
```

### 自定义通知声音

Bark 支持自定义声音，可选值：
- `alarm`, `anticipate`, `bell`, `birdsong`, `bloom`
- `calypso`, `chime`, `choo`, `descent`, `electronic`
- `fanfare`, `glass`, `gotosleep`, `healthnotification`
- `horn`, `ladder`, `mailsent`, `minuet`, `multiwayinvitation`
- `newmail`, `newsflash`, `noir`, `paymentsuccess`
- `shake`, `sherwoodforest`, `silence`, `spell`
- `suspense`, `telegraph`, `tiptoes`, `typewriters`, `update`

---

## 📋 完整配置示例

### ~/.ccjk/notification-config.json

```json
{
  "cloud": {
    "enabled": true,
    "deviceToken": "ccjk_xxx"
  },
  "local": {
    "enabled": true,
    "shortcutName": "ClaudeNotify",
    "barkUrl": "https://api.day.app/YOUR_KEY",
    "preferLocal": true,
    "sound": "minuet",
    "group": "claude-code"
  },
  "triggers": {
    "onTaskComplete": true,
    "onError": true,
    "onAskUser": true
  }
}
```

---

## ❓ 常见问题

### Q: Bark 通知收不到？

1. 检查 Bark App 是否有通知权限
2. 检查 Bark URL 是否正确
3. 测试：`curl https://api.day.app/YOUR_KEY/测试/这是测试消息`

### Q: 快捷指令无法运行？

1. 确保快捷指令名称正确
2. 在"快捷指令" App 中手动运行一次授权
3. 检查：`shortcuts list | grep ClaudeNotify`

### Q: GitHub Action 没有触发？

1. 检查 Action 是否启用
2. 检查 Secrets 是否配置正确
3. 查看 Action 运行日志

### Q: 如何在 Windows/Linux 上使用？

Windows/Linux 用户推荐使用 CCJK Cloud 方案，支持飞书、钉钉、企业微信通知。

---

## 🔗 相关资源

- [Bark 官方文档](https://bark.day.app/#/en-us/)
- [Bark GitHub](https://github.com/Finb/Bark)
- [Bark GitHub Action](https://github.com/harryzcy/action-bark)
- [CCJK Cloud](https://www.claudehome.cn)
- [macOS 快捷指令](https://www.icloud.com/shortcuts/6c1234a20d8b4ee2a1b33e5cb3e612db)

---

*© 2025 CCJK. 让 AI 编程更高效！*
