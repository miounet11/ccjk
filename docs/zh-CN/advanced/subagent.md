---
title: Subagent 子代理编排
---

# Subagent 子代理编排

CCJK 的 Subagent 系统提供了强大的多代理编排能力，允许你协调多个 AI 代理协同工作，完成复杂的任务。

## 什么是 Subagent？

Subagent（子代理）是由主代理调度的专业化代理，它们：

- 🎯 **专注子任务**：每个 Subagent 处理特定的子任务
- 🔄 **可并行执行**：多个 Subagent 可以同时工作
- 📊 **结果聚合**：主代理汇总所有 Subagent 的结果
- 🔗 **上下文共享**：Subagent 之间可以共享上下文

## 编排模式

### 1. 串行编排（Sequential）

Subagent 按顺序依次执行：

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Planner │ -> │Developer│ -> │ Tester  │ -> │Reviewer │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

**适用场景**：
- 任务有明确的先后依赖
- 后续任务需要前置任务的输出
- 需要严格的执行顺序

**配置示例**：

```yaml
# .claude/workflows/sequential-dev.yaml
name: sequential-development
mode: sequential

stages:
  - name: planning
    agent: planner
    input: "{{user.requirement}}"
    output: plan

  - name: development
    agent: developer
    input: "{{stages.planning.output}}"
    output: code

  - name: testing
    agent: tester
    input: "{{stages.development.output}}"
    output: tests

  - name: review
    agent: reviewer
    input:
      code: "{{stages.development.output}}"
      tests: "{{stages.testing.output}}"
    output: review_report
```

### 2. 并行编排（Parallel）

多个 Subagent 同时执行：

```
              ┌──────────┐
              │ Security │
              └──────────┘
                   │
┌─────────┐   ┌────┴────┐   ┌─────────┐
│ Request │ ->│ Parallel│ ->│ Merge   │
└─────────┘   └────┬────┘   └─────────┘
                   │
              ┌────┴─────┐
              │Performance│
              └──────────┘
```

**适用场景**：
- 任务之间相互独立
- 需要快速完成多项检查
- 资源充足，可以并行处理

**配置示例**：

```yaml
# .claude/workflows/parallel-review.yaml
name: parallel-review
mode: parallel

tasks:
  - name: security-check
    agent: security
    input: "{{code}}"

  - name: performance-check
    agent: performance
    input: "{{code}}"

  - name: style-check
    agent: reviewer
    input: "{{code}}"

  - name: test-coverage
    agent: tester
    input: "{{code}}"

merge:
  strategy: aggregate
  output: comprehensive_report
```

### 3. 管道编排（Pipeline）

数据流经多个处理阶段：

```
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│ Parse │ ->│Transform->│Validate->│ Output│
└───────┘   └───────┘   └───────┘   └───────┘
```

**适用场景**：
- 数据需要多步处理
- 每个阶段对数据进行转换
- 类似流水线的处理模式

**配置示例**：

```yaml
# .claude/workflows/data-pipeline.yaml
name: data-pipeline
mode: pipeline

pipeline:
  - stage: parse
    agent: parser
    transform: |
      将原始输入解析为结构化数据

  - stage: enrich
    agent: enricher
    transform: |
      添加额外的上下文信息

  - stage: validate
    agent: validator
    transform: |
      验证数据完整性和正确性

  - stage: format
    agent: formatter
    transform: |
      格式化为最终输出格式
```

### 4. 分支编排（Branch）

根据条件选择不同的执行路径：

```
                    ┌─────────┐
              Yes ->│ Path A  │
┌─────────┐  ┌──────┴─────────┘
│Condition│->│
└─────────┘  └──────┬─────────┐
              No  ->│ Path B  │
                    └─────────┘
```

**适用场景**：
- 需要根据条件选择处理方式
- 不同类型的输入需要不同处理
- 实现智能路由

**配置示例**：

```yaml
# .claude/workflows/smart-router.yaml
name: smart-router
mode: branch

router:
  input: "{{user.request}}"
  rules:
    - condition: "contains('bug') or contains('fix')"
      route: bug-fix-flow

    - condition: "contains('feature') or contains('new')"
      route: feature-dev-flow

    - condition: "contains('refactor')"
      route: refactor-flow

    - default: general-flow

flows:
  bug-fix-flow:
    agents: [analyzer, developer, tester]

  feature-dev-flow:
    agents: [planner, designer, developer, tester, reviewer]

  refactor-flow:
    agents: [analyzer, architect, developer, reviewer]

  general-flow:
    agents: [assistant]
```

### 5. 循环编排（Loop）

重复执行直到满足条件：

```
┌─────────────────────────────┐
│                             │
│  ┌───────┐    ┌─────────┐  │
└->│Execute│ -> │ Check   │--┘
   └───────┘    └────┬────┘
                     │ Done
                     v
               ┌─────────┐
               │ Output  │
               └─────────┘
```

**适用场景**：
- 迭代改进直到满足质量标准
- 需要多轮处理
- 实现自动重试

**配置示例**：

```yaml
# .claude/workflows/iterative-improve.yaml
name: iterative-improvement
mode: loop

loop:
  maxIterations: 5

  execute:
    agent: developer
    input: "{{current.code}}"
    output: improved_code

  check:
    agent: reviewer
    input: "{{loop.execute.output}}"
    condition: "score >= 8"  # 满分 10 分

  onMaxIterations:
    action: warn
    message: "达到最大迭代次数，返回当前最佳结果"
```

### 6. 混合编排（Hybrid）

组合多种编排模式：

```yaml
# .claude/workflows/hybrid-workflow.yaml
name: hybrid-workflow
mode: hybrid

workflow:
  # 阶段 1：串行规划
  - stage: planning
    mode: sequential
    agents:
      - pm
      - architect

  # 阶段 2：并行开发
  - stage: development
    mode: parallel
    tasks:
      - { agent: frontend-dev, scope: "frontend" }
      - { agent: backend-dev, scope: "backend" }
      - { agent: db-dev, scope: "database" }

  # 阶段 3：串行集成
  - stage: integration
    mode: sequential
    agents:
      - integrator
      - tester

  # 阶段 4：并行审查
  - stage: review
    mode: parallel
    tasks:
      - { agent: security }
      - { agent: performance }
      - { agent: reviewer }

  # 阶段 5：循环优化
  - stage: optimization
    mode: loop
    agent: optimizer
    until: "quality_score >= 9"
```

## 创建 Subagent 编排

### 使用 YAML 配置

```yaml
# .claude/workflows/my-workflow.yaml
name: my-custom-workflow
description: 自定义工作流
version: 1.0.0

# 输入定义
inputs:
  requirement:
    type: string
    required: true
    description: 用户需求描述

  codebase:
    type: path
    default: "./src"
    description: 代码库路径

# 编排配置
orchestration:
  mode: sequential
  errorHandling: continue  # continue | stop | retry
  timeout: 300000

# 阶段定义
stages:
  - id: analyze
    name: 需求分析
    agent: pm
    inputs:
      requirement: "{{inputs.requirement}}"
    outputs:
      - name: user_stories
        type: array
      - name: acceptance_criteria
        type: array

  - id: design
    name: 技术设计
    agent: architect
    inputs:
      stories: "{{stages.analyze.outputs.user_stories}}"
      codebase: "{{inputs.codebase}}"
    outputs:
      - name: design_doc
        type: markdown
      - name: task_breakdown
        type: array

  - id: implement
    name: 并行实现
    mode: parallel
    tasks:
      - agent: developer
        input: "{{stages.design.outputs.task_breakdown[0]}}"
      - agent: developer
        input: "{{stages.design.outputs.task_breakdown[1]}}"
      - agent: developer
        input: "{{stages.design.outputs.task_breakdown[2]}}"

  - id: test
    name: 测试验证
    agent: tester
    inputs:
      code: "{{stages.implement.outputs}}"
      criteria: "{{stages.analyze.outputs.acceptance_criteria}}"

# 输出定义
outputs:
  deliverables:
    - "{{stages.implement.outputs}}"
    - "{{stages.test.outputs}}"
```

### 使用代码配置

```typescript
// .claude/workflows/my-workflow.ts
import { Workflow, Stage, Agent } from '@ccjk/workflow';

const myWorkflow = new Workflow({
  name: 'my-custom-workflow',
  description: '自定义工作流'
});

// 添加阶段
myWorkflow
  .addStage(new Stage({
    id: 'analyze',
    agent: Agent.PM,
    handler: async (ctx) => {
      const { requirement } = ctx.inputs;
      // 分析逻辑
      return { userStories, acceptanceCriteria };
    }
  }))
  .addStage(new Stage({
    id: 'design',
    agent: Agent.Architect,
    dependsOn: ['analyze'],
    handler: async (ctx) => {
      const { userStories } = ctx.previousOutputs.analyze;
      // 设计逻辑
      return { designDoc, taskBreakdown };
    }
  }))
  .addParallelStage({
    id: 'implement',
    dependsOn: ['design'],
    tasks: (ctx) => {
      const { taskBreakdown } = ctx.previousOutputs.design;
      return taskBreakdown.map(task => ({
        agent: Agent.Developer,
        input: task
      }));
    }
  })
  .addStage(new Stage({
    id: 'test',
    agent: Agent.Tester,
    dependsOn: ['implement'],
    handler: async (ctx) => {
      // 测试逻辑
    }
  }));

export default myWorkflow;
```

## Subagent 通信

### 上下文传递

```yaml
# 显式传递
stages:
  - id: stage1
    outputs:
      - name: result
        passTo: [stage2, stage3]

  - id: stage2
    inputs:
      data: "{{stages.stage1.outputs.result}}"
```

### 共享状态

```yaml
# 使用共享状态
sharedState:
  - name: projectContext
    type: object
    initialValue: {}

stages:
  - id: stage1
    updateState:
      projectContext.analyzed: true

  - id: stage2
    condition: "{{state.projectContext.analyzed}}"
```

### 消息传递

```typescript
// Subagent 之间发送消息
myWorkflow.on('message', (from, to, message) => {
  console.log(`${from} -> ${to}: ${message}`);
});

// 在 Stage 中发送消息
stage.handler = async (ctx) => {
  await ctx.sendMessage('reviewer', {
    type: 'request_review',
    code: ctx.outputs.code
  });
};
```

## 错误处理

### 重试策略

```yaml
errorHandling:
  retry:
    maxAttempts: 3
    backoff: exponential
    initialDelay: 1000
    maxDelay: 30000

  onError:
    - condition: "error.type === 'timeout'"
      action: retry

    - condition: "error.type === 'rate_limit'"
      action: wait
      duration: 60000

    - default:
        action: fail
        notify: true
```

### 降级策略

```yaml
stages:
  - id: primary
    agent: advanced-agent
    fallback:
      agent: basic-agent
      condition: "error or timeout > 30s"
```

### 回滚策略

```yaml
rollback:
  enabled: true
  checkpoints:
    - after: design
    - after: implement

  onFailure:
    - rollbackTo: lastCheckpoint
    - notify: team
```

## 监控与可观测性

### 执行追踪

```bash
# 查看工作流执行状态
ccjk workflow status my-workflow

# 输出示例
Workflow: my-custom-workflow
Status: Running
Progress: 3/5 stages

Stages:
  ✅ analyze      (2.3s)
  ✅ design       (4.1s)
  🔄 implement    (running... 12.5s)
     ├── task-1   ✅ done
     ├── task-2   🔄 running
     └── task-3   ⏳ pending
  ⏳ test         (pending)
  ⏳ review       (pending)
```

### 性能指标

```bash
# 查看工作流性能
ccjk workflow metrics my-workflow

# 输出示例
Workflow Metrics (Last 7 days)
──────────────────────────────
Executions:     42
Success Rate:   95.2%
Avg Duration:   3m 24s
Avg Cost:       $0.45

Stage Breakdown:
  analyze     avg: 2.1s   success: 100%
  design      avg: 3.8s   success: 97.6%
  implement   avg: 45.2s  success: 95.2%
  test        avg: 12.3s  success: 97.6%
  review      avg: 8.7s   success: 100%
```

### 日志与调试

```bash
# 启用详细日志
export CCJK_WORKFLOW_DEBUG=true

# 查看工作流日志
tail -f ~/.ccjk/logs/workflows/my-workflow.log

# 查看特定执行
ccjk workflow logs my-workflow --execution-id abc123
```

## 实用模板

### 功能开发模板

```yaml
name: feature-development
description: 完整的功能开发流程

stages:
  - id: requirements
    agent: pm
    prompt: |
      分析以下需求，输出用户故事和验收标准：
      {{input}}

  - id: design
    agent: architect
    prompt: |
      基于以下用户故事，设计技术方案：
      {{stages.requirements.output}}

  - id: breakdown
    agent: planner
    prompt: |
      将技术方案分解为可执行的任务：
      {{stages.design.output}}

  - id: implement
    mode: parallel
    agent: developer
    forEach: "{{stages.breakdown.output.tasks}}"

  - id: test
    agent: tester
    prompt: |
      为以下代码编写测试：
      {{stages.implement.output}}

  - id: review
    mode: parallel
    tasks:
      - agent: reviewer
        focus: code_quality
      - agent: security
        focus: security
      - agent: performance
        focus: performance

  - id: document
    agent: writer
    prompt: |
      为以下功能编写文档：
      {{stages.implement.output}}
```

### 代码审查模板

```yaml
name: comprehensive-review
description: 全面的代码审查流程

mode: parallel

tasks:
  - id: quality
    agent: reviewer
    aspects:
      - 代码可读性
      - 命名规范
      - 代码复杂度
      - 重复代码

  - id: security
    agent: security
    aspects:
      - 输入验证
      - 认证授权
      - 敏感数据处理
      - 常见漏洞

  - id: performance
    agent: performance
    aspects:
      - 算法复杂度
      - 内存使用
      - 数据库查询
      - 缓存策略

  - id: testing
    agent: tester
    aspects:
      - 测试覆盖率
      - 边界条件
      - 错误处理
      - 集成测试

merge:
  agent: reviewer
  prompt: |
    综合以下审查结果，生成最终报告：
    - 代码质量: {{tasks.quality.output}}
    - 安全审查: {{tasks.security.output}}
    - 性能分析: {{tasks.performance.output}}
    - 测试评估: {{tasks.testing.output}}
```

### Bug 修复模板

```yaml
name: bug-fix
description: 系统化的 Bug 修复流程

stages:
  - id: reproduce
    agent: tester
    prompt: |
      分析并复现以下 Bug：
      {{input}}
    outputs:
      - reproduction_steps
      - root_cause_hypothesis

  - id: analyze
    agent: developer
    prompt: |
      基于复现步骤，定位 Bug 根因：
      {{stages.reproduce.output}}
    outputs:
      - root_cause
      - affected_files
      - fix_approach

  - id: fix
    agent: developer
    prompt: |
      实现以下修复方案：
      {{stages.analyze.output}}

  - id: test
    agent: tester
    prompt: |
      验证修复是否有效，并检查回归：
      - 修复代码: {{stages.fix.output}}
      - 原始 Bug: {{input}}

  - id: review
    agent: reviewer
    condition: "{{stages.test.output.passed}}"
    prompt: |
      审查修复代码的质量：
      {{stages.fix.output}}
```

## 最佳实践

### 1. 合理划分任务

```yaml
# ✅ 好的做法：任务粒度适中
stages:
  - id: analyze
    agent: analyzer
  - id: implement
    agent: developer
  - id: test
    agent: tester

# ❌ 不好的做法：任务粒度过细
stages:
  - id: read-file
  - id: parse-content
  - id: analyze-structure
  - id: generate-report
  # ... 太多小任务
```

### 2. 明确依赖关系

```yaml
# ✅ 好的做法：显式声明依赖
stages:
  - id: design
    dependsOn: [requirements]

  - id: implement
    dependsOn: [design]

# ❌ 不好的做法：隐式依赖
stages:
  - id: design
    # 假设 requirements 已完成
```

### 3. 处理边界情况

```yaml
# ✅ 好的做法：完善的错误处理
stages:
  - id: risky-stage
    timeout: 60000
    retry:
      maxAttempts: 3
    fallback:
      agent: simple-agent
    onError:
      action: notify
```

### 4. 优化并行度

```yaml
# ✅ 好的做法：合理的并行度
parallel:
  maxConcurrent: 3  # 限制并发数
  tasks: [...]

# ❌ 不好的做法：无限制并行
parallel:
  tasks: [...]  # 可能导致资源耗尽
```

## 相关资源

- [Agents 代理系统](agents.md) - 了解可用的代理
- [Workflows 工作流](../features/workflows.md) - 工作流基础
- [Hooks 系统](hooks.md) - 工作流事件钩子
- [配置管理](configuration.md) - 编排配置选项

> 💡 **提示**：Subagent 编排是 CCJK 最强大的功能之一。通过合理的编排，你可以让多个 AI 代理协同工作，完成复杂的开发任务。
