---
title: Permissions 权限系统
---

# Permissions 权限系统

CCJK 的权限系统提供细粒度的访问控制，确保 AI 在安全的边界内工作，保护你的代码和系统安全。

## 为什么需要权限控制？

AI 助手拥有强大的能力，但也需要适当的约束：

- 🛡️ **安全保护**：防止意外修改关键文件
- 🔒 **隐私保护**：限制对敏感数据的访问
- ⚠️ **风险控制**：危险操作需要确认
- 📋 **审计追踪**：记录所有敏感操作

## 权限类型

### 1. 文件权限

控制对文件系统的访问：

| 权限 | 描述 | 默认 |
|------|------|------|
| `file:read` | 读取文件内容 | ✅ 允许 |
| `file:write` | 修改现有文件 | ✅ 允许 |
| `file:create` | 创建新文件 | ✅ 允许 |
| `file:delete` | 删除文件 | ⚠️ 需确认 |
| `file:rename` | 重命名/移动文件 | ✅ 允许 |

**配置示例**：

```yaml
permissions:
  file:
    read: allow
    write: allow
    create: allow
    delete: confirm  # 删除需要确认
    rename: allow

    # 路径级别控制
    paths:
      # 保护配置文件
      - pattern: "**/.env*"
        read: deny
        write: deny

      # 保护生产配置
      - pattern: "**/config/production.*"
        write: confirm

      # 允许修改源代码
      - pattern: "src/**"
        write: allow

      # 只读依赖
      - pattern: "node_modules/**"
        write: deny
```

### 2. 命令权限

控制 Shell 命令执行：

| 权限 | 描述 | 默认 |
|------|------|------|
| `shell:execute` | 执行命令 | ⚠️ 需确认 |
| `shell:background` | 后台执行 | ⚠️ 需确认 |
| `shell:sudo` | 管理员权限 | ❌ 禁止 |

**配置示例**：

```yaml
permissions:
  shell:
    execute: confirm

    # 命令白名单（无需确认）
    allowlist:
      - "npm install"
      - "npm run *"
      - "git status"
      - "git diff"
      - "git log"
      - "ls"
      - "cat"
      - "echo"

    # 命令黑名单（始终禁止）
    denylist:
      - "rm -rf /"
      - "sudo *"
      - "chmod 777 *"
      - "curl * | bash"
      - "wget * | sh"

    # 危险命令（需要额外确认）
    dangerous:
      - "rm -rf *"
      - "git push --force"
      - "git reset --hard"
      - "DROP TABLE"
      - "DELETE FROM"
```

### 3. 网络权限

控制网络访问：

| 权限 | 描述 | 默认 |
|------|------|------|
| `network:fetch` | HTTP 请求 | ⚠️ 需确认 |
| `network:websocket` | WebSocket 连接 | ⚠️ 需确认 |
| `network:dns` | DNS 查询 | ✅ 允许 |

**配置示例**：

```yaml
permissions:
  network:
    fetch: confirm

    # 允许的域名
    allowedDomains:
      - "api.github.com"
      - "registry.npmjs.org"
      - "*.anthropic.com"

    # 禁止的域名
    blockedDomains:
      - "*.malware.com"
      - "tracking.*"

    # 允许的端口
    allowedPorts:
      - 80
      - 443
      - 3000  # 本地开发
      - 5432  # PostgreSQL
```

### 4. Git 权限

控制 Git 操作：

| 权限 | 描述 | 默认 |
|------|------|------|
| `git:read` | 读取仓库信息 | ✅ 允许 |
| `git:commit` | 提交更改 | ⚠️ 需确认 |
| `git:push` | 推送到远程 | ⚠️ 需确认 |
| `git:branch` | 分支操作 | ✅ 允许 |
| `git:merge` | 合并操作 | ⚠️ 需确认 |
| `git:rebase` | 变基操作 | ⚠️ 需确认 |

**配置示例**：

```yaml
permissions:
  git:
    read: allow
    commit: confirm
    push: confirm
    branch: allow
    merge: confirm
    rebase: confirm

    # 保护的分支
    protectedBranches:
      - main
      - master
      - production
      - release/*

    # 这些分支禁止直接推送
    noPush:
      - main
      - production
```

### 5. 代理权限

控制 AI 代理的能力：

| 权限 | 描述 | 默认 |
|------|------|------|
| `agent:spawn` | 创建子代理 | ✅ 允许 |
| `agent:parallel` | 并行执行 | ✅ 允许 |
| `agent:external` | 调用外部服务 | ⚠️ 需确认 |

**配置示例**：

```yaml
permissions:
  agent:
    spawn: allow
    parallel: allow
    external: confirm

    # 允许的代理
    allowedAgents:
      - planner
      - developer
      - reviewer
      - tester

    # 限制并行数
    maxParallel: 3

    # 代理超时
    timeout: 300000  # 5 分钟
```

## 权限级别

### 预设级别

CCJK 提供三个预设权限级别：

#### 严格模式（Strict）

```yaml
# 最高安全级别，所有敏感操作都需要确认
preset: strict

# 等效于：
permissions:
  file:
    write: confirm
    delete: deny
  shell:
    execute: confirm
  network:
    fetch: confirm
  git:
    commit: confirm
    push: confirm
```

#### 标准模式（Standard）

```yaml
# 平衡安全和效率，推荐日常使用
preset: standard

# 等效于：
permissions:
  file:
    write: allow
    delete: confirm
  shell:
    execute: confirm
    allowlist: [npm, git, ls, cat]
  network:
    fetch: confirm
  git:
    commit: confirm
    push: confirm
```

#### 宽松模式（Relaxed）

```yaml
# 最大自由度，适合受信任的环境
preset: relaxed

# 等效于：
permissions:
  file:
    write: allow
    delete: confirm
  shell:
    execute: allow
  network:
    fetch: allow
  git:
    commit: allow
    push: confirm
```

### 自定义级别

```yaml
# 基于预设自定义
preset: standard

# 覆盖特定权限
overrides:
  file:
    paths:
      - pattern: "src/**"
        write: allow  # 源代码目录无需确认
  shell:
    allowlist:
      - "docker *"  # 添加 docker 命令
```

## 权限配置

### 全局配置

在 `~/.ccjk/permissions.yaml` 中配置：

```yaml
# 全局权限配置
version: 1

# 使用预设
preset: standard

# 全局覆盖
global:
  file:
    paths:
      - pattern: "**/.env*"
        read: deny
        write: deny

  shell:
    denylist:
      - "rm -rf /"
      - "sudo *"
```

### 项目配置

在项目的 `.ccjk/permissions.yaml` 中配置：

```yaml
# 项目级权限配置
version: 1

# 继承全局配置
extends: global

# 项目特定配置
project:
  file:
    paths:
      # 保护数据库迁移
      - pattern: "migrations/**"
        write: confirm
        delete: deny

      # 允许修改测试
      - pattern: "**/*.test.ts"
        write: allow

  shell:
    # 项目特定的允许命令
    allowlist:
      - "prisma *"
      - "jest *"

  git:
    # 项目的保护分支
    protectedBranches:
      - main
      - staging
```

### 会话配置

临时调整当前会话的权限：

```bash
# 临时启用宽松模式
/permissions --preset relaxed

# 临时允许特定操作
/permissions --allow "shell:execute"

# 临时禁止特定操作
/permissions --deny "file:delete"

# 查看当前权限
/permissions --show
```

## 权限确认

### 确认对话框

当操作需要确认时：

```
AI: 我需要执行以下操作：

📝 操作: 删除文件
📁 文件: src/old-module.ts
⚠️ 权限: file:delete (需要确认)

确认执行？
[Y] 是  [N] 否  [A] 始终允许  [D] 始终拒绝
```

### 批量确认

```
AI: 我需要执行以下操作：

1. 📝 修改 src/api/user.ts
2. 📝 修改 src/api/auth.ts
3. 📝 创建 src/api/payment.ts
4. 🗑️ 删除 src/api/old.ts

[Y] 全部允许  [N] 全部拒绝  [S] 逐个确认
```

### 记住选择

```yaml
# 配置记住用户选择
confirmation:
  remember: true
  rememberDuration: 3600  # 1 小时
  rememberScope: session  # session | project | global
```

## 权限审计

### 操作日志

所有敏感操作都会被记录：

```bash
# 查看权限日志
ccjk permissions log

# 输出示例
Permission Log (Last 24h)
─────────────────────────
2024-01-10 14:30:22  file:write    ALLOW   src/api/user.ts
2024-01-10 14:30:25  file:write    ALLOW   src/api/auth.ts
2024-01-10 14:31:10  shell:execute CONFIRM npm install axios
2024-01-10 14:31:15  shell:execute ALLOW   npm install axios
2024-01-10 14:35:42  file:delete   DENY    src/config/prod.ts
2024-01-10 14:40:18  git:push      CONFIRM origin/feature-x
2024-01-10 14:40:22  git:push      ALLOW   origin/feature-x
```

### 审计报告

```bash
# 生成审计报告
ccjk permissions audit --period 7d

# 输出示例
Permission Audit Report (Last 7 days)
─────────────────────────────────────

Summary:
  Total Operations: 1,234
  Allowed: 1,180 (95.6%)
  Denied: 32 (2.6%)
  Confirmed: 22 (1.8%)

By Category:
  file:read     892  (100% allowed)
  file:write    245  (98% allowed)
  shell:execute  67  (85% allowed, 15% confirmed)
  git:commit     18  (100% confirmed)
  git:push       12  (100% confirmed)

Denied Operations:
  file:delete   src/config/production.ts  (5 times)
  shell:execute rm -rf node_modules       (2 times)
  ...

Recommendations:
  • Consider adding 'npm ci' to shell allowlist
  • Review frequent denials for potential allowlist updates
```

## 安全最佳实践

### 1. 最小权限原则

```yaml
# ✅ 好的做法：只授予必要权限
permissions:
  file:
    paths:
      - pattern: "src/**"
        write: allow
      - pattern: "**"
        write: confirm  # 其他目录需确认

# ❌ 不好的做法：过于宽松
permissions:
  file:
    write: allow  # 所有文件都可写
```

### 2. 保护敏感文件

```yaml
# 始终保护敏感文件
permissions:
  file:
    paths:
      # 环境变量
      - pattern: "**/.env*"
        read: deny
        write: deny

      # 密钥文件
      - pattern: "**/*.pem"
        read: deny
        write: deny

      # 生产配置
      - pattern: "**/config/production.*"
        write: deny
```

### 3. 命令白名单

```yaml
# 使用白名单而非黑名单
permissions:
  shell:
    execute: confirm  # 默认需确认

    # 明确允许的命令
    allowlist:
      - "npm *"
      - "yarn *"
      - "git status"
      - "git diff"
      - "git log"
      - "ls *"
      - "cat *"
```

### 4. 定期审计

```bash
# 定期检查权限配置
ccjk permissions validate

# 定期审计操作日志
ccjk permissions audit --period 30d --export report.json
```

### 5. 分环境配置

```yaml
# 开发环境
# .ccjk/permissions.development.yaml
preset: standard

# 生产环境
# .ccjk/permissions.production.yaml
preset: strict
permissions:
  shell:
    execute: deny  # 生产环境禁止执行命令
  git:
    push: deny     # 生产环境禁止推送
```

## 故障排除

### 权限被拒绝

```
错误: Permission denied: file:write on src/config/app.ts

解决方案:
1. 检查权限配置
   ccjk permissions show --path src/config/app.ts

2. 临时允许
   /permissions --allow "file:write" --path "src/config/*"

3. 更新配置
   编辑 .ccjk/permissions.yaml
```

### 频繁确认

```
问题: 每次操作都需要确认，效率低下

解决方案:
1. 添加到白名单
   permissions:
     shell:
       allowlist:
         - "npm run dev"

2. 使用"始终允许"选项
   在确认对话框选择 [A] 始终允许

3. 调整预设级别
   preset: relaxed  # 如果环境可信
```

### 配置不生效

```bash
# 验证配置
ccjk permissions validate

# 查看生效的配置
ccjk permissions show --effective

# 检查配置优先级
ccjk permissions show --debug
```

## 相关资源

- [配置管理](configuration.md) - 权限配置详情
- [Hooks 系统](hooks.md) - 权限相关钩子
- [安全最佳实践](../best-practices/security.md) - 安全指南
- [故障排除](troubleshooting.md) - 常见问题

> 💡 **提示**：权限系统是保护你的代码和系统的重要防线。建议从严格模式开始，根据需要逐步放宽，而不是从宽松模式开始收紧。
