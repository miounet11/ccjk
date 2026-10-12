# Context
The release commit for `ccjk@14.0.0` is already created and pushed to `origin/main` (`8f3a8feb`). Local release verification succeeded, but both the local `npm publish` attempt and the GitHub Actions release workflow failed with `ENEEDAUTH`, which means npm authentication is missing. The user chose to unblock publishing through CI by fixing the repository `NPM_TOKEN` secret rather than logging in locally. The intended outcome is: keep the existing release commit, repair the CI publish path, rerun the existing release workflow, and verify that npm and npx now resolve `14.0.0`.

# Recommended approach
1. Keep the existing release artifact state.
   - Do not create a new version bump or replacement commit unless rerun evidence shows the code itself is broken.
   - Reuse the already-pushed release commit `8f3a8feb` on `main`.

2. Fix npm authentication in GitHub Actions.
   - Update/add the repository `NPM_TOKEN` secret with the provided npm publish token for the `ccjk` package, without printing or persisting the token in repo files/logs.
   - Reuse the existing workflow in `.github/workflows/release.yml`, which already sets `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

3. Rerun the existing release workflow instead of inventing a custom publish path.
   - Trigger `.github/workflows/release.yml` again after the secret is fixed.
   - Use the existing workflow’s publish, tagging, and GitHub Release steps so the repo stays on one release path.

4. Verify public release state after the rerun.
   - Confirm the rerun completed successfully.
   - Confirm `npm view ccjk version` returns `14.0.0`.
   - Confirm the GitHub workflow created/pushed tag `v14.0.0` and the GitHub release entry.
   - Only if CI still fails for a non-auth reason, inspect that specific failure and patch the workflow or code in a follow-up change.

# Critical files
- `.github/workflows/release.yml`
- `package.json`
- `scripts/validate-prepublish.mjs`
- `scripts/release-verify.mjs`

# Existing functions/utilities to reuse
- Existing GitHub Actions publish flow in `.github/workflows/release.yml`
- Existing pushed release commit `8f3a8feb`
- Existing release verification already completed locally on `14.0.0`

# Verification
1. Confirm CI auth fix is in place.
   - Repository secret `NPM_TOKEN` is set correctly.
2. Rerun publish workflow.
   - Re-dispatch `.github/workflows/release.yml` for `main` / commit `8f3a8feb`.
3. Confirm release success.
   - `gh run view <rerun-id>` shows success
   - `npm view ccjk version` returns `14.0.0`
   - GitHub tag/release exists for `v14.0.0`
