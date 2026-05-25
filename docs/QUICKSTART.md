# ccjk 5 分钟上手

第一次用 ccjk 的人看这里。读者画像：会用终端，听过 Claude Code / Codex，但还没自己配过。

跟着做一遍，你会拥有：一个能跑的 profile、一个干净的 settings.json、一份可以发给同事的配置包。

---

## 它能干什么（30 秒）

ccjk 是 Clavue / Claude Code / Codex 的本地配置 CLI。

它替你做这些手工活：写 `~/.claude/settings.json` 的 env、在多个 API key 之间切换、装 MCP、设权限档位、装状态栏、检测配置脏数据、备份还原。

**它不做**：不主动写代码、不装 hooks、不开后台进程。它只是个配置工具。

---

## 安装（30 秒）

```bash
npm install -g ccjk
```

验证：

```bash
ccjk --version
```

**如果失败**：node 版本要 ≥ 20（`node -v` 检查）；权限报错用 `sudo` 或换 [pnpm/volta 之类的版本管理器](https://github.com/volta-cli/volta)。

---

## 第一次配置（2 分钟）

跑首次向导：

```bash
ccjk onboard
```

它会带你过一遍 `init`（配 API）+ `doctor`（健康检查）。已经有 profile 的话会安静跳过，加 `--force` 强制重跑。

向导会问 4 件事：

**1. 选工具**

```
? 选择目标代码工具
> Clavue (主推)
  Claude Code
  Codex
```

第一次选 **Clavue** 就行，配置文件写到 `~/.claude/settings.json`，Claude Code 也能直接读到。

**2. 选 provider**

```
? 选择 API provider
> GLM (智谱)
  Kimi (月之暗面)
  MiniMax (海螺)
  DeepSeek
  Anthropic 官方
  OpenRouter
  GPT 网关 (OpenAI 兼容)
  自定义网关
```

国内用户挑 GLM / Kimi / DeepSeek 任意一个（都有免费额度）；海外用户挑 Anthropic 官方。

**3. 填 API key**

base_url 已经预填，直接回车；接着粘贴你的 API key。模型策略选默认的「单 model（推荐）」。

**4. 起 profile 名**

回车采纳建议名（一般就是 provider id，比如 `glm`）。这个名字之后 `ccjk use glm` 会用到。

写完后 ccjk 会自动跑一次 doctor 体检。**如果有 error/warning**，按提示跑 `ccjk doctor --fix`。

**全程嫌交互慢的话**，一行命令也能跑：

```bash
ccjk init -t clavue -p glm --api-key sk-xxx --profile work -y
```

**如果失败**：常见原因是 base_url 拼错或 key 失效。跑 `ccjk probe` 直接打一次真实 API，看具体是 401（key 错）还是 unreachable（URL/网络）。

---

## 切换 profile（30 秒）

配过的 provider 都会变成一个 profile。多个 profile 之间一键切：

```bash
ccjk use         # 交互选
ccjk use work    # 直接切到名为 work 的 profile
ccjk profile ls  # 看当前用的是哪个
```

切换会改写 `~/.claude/settings.json` 的 env。**切完要重启 Claude Code / Clavue 才生效**（启动时才读 settings）。

**如果失败**：profile 不存在时 ccjk 会列出现有的；想新增就再跑一次 `ccjk init`。

---

## 检查健康（30 秒）

两个命令配合用：

```bash
ccjk doctor    # 静态检查：扫 settings.json 找脏数据
ccjk probe     # 动态检查：真的对 base_url 打一次 API
```

**doctor 输出示例**：

```
[Clavue] /Users/you/.claude/settings.json
  ✗ [model-overrides-env] 顶层 settings.model 会覆盖 env.ANTHROPIC_MODEL [可自动修]
  ⚠ [duplicate-auth] 同时存在 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN [可自动修]
```

带 `[可自动修]` 的可以一键处理：

```bash
ccjk doctor --fix
```

修改前会自动备份到 `~/.claude/settings.json.bak-<时间戳>`，错了用 `ccjk rollback` 找回。

**probe 输出示例**：

```
✓ work · https://open.bigmodel.cn/api/anthropic [200] OK (312ms)
```

`✓` = 通；`!` = 鉴权失败（端点活着，key 不对）；`×` = 不可达或非预期响应。退出码也跟着区分（ok=0 / auth-failed=1 / unreachable=2 / unexpected=3），方便写进 CI。

**如果失败**：鉴权失败就重新 `ccjk init` 一次或 `ccjk profile show work` 核对 key；不可达就检查网络 / base_url。

---

## 团队共享配置（1 分钟）

把你的 profile 打包给同事 / 同步到另一台机器：

```bash
# 导出（交互勾选要导哪些）
ccjk profile export

# 或者直接导出指定的几个，跳过交互
ccjk profile export -n work free -o team.json -y

# 不带 key 的"模板"（适合提交到团队仓库 / 群里发）
ccjk profile export --redact -o team-template.json -y
```

在新机器上：

```bash
ccjk profile import team.json
```

同名 profile 会问跳过 / 覆盖 / 重命名。

**包是普通 JSON**，可以手动编辑。**带 key 的包等同于凭证文件**，别贴到 Slack 公共频道——要么 `--redact` 导模板再单独传 key，要么走加密渠道。

---

## 之后做什么

- **看 [README.md](../README.md) 的「ccjk 能干什么」速查表** —— 找具体场景对应的命令
- **跑 `ccjk`** —— 直接进交互菜单，覆盖了几乎所有能力，不想记命令时用它
- **跑 `ccjk status`** —— 一眼看全当前 profile / 权限档位 / 工具版本 / MCP 列表
- **配状态栏**：`ccjk statusline-install` —— 底部显示模型、context 用量、今日调用数
- **设权限档位**：`ccjk perms standard` —— 减少每次点确认的烦躁
- **出问题第一招**：`ccjk doctor --fix`；第二招：`ccjk rollback`
