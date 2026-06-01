# 功能规划：统一插件安装系统

## 📋 概述

### 功能目标
为 CCJK CLI 工具实现一个统一的 `add` 命令，让用户可以通过简单的命令从 GitHub URL 安装各类插件（Skills、MCP、Hooks、Agents）。

### 参考方案
Vercel 的 agent-skills 项目：
```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
```

### 目标命令格式
```bash
npx ccjk add <github-url> --skill <skill-name>
npx ccjk add <github-url> --mcp <mcp-name>
npx ccjk add <github-url> --hook <hook-name>
npx ccjk add <github-url> --agent <agent-name>
```

### 预期价值
- **统一体验**：一个命令安装所有类型的插件
- **简化操作**：从 GitHub URL 直接安装，无需手动下载
- **提升效率**：快速扩展 CCJK 功能
- **降低门槛**：新用户更容易上手

### 影响范围
- CLI 命令系统（新增 `add` 命令）
- Skills 管理模块
- MCP 管理模块
- Agents 管理模块
- Hooks 管理模块
- 主菜单界面

---

## 🎯 功能分解

### 核心功能

- [ ] **1. 统一 `add` 命令**
  - [ ] 1.1 命令参数解析（URL + 类型标志）
  - [ ] 1.2 GitHub URL 验证和解析
  - [ ] 1.3 插件类型识别（--skill/--mcp/--hook/--agent）
  - [ ] 1.4 路由到对应的安装处理器

- [ ] **2. GitHub 仓库解析器**
  - [ ] 2.1 克隆/下载 GitHub 仓库
  - [ ] 2.2 扫描仓库结构
  - [ ] 2.3 识别可用插件列表
  - [ ] 2.4 读取插件元数据（名称、描述、依赖）

- [ ] **3. Skills 安装器**
  - [ ] 3.1 从 URL 安装单个 Skill
  - [ ] 3.2 从 URL 安装多个 Skills（交互式选择）
  - [ ] 3.3 验证 Skill 格式
  - [ ] 3.4 复制到 Skills 目录
  - [ ] 3.5 更新 Skills 索引

- [ ] **4. MCP 安装器**
  - [ ] 4.1 从 URL 安装 MCP 服务
  - [ ] 4.2 解析 MCP 配置
  - [ ] 4.3 安装 MCP 依赖
  - [ ] 4.4 更新 MCP 配置文件

- [ ] **5. Agents 安装器**
  - [ ] 5.1 从 URL 安装 Agent
  - [ ] 5.2 验证 Agent 格式
  - [ ] 5.3 复制到 Agents 目录
  - [ ] 5.4 更新 Agents 索引

- [ ] **6. Hooks 安装器**
  - [ ] 6.1 从 URL 安装 Hook
  - [ ] 6.2 验证 Hook 格式
  - [ ] 6.3 复制到 Hooks 目录
  - [ ] 6.4 更新 Hooks 配置

- [ ] **7. 菜单页面升级**
  - [ ] 7.1 Skills 管理页面添加「从 URL 安装」
  - [ ] 7.2 MCP 管理页面添加「从 URL 安装」
  - [ ] 7.3 Agents 管理页面添加「从 URL 安装」
  - [ ] 7.4 Hooks 管理页面添加「从 URL 安装」

- [ ] **8. 用户体验优化**
  - [ ] 8.1 安装进度显示
  - [ ] 8.2 错误处理和友好提示
  - [ ] 8.3 安装成功确认
  - [ ] 8.4 中英文支持

---

## 📐 技术方案

### 1. 命令接口设计

#### 命令结构
```typescript
// src/commands/add.ts
export interface AddCommandOptions {
  skill?: string    // --skill <name>
  mcp?: string      // --mcp <name>
  agent?: string    // --agent <name>
  hook?: string     // --hook <name>
  list?: boolean    // --list (列出所有可用插件)
  force?: boolean   // --force (强制覆盖)
}

export async function addCommand(
  url: string,
  options: AddCommandOptions
): Promise<void>
```

#### 使用示例
```bash
# 安装单个 Skill
npx ccjk add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines

# 列出仓库中所有可用的 Skills
npx ccjk add https://github.com/vercel-labs/agent-skills --skill --list

# 交互式选择安装
npx ccjk add https://github.com/vercel-labs/agent-skills --skill

# 强制覆盖已存在的插件
npx ccjk add https://github.com/user/repo --skill my-skill --force
```

### 2. GitHub 仓库解析

#### 仓库结构识别
```typescript
// src/utils/github-repo-parser.ts
export interface RepoPlugin {
  type: 'skill' | 'mcp' | 'agent' | 'hook'
  name: string
  path: string
  description?: string
  metadata?: Record<string, any>
}

export class GitHubRepoParser {
  async clone(url: string): Promise<string> {
    // 克隆到临时目录
  }

  async scanPlugins(repoPath: string): Promise<RepoPlugin[]> {
    // 扫描仓库，识别所有插件
  }

  async getPluginMetadata(pluginPath: string): Promise<any> {
    // 读取插件元数据
  }
}
```

#### 插件识别规则

**Skills 识别**：
- 文件扩展名：`.md`
- 位置：`skills/` 或根目录
- 格式：包含 frontmatter 的 Markdown 文件

**MCP 识别**：
- 文件：`package.json` 包含 MCP 相关依赖
- 配置：存在 `mcp.json` 或 `mcp-config.json`

**Agents 识别**：
- 文件扩展名：`.md`
- 位置：`agents/` 目录
- 格式：包含 Agent 配置的 Markdown 文件

**Hooks 识别**：
- 文件扩展名：`.js` 或 `.ts`
- 位置：`hooks/` 目录
- 格式：导出 Hook 函数的脚本

### 3. 安装流程设计

#### 通用安装流程
```
┌─────────────────────────────────────────────────────────┐
│  1. 解析 GitHub URL                                      │
│       ↓                                                 │
│  2. 克隆/下载仓库到临时目录                               │
│       ↓                                                 │
│  3. 扫描仓库，识别插件类型和列表                          │
│       ↓                                                 │
│  4. 根据命令参数筛选目标插件                              │
│       ↓                                                 │
│  5. 验证插件格式和依赖                                    │
│       ↓                                                 │
│  6. 复制插件到目标目录                                    │
│       ↓                                                 │
│  7. 更新索引/配置文件                                     │
│       ↓                                                 │
│  8. 清理临时文件                                         │
│       ↓                                                 │
│  9. 显示安装成功消息                                     │
└─────────────────────────────────────────────────────────┘
```

#### Skills 特定流程
```typescript
// src/installers/skill-installer.ts
export class SkillInstaller {
  async install(repoPath: string, skillName: string): Promise<void> {
    // 1. 查找 Skill 文件
    const skillFile = await this.findSkillFile(repoPath, skillName)

    // 2. 验证格式
    await this.validateSkillFormat(skillFile)

    // 3. 复制到 Skills 目录
    const targetPath = join(SKILLS_DIR, `${skillName}.md`)
    await copyFile(skillFile, targetPath)

    // 4. 更新索引
    await this.updateSkillsIndex()

    console.log(`✅ Skill "${skillName}" installed successfully`)
  }
}
```

### 4. 菜单集成方案

#### Skills 管理菜单升级
```typescript
// src/commands/ccjk-skills.ts

// 添加新选项
const choices = [
  { name: '📥 从 URL 安装 Skill', value: 'install-from-url' },  // 新增
  { name: '📚 查看已安装的 Skills', value: 'list' },
  { name: '🔄 更新 Skills', value: 'update' },
  { name: '🗑️ 删除 Skill', value: 'remove' },
  // ...
]

// 处理新选项
if (choice === 'install-from-url') {
  const { url } = await inquirer.prompt({
    type: 'input',
    name: 'url',
    message: 'GitHub URL:',
    validate: (input) => isValidGitHubUrl(input)
  })

  await addCommand(url, { skill: true })
}
```

#### 统一的「从 URL 安装」组件
```typescript
// src/components/install-from-url.ts
export async function promptInstallFromUrl(
  type: 'skill' | 'mcp' | 'agent' | 'hook'
): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  console.log(ansis.bold.cyan(
    isZh ? `📥 从 URL 安装 ${type}` : `📥 Install ${type} from URL`
  ))

  const { url } = await inquirer.prompt({
    type: 'input',
    name: 'url',
    message: isZh ? 'GitHub 仓库 URL:' : 'GitHub repository URL:',
    validate: (input) => {
      if (!isValidGitHubUrl(input)) {
        return isZh ? '请输入有效的 GitHub URL' : 'Please enter a valid GitHub URL'
      }
      return true
    }
  })

  const options = { [type]: true }
  await addCommand(url, options)
}
```

### 5. 文件结构

#### 新增文件
```
src/
├── commands/
│   └── add.ts                    # 新增：add 命令入口
├── installers/
│   ├── base-installer.ts         # 新增：安装器基类
│   ├── skill-installer.ts        # 新增：Skill 安装器
│   ├── mcp-installer.ts          # 新增：MCP 安装器
│   ├── agent-installer.ts        # 新增：Agent 安装器
│   └── hook-installer.ts         # 新增：Hook 安装器
├── utils/
│   ├── github-repo-parser.ts     # 新增：GitHub 仓库解析器
│   └── plugin-validator.ts       # 新增：插件验证器
└── components/
    └── install-from-url.ts       # 新增：URL 安装组件
```

#### 修改文件
```
src/
├── commands/
│   ├── ccjk-skills.ts            # 修改：添加「从 URL 安装」选项
│   ├── ccjk-mcp.ts               # 修改：添加「从 URL 安装」选项
│   ├── ccjk-agents.ts            # 修改：添加「从 URL 安装」选项
│   └── menu.ts                   # 修改：可能需要更新菜单
└── core/
    └── index.ts                  # 修改：注册 add 命令
```

---

## ✅ 验收标准

### 功能验收

#### 1. 命令行功能
- [ ] `npx ccjk add <url> --skill <name>` 可以成功安装 Skill
- [ ] `npx ccjk add <url> --mcp <name>` 可以成功安装 MCP
- [ ] `npx ccjk add <url> --agent <name>` 可以成功安装 Agent
- [ ] `npx ccjk add <url> --hook <name>` 可以成功安装 Hook
- [ ] `npx ccjk add <url> --skill --list` 可以列出所有可用 Skills
- [ ] `npx ccjk add <url> --skill` 提供交互式选择界面

#### 2. 菜单功能
- [ ] Skills 管理菜单有「从 URL 安装」选项
- [ ] MCP 管理菜单有「从 URL 安装」选项
- [ ] Agents 管理菜单有「从 URL 安装」选项
- [ ] Hooks 管理菜单有「从 URL 安装」选项（如果存在）
- [ ] 所有菜单选项都能正常工作

#### 3. 用户体验
- [ ] 安装过程有清晰的进度提示
- [ ] 安装成功有明确的确认消息
- [ ] 安装失败有友好的错误提示
- [ ] 支持中英文界面
- [ ] URL 验证提供即时反馈

#### 4. 错误处理
- [ ] 无效的 GitHub URL 被正确拒绝
- [ ] 不存在的插件名称有清晰提示
- [ ] 网络错误有重试机制
- [ ] 格式错误的插件被拒绝安装
- [ ] 已存在的插件提示用户确认覆盖

### 性能指标
- [ ] 小型仓库（< 10MB）安装时间 < 10 秒
- [ ] 大型仓库（< 100MB）安装时间 < 30 秒
- [ ] 临时文件正确清理，不占用磁盘空间

### 兼容性
- [ ] 支持 GitHub 公开仓库
- [ ] 支持 GitHub 私有仓库（需要认证）
- [ ] 支持不同的仓库结构
- [ ] 向后兼容现有的插件管理命令

---

## ⏱️ 实施计划

### 阶段 1：基础设施（2-3 天）
**目标**：搭建核心框架

- [ ] 创建 `add` 命令入口
- [ ] 实现 GitHub 仓库解析器
- [ ] 实现插件验证器
- [ ] 创建安装器基类

**交付物**：
- `src/commands/add.ts`
- `src/utils/github-repo-parser.ts`
- `src/utils/plugin-validator.ts`
- `src/installers/base-installer.ts`

### 阶段 2：Skills 安装器（1-2 天）
**目标**：实现 Skills 的完整安装流程

- [ ] 实现 SkillInstaller 类
- [ ] Skills 格式验证
- [ ] Skills 目录管理
- [ ] Skills 索引更新
- [ ] 测试 Skills 安装

**交付物**：
- `src/installers/skill-installer.ts`
- Skills 安装功能完整可用

### 阶段 3：其他安装器（2-3 天）
**目标**：实现 MCP、Agents、Hooks 安装器

- [ ] 实现 McpInstaller 类
- [ ] 实现 AgentInstaller 类
- [ ] 实现 HookInstaller 类
- [ ] 测试各类型安装

**交付物**：
- `src/installers/mcp-installer.ts`
- `src/installers/agent-installer.ts`
- `src/installers/hook-installer.ts`
- 所有类型插件都能安装

### 阶段 4：菜单集成（1-2 天）
**目标**：在所有管理菜单中添加「从 URL 安装」功能

- [ ] 创建统一的 URL 安装组件
- [ ] 升级 Skills 管理菜单
- [ ] 升级 MCP 管理菜单
- [ ] 升级 Agents 管理菜单
- [ ] 升级 Hooks 管理菜单

**交付物**：
- `src/components/install-from-url.ts`
- 所有管理菜单都支持 URL 安装

### 阶段 5：用户体验优化（1 天）
**目标**：完善交互体验和错误处理

- [ ] 添加进度显示
- [ ] 优化错误提示
- [ ] 完善中英文支持
- [ ] 添加安装确认

**交付物**：
- 流畅的用户体验
- 友好的错误处理

### 阶段 6：测试和文档（1 天）
**目标**：确保质量和可维护性

- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新用户文档
- [ ] 更新开发文档

**交付物**：
- 测试覆盖率 > 80%
- 完整的使用文档

---

## 📊 依赖关系

```
阶段 1 (基础设施)
    ↓
阶段 2 (Skills 安装器) ← 可以并行 → 阶段 3 (其他安装器)
    ↓                                    ↓
    └────────────→ 阶段 4 (菜单集成) ←────┘
                        ↓
                  阶段 5 (UX 优化)
                        ↓
                  阶段 6 (测试文档)
```

---

## 🔧 技术细节

### GitHub URL 解析

```typescript
export function parseGitHubUrl(url: string): {
  owner: string
  repo: string
  branch?: string
  path?: string
} {
  // 支持的格式：
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch
  // https://github.com/owner/repo/tree/branch/path/to/dir
  // git@github.com:owner/repo.git
}
```

### 临时目录管理

```typescript
export class TempDirManager {
  private tempDir: string

  async create(): Promise<string> {
    this.tempDir = await mkdtemp(join(tmpdir(), 'ccjk-install-'))
    return this.tempDir
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      await rm(this.tempDir, { recursive: true, force: true })
    }
  }
}
```

### 进度显示

```typescript
import ora from 'ora'

export class InstallProgress {
  private spinner: ora.Ora

  start(message: string): void {
    this.spinner = ora(message).start()
  }

  update(message: string): void {
    this.spinner.text = message
  }

  succeed(message: string): void {
    this.spinner.succeed(message)
  }

  fail(message: string): void {
    this.spinner.fail(message)
  }
}
```

---

## 📝 注意事项

### 安全考虑
1. **URL 验证**：只允许 GitHub URL，防止恶意链接
2. **代码审查**：安装前提示用户审查插件内容
3. **沙箱执行**：插件在受限环境中运行
4. **权限检查**：验证文件系统权限

### 兼容性
1. **保持向后兼容**：不影响现有的插件管理命令
2. **渐进增强**：新功能作为可选项添加
3. **优雅降级**：网络失败时提供离线选项

### 可扩展性
1. **插件类型**：设计支持未来新增插件类型
2. **仓库源**：预留支持 GitLab、Bitbucket 的接口
3. **安装方式**：支持从 npm、本地路径安装

---

## 🎯 成功指标

### 用户采用率
- 30% 的用户使用 `add` 命令安装插件
- 50% 的新插件通过 URL 安装

### 用户满意度
- 安装成功率 > 95%
- 用户反馈评分 > 4.5/5

### 技术指标
- 代码覆盖率 > 80%
- 安装失败率 < 5%
- 平均安装时间 < 15 秒

---

## 📚 参考资料

- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [CCJK 现有代码库](https://github.com/anthropics/claude-code)

---

**规划完成时间**：2026-02-01
**预计实施周期**：7-10 天
**优先级**：高
**复杂度**：中等
