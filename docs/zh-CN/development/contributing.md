---
title: 贡献指南
---

# 贡献指南

欢迎贡献者参与 CCJK 项目！本文档将指导您如何参与项目开发、提交代码和贡献文档。

## 📋 目录

- [开始之前](#开始之前)
- [开发环境设置](#开发环境设置)
- [贡献流程](#贡献流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 指南](#pull-request-指南)
- [文档贡献](#文档贡献)
- [测试要求](#测试要求)

## 开始之前

### 前置要求

- **Node.js**: >= 22
- **包管理器**: pnpm >= 10.17.1
- **Git**: 最新版本
- **IDE**: 推荐 VS Code（带 TypeScript 支持）

### 选择贡献方向

您可以通过以下方式贡献：

1. **功能开发**：实现新功能或改进现有功能
2. **Bug 修复**：修复项目中的问题
3. **文档改进**：完善或翻译文档
4. **测试补充**：添加测试用例提高覆盖率
5. **代码优化**：重构或优化代码质量

## 开发环境设置

### 1. Fork 并克隆仓库

```bash
# Fork 仓库到您的 GitHub 账号
# 然后克隆您的 fork
git clone https://github.com/YOUR_USERNAME/ccjk.git
cd ccjk
```

### 2. 添加上游仓库

```bash
# 添加上游仓库以便同步更新
git remote add upstream https://github.com/miounet11/ccjk.git

# 验证远程仓库
git remote -v
```

### 3. 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install
```

### 4. 验证安装

```bash
# 运行测试确保环境正常
pnpm test:run

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

### 5. 开发模式

```bash
# 使用 tsx 运行开发版本（支持热重载）
pnpm dev

# 或直接运行编译后的版本
pnpm build
pnpm start
```

## 贡献流程

### 1. 创建特性分支

```bash
# 从最新的 main 分支创建新分支
git checkout main
git pull upstream main

# 创建特性分支（使用描述性名称）
git checkout -b feat/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范**：

- `feat/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关
- `chore/` - 构建/工具相关

### 2. 进行开发

在开发过程中：

1. **编写代码**：遵循代码规范
2. **添加测试**：为新功能或修复添加测试用例
3. **更新文档**：如有必要，更新相关文档
4. **运行检查**：定期运行 lint 和测试

```bash
# 开发过程中定期检查
pnpm lint          # 代码检查
pnpm typecheck     # 类型检查
pnpm test          # 运行测试
```

### 3. 提交更改

```bash
# 添加更改的文件
git add .

# 提交（遵循 Conventional Commits 规范）
git commit -m "feat: add new feature description"
```

### 4. 同步上游更改

在推送之前，确保您的分支包含最新的上游更改：

```bash
# 获取上游更新
git fetch upstream

# 合并到您的分支
git merge upstream/main

# 或使用 rebase（推荐，保持提交历史整洁）
git rebase upstream/main
```

### 5. 推送到您的 Fork

```bash
# 推送到您的 fork
git push origin feat/your-feature-name
```

### 6. 创建 Pull Request

1. 在 GitHub 上访问您的 fork
2. 点击 "New Pull Request"
3. 选择 `miounet11/ccjk:main` 作为目标分支
4. 填写 PR 描述（使用模板）
5. 等待代码审查

## 代码规范

### TypeScript 规范

- **语言**: TypeScript (ESM-only)
- **缩进**: 2 个空格
- **引号**: 单引号
- **分号**: 不使用分号（由 ESLint 配置决定）
- **行宽**: 建议 100 字符，最大 120 字符

### 代码风格

```typescript
// ✅ 好的示例
import type { Config } from '../types/config';
import { readConfig } from '../utils/config';

export async function processConfig(): Promise<Config | null> {
  const config = await readConfig();
  return config;
}

// ❌ 避免
import { Config } from '../types/config'; // 使用双引号和分号
const config = await readConfig(); // 避免不必要的 await
```

### 导出规范

- **优先使用命名导出**：

  ```typescript
  // ✅ 推荐
  export function processData() {}
  export const CONSTANT = 'value';

  // ❌ 避免
  export default function () {}
  ```

- **避免副作用**：模块应只包含定义，避免在模块顶层执行代码

### 字符串处理

- **使用 i18n**：所有用户可见的字符串应通过 i18n 系统

  ```typescript
  // ✅ 推荐
  console.log(i18n.t('common:success'));

  // ❌ 避免硬编码
  console.log('Success');
  ```

- **使用常量**：配置值应定义为常量

  ```typescript
  // ✅ 推荐
  const DEFAULT_PORT = 3456;
  const API_TIMEOUT = 60000;

  // ❌ 避免魔法数字
  const port = 3456;
  ```

### 错误处理

- **使用类型安全的错误处理**：
  ```typescript
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
  ```

## 提交规范

CCJK 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新增功能，也不是修复bug）
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置更改

### 示例

```bash
# 新功能
git commit -m "feat(config): add multi-config support"

# Bug 修复
git commit -m "fix(ccr): resolve port conflict issue"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 包含详细说明
git commit -m "feat(workflow): add new workflow template

- Add six-phase workflow template
- Support custom workflow configuration
- Update workflow installer to handle new template"
```

## Pull Request 指南

### PR 标题

使用与提交信息相同的格式：

```
feat(config): add multi-config support
```

### PR 描述模板

```markdown
## 变更类型

- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 其他（请说明）

## 变更描述

简要描述此次 PR 的变更内容...

## 相关 Issue

Closes #123

## 测试说明

描述如何验证这些变更...

## 检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 代码已通过 lint 检查
- [ ] 类型检查通过
```

### PR 大小

- **小型 PR**（推荐）：一个 PR 只做一件事，易于审查
- **大型 PR**：如果必须，请先创建 Draft PR 讨论

### 审查反馈

- 认真对待审查意见
- 积极回应审查者的问题
- 及时修改并重新提交

## 文档贡献

### GitBook 文档

文档位于 `gitbook/zh-CN/` 和 `gitbook/en/` 目录：

```bash
gitbook/zh-CN/
├── README.md
├── getting-started/
├── features/
├── cli/
└── ...
```

**更新文档时**：

1. 同步更新中英文文档
2. 保持文档结构一致
3. 检查语法和格式

### 代码注释

- **英文注释**：所有代码注释必须使用英文
- **JSDoc 注释**：公共 API 应添加 JSDoc 注释

```typescript
/**
 * Reads configuration from the specified file
 * @param filePath - Path to the configuration file
 * @returns Configuration object or null if file doesn't exist
 */
export function readConfig(filePath: string): Config | null {
  // Implementation
}
```

### 模板和工作流

如果新增模板或工作流：

1. 在 `templates/` 目录添加模板文件
2. 在 `src/config/` 中更新配置
3. 更新相关文档
4. 添加测试用例

## 测试要求

### 测试覆盖率

- **目标覆盖率**: 80%（行、函数、分支、语句）
- **新增代码**: 必须包含测试

### 测试类型

1. **单元测试** (`tests/unit/`): 测试单个函数或模块
2. **集成测试** (`tests/integration/`): 测试跨模块交互
3. **边界测试** (`*.edge.test.ts`): 测试边界情况和错误场景

### 运行测试

```bash
# 运行所有测试
pnpm test

# 持续运行（watch 模式）
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage

# 运行特定测试
pnpm vitest tests/unit/utils/config.test.ts
```

### 测试编写建议

- 使用描述性的测试名称
- 每个测试只验证一件事
- 使用快照测试时要确保输出稳定（不受语言影响）
- Mock 文件系统操作时使用 Vitest 临时目录

## 常见问题

### Q: 如何同步上游更改？

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Q: 如何修改之前的提交？

```bash
# 修改最后一次提交
git commit --amend

# 交互式 rebase（修改多个提交）
git rebase -i upstream/main
```

### Q: 测试失败怎么办？

1. 检查本地环境是否正常
2. 运行 `pnpm install` 更新依赖
3. 查看测试输出中的错误信息
4. 如果问题持续，在 Issue 中报告

### Q: PR 被关闭了怎么办？

- 如果是因为需要修改，请修改后重新打开或创建新 PR
- 如果是被拒绝，请查看审查意见，重新评估后再提交

## 获取帮助

- **GitHub Issues**: 提交问题或建议
- **Discussions**: 参与项目讨论
- **文档**: 查看项目文档了解更多信息

感谢您的贡献！🎉
