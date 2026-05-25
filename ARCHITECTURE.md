# ARCHITECTURE.md — ccjk 代码组织

本文件描述 ccjk 的代码分层与不变量。和 `PRODUCT.md` 一样是 program.md 等价物：人类拥有，代码 PR 可以指出需要更新的地方但不 silent rewrite。

---

## 1. 分层

```
src/
  cli.ts                 -- 唯一 program 入口；只做参数路由
  commands/<name>.ts     -- 一文件一命令；与终端 IO 紧耦合
  core/<topic>.ts        -- 纯函数 / 数据层；测试都打这层
  i18n/locales/{en,zh-CN}/*.json  -- 用户可见字串

tests/
  commands/<name>.test.ts  -- 命令级集成测（mock IO）

src/**/*.test.ts          -- core 纯函数单测（就近放置）
```

依赖方向：`cli → commands → core → (i18n / fs / inquirer / ansis)`。**禁止反向**：core 不引 commands；commands 不引 cli。

---

## 2. 不变量

### #1 备份先行
任何写盘操作必须先调 `core/backup` 落 `.bak-<ts>` 备份。`rollback` 命令是这个不变量的兑现入口。

### #2 lint 三层模型
`core/lint.ts` 的体检规则走：
- **白名单** `KNOWN_ENV` —— Claude/Clavue 官方 env（~25 项）
- **黑名单** `KNOWN_BAD_ENV` —— 已知第三方私有 / 已弃用 env（带原因）
- **启发式** —— `apiKeyHelper-stale`、`bash-permissions-too-broad` 等

新规则进的判断：（a）至少有一个真实用户案例；（b）能给出 `fixHint`，能不能 auto-fix 视情况。

### #3 取消不是错误
inquirer prompt 抛 `ExitPromptError` 是用户主动取消：
- 顶层 `cli.ts` 静默退出（exit 0）
- 菜单循环 `continue`（v15.27.1 落地）
- 任何把它当 throw 处理的 catch 都是 bug

### #4 跨工具同步
- `clavue` ↔ `claude-code`：共享 `~/.claude/settings.json` 结构（key / env / permissions）
- `codex`：独立 `~/.codex/config.toml`，profile 信息写 `[profiles.<name>]` 段
- `ccjk use` 默认 fan-out 到所有已装工具；`-t <tool>` 限定单工具

### #5 单向 migrate
`ccjk migrate` 从 `settings.json → profile` 只读不改源。**反向**（profile → settings）是 `ccjk use` 的语义。两个动作概念不能混用。

### #6 provider catalog 是元数据
`core/providers.ts` 的 catalog 只记 `baseUrl / hint / docsUrl / region`，**不记 key**。key 永远在 `~/.ccjk/profiles/<name>.json` 里。catalog 可以 commit；profile 不行（用户敏感数据）。

---

## 3. 测试金字塔

| 层 | 数量 | 例子 |
|---|---|---|
| core 纯函数 | 大头 (~250) | `core/lint.test.ts`、`core/profiles.test.ts`、`core/perms.test.ts` |
| commands 集成 | 中等 (~70) | `tests/commands/probe.test.ts`、`tests/commands/menu.test.ts` |
| 端到端 | 极少 | `.clavue/retro/scripts/*.exp`（不入 CI，retro 时手跑） |

总数随版本走，截至 v15.27.2 ≈ 323。新增功能必须带 commands-level 测试至少 1 例，core-level 测试覆盖核心分支。

---

## 4. 写新命令的 checklist

1. `src/commands/<name>.ts` 实现命令；只做 IO + 调 core
2. `src/cli.ts` 注册 `program.command('<name>')` + 选项 + action
3. `tests/commands/<name>.test.ts` 至少 3 个用例（happy / 边界 / 失败）
4. README 命令一览表 + QUICKSTART 相关段更新
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 全绿
6. CHANGELOG 加一条
7. 不要在命令里直接 import 另一个命令（commands 之间通过 core 解耦）

---

## 5. 发布流程

1. 单分支 `main`，不 force push
2. bump `package.json` 版本
3. 写 `CHANGELOG.md` 该版本段
4. `pnpm typecheck && pnpm test && pnpm lint && pnpm build`（全部必须绿）
5. `git commit` + `git tag vX.Y.Z` + `git push origin main && git push origin vX.Y.Z`
6. `npm publish`（latest tag）

破坏性变更（doctor exit code、cli 命令重命名、profile schema 变化）必须 minor bump，CHANGELOG 标 **Breaking change**。

---

## 6. 何时改本文件

- 新增 / 移除一条「不变量」（第 2 节）
- 引入新顶层目录（src/brain/、src/utils/ 等出现时）
- 测试金字塔比例失衡到需要重新阐述
- 发布流程变化（自动化 / multi-branch / pre-release tag）

不需要改的情形：
- 加新命令（看 commands/* + cli.ts）
- 重命名变量、抽小函数、补测（看 git log）
- 调依赖小版本（看 package.json）
