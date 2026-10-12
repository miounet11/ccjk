# Repository Guidelines

## Source Of Truth

- Use `docs/CLAUDE-NOTES.md` for durable project notes.
- Use `ARCHITECTURE.md` for architecture invariants.
- Use `PRODUCT.md` for product and main-path context.

## Behavior

- Let the active model make implementation decisions from the current request, repository context, and verification results.

## Validation

- Run the smallest relevant check for the change.
- For broad changes, run `pnpm typecheck && pnpm lint && pnpm test`.

## Notes

- Record major project decisions in `docs/CLAUDE-NOTES.md` when they change project behavior or operating assumptions.
