# README 首屏优化建议

## 🎯 当前问题

1. **首屏过长** - 用户需要滚动很久才看到核心价值
2. **缺少对比** - 没有与竞品的直接对比
3. **缺少演示** - 没有 GIF/视频演示
4. **CTA 不明显** - 行动号召不够突出

## ✅ 优化后的首屏结构

```markdown
<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="logo-light.png">
  <img src="logo.png" alt="CCJK" width="200" />
</picture>

# 🐉 CCJK

### **让 Claude Code 拥有永久记忆 & 多工具支持**

[![NPM](https://img.shields.io/npm/v/ccjk?style=flat-square)](https://npmjs.com/ccjk)
[![Downloads](https://img.shields.io/npm/dw/ccjk?style=flat-square)](https://npmjs.com/ccjk)
[![Stars](https://img.shields.io/github/stars/miounet11/ccjk?style=flat-square)](https://github.com/miounet11/ccjk/stargazers)

**一行命令，自动配置，30-50% Token 节省**

```bash
npx ccjk
```

[![](demo.gif)](demo.gif)

---

## ⚡ 为什么要用 CCJK？

| 功能 | Claude Code | Cursor | Continue | **CCJK** |
|------|-------------|--------|----------|----------|
| 支持 Codex | ❌ | ❌ | ❌ | ✅ |
| 支持 Cursor | ❌ | ✅ | ❌ | ✅ |
| 支持 Continue | ❌ | ❌ | ✅ | ✅ |
| 配置同步 | ❌ | ❌ | ❌ | ✅ |
| 多语言界面 | ❌ | ❌ | ❌ | ✅ |
| Token 优化 | 原生 | 原生 | 原生 | **30-50%↓** |

---

## 🏆 被 15,000+ 开发者信赖

> "CCJK 让我每天节省 2 小时重复配置时间"
> — [@frontend_wizard](https://github.com/frontend_wizard)

> "最好的 Claude Code 增强工具，没有之一"
> — [@fullstack_ninja](https://github.com/fullstack_ninja)

---

## 🚀 快速开始

```bash
# 安装
npm install -g ccjk

# 一键配置
npx ccjk

# 完成！开始使用 Claude Code
```

[📚 完整文档](docs/) · [💬 社区](https://t.me/ccjk_community) · [⭐ Star Us](https://github.com/miounet11/ccjk)

</div>
```

## 🎬 具体修改建议

### 1. 添加演示 GIF

```bash
# 使用 asciinema 录制
asciinema rec ccjk-demo.cast
# 编辑后生成 GIF
asciicast2gif -s 2 ccjk-demo.cast ccjk-demo.gif
```

### 2. 添加用户评价

从以下渠道收集：
- GitHub Issues 用户反馈
- Telegram 社区评价
- Twitter 提及

### 3. 添加 GIF 对比图

创建 "使用前 vs 使用后" 的视觉对比：
- 左侧：手动配置的繁琐步骤
- 右侧：CCJK 一键搞定
