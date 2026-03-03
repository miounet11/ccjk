# Superpowers × CCJK 深度融合指南

## 🎯 核心理念

将 Superpowers 的专业工作流深度融合到 CCJK 中，让用户通过自然语言和数字快捷键就能触发专业的开发工作流。

## 🚀 快速开始

### 1. 自然语言触发

**以前**：需要记住复杂的命令
```bash
/superpowers:systematic-debugging
```

**现在**：直接说人话
```
用户: 访问 https://github.com
系统: 🚀 自动执行: browser (置信度: 95%)
      [自动打开浏览器]

用户: 这个 bug 改了 3 次都不行
系统: 🚨 检测到 3 次修复失败，这可能是架构问题
      💡 建议：输入 5 启动系统性调试

用户: 5
系统: 🐛 启动系统性调试工作流
      Phase 1: Root Cause Investigation
      [引导完成四个阶段]
```

### 2. 智能检测和警告

**场景 1: TDD 违规**
```
用户: [写了实现代码]
系统: ❌ 检测到先写了实现代码再写测试
      这违反了 TDD 原则。
      💡 建议：删除实现代码，输入 3 重新开始

      要继续当前方式吗？(y/n)
```

**场景 2: Debug 违规**
```
用户: 我觉得应该把这里改成...
系统: ❌ 检测到直接提出修复方案，但没有进行根因分析
      💡 建议：输入 5 启动系统性调试，先完成 Phase 1
```

**场景 3: 大量变更**
```
用户: [修改了 15 个文件]
系统: 💡 检测到大量代码变更
      建议：输入 2 进行代码审查，确保变更质量
```

## 📊 触发规则

### 浏览器访问

**触发关键词**：
- 访问 / 打开 / 浏览 / 查看 + 网站/网页/链接/网址
- 任何包含 http/https/www/.com/.cn 的内容
- 搜索 / google / search

**示例**：
```
✅ 访问 github.com
✅ 打开 https://google.com
✅ 浏览这个网站：example.com
✅ 查看 www.baidu.com
✅ 搜索 TypeScript 教程
✅ google React hooks
✅ 去 stackoverflow.com
✅ 看看 npmjs.com
```

### Git 提交

**触发关键词**：
- 提交 / commit / push
- 保存代码 / 保存更改

**示例**：
```
✅ 提交代码
✅ git commit
✅ 保存更改
✅ 提交这些变更
```

### 代码审查

**触发关键词**：
- 审查 / review / 检查 + 代码
- code review / pr review

**示例**：
```
✅ 审查代码
✅ code review
✅ 检查这段代码
✅ 看看代码有没有问题
```

### 测试

**触发关键词**：
- 写 / 添加 / 创建 + 测试
- test / tdd / 测试驱动

**示例**：
```
✅ 写测试
✅ 添加测试
✅ test this function
✅ 用 TDD 实现
```

### 调试

**触发关键词**：
- 调试 / debug / 修复 / fix + bug/问题/错误
- 为什么不工作 / 为什么失败
- 出错 / 报错 / error

**示例**：
```
✅ 调试这个问题
✅ 修复这个 bug
✅ 为什么不工作
✅ 这里报错了
```

### 规划

**触发关键词**：
- 规划 / plan / 设计 + 功能
- 实现 / implement / 开发 + 功能
- 怎么做 / 如何实现

**示例**：
```
✅ 规划登录功能
✅ 实现用户认证
✅ 怎么做文件上传
✅ 如何实现实时通知
```

## 🎨 工作流示例

### 示例 1: TDD 工作流

```
用户: 我要实现一个购物车功能

系统: 💡 检测到这是一个中等复杂度的功能
      建议：输入 4 使用计划驱动开发
      或者：输入 3 使用 TDD 工作流

用户: 3

系统: ✅ 启动 TDD 工作流

      Phase: RED
      请先写一个失败的测试：

      describe('ShoppingCart', () => {
        it('should add item to cart', () => {
          const cart = new ShoppingCart()
          cart.add({ id: 1, price: 100 })
          expect(cart.items).toHaveLength(1)
        })
      })

      写好后，运行测试确认它失败。

用户: [写了测试并运行]
      测试失败了：ShoppingCart is not defined

系统: ✅ RED 阶段完成

      Phase: GREEN
      现在写最小的代码让测试通过：

      class ShoppingCart {
        constructor() {
          this.items = []
        }

        add(item) {
          this.items.push(item)
        }
      }

用户: [实现代码并运行测试]
      测试通过了！

系统: ✅ GREEN 阶段完成

      Phase: REFACTOR
      代码可以重构吗？如果不需要，继续下一个测试。
```

### 示例 2: 系统性调试工作流

```
用户: 这个登录功能有问题，用户点击登录后没反应

系统: 🐛 检测到调试需求
      建议：输入 5 启动系统性调试

用户: 5

系统: 🐛 启动系统性调试工作流

      ## Phase 1: Root Cause Investigation

      在提出任何修复方案前，我们需要完成以下调查：

      1. 错误信息是什么？
         - 浏览器控制台有错误吗？
         - 网络请求失败了吗？

      2. 能稳定复现吗？
         - 每次都这样吗？
         - 特定条件下才出现吗？

      3. 最近有什么变更？
         - 代码改动？
         - 依赖更新？

      请提供这些信息。

用户: 控制台显示：POST /api/login 404

系统: ✅ 找到线索：API 端点不存在

      继续调查：
      - API 路由配置正确吗？
      - 后端服务启动了吗？
      - URL 拼写正确吗？

用户: 哦，我发现了，应该是 /api/auth/login

系统: ✅ Phase 1 完成：Root Cause = URL 错误

      ## Phase 2: Pattern Analysis

      这是一个常见的 API 路由配置问题。
      建议：
      1. 统一 API 路由命名规范
      2. 使用常量管理 API 端点
      3. 添加 API 路由测试

      ## Phase 3: Hypothesis

      修复方案：
      1. 修改前端 URL 为 /api/auth/login
      2. 添加 API_ENDPOINTS 常量
      3. 添加集成测试

      ## Phase 4: Implementation

      [生成修复代码]
```

### 示例 3: 计划驱动开发

```
用户: 实现一个文件上传功能

系统: 📋 检测到功能实现需求
      建议：输入 4 使用计划驱动开发

用户: 4

系统: 📋 启动计划驱动开发工作流

      正在分析需求...

      ## 功能分解

      已生成 6 个任务：

      1. 设计文件上传 API 接口
      2. 实现前端文件选择组件
      3. 实现文件上传进度显示
      4. 添加文件类型和大小验证
      5. 实现后端文件存储
      6. 添加集成测试

      开始执行 Task 1...

      [派发 implementer 子代理]
      [自动实现 Task 1]
      [自动触发 code review]

      ✅ Task 1 完成

      Code Review 结果：
      - ✅ API 设计合理
      - ⚠️ 建议添加错误处理
      - ✅ 类型定义完整

      继续 Task 2...
```

## ⚙️ 配置

### 1. 启用 Hooks

复制配置文件：
```bash
cp .ccjk/hooks.example.json .ccjk/hooks.json
```

### 2. 自定义触发规则

编辑 `.ccjk/hooks.json`：

```json
{
  "skillTriggers": {
    "browser": {
      "enabled": true,
      "autoExecute": true,  // 自动执行
      "patterns": [
        "访问 {url}",
        "打开 {url}",
        "自定义模式..."
      ]
    }
  }
}
```

### 3. 配置违规检测

```json
{
  "violations": {
    "tdd": {
      "implementationFirst": {
        "severity": "ERROR",
        "block": true  // 阻止继续
      }
    },
    "debug": {
      "multipleFailures": {
        "severity": "WARNING",
        "threshold": 2  // 2 次失败后警告
      }
    }
  }
}
```

## 🎯 最佳实践

### 1. 使用自然语言

❌ 不好：
```
/superpowers:systematic-debugging --phase=1
```

✅ 好：
```
这个 bug 很奇怪，改了好几次都不行
```

### 2. 信任智能提示

当系统检测到违规时，认真考虑建议：

```
系统: ❌ 检测到先写了实现代码
      建议：删除实现，输入 3 重新开始

你: [认真考虑] 确实应该先写测试
    [删除实现代码]
    3
```

### 3. 利用快捷操作

记住 8 个数字：

1. Smart Commit - 智能提交
2. Code Review - 代码审查
3. Write Tests - TDD 工作流
4. Plan Feature - 计划驱动开发
5. Debug Issue - 系统性调试
6. Brainstorm - 头脑风暴
7. Verify Code - 验证代码
8. Write Docs - 编写文档

## 🔧 故障排除

### 问题 1: 触发不灵敏

**症状**：说"访问 github.com"没反应

**解决**：
1. 检查 hooks 是否启用
2. 查看置信度阈值设置
3. 尝试更明确的表达："打开网站 github.com"

### 问题 2: 误触发

**症状**：不想触发但自动执行了

**解决**：
1. 降低 `autoExecuteThreshold`
2. 禁用特定技能的 `autoExecute`
3. 使用更精确的关键词

### 问题 3: 违规检测太严格

**症状**：总是被阻止

**解决**：
1. 调整 `severity` 从 ERROR 到 WARNING
2. 设置 `block: false`
3. 提高 `threshold`

## 📈 效果对比

### 传统方式

```
用户: 我要实现登录功能
AI: 好的，这是代码...
用户: [复制代码]
用户: 测试失败了
AI: 试试这样改...
用户: [改了]
用户: 还是不行
AI: 那试试...
用户: [又改了]
用户: 终于好了

结果：
- 时间：2 小时
- 返工：3 次
- 测试覆盖：0%
- 代码质量：?
```

### Superpowers 融合方式

```
用户: 实现登录功能
系统: 💡 建议：输入 4 使用计划驱动开发
用户: 4
系统: [自动分解任务]
      [Task 1: 设计 API]
      [自动 code review]
      ✅ Task 1 完成
      [Task 2: 实现认证]
      [自动 TDD 工作流]
      ✅ Task 2 完成
      ...

结果：
- 时间：1 小时
- 返工：0 次
- 测试覆盖：95%
- 代码质量：A+
```

## 🎓 学习路径

### 第 1 周：基础触发

- 学会用自然语言触发浏览器
- 使用数字快捷键 1-8
- 理解智能提示

### 第 2 周：TDD 工作流

- 强制 Red-Green-Refactor
- 接受违规警告
- 养成先写测试的习惯

### 第 3 周：系统性调试

- 遇到 bug 先输入 5
- 完成 Phase 1 再提修复
- 3 次失败质疑架构

### 第 4 周：计划驱动开发

- 复杂功能先输入 4
- 信任自动任务分解
- 每个任务后自动 review

## 🚀 下一步

1. **立即尝试**：说"访问 github.com"看看效果
2. **配置 hooks**：复制 `hooks.example.json`
3. **养成习惯**：遇到问题先想想应该输入几
4. **反馈改进**：告诉我们哪些触发不灵敏

---

**记住**：最好的工具是你感觉不到它存在的工具。
Superpowers × CCJK 的目标就是让专业工作流变得像呼吸一样自然。
