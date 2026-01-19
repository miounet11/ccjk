---
title: 常见问题 (FAQ)
---

# 常见问题 (FAQ)

本页面收集了 CCJK 用户最常遇到的问题和解决方案。

## 安装与配置

### Q: 如何安装 CCJK？

**A:** CCJK 可以通过 npm 全局安装或使用 npx 直接运行：

```bash
# 方式 1：全局安装
npm install -g ccjk
ccjk init

# 方式 2：使用 npx（推荐）
npx ccjk init
```

### Q: 支持哪些 AI 工具？

**A:** CCJK 目前支持：

| 工具 | 支持状态 | 说明 |
|------|---------|------|
| Claude Code | ✅ 完整支持 | 主要支持目标 |
| Codex | ✅ 完整支持 | OpenAI Codex CLI |
| Cursor | 🔄 部分支持 | 基础功能 |
| Windsurf | 🔄 部分支持 | 基础功能 |

### Q: 如何配置 API 提供商？

**A:** 使用 `-p` 参数指定提供商：

```bash
# 使用 302.AI
npx ccjk init -s -p 302ai -k "your-api-key"

# 使用智谱 AI
npx ccjk init -s -p glm -k "your-auth-token"

# 使用 Kimi
npx ccjk init -s -p kimi -k "your-auth-token"

# 查看所有支持的提供商
npx ccjk init --help
```

详见 [API 提供商配置](../advanced/api-providers.md)。

### Q: 配置文件在哪里？

**A:** CCJK 的配置文件位置：

```
全局配置:
  ~/.ccjk/config.json        # 全局设置
  ~/.ccjk/permissions.yaml   # 全局权限
  ~/.claude/settings.json    # Claude Code 设置

项目配置:
  .ccjk/config.json          # 项目设置
  .ccjk/permissions.yaml     # 项目权限
  CLAUDE.md                  # Claude Code 项目指令
```

### Q: 如何更新 CCJK？

**A:**

```bash
# 如果全局安装
npm update -g ccjk

# 使用 npx 总是获取最新版本
npx ccjk@latest init

# 更新项目中的 CCJK 配置
npx ccjk update
```

---

## 功能使用

### Q: 如何使用工作流？

**A:** 工作流通过斜杠命令触发：

```bash
# Claude Code 中
/ccjk:workflow 实现用户登录功能

# 或简写
/workflow 实现用户登录功能

# 查看可用工作流
/ccjk:help
```

详见 [工作流系统](../features/workflows.md)。

### Q: 如何创建自定义技能？

**A:** 在 `.claude/skills/` 目录下创建 Markdown 文件：

```markdown
---
name: my-skill
triggers:
  - pattern: "/my-command"
    type: command
---

# 我的技能

## 目标
描述技能要完成的目标

## 指令
1. 第一步
2. 第二步
```

详见 [Skills 技能系统](../features/skills.md)。

### Q: 如何使用代理？

**A:** 使用 `@` 符号调用代理：

```
@planner 帮我规划这个功能的开发计划

@reviewer 请审查这段代码

@security 检查这个 API 的安全性
```

详见 [Agents 代理系统](../advanced/agents.md)。

### Q: 如何进行代码审查？

**A:** 使用 ShenCha 审查引擎：

```bash
# 审查单个文件
/shencha src/api/user.ts

# 审查整个目录
/shencha src/

# 深度审查
/shencha src/ --deep

# 安全专项审查
/shencha src/auth/ --security
```

详见 [ShenCha 审查引擎](../features/shencha.md)。

---

## 问题排查

### Q: Claude Code 无法连接 API？

**A:** 检查以下几点：

1. **验证 API 密钥**
   ```bash
   # 检查配置
   cat ~/.claude/settings.json | grep -A5 "env"
   ```

2. **测试网络连接**
   ```bash
   curl -I https://api.302.ai/cc
   ```

3. **检查代理设置**
   ```bash
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

4. **重新配置**
   ```bash
   npx ccjk init -s -p 302ai -k "your-key" --force
   ```

### Q: 工作流命令不生效？

**A:** 可能的原因和解决方案：

1. **工作流未安装**
   ```bash
   # 重新安装工作流
   npx ccjk update --workflows
   ```

2. **命令格式错误**
   ```bash
   # 正确格式
   /ccjk:workflow 任务描述

   # 错误格式
   /workflow:ccjk 任务描述
   ```

3. **CLAUDE.md 未包含工作流引用**
   ```bash
   # 检查 CLAUDE.md
   cat CLAUDE.md | grep -i workflow
   ```

### Q: 权限被拒绝怎么办？

**A:**

1. **查看当前权限**
   ```bash
   /permissions --show
   ```

2. **临时允许操作**
   ```bash
   /permissions --allow "file:write"
   ```

3. **修改权限配置**
   ```yaml
   # .ccjk/permissions.yaml
   permissions:
     file:
       write: allow
   ```

详见 [Permissions 权限系统](../advanced/permissions.md)。

### Q: 技能没有被触发？

**A:** 检查以下几点：

1. **触发器配置正确**
   ```yaml
   triggers:
     - pattern: "/my-command"  # 确保模式正确
       type: command
   ```

2. **技能文件位置正确**
   ```
   .claude/skills/my-skill.md  ✅
   skills/my-skill.md          ❌
   ```

3. **技能语法正确**
   ```bash
   # 验证技能文件
   npx ccjk skill validate .claude/skills/my-skill.md
   ```

### Q: 代理响应很慢？

**A:** 可能的原因：

1. **网络延迟** - 检查网络连接
2. **任务复杂** - 复杂任务需要更多时间
3. **并发限制** - 减少并行代理数量

**优化建议**：
```yaml
# 调整代理配置
agents:
  timeout: 60000      # 增加超时时间
  maxParallel: 2      # 减少并行数
```

---

## 最佳实践

### Q: 如何组织项目的 CCJK 配置？

**A:** 推荐的目录结构：

```
project/
├── .ccjk/
│   ├── config.json         # 项目配置
│   ├── permissions.yaml    # 权限配置
│   └── interviews/         # 访谈模板
├── .claude/
│   ├── skills/             # 自定义技能
│   ├── agents/             # 自定义代理
│   ├── hooks/              # 自定义钩子
│   └── workflows/          # 工作流文件
├── CLAUDE.md               # 项目指令
└── ...
```

### Q: 如何在团队中共享配置？

**A:**

1. **将配置纳入版本控制**
   ```bash
   git add .ccjk/ .claude/ CLAUDE.md
   git commit -m "Add CCJK configuration"
   ```

2. **使用共享配置包**
   ```yaml
   # .ccjk/config.json
   {
     "extends": "@company/ccjk-config"
   }
   ```

3. **文档化团队规范**
   ```markdown
   # CLAUDE.md
   ## 团队规范
   - 使用 TypeScript 严格模式
   - 遵循 Airbnb 代码风格
   - 所有 API 需要类型定义
   ```

### Q: 如何提高 AI 响应质量？

**A:**

1. **提供清晰的上下文**
   ```
   # ✅ 好的提示
   在 src/api/user.ts 中添加一个获取用户列表的 API，
   需要支持分页（page, pageSize）和搜索（keyword），
   返回格式参考现有的 getProducts API

   # ❌ 不好的提示
   加个用户列表接口
   ```

2. **使用访谈模式**
   ```bash
   /interview 添加用户管理功能
   ```

3. **利用代理专业性**
   ```
   @architect 设计这个功能的技术方案
   @developer 实现这个功能
   @reviewer 审查代码质量
   ```

### Q: 如何处理大型项目？

**A:**

1. **使用模块化配置**
   ```yaml
   # 按模块组织技能
   .claude/skills/
   ├── auth/
   ├── payment/
   └── user/
   ```

2. **限制上下文范围**
   ```
   # 指定工作范围
   /context src/modules/auth
   ```

3. **使用工作流分解任务**
   ```
   /workflow 将大任务分解为可管理的子任务
   ```

---

## 高级问题

### Q: 如何集成 CI/CD？

**A:**

```yaml
# .github/workflows/ccjk.yml
name: CCJK Checks

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install CCJK
        run: npm install -g ccjk

      - name: Run ShenCha
        run: ccjk shencha src/ --ci --fail-on error

      - name: Validate Skills
        run: ccjk skill validate .claude/skills/
```

### Q: 如何自定义输出格式？

**A:**

```yaml
# .ccjk/config.json
{
  "output": {
    "format": "markdown",
    "codeStyle": "fenced",
    "language": "zh-CN",
    "includeExplanation": true
  }
}
```

### Q: 如何调试 CCJK？

**A:**

```bash
# 启用调试模式
export CCJK_DEBUG=true

# 查看详细日志
tail -f ~/.ccjk/logs/debug.log

# 验证配置
ccjk config validate

# 检查技能
ccjk skill list --verbose
```

### Q: 如何贡献代码？

**A:**

1. Fork 仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

详见 [贡献指南](../development/contributing.md)。

---

## 获取帮助

### 文档资源

- [快速开始](../getting-started/installation.md)
- [功能指南](../features/workflows.md)
- [高级配置](../advanced/configuration.md)
- [API 参考](../api/reference.md)

### 社区支持

- **GitHub Issues**: [报告问题](https://github.com/miounet11/ccjk/issues)
- **GitHub Discussions**: [讨论交流](https://github.com/miounet11/ccjk/discussions)
- **Discord**: [加入社区](https://discord.gg/ccjk)

### 反馈建议

如果你有任何问题或建议，欢迎：

1. 在 GitHub 上提交 Issue
2. 参与社区讨论
3. 贡献文档改进

> 💡 **提示**：如果你的问题不在此列表中，请查看完整文档或在社区中提问。我们会持续更新这个 FAQ 页面。
