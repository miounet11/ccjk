---
title: Hooks 事件钩子系统
---

# Hooks 事件钩子系统

CCJK 的 Hooks 系统允许你在特定事件发生时自动执行自定义逻辑，实现工作流自动化和智能化。

## 什么是 Hooks？

Hooks（钩子）是在特定时机自动触发的回调机制：

- 🎣 **事件驱动**：响应特定事件自动执行
- 🔄 **可组合**：多个 Hook 可以串联执行
- 🛡️ **可控制**：支持条件触发和优先级
- 📊 **可观测**：完整的执行日志和监控

## Hook 类型

### 1. 生命周期 Hooks

在 AI 交互的不同阶段触发：

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `onSessionStart` | 会话开始时 | 初始化上下文、加载配置 |
| `onSessionEnd` | 会话结束时 | 保存状态、清理资源 |
| `onMessageReceive` | 收到用户消息时 | 消息预处理、过滤 |
| `onMessageSend` | 发送 AI 响应前 | 响应后处理、格式化 |
| `onError` | 发生错误时 | 错误处理、通知 |

### 2. 文件 Hooks

文件操作相关的钩子：

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `onFileRead` | 读取文件前/后 | 文件访问控制、日志 |
| `onFileWrite` | 写入文件前/后 | 代码格式化、备份 |
| `onFileCreate` | 创建文件时 | 模板应用、命名检查 |
| `onFileDelete` | 删除文件前 | 确认、备份 |

### 3. Git Hooks

Git 操作相关的钩子：

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `onPreCommit` | 提交前 | 代码检查、测试 |
| `onPostCommit` | 提交后 | 通知、触发 CI |
| `onPrePush` | 推送前 | 分支检查、权限验证 |
| `onBranchChange` | 切换分支时 | 环境切换、配置更新 |

### 4. 代理 Hooks

代理相关的钩子：

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `onAgentStart` | 代理启动时 | 初始化、日志 |
| `onAgentComplete` | 代理完成时 | 结果处理、统计 |
| `onAgentSwitch` | 切换代理时 | 上下文传递 |
| `onAgentError` | 代理出错时 | 错误恢复、降级 |

### 5. 工作流 Hooks

工作流相关的钩子：

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `onWorkflowStart` | 工作流开始 | 初始化、通知 |
| `onWorkflowStep` | 每个步骤完成 | 进度更新、检查点 |
| `onWorkflowComplete` | 工作流完成 | 总结、清理 |
| `onWorkflowAbort` | 工作流中止 | 回滚、通知 |

## 创建 Hooks

### 基本结构

在 `.claude/hooks/` 目录下创建 Hook 文件：

```javascript
// .claude/hooks/pre-commit.js
module.exports = {
  name: 'pre-commit-check',
  description: '提交前代码检查',
  event: 'onPreCommit',
  priority: 100, // 数字越大优先级越高

  async handler(context) {
    const { files, message } = context;

    // 检查是否有未格式化的文件
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const formatted = await checkFormat(file);
        if (!formatted) {
          return {
            success: false,
            message: `文件 ${file} 未格式化，请运行 npm run format`
          };
        }
      }
    }

    return { success: true };
  }
};
```

### Markdown 格式

也支持 Markdown 格式定义 Hook：

```markdown
---
name: session-logger
event: onSessionStart
priority: 50
---

# 会话日志记录器

## 触发条件

每次会话开始时自动触发。

## 执行逻辑

1. 记录会话开始时间
2. 记录用户信息
3. 初始化会话上下文

## 输出

```json
{
  "sessionId": "xxx",
  "startTime": "2024-01-10T10:00:00Z",
  "user": "current-user"
}
```
```

### TypeScript 格式

```typescript
// .claude/hooks/file-backup.ts
import { Hook, HookContext, HookResult } from '@ccjk/types';

const fileBackupHook: Hook = {
  name: 'file-backup',
  description: '文件修改前自动备份',
  event: 'onFileWrite',
  priority: 200,

  // 条件：只对重要文件生效
  condition: (ctx: HookContext) => {
    const importantPatterns = [
      /\.env/,
      /config\./,
      /package\.json/
    ];
    return importantPatterns.some(p => p.test(ctx.file));
  },

  async handler(context: HookContext): Promise<HookResult> {
    const { file, content } = context;
    const backupPath = `${file}.backup.${Date.now()}`;

    // 创建备份
    await fs.copyFile(file, backupPath);

    console.log(`已备份: ${file} -> ${backupPath}`);

    return {
      success: true,
      data: { backupPath }
    };
  }
};

export default fileBackupHook;
```

## Hook 配置

### 全局配置

在 `~/.ccjk/hooks.json` 中配置：

```json
{
  "enabled": true,
  "hooks": {
    "onPreCommit": {
      "enabled": true,
      "timeout": 30000,
      "failOnError": true
    },
    "onFileWrite": {
      "enabled": true,
      "timeout": 5000,
      "failOnError": false
    }
  },
  "globalTimeout": 60000,
  "maxConcurrent": 5
}
```

### 项目配置

在项目的 `.ccjk/config.json` 中覆盖：

```json
{
  "hooks": {
    "disabled": ["file-backup"],
    "custom": [
      ".claude/hooks/custom-check.js"
    ],
    "overrides": {
      "pre-commit-check": {
        "priority": 150
      }
    }
  }
}
```

## 内置 Hooks

CCJK 提供了多个实用的内置 Hook：

### 代码质量 Hooks

```javascript
// 自动格式化
{
  name: 'auto-format',
  event: 'onFileWrite',
  handler: async (ctx) => {
    if (ctx.file.match(/\.(ts|js|tsx|jsx)$/)) {
      await prettier.format(ctx.file);
    }
  }
}

// ESLint 检查
{
  name: 'eslint-check',
  event: 'onPreCommit',
  handler: async (ctx) => {
    const results = await eslint.lintFiles(ctx.files);
    if (results.errorCount > 0) {
      return { success: false, message: 'ESLint 检查失败' };
    }
  }
}
```

### 安全 Hooks

```javascript
// 敏感信息检查
{
  name: 'secret-scan',
  event: 'onPreCommit',
  handler: async (ctx) => {
    const patterns = [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i
    ];

    for (const file of ctx.files) {
      const content = await fs.readFile(file, 'utf-8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return {
            success: false,
            message: `检测到敏感信息: ${file}`
          };
        }
      }
    }
  }
}
```

### 通知 Hooks

```javascript
// Slack 通知
{
  name: 'slack-notify',
  event: 'onWorkflowComplete',
  handler: async (ctx) => {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        text: `✅ 工作流 "${ctx.workflow}" 已完成`
      })
    });
  }
}

// 邮件通知
{
  name: 'email-notify',
  event: 'onError',
  handler: async (ctx) => {
    await sendEmail({
      to: 'team@example.com',
      subject: `CCJK 错误: ${ctx.error.message}`,
      body: ctx.error.stack
    });
  }
}
```

## Hook 上下文

每个 Hook 都会收到丰富的上下文信息：

### 通用上下文

```typescript
interface HookContext {
  // 基本信息
  hookName: string;
  event: string;
  timestamp: Date;

  // 项目信息
  project: {
    root: string;
    name: string;
    type: string;
  };

  // 用户信息
  user: {
    name: string;
    email: string;
  };

  // 会话信息
  session: {
    id: string;
    startTime: Date;
    messageCount: number;
  };
}
```

### 文件 Hook 上下文

```typescript
interface FileHookContext extends HookContext {
  file: string;
  content?: string;
  oldContent?: string;
  operation: 'read' | 'write' | 'create' | 'delete';
}
```

### Git Hook 上下文

```typescript
interface GitHookContext extends HookContext {
  files: string[];
  message?: string;
  branch: string;
  author: string;
  hash?: string;
}
```

### 代理 Hook 上下文

```typescript
interface AgentHookContext extends HookContext {
  agent: string;
  input: string;
  output?: string;
  duration?: number;
  tokens?: {
    input: number;
    output: number;
  };
}
```

## Hook 链

多个 Hook 可以形成执行链：

### 顺序执行

```javascript
// Hook 1: 验证
{
  name: 'validate',
  event: 'onFileWrite',
  priority: 100,
  handler: async (ctx) => {
    // 验证逻辑
    return { success: true, data: { validated: true } };
  }
}

// Hook 2: 格式化（依赖验证结果）
{
  name: 'format',
  event: 'onFileWrite',
  priority: 90,
  handler: async (ctx, prevResults) => {
    if (prevResults.validate?.data?.validated) {
      // 格式化逻辑
    }
  }
}

// Hook 3: 保存（最后执行）
{
  name: 'save',
  event: 'onFileWrite',
  priority: 10,
  handler: async (ctx, prevResults) => {
    // 保存逻辑
  }
}
```

### 条件执行

```javascript
{
  name: 'conditional-hook',
  event: 'onFileWrite',

  // 只在满足条件时执行
  condition: (ctx) => {
    return ctx.file.endsWith('.ts') &&
           !ctx.file.includes('node_modules');
  },

  handler: async (ctx) => {
    // 处理逻辑
  }
}
```

### 中断执行

```javascript
{
  name: 'blocker-hook',
  event: 'onPreCommit',
  priority: 1000, // 最高优先级

  handler: async (ctx) => {
    if (hasBlockingIssue(ctx)) {
      return {
        success: false,
        abort: true, // 中断后续 Hook
        message: '发现阻塞性问题，已中止'
      };
    }
  }
}
```

## 异步 Hooks

### 并行执行

```javascript
{
  name: 'parallel-checks',
  event: 'onPreCommit',
  parallel: true, // 与其他 parallel Hook 并行执行

  handler: async (ctx) => {
    // 这个 Hook 会与其他 parallel Hook 同时执行
  }
}
```

### 超时处理

```javascript
{
  name: 'slow-hook',
  event: 'onWorkflowStep',
  timeout: 60000, // 60 秒超时

  handler: async (ctx) => {
    // 长时间运行的操作
  },

  onTimeout: async (ctx) => {
    // 超时时的处理
    console.log('Hook 执行超时，已跳过');
  }
}
```

## 调试 Hooks

### 启用调试模式

```bash
export CCJK_HOOK_DEBUG=true
```

### 查看 Hook 日志

```bash
# 查看所有 Hook 执行日志
tail -f ~/.ccjk/logs/hooks.log

# 查看特定事件的 Hook
grep "onPreCommit" ~/.ccjk/logs/hooks.log
```

### Hook 执行报告

```bash
# 生成 Hook 执行报告
ccjk hooks report

# 输出示例
Hook Execution Report (Last 24h)
────────────────────────────────
Event: onPreCommit
  ├── pre-commit-check    ✅ 15/15  avg: 1.2s
  ├── eslint-check        ✅ 15/15  avg: 3.4s
  └── secret-scan         ✅ 15/15  avg: 0.8s

Event: onFileWrite
  ├── auto-format         ✅ 142/142  avg: 0.3s
  └── file-backup         ✅ 28/28   avg: 0.1s

Event: onError
  └── slack-notify        ✅ 3/3    avg: 0.5s
```

## 实用 Hook 模板

### API 限流 Hook

```javascript
const rateLimiter = {
  name: 'rate-limiter',
  event: 'onMessageReceive',

  state: {
    requests: [],
    limit: 10,
    window: 60000 // 1 分钟
  },

  handler: async function(ctx) {
    const now = Date.now();
    this.state.requests = this.state.requests.filter(
      t => now - t < this.state.window
    );

    if (this.state.requests.length >= this.state.limit) {
      return {
        success: false,
        message: '请求过于频繁，请稍后再试'
      };
    }

    this.state.requests.push(now);
    return { success: true };
  }
};
```

### 响应缓存 Hook

```javascript
const responseCache = {
  name: 'response-cache',
  event: 'onMessageReceive',

  cache: new Map(),
  ttl: 300000, // 5 分钟

  handler: async function(ctx) {
    const key = hashMessage(ctx.message);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.time < this.ttl) {
      return {
        success: true,
        cached: true,
        response: cached.response
      };
    }

    return { success: true, cached: false };
  }
};
```

### 错误恢复 Hook

```javascript
const errorRecovery = {
  name: 'error-recovery',
  event: 'onError',

  handler: async (ctx) => {
    const { error, retryCount = 0 } = ctx;

    // 最多重试 3 次
    if (retryCount < 3) {
      console.log(`错误恢复: 第 ${retryCount + 1} 次重试`);
      return {
        success: true,
        retry: true,
        retryCount: retryCount + 1,
        delay: Math.pow(2, retryCount) * 1000 // 指数退避
      };
    }

    // 重试失败，发送通知
    await notifyTeam(error);
    return { success: false };
  }
};
```

## 最佳实践

### 1. 保持 Hook 轻量

```javascript
// ✅ 好的做法：快速执行
{
  handler: async (ctx) => {
    // 简单检查，快速返回
    if (!ctx.file.endsWith('.ts')) return { success: true };
    // 必要的处理
  }
}

// ❌ 不好的做法：耗时操作
{
  handler: async (ctx) => {
    // 对所有文件执行耗时操作
    await heavyOperation(ctx.file);
  }
}
```

### 2. 合理设置优先级

```javascript
// 验证类 Hook：高优先级
{ name: 'validator', priority: 100 }

// 处理类 Hook：中优先级
{ name: 'processor', priority: 50 }

// 通知类 Hook：低优先级
{ name: 'notifier', priority: 10 }
```

### 3. 优雅处理错误

```javascript
{
  handler: async (ctx) => {
    try {
      await riskyOperation();
    } catch (error) {
      // 记录错误但不中断流程
      console.error('Hook 执行出错:', error);
      return { success: true, warning: error.message };
    }
  }
}
```

### 4. 使用条件触发

```javascript
{
  // 只在特定条件下执行
  condition: (ctx) => {
    return ctx.branch === 'main' &&
           ctx.files.some(f => f.includes('src/'));
  }
}
```

## 相关资源

- [Skills 技能系统](../features/skills.md) - 技能与 Hook 的配合
- [Agents 代理系统](agents.md) - 代理事件钩子
- [Workflows 工作流](../features/workflows.md) - 工作流 Hook
- [配置管理](configuration.md) - Hook 配置选项

> 💡 **提示**：Hooks 是实现自动化工作流的关键。通过合理使用 Hooks，你可以让 CCJK 自动处理重复性任务，提升开发效率。
