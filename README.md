<div align="center">

# ccjk

### The local config doctor for your coding agents.

**Clavue · Claude Code · Codex · Grok · OpenCode · ClaudeWork**<br>
Scan your local config, confirm, then write API keys, MCP servers, models and workflows.<br>
When a tool can't speak a provider's protocol, ccjk opens a proxy on `127.0.0.1` and translates.

[![npm](https://img.shields.io/npm/v/ccjk.svg?color=111111)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/npm/l/ccjk.svg?color=111111)](https://github.com/miounet11/ccjk/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/ccjk.svg?color=111111)](https://nodejs.org)
[![stars](https://img.shields.io/github/stars/miounet11/ccjk?color=111111)](https://github.com/miounet11/ccjk/stargazers)<br>
![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)
![Windows](https://img.shields.io/badge/Windows-0078D4?logo=windows&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

**English** · [简体中文](https://github.com/miounet11/ccjk/blob/main/README.zh-CN.md)

<br>

<img src="https://raw.githubusercontent.com/miounet11/ccjk/main/docs/assets/architecture.svg" width="900" alt="ccjk sits between your local coding tools and model providers, listening on 127.0.0.1 only">

</div>

<br>

## Is ccjk for you?

Every agent keeps its model in its own file, in its own format — JSON for Claude Code, TOML for Codex, something else again for the next one. Swapping a provider means editing each of them by hand, and a mistake there is a broken session.

ccjk is a terminal tool that does that editing for you, with a backup before every write. It is for you if:

- **You already run** Clavue, Claude Code, Codex or Grok and want to stop hand-editing JSON and TOML.
- **You route several providers** into those tools and only accept local forwarding.
- **You want model switching and config management to be one command**, not another always-on app.

It is *not* an IDE, an orchestrator, or an agent runtime. It does not write code for you. The proxy only exists while you run it.

## Quick start

Node.js 20 or newer.

```sh
npm install -g ccjk
ccjk
ccjk ui
ccjk proxy use --tool claude-code --model deepseek/deepseek-chat
```

`ccjk` opens the doctor / operator menu. `ccjk ui` starts the proxy if it isn't running and opens the local interface at `http://127.0.0.1:15721/ui`. The last line writes by **tool + provider/model**: if the tool speaks that protocol, ccjk connects it directly; if not, it routes through the local proxy.

Upgrade with `npm install -g ccjk@latest`.

## What it does

**Doctor — read-only.** Scans for dirty MCP servers, broken Skills, redundant prompts and config risk. Nothing is written.

```sh
ccjk clean          # interactive cleanup
ccjk clean -s       # non-interactive, high-confidence items only
```

**Operator — backs up, then writes.** API keys, MCP servers, models, workflows, memory.

```sh
ccjk init -T codex  # -T clavue | claude-code | codex | grok
```

**Optional local proxy.** Off by default. It listens on `127.0.0.1` only, on port `15721`. The request identity is always `ccjk-proxy`.

- **Three routing modes per tool**: sequential, rotate, or least-used. A conversation sticks to one upstream while it's healthy; consecutive failures trip a circuit breaker and move to the next.
- **Protocol translation.** Claude speaks `anthropic-messages`; Codex, Grok and OpenCode speak `openai-chat`, `openai-responses` and `xai`; Gemini is supported too. A tool that can't speak the protocol goes through the local proxy, which translates both ways.
- **Thinking is preserved.** OpenAI's `reasoning_content` becomes a Claude-readable `thinking` block, and back.
- **Secrets stay out of `proxy.json`.** Keys live in `proxy-secrets.json` under AES-256-GCM. Client configs get the local address and a local token.
- **Import your existing endpoints** from your own Claude, Codex and Grok config. `127.0.0.1`, `localhost` and `::1` are skipped.
- **Profiles with your own names**: `ccjk proxy save --name work` / `ccjk proxy load --name work`.
- **Snapshot before first write.** `ccjk proxy revert` restores exactly what was there.
- **Usage and cost** per million tokens, with cache hits. An estimate, not a bill.

### Local console

`ccjk ui` opens it. No second app to keep running:

- **Model cards** — one page per tool, each card marked in use / missing key / one click to use. The top card shows the current route's model, protocol and connection mode.
- **Logs** — every request that passed through the local proxy: time, model, status and latency, filterable by provider or failures only.
- **Routing** — for one request, which upstreams were tried and why it moved to the next, laid out as a timeline.
- **Usage** — today / 7 days / 30 days / all, split by provider, by model and by account, with a trend line. Still an estimate.
- **Quick jump** — `⌘K` / `Ctrl+K` searches pages and models; `↑↓` to move, Enter to use.
- **Deep links** — the address bar carries the route (`#/logs`, `#/routing`, `#/usage`, `#/providers`, `#/sessions`, `#/accounts`), so reload, bookmarks and back/forward land on the same page.
- **Chinese / English** — switch inside the console; the choice is stored locally.

## Supported tools

| Tool | Config root | What ccjk manages |
|---|---|---|
| **Clavue** | `~/.clavue/` | Doctor + operator: init / MCP / model / workflow / permissions / cleanup |
| **Claude Code** | `~/.claude/` | Same as above |
| **Codex** | `~/.codex/` (`CODEX_HOME`) | Same, plus the shared CLI / desktop / IDE config below |
| **Grok CLI** | `~/.grok/` + `~/.ccjk/` profile | Doctor (skills cleanup) + lightweight operator (profile launch) |
| **OpenCode** | `opencode` config | Proxy routing |
| **ClaudeWork** | `~/.claudework/` | Proxy routing |

ccjk's own config lives only in `~/.ccjk/` and **never** mixes into tool directories. The proxy config is here too: `proxy.json` holds routes, `proxy-secrets.json` holds keys.

### Codex: CLI + desktop app + IDE extension

By OpenAI's design, all three **share one** `config.toml`:

- Default path: `~/.codex/config.toml`
- Override the config root with `CODEX_HOME`
- `~/Library/Application Support/Codex` (macOS) is an Electron runtime cache, **not** a config directory

After ccjk writes config: the CLI and IDE extension usually pick it up immediately; the desktop app needs a **full quit and relaunch** if it's running.

### Codex init presets

| Preset | AGENTS | Workflow | MCP |
|---|---|---|---|
| **Clean** | no | no | no |
| **Optimized** | engineering baseline | default flow | context7 only |
| **Custom** | your choice | your choice | your choice |

## Providers

28 built-in presets, plus any OpenAI-compatible endpoint:

Anthropic · OpenAI · xAI · Gemini · OpenRouter · DeepSeek · Kimi / Moonshot · Zhipu GLM · MiniMax · Alibaba Bailian · Volcengine Ark · SiliconFlow · Groq · Together · Fireworks · Mistral · DeepInfra · Cerebras · SambaNova · NVIDIA NIM · Perplexity · StepFun · 01.AI · Baichuan · Tencent Hunyuan · GitHub Models · Ollama · LM Studio

## How it compares

All three solve "stop hand-editing each tool's config". The shapes differ. Facts below are from each project's own README.

| | ccjk | [cc-switch](https://github.com/farion1231/cc-switch) | [magpie](https://github.com/yetone/magpie) |
|---|---|---|---|
| Shape | Terminal CLI + local web console | Desktop app | Menu bar + local gateway |
| Main job | Scan, back up, write, restore | Manage providers, MCP, Skills, Prompts in one app | Route many agents' models through one gateway |
| Observability | Console: logs, routing timeline, usage by model/account | Usage inside the app | Requests and usage on the gateway |
| Proxy | Optional, `127.0.0.1` only | Mostly rewrites client config | The gateway *is* the product; local by default, can share on LAN |
| Keys | Your keys. Never reads the keychain | Filled in and switched inside the app | Can read the keychain, can discover subscriptions |
| Routing | Sequential, rotate, least-used; sticky per conversation | Switch current provider | Also smart, pace |
| Telemetry | None | Not advertised as a feature | Daily telemetry described on its page |

If you already manage these tools from the terminal, ccjk is more direct:

- Config and proxy are the same command. Switching models doesn't need another always-on app.
- The proxy never listens on the LAN, never reads the keychain, never impersonates official clients, and never reports usage.
- A snapshot is taken before writing into a tool, and it can be restored.
- Chinese-first interface. One line to pick a tool and a provider/model.

Where they go wider, ccjk doesn't: managing MCP, Skills and Prompts from a desktop, menu bar, subscriptions and keychain, 60+ agents, plugins, smart / pace, LAN and Docker. If you want those, use them.

## Doctor and operator

| Role | What it does | How |
|---|---|---|
| **Doctor** | Read-only scan for dirty MCP servers, broken Skills, redundant prompts, config risk | `ccjk clean`, menu **H** |
| **Operator** | Back up, then write API keys / MCP / models / workflows | `ccjk init`, menu **W** |

The interactive menu is the recommended entry point:

```sh
ccjk
```

It groups **operator / doctor / cross-tool / CCJK**. Press **W** for the quick wizard, **H** for the doctor.

## Languages

Simplified Chinese is the default. English and Japanese are also supported:

```sh
ccjk --lang zh-CN   # default
ccjk --lang en      # English
ccjk --lang ja      # 日本語
```

The first run asks for a display language, then for the tool (Clavue / Claude Code / Codex / Grok CLI). Inside the menu, **W** is the quick wizard; if the environment is unclear, run **H** first.

## Common tasks

| Task | Command / action |
|---|---|
| Configure a tool for the first time | `ccjk init -T codex` (or `clavue` / `claude-code` / `grok`) |
| Clean start / daily preset for Codex | menu **W** → full init (clean / optimized / custom) |
| Clean up a messy environment | `ccjk clean`, or menu **H** → smart cleanup |
| Reset Codex completely, then init | menu **W** → reset then init |
| Is the API reachable? | `ccjk probe` |
| Switch the Codex API provider | `ccjk config-switch` |
| Point one tool at a model | `ccjk proxy use --tool codex --model deepseek/deepseek-chat` |
| Save / restore a whole proxy setup | `ccjk proxy save --name work` / `ccjk proxy load --name work` |
| Undo proxy-written config | `ccjk proxy revert` |
| Grok / Reasonix status and launch | `ccjk grok` / `ccjk reasonix` |
| Check tool updates | `ccjk check-updates` |

## CLI

| Command | Purpose |
|---|---|
| `ccjk` | Interactive menu (default) |
| `ccjk init` | Full init: API, MCP, models, workflows, memory |
| `ccjk clean` | Cleanup: dirty MCP, broken Skills, redundant prompts |
| `ccjk clean --purge-all` | Purge everything (Codex config backed up first) |
| `ccjk clean -s` | Non-interactive, high-confidence items only |
| `ccjk probe` | HTTP liveness check for the current API |
| `ccjk bench` | Lightweight latency benchmark |
| `ccjk config-switch` | Switch Codex provider / Claude config |
| `ccjk update` | Update workflow and memory docs only |
| `ccjk check-updates` | Check and update Claude Code / Codex / CCR |
| `ccjk grok [profile]` | Grok CLI status and profile launch |
| `ccjk reasonix [profile]` | Reasonix companion: status and launch |
| `ccjk uninstall` | Remove CCJK-managed config |
| `ccjk ccr` | Claude Code Router config |
| `ccjk ccu` | Claude Code usage analysis |
| `ccjk proxy` | Local proxy: `serve` / `start` / `stop` / `status` / `ls` / `apply` / `revert` / `switch` / `use` / `save` / `load` |
| `ccjk ui` | Open the local console, starting the proxy if needed |

Tool aliases: `-T cv` (Clavue), `-T cc` (Claude Code), `-T cx` (Codex), `-T gk` (Grok).

## Design principles

- **A config tool is a config tool** — not a brain, not an orchestrator. The proxy exists only while `ccjk proxy` or `ccjk ui` runs.
- **No code written for you** — nothing injects hooks or commands at runtime.
- **Backup first** — every write is preceded by a backup; proxy writes keep a first-touch snapshot, restorable with `ccjk proxy revert`.
- **Scriptable** — `init -s`, `clean -s`, `clean --purge-all` and `proxy use` are non-interactive.

## Docs

- [QUICKSTART.md](https://github.com/miounet11/ccjk/blob/main/docs/QUICKSTART.md) — copy-paste walkthrough
- [PRODUCT.md](https://github.com/miounet11/ccjk/blob/main/PRODUCT.md) — product boundaries and behavior
- [ARCHITECTURE.md](https://github.com/miounet11/ccjk/blob/main/ARCHITECTURE.md) — architecture invariants
- [RELEASE-NOTES.md](https://github.com/miounet11/ccjk/blob/main/docs/RELEASE-NOTES.md) — release history
- [CHANGELOG.md](https://github.com/miounet11/ccjk/blob/main/CHANGELOG.md) — what changed
- [Landing page](https://github.com/miounet11/ccjk/blob/main/site/index.html) — a zero-dependency static intro page

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build

# smoke: enter the Codex menu
echo '' | node dist/cli.mjs -T codex
```

## License

[MIT](https://github.com/miounet11/ccjk/blob/main/LICENSE)
