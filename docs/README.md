# CCJK Documentation Hub

This index is the stable entry point for the docs we want users to reach from GitHub and npm.

## Start Here

- English docs home: [docs/en/index.md](./en/index.md)
- Chinese docs home: [docs/zh-CN/index.md](./zh-CN/index.md)
- English installation guide: [docs/en/getting-started/installation.md](./en/getting-started/installation.md)
- Chinese installation guide: [docs/zh-CN/getting-started/installation.md](./zh-CN/getting-started/installation.md)

## Recommended Onboarding Path

```bash
npx ccjk
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent
npx ccjk boost
npx ccjk zc --preset dev
```

Use that path as the default mental model:

- `npx ccjk` for guided onboarding
- `npx ccjk init --silent` for CI or scripted setup
- `npx ccjk boost` to optimize the environment after install
- `npx ccjk zc --preset <id>` to apply permission presets

## Core Topics

- Remote control: [docs/remote-control-summary.md](./remote-control-summary.md)
- Remote JSON Contract: [docs/remote-json-contract.md](./remote-json-contract.md)
- Remote JSON Schema: [schema/remote-json-contract.schema.json](../schema/remote-json-contract.schema.json)
- Agent Teams: [docs/agent-teams.md](./agent-teams.md)
- Persistent memory: [docs/persistence-manager.md](./persistence-manager.md)
- Zero-config permissions: [docs/zero-config-permissions.md](./zero-config-permissions.md)
- Skills and workflows: [docs/skills.md](./skills.md)

## CLI References

- English CLI overview: [docs/en/cli/index.md](./en/cli/index.md)
- Chinese CLI overview: [docs/zh-CN/cli/index.md](./zh-CN/cli/index.md)

## Support

- GitHub Issues: <https://github.com/miounet11/ccjk/issues>
- npm package: <https://www.npmjs.com/package/ccjk>
- GitHub repository: <https://github.com/miounet11/ccjk>
