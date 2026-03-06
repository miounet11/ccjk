# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the main CLI and shared libraries, organized by feature areas such as `cli/`, `utils/`, `services/`, `generation/`, and `brain/`. Cross-package work lives in `packages/`: `ccjk-app` (Expo client), `ccjk-daemon`, `ccjk-wire`, `ccjk-server`, and related workspace modules. Tests live under `tests/` for integration, e2e, and v2 coverage, while some units also sit beside code in `src/**/__tests__`. Docs and the VitePress site live in `docs/`; reusable templates are in `templates/`; release and maintenance scripts are in `scripts/`.

## Build, Test, and Development Commands
Use `pnpm` with Node 20+.

- `pnpm dev`: run the CLI entrypoint with `tsx`.
- `pnpm build`: build the root package with `unbuild`.
- `pnpm typecheck`: run TypeScript without emitting files.
- `pnpm lint` / `pnpm lint:fix`: run ESLint, optionally auto-fixing issues.
- `pnpm test:run`: run the main Vitest suite once.
- `pnpm test:coverage`: collect coverage; the repo enforces 80% thresholds.
- `pnpm test:integration:run` and `pnpm test:e2e:run`: run higher-level suites.
- `pnpm --filter @ccjk/daemon test`: target a workspace package directly.

## Coding Style & Naming Conventions
The codebase is TypeScript-first, ESM by default, with 2-space indentation, semicolons, single quotes, trailing commas (`es5`), and `printWidth: 100`. ESLint uses `@antfu/eslint-config`; Prettier handles formatting. Prefer descriptive file names matching the exported responsibility, such as `provider-registry.ts` or `setup-wizard.test.ts`. Use `camelCase` for variables/functions, `PascalCase` for types/classes/components, and `SCREAMING_SNAKE_CASE` only for true constants and environment keys.

## Testing Guidelines
Vitest is the primary test runner; Jest remains configured for legacy `src/**/__tests__` patterns. Name tests `*.test.ts` or `*.spec.ts`. Keep fast unit tests near the module when practical, and place scenario-driven coverage in `tests/integration`, `tests/e2e`, or `tests/v2`. Before opening a PR, run the smallest relevant suite plus `pnpm typecheck`.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, with optional scopes and headers under 100 characters. Recent history favors concise subjects such as `fix: remove duplicate prompt hints in model config`. PRs should explain user-visible impact, list validation commands run, link issues when applicable, and include screenshots or terminal output for UI, docs, or CLI behavior changes.

## Security & Configuration Tips
Do not commit secrets; use `.env.example` as the reference for new variables. Treat `tests/analyzers/fixtures/` and similar sample projects as fixtures, not production code. For contract or release work, run `pnpm contract:check` and `pnpm release:verify` before publishing.
