## Context
The user wants a permanent release path so the latest CCJK version reaches both GitHub and npm, and therefore `npx ccjk@latest` resolves to the newest package without requiring manual `npm login` on their local machine each time. The repo already contains npm/GitHub release pieces, but the current automation is misaligned with the actual repository state: `.github/workflows/release.yml` is Changesets-based and only triggers on `.changeset/**`, while this repo currently has no `.changeset/` directory. That means automatic npm publishing is effectively not active.

## Recommended approach
Switch the existing release workflow from Changesets-triggered publishing to a simpler `version bump on main` workflow that matches the current repo habits.

### 1. Rework the existing release workflow
Modify `.github/workflows/release.yml` so it:
- triggers on `push` to `main`
- checks whether `package.json` version changed in the pushed commit range
- exits early without publishing if the version did not change
- publishes to npm only when the version changed
- optionally creates a GitHub release/tag for that exact version after successful publish

Why this approach:
- matches the user’s selected trigger: version bump on main
- reuses the existing repo release file instead of adding a second publish workflow
- avoids depending on Changesets since the repo is not currently using it

### 2. Reuse the repo’s existing prepublish safeguards
Keep/reuse the current publish validation path already defined in `package.json` and scripts:
- `package.json:89-91` — `release:verify`, `release:verify:full`, `prepublishOnly`
- `package.json:115` — `prepublish:fix`
- `scripts/validate-prepublish.mjs:14-59` — validates version and blocks `catalog:` references
- `scripts/fix-package-catalog.mjs:58-109` — rewrites `catalog:` refs before publish

Recommended release job sequence:
1. checkout
2. setup pnpm/node with npm registry auth
3. install deps
4. run `node scripts/fix-package-catalog.mjs`
5. run `pnpm typecheck`
6. run `pnpm test:run`
7. run `pnpm build`
8. run `npm publish --access public`

Note: `prepublishOnly` already runs validation/build-related checks at publish time, so the explicit job steps mainly provide clearer CI feedback before the publish step.

### 3. Remove broken Changesets-specific behavior
In `.github/workflows/release.yml`, remove the `changesets/action@v1` flow and its assumptions, including:
- trigger path limited to `.changeset/**`
- `pnpm changeset version`
- `pnpm changeset publish`
- use of `steps.changesets.outputs.*`

This is necessary because the repo currently has no `.changeset/` directory.

### 4. Create a simple version-detection gate
In `.github/workflows/release.yml`, add a small shell step that compares `package.json` version between the before/after revisions for the push event. Use that step output to guard the publish and release steps.

This keeps main safe:
- normal pushes do not publish
- only intentional version bumps publish

### 5. Keep secrets minimal and explicit
Document/use these GitHub Actions secrets:
- `NPM_TOKEN` — required for npm publish
- `GITHUB_TOKEN` — built-in, used for release/tag creation if enabled
- `SLACK_WEBHOOK` — optional; keep notification step conditional or remove if not needed

Because the user pasted an npm token in chat, recommend rotating it after setup and replacing the GitHub secret with the rotated token.

### 6. Optional GitHub release creation
After successful npm publish, create or update a GitHub Release for `v${package.json version}`. Reuse the existing release intent, but generate the tag/title from the actual package version instead of the broken `publishedPackages` output currently used in `.github/workflows/release.yml:65-103`.

If we keep GitHub release creation:
- create lightweight tag `v<version>` if missing
- create GitHub Release named `v<version>`
- use generated notes or a small default body

## Critical files to modify
- `.github/workflows/release.yml`

## Existing files to reference
- `package.json:89-91`
- `package.json:115`
- `scripts/validate-prepublish.mjs:14-59`
- `scripts/fix-package-catalog.mjs:58-109`
- `.github/workflows/ci.yml:13-236`
- `scripts/create-github-release.sh:56-62` (only as precedent for GitHub release creation intent, not as the automation mechanism)

## Verification
After implementation, verify with:
1. YAML sanity check by reading back `.github/workflows/release.yml`
2. Local validation:
   - `pnpm typecheck`
   - `pnpm build`
3. Workflow logic review:
   - confirm publish steps are guarded by version-change detection
   - confirm npm auth uses `NODE_AUTH_TOKEN`/`NPM_TOKEN`
4. End-to-end release path:
   - bump `package.json` version on a branch/main-bound change
   - push to GitHub
   - confirm Actions publishes to npm
   - verify with `npm view ccjk version`
   - verify with `npx --yes ccjk@latest --version`
5. If GitHub release creation is kept, verify the repo has tag/release `v<version>`.

## Notes for execution
- Do not add Changesets unless the user later asks for that workflow explicitly.
- Prefer updating the existing `release.yml` rather than introducing a parallel publish workflow.
- If Slack notifications are not configured, keep them optional so npm publish does not fail on missing `SLACK_WEBHOOK`.
- After setup, the user still needs normal `git push origin main`; npm publication should then be automatic when the pushed commit includes a package version bump.