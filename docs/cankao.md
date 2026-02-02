https://github.com/miounet11/ccjk

🔑 核心功能 (Core)
──────────────────────────────────────────────────

1. 🔑 API 配置 - 一键配置 API (核心功能)

🚀 快速开始 (Quick Start)
────────────────────────────────────────────────── 2. ⚡ 一键初始化 - 初始化项目配置 3. 🔧 一键体检 - 诊断问题并自动修复 4. 🔄 一键更新 - 更新所有组件到最新版本

📦 高级功能 (Advanced)
────────────────────────────────────────────────── 5. 📚 Skills 管理 - 安装/更新/删除工作流技能 6. 🔌 MCP 管理 - 配置 Model Context Protocol 服务 7. 🤖 Agents 管理 - 创建/管理 AI 智能体 8. 📋 更多功能 - CCR/CCUsage/配置切换/代码工具等

⚙️ 系统设置 (System)
────────────────────────────────────────────────── 9. 🌍 语言设置 - 切换界面语言
H. ❓ 帮助文档 - 查看使用指南

0. 🚪 退出

✔ 请输入选项 (0-9, H): 5

📚 Skills 管理...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CCJK 技能安装
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 分析项目...
ℹ Analyzing project at: /Users/lu/ccjk-public analyzer 18:58:38
ℹ Detecting project at: /Users/lu/ccjk-public project-detector 18:58:38
ℹ Analyzing TypeScript/JavaScript project typescript-analyzer 18:58:38
ℹ Detected project type: typescript project-detector 18:58:38
✔ Project analysis completed in 56ms analyzer 18:58:38
ℹ Detected: typescript (54.29658901830283% confidence) analyzer 18:58:38
检测到: typescript
框架: typescript, vitest, eslint, prettier, gatsby, react, preact, solidjs, svelte, nest.js, feathers, ionic
包管理器: pnpm
构建系统: tsc

📚 推荐技能...
ℹ Fetching cloud recommendations... recommender 18:58:38
✔ Fetched 50 skills from cloud recommender 18:58:39

推荐的技能 (找到 16 个)

✔ 选择要安装的技能 (空格选择, 回车确认) 📦 Code Refactor (refactoring), 📦 Import Organizer (refactoring), 📦 JSDoc
Generator (documentation), 📦 Security Scanner (security), 📦 Component Generator (code-generation), 🧪 Test Generator
(testing), 📦 Schema Generator (code-generation), 💻 TypeScript Best Practices (dev), 📦 TypeScript Best Practices
(development), 📦 React Best Practices (frontend), 📦 Component Generator (code-generation), 📦 Schema Generator
(code-generation), 🧪 Test Generator (testing), 📦 JSDoc Generator (documentation), 📦 Code Refactor (refactoring)

📦 安装技能中...
→ Code Refactor...
WARN Cloud API error in template fetch: skill_nsDoZrxNyLn4: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_nsDoZrxNyLn4": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_nsDoZrxNyLn4": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_nsDoZrxNyLn4: //api.claudehome.cn/api/v1/templates/skill_nsDoZrxNyLn4": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_nsDoZrxNyLn4
→ Import Organizer...
WARN Cloud API error in template fetch: skill_3k8Ar146QsNh: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_3k8Ar146QsNh": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_3k8Ar146QsNh": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_3k8Ar146QsNh: //api.claudehome.cn/api/v1/templates/skill_3k8Ar146QsNh": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_3k8Ar146QsNh
→ JSDoc Generator...
WARN Cloud API error in template fetch: skill_NVFsru7IdsKD: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_NVFsru7IdsKD": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_NVFsru7IdsKD": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_NVFsru7IdsKD: //api.claudehome.cn/api/v1/templates/skill_NVFsru7IdsKD": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_NVFsru7IdsKD
→ Security Scanner...
WARN Cloud API error in template fetch: skill_A8lccokz1dFl: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_A8lccokz1dFl": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_A8lccokz1dFl": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_A8lccokz1dFl: //api.claudehome.cn/api/v1/templates/skill_A8lccokz1dFl": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_A8lccokz1dFl
→ Component Generator...
WARN Cloud API error in template fetch: skill_U0qUCzwYURSB: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_U0qUCzwYURSB": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_U0qUCzwYURSB": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_U0qUCzwYURSB: //api.claudehome.cn/api/v1/templates/skill_U0qUCzwYURSB": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_U0qUCzwYURSB
→ Test Generator...
WARN Cloud API error in template fetch: skill_0y47SW_1lO-W: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_0y47SW_1lO-W": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_0y47SW_1lO-W": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_0y47SW_1lO-W: //api.claudehome.cn/api/v1/templates/skill_0y47SW_1lO-W": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_0y47SW_1lO-W
→ Schema Generator...
WARN Cloud API error in template fetch: skill_Ti_Njiu6PyKv: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/skill_Ti_Njiu6PyKv": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/skill_Ti_Njiu6PyKv": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template skill_Ti_Njiu6PyKv: //api.claudehome.cn/api/v1/templates/skill_Ti_Njiu6PyKv": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: skill_Ti_Njiu6PyKv
→ TypeScript Best Practices... ✗
Generated SKILL.md is invalid: Invalid SKILL.md format
→ TypeScript Best Practices...
WARN Cloud API error in template fetch: tpl_VVvfHw7NA_qw: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_VVvfHw7NA_qw": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_VVvfHw7NA_qw": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_VVvfHw7NA_qw: //api.claudehome.cn/api/v1/templates/tpl_VVvfHw7NA_qw": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_VVvfHw7NA_qw
→ React Best Practices...
WARN Cloud API error in template fetch: tpl_uKPyj6viVGfg: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_uKPyj6viVGfg": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_uKPyj6viVGfg": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_uKPyj6viVGfg: //api.claudehome.cn/api/v1/templates/tpl_uKPyj6viVGfg": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_uKPyj6viVGfg
→ Component Generator...
WARN Cloud API error in template fetch: tpl_Ox4f9FJhul-A: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_Ox4f9FJhul-A": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_Ox4f9FJhul-A": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_Ox4f9FJhul-A: //api.claudehome.cn/api/v1/templates/tpl_Ox4f9FJhul-A": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_Ox4f9FJhul-A
→ Schema Generator...
WARN Cloud API error in template fetch: tpl_l9SkEvoBkncY: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_l9SkEvoBkncY": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_l9SkEvoBkncY": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_l9SkEvoBkncY: //api.claudehome.cn/api/v1/templates/tpl_l9SkEvoBkncY": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_l9SkEvoBkncY
→ Test Generator...
WARN Cloud API error in template fetch: tpl_m2FEpjnJIXp8: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_m2FEpjnJIXp8": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_m2FEpjnJIXp8": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_m2FEpjnJIXp8: //api.claudehome.cn/api/v1/templates/tpl_m2FEpjnJIXp8": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_m2FEpjnJIXp8
→ JSDoc Generator...
WARN Cloud API error in template fetch: tpl_GW52d3V_8CRm: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_GW52d3V_8CRm": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_GW52d3V_8CRm": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_GW52d3V_8CRm: //api.claudehome.cn/api/v1/templates/tpl_GW52d3V_8CRm": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_GW52d3V_8CRm
→ Code Refactor...
WARN Cloud API error in template fetch: tpl_DhHFG_rbdOHk: { statusCode: 404, 18:58:53
message: '//api.claudehome.cn/api/v1/templates/tpl_DhHFG_rbdOHk": 404 Not Found',
originalError:
FetchError: [GET] "https://api.claudehome.cn/api/v1/templates/tpl_DhHFG_rbdOHk": 404 Not Found
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async CloudClient.$fetch2 [as fetch] (file:///Users/lu/ccjk-public/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:332:15)
at async CloudClient.getTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:187:24)
at async loadSkillTemplate (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:695:26)
at async installSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:646:31)
at async ccjkSkills (file:///Users/lu/ccjk-public/dist/chunks/ccjk-skills.mjs:376:21)
at async showSimplifiedMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:483:7)
at async showMainMenu (file:///Users/lu/ccjk-public/dist/chunks/menu.mjs:719:22)
at async file:///Users/lu/ccjk-public/dist/cli.mjs:17:9
at async CAC.<anonymous> (file:///Users/lu/ccjk-public/dist/cli.mjs:1430:7) }

[18:58:53] WARN Failed to fetch cloud template tpl_DhHFG_rbdOHk: //api.claudehome.cn/api/v1/templates/tpl_DhHFG_rbdOHk": 404 Not Found

    at CloudClientError.fromResponse (dist/chunks/ccjk-skills.mjs:37:12)
    at CloudClient.handleError (dist/chunks/ccjk-skills.mjs:137:32)
    at CloudClient.getTemplate (dist/chunks/ccjk-skills.mjs:194:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadSkillTemplate (dist/chunks/ccjk-skills.mjs:695:26)
    at async installSkills (dist/chunks/ccjk-skills.mjs:646:31)
    at async ccjkSkills (dist/chunks/ccjk-skills.mjs:376:21)
    at async showSimplifiedMenu (dist/chunks/menu.mjs:483:7)
    at async showMainMenu (dist/chunks/menu.mjs:719:22)
    at async dist/cli.mjs:17:9

✗
Template not found: tpl_DhHFG_rbdOHk

✗ 安装失败 15 个技能
skill_nsDoZrxNyLn4: Template not found: skill_nsDoZrxNyLn4
skill_3k8Ar146QsNh: Template not found: skill_3k8Ar146QsNh
skill_NVFsru7IdsKD: Template not found: skill_NVFsru7IdsKD
skill_A8lccokz1dFl: Template not found: skill_A8lccokz1dFl
skill_U0qUCzwYURSB: Template not found: skill_U0qUCzwYURSB
skill_0y47SW_1lO-W: Template not found: skill_0y47SW_1lO-W
skill_Ti_Njiu6PyKv: Template not found: skill_Ti_Njiu6PyKv
ts-best-practices: Generated SKILL.md is invalid: Invalid SKILL.md format
tpl_VVvfHw7NA_qw: Template not found: tpl_VVvfHw7NA_qw
tpl_uKPyj6viVGfg: Template not found: tpl_uKPyj6viVGfg
tpl_Ox4f9FJhul-A: Template not found: tpl_Ox4f9FJhul-A
tpl_l9SkEvoBkncY: Template not found: tpl_l9SkEvoBkncY
tpl_m2FEpjnJIXp8: Template not found: tpl_m2FEpjnJIXp8
tpl_GW52d3V_8CRm: Template not found: tpl_GW52d3V_8CRm
tpl_DhHFG_rbdOHk: Template not found: tpl_DhHFG_rbdOHk
✔ Completed in 14508ms
