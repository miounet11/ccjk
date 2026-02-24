<div align="center">

# CCJK

### Claude Code 的超级增强器

节省 30-50% Token · 最小配置 · 一条命令

<br/>

<!-- TODO: 替换为真实演示 GIF -->
<img src="https://raw.githubusercontent.com/miounet11/ccjk/main/assets/demo.gif" alt="CCJK 演示" width="600" />

<br/>

```bash
npx ccjk
```

<br/>

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[English](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md)

</div>

---

## CCJK 是什么？

CCJK 为 [Claude Code](https://github.com/anthropics/claude-code) 注入超能力：

- **🧠 持久记忆** — AI 跨会话记住你的代码库
- **⚡ 节省 30-50% Token** — 智能上下文压缩
- **🔧 最小配置** — 自动检测项目类型，一条命令搞定
- **☁️ 云端同步** — 跨设备、跨团队共享配置
- **🌐 远程控制** — 手机/网页随时掌控 Claude Code（v11.1.1 新增）
- **🛡️ 生产级安全** — HTTPS 强制、CORS 加固、密钥校验（v11.1.1 新增）

## 快速开始

```bash
# 在项目目录运行
npx ccjk

# 完成。Claude Code 已超级充能。
```

安装后可直接使用浏览器自动化（默认已启用）：

```bash
ccjk browser start https://example.com
ccjk browser status
ccjk browser stop
```

## 为什么选 CCJK？

| 没有 CCJK | 有 CCJK |
|:----------|:--------|
| 每次对话重复项目背景 | AI 记住一切 |
| 60+ 分钟手动配置 | 30 秒，一条命令 |
| Token 成本高 | 降低 30-50% |
| 配置只在单设备 | 云端同步所有设备 |
| 无法通过手机/网页控制 Claude | 远程控制，任意设备操作 |
| 生产环境配置存局隐患 | 生产级安全加固，开笄1秒失败 |

## 核心功能

<details>
<summary><b>🌐 远程控制（v11.1.1 新增）</b></summary>

任意设备控制 Claude Code — 手机、浏览器、应用均可。

```bash
ccjk remote setup    # 一键远程初始化（互动引导）
ccjk remote doctor   # 远程连接体检（容错、解决建议）
ccjk remote status   # 实时运行状态（Daemon 、服务器、认证）
```

支持 CI/CD 非交互模式:
```bash
ccjk remote setup --non-interactive \
  --server-url https://your-server.com \
  --auth-token <token> \
  --binding-code <code>
```

</details>

<details>
<summary><b>🛡️ 生产级安全加固（v11.1.1 新增）</b></summary>

所有配置默认候均已适配生产环境安全标准：

- ✅ **HTTPS 强制** — 生产环境下所有服务地址必须为 `https://`
- ✅ **CORS 加固** — 生产环境拒绝通配符 `*` 源
- ✅ **密鑰校验** — 开发默认密鑰（`dev-secret` 等）启动时直接拦截
- ✅ **快速失败** — 配置错误即刻退出，没有静默退化
- ✅ **Daemon 配置** — 从 `~/.ccjk/daemon.json` 读取，必字段校验

</details>

<details>
<summary><b>🧠 智能技能系统</b></summary>

根据工作流自动激活：
- 代码审查 — 上线前捕获 Bug
- 安全审计 — OWASP Top 10 扫描
- 性能分析 — 识别瓶颈
- 文档生成 — 从代码自动生成

</details>

<details>
<summary><b>☁️ 云端同步</b></summary>

配置随处可用：
- GitHub Gist（免费）
- WebDAV（自托管）
- S3（企业级）

```bash
npx ccjk cloud enable --provider github-gist
```

</details>

<details>
<summary><b>🔌 生态集成</b></summary>

一个工具包，统一体验：
- **CCR** — 多提供商路由
- **CCUsage** — 使用量分析
- **MCP 市场** — 插件商店

</details>

## 常用命令

```bash
npx ccjk           # 交互式设置
npx ccjk i         # 完整初始化

# 远程控制（v11.1.1 新增）
ccjk remote setup                       # 一键远程初始化（推荐）
ccjk remote setup --non-interactive \   # CI/CD 非交互模式
  --server-url https://... \
  --auth-token <token> \
  --binding-code <code>
ccjk remote doctor                      # 远程体检（含修复建议）
ccjk remote status                      # 实时运行状态

# 其他
npx ccjk u         # 更新工作流
npx ccjk sync      # 云端同步
npx ccjk doctor    # 健康检查

# 浏览器自动化（默认可用）
ccjk browser start <url>
ccjk browser status
ccjk browser stop
```

## 文档

完整文档请访问 [docs/README.md](./docs/README.md)

## 社区

- [Telegram](https://t.me/ccjk_community) — 加入讨论
- [Issues](https://github.com/miounet11/ccjk/issues) — 反馈问题

## 许可证

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)

---

<div align="center">

**如果 CCJK 帮到了你，请给个 ⭐**

</div>
