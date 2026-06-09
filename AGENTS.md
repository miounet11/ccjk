# Repository Guidelines

## Source Of Truth

- Use `docs/CLAUDE-NOTES.md` for durable project notes.
- Use `ARCHITECTURE.md` for architecture invariants.
- Use `PRODUCT.md` for product and main-path context.

## Behavior

- Follow the current project request and the repository files.
- Do not inherit global persona, language, or style rules from other tools.
- Keep responses and edits scoped to this repository.

## Validation

- Run the smallest relevant check for the change.
- For broad changes, run `pnpm typecheck && pnpm lint && pnpm test`.

## Notes

- Record major project decisions in `docs/CLAUDE-NOTES.md` when they change project behavior or operating assumptions.
