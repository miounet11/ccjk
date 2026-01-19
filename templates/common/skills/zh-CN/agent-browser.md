---
name: agent-browser
description: 零配置无头浏览器自动化，专为 AI 代理设计
version: 1.0.0
author: Vercel Labs / CCJK
category: automation
triggers:
  - /browser
  - /web
  - /scrape
  - /test-ui
  - /浏览器
  - /网页
use_when:
  - "用户需要网页自动化或浏览器控制"
  - "用户想要抓取或与网站交互"
  - "用户需要 UI 测试或截图"
  - "用户提到浏览器、网页或网站交互"
auto_activate: true
priority: 8
difficulty: beginner
tags:
  - browser
  - automation
  - web
  - zero-config
  - ai-native
dependencies:
  - agent-browser
---

# Agent Browser - 零配置网页自动化

> **核心理念**: AI 原生、零配置、基于引用的交互

专为 AI 代理设计的无头浏览器自动化工具。快速的 Rust CLI，Node.js 作为后备。

## 快速开始

```bash
# 一次性安装（通常自动检测，无需手动）
agent-browser install

# 核心工作流
agent-browser open <url>           # 导航
agent-browser snapshot -i          # 获取带引用的交互元素
agent-browser click @e1            # 通过引用点击
agent-browser fill @e2 "文本"      # 通过引用填充
agent-browser screenshot page.png  # 截图
agent-browser close                # 完成
```

## 为什么选择 Agent Browser？

| 特性 | Agent Browser | 传统 MCP |
|------|--------------|----------|
| 配置 | 零配置 | 复杂 JSON 配置 |
| 速度 | 原生 Rust | Node.js 开销 |
| AI 原生 | 基于引用 (@e1) | CSS 选择器 |
| 内存 | 极小 | 重量级守护进程 |
| 学习曲线 | 5 分钟 | 数小时 |

## 核心命令

### 导航
```bash
agent-browser open example.com      # 打开 URL
agent-browser back                  # 后退
agent-browser forward               # 前进
agent-browser reload                # 刷新页面
```

### 快照（AI 优化）
```bash
agent-browser snapshot              # 完整无障碍树
agent-browser snapshot -i           # 仅交互元素（推荐）
agent-browser snapshot -c           # 紧凑模式
agent-browser snapshot -d 3         # 限制深度
agent-browser snapshot -i -c        # 组合选项
```

**输出示例：**
```
- heading "示例域名" [ref=e1] [level=1]
- button "提交" [ref=e2]
- textbox "邮箱" [ref=e3]
- link "了解更多" [ref=e4]
```

### 交互（基于引用）
```bash
agent-browser click @e2             # 点击元素
agent-browser fill @e3 "email@test.com"  # 填充输入
agent-browser hover @e4             # 悬停元素
agent-browser check @e5             # 勾选复选框
agent-browser select @e6 "选项"     # 选择下拉菜单
```

### 获取信息
```bash
agent-browser get text @e1          # 获取文本内容
agent-browser get html @e1          # 获取 innerHTML
agent-browser get value @e3         # 获取输入值
agent-browser get title             # 页面标题
agent-browser get url               # 当前 URL
```

### 截图和 PDF
```bash
agent-browser screenshot            # 视口截图
agent-browser screenshot --full     # 全页面
agent-browser screenshot page.png   # 保存到文件
agent-browser pdf report.pdf        # 保存为 PDF
```

### 等待操作
```bash
agent-browser wait @e1              # 等待元素
agent-browser wait 2000             # 等待 2 秒
agent-browser wait --text "欢迎"    # 等待文本出现
agent-browser wait --load networkidle  # 等待加载完成
```

## 最佳 AI 工作流

### 模式 1：简单交互
```bash
agent-browser open example.com
agent-browser snapshot -i --json    # 解析引用
agent-browser click @e2             # 执行操作
```

### 模式 2：表单填写
```bash
agent-browser open login.example.com
agent-browser snapshot -i
agent-browser fill @e1 "用户名"
agent-browser fill @e2 "密码"
agent-browser click @e3             # 提交按钮
agent-browser wait --text "仪表板"
agent-browser snapshot -i           # 验证成功
```

### 模式 3：数据提取
```bash
agent-browser open data.example.com
agent-browser snapshot -i
agent-browser get text @e1          # 提取特定数据
agent-browser screenshot data.png   # 视觉记录
```

### 模式 4：多页面流程
```bash
agent-browser open shop.example.com
agent-browser snapshot -i
agent-browser click @e5             # 产品链接
agent-browser wait --load networkidle
agent-browser snapshot -i           # 新页面引用
agent-browser click @e2             # 加入购物车
```

## 会话（并行浏览器）

```bash
# 运行多个隔离会话
agent-browser --session agent1 open site-a.com
agent-browser --session agent2 open site-b.com

# 列出会话
agent-browser session list

# 每个会话独立拥有：
# - Cookie 和存储
# - 导航历史
# - 认证状态
```

## 高级功能

### 语义定位器（后备方案）
```bash
agent-browser find role button click --name "提交"
agent-browser find label "邮箱" fill "test@test.com"
agent-browser find text "登录" click
```

### 网络控制
```bash
agent-browser network requests              # 查看请求
agent-browser network route "**/api" --abort  # 阻止请求
agent-browser set offline on                # 离线模式
```

### 调试模式
```bash
agent-browser open example.com --headed     # 显示浏览器窗口
agent-browser console                       # 查看控制台日志
agent-browser errors                        # 查看页面错误
agent-browser highlight @e1                 # 高亮元素
```

## 集成示例

### 与 Workflow 技能配合
```bash
# 在 /workflow 执行阶段
agent-browser open $TEST_URL
agent-browser snapshot -i
# AI 分析快照，识别测试目标
agent-browser click @e2
agent-browser wait --text "成功"
```

### 与 TDD 技能配合
```bash
# E2E 测试执行
agent-browser open localhost:3000
agent-browser snapshot -i
agent-browser fill @e1 "测试输入"
agent-browser click @e2
agent-browser get text @e3  # 验证输出
```

## 最佳实践

1. **始终使用 `-i` 标志** 获取快照（仅交互元素）
2. **使用引用 (@e1)** 而非 CSS 选择器
3. **页面变化后重新快照** 获取新引用
4. **使用 `--json` 标志** 进行程序化解析
5. **配合 wait 使用** 处理动态内容

## 故障排除

```bash
# 浏览器未安装
agent-browser install

# Linux 依赖
agent-browser install --with-deps

# 调试问题
agent-browser open url --headed --debug
```

## 命令参考

| 命令 | 描述 |
|------|------|
| `open <url>` | 导航到 URL |
| `snapshot [-i] [-c]` | 获取无障碍树 |
| `click @ref` | 点击元素 |
| `fill @ref "text"` | 填充输入 |
| `get text @ref` | 获取文本内容 |
| `screenshot [path]` | 截图 |
| `wait <ref\|ms\|--text>` | 等待条件 |
| `close` | 关闭浏览器 |

---

**零配置。AI 原生。开箱即用。**
