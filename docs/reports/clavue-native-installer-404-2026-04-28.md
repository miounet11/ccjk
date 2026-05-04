# Clavue Native Installer Fails With 404 For `darwin-arm64/clavue`

## Summary

The npm package `clavue@8.8.94` installs and runs correctly, but the documented follow-up command `clavue install --force` fails on macOS Apple Silicon because the native installer tries to download a missing Google Cloud Storage object.

This means installation flows that run:

```bash
npm install -g clavue
clavue install --force
```

report a failure even though the npm-installed `clavue` CLI is already usable.

## Environment

- OS: macOS 26.4.1, build 25E253
- CPU/platform: Apple Silicon, `darwin-arm64`
- Node.js: `v24.14.0`
- npm: `11.9.0`
- Clavue npm package: `8.8.94`
- Global package path: `/opt/homebrew/lib/node_modules/clavue`
- CLI path: `/opt/homebrew/bin/clavue`

## Reproduction

```bash
npm install -g clavue
clavue --version
clavue install --force
```

## Expected Behavior

`clavue install --force` should either:

- install the correct native build successfully, or
- detect that the npm CLI is already valid and exit successfully, or
- clearly state that native installation is optional and unavailable for this release.

## Actual Behavior

`clavue --version` works:

```text
8.8.94 (Clavue)
```

But `clavue install --force` fails:

```text
Installation failed
Request failed with status code 404
```

With debug logging enabled, the failing download URL is:

```text
https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/clavue
```

That URL returns HTTP 404.

## Release Feed Evidence

The native release feed currently reports:

```bash
curl -sS https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/latest
```

Output:

```text
2.1.121
```

The Clavue artifact path is missing:

```bash
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/clavue
```

Result:

```text
HTTP/2 404
```

But the equivalent `claude` artifact exists:

```bash
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/claude
```

Result:

```text
HTTP/2 200
```

## Diagnosis

The npm package itself is not the problem. The npm package exposes a valid binary:

```json
{
  "bin": {
    "clavue": "dist/cli.js"
  }
}
```

The failure is in the separate native installer path. It appears to request a `clavue` binary from the Claude Code native release bucket, but the available artifact for the same version/platform is named `claude`, not `clavue`.

Possible fixes:

- Publish the missing object:

```text
claude-code-releases/2.1.121/darwin-arm64/clavue
```

- Or update the native installer to download the existing `claude` artifact and install or wrap it as `clavue` if that is intended.

- Or update docs/install scripts to avoid `clavue install --force` when npm installation is sufficient.

## Workaround

For now, install and use the npm CLI directly:

```bash
npm install -g clavue
clavue --version
clavue
```

Avoid:

```bash
clavue install --force
```

until the native artifact path is fixed.

## Related User Confusion

Users may also try:

```bash
npx -g install clavue
```

That is invalid npm syntax. It is parsed as `npm exec --global -- install clavue`, which tries to execute the npm package named `install` and fails with:

```text
npm error could not determine executable to run
```

The correct global npm install command is:

```bash
npm install -g clavue
```
