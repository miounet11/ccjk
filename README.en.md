<div align="center">

# CCJK

### Production-ready AI dev environment for Claude Code, Codex, and modern coding workflows

**30-second onboarding · Persistent memory · Agent Teams · Remote control**

```bash
npx ccjk
```

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[Canonical English README](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md)

</div>

---

## What CCJK Covers

- **30-second onboarding** for Claude Code, Codex, MCP services, and browser automation
- **Persistent memory** so the assistant keeps project context across sessions
- **Agent Teams** for parallel execution on larger tasks
- **Remote control** for browser or mobile-driven sessions
- **Capability discovery + presets** for recommended services and safer permission defaults

## Recommended Path

```bash
# Guided setup
npx ccjk

# Automation / CI
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# Tighten and personalize
npx ccjk boost
npx ccjk zc --preset dev
```

Optional next steps:

```bash
npx ccjk remote setup
npx ccjk doctor
npx ccjk mcp list
```

## Docs

- Full English README: [README.md](./README.md)
- Documentation hub: [docs/README.md](./docs/README.md)
- Docs site entry: [docs/en/index.md](./docs/en/index.md)

## Community

- [Telegram](https://t.me/ccjk_community)
- [GitHub Issues](https://github.com/miounet11/ccjk/issues)

## License

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)
