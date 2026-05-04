# Clavue Local Install Root Cause Report

Date: 2026-04-28  
Reporter environment: `/Users/lu/ccjk-public` on macOS Apple Silicon

## Executive Summary

The local `clavue` npm package is installed correctly and its npm binary entrypoint is valid. The current installation failure is caused by a separate native-installer path inside Clavue.

There are two distinct issues that can look like one install problem:

1. `npx -g install clavue` is invalid npm syntax. npm interprets it as `npm exec --global -- install clavue`, tries to execute the unrelated npm package `install`, and fails with `could not determine executable to run`.
2. After using the correct npm command, `clavue install --force` still fails because the native installer hardcodes the binary name `clavue`, but the upstream Claude Code release manifest for the selected version declares and publishes the binary as `claude`.

The actionable Clavue-side bug is issue 2.

## Environment

```text
OS: macOS 26.4.1, build 25E253
Platform: darwin-arm64
Node.js: v24.14.0
npm: 11.9.0
Clavue npm package: 8.8.94
Global executable: /opt/homebrew/bin/clavue
Global package path: /opt/homebrew/lib/node_modules/clavue
```

## Confirmed Working State

The npm package installs and exposes a valid CLI binary:

```bash
npm install -g clavue
which clavue
clavue --version
npm ls -g clavue --depth=0
npm info clavue version bin dist.tarball --json
```

Observed:

```text
/opt/homebrew/bin/clavue
8.8.94 (Clavue)
/opt/homebrew/lib
└── clavue@8.8.94
```

Package metadata:

```json
{
  "version": "8.8.94",
  "bin": {
    "clavue": "dist/cli.js"
  },
  "dist.tarball": "https://registry.npmjs.org/clavue/-/clavue-8.8.94.tgz"
}
```

The global symlink is also correct:

```text
/opt/homebrew/bin/clavue -> ../lib/node_modules/clavue/dist/cli.js
```

## Issue 1: Invalid User Command

Command:

```bash
npx -g install clavue
```

Relevant npm debug log:

```text
verbose title npm exec install clavue
verbose argv "exec" "--global" "--" "install" "clavue"
http fetch GET 200 https://registry.npmjs.org/install
verbose pkgid install@0.13.0
error could not determine executable to run
```

Diagnosis:

`npx` is for executing package binaries, not installing global packages. The command above asks npm to execute a package named `install`, not to install `clavue`.

Correct command:

```bash
npm install -g clavue
```

This issue is a documentation/user-command issue, not a broken Clavue npm package.

## Issue 2: Native Installer Requests The Wrong Artifact Name

Command:

```bash
clavue install --force
```

Observed output:

```text
Checking installation status...
Installing Clavue native build latest...
✘ Installation failed

Request failed with status code 404

Try running with --force to override checks
```

The failure reproduces even with `--force`; it is not a local permission or cache problem.

## Release Feed Evidence

The native installer uses this release bucket:

```text
https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases
```

Current release pointers:

```bash
curl -sS https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/latest
curl -sS https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/stable
```

Observed:

```text
latest = 2.1.121
stable = 2.1.112
```

For `latest = 2.1.121`, the manifest exists:

```bash
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/manifest.json
```

Observed:

```text
HTTP/2 200
content-type: application/json
```

The manifest declares `darwin-arm64` like this:

```json
{
  "version": "2.1.121",
  "platforms": {
    "darwin-arm64": {
      "binary": "claude",
      "checksum": "3810e55d47ed4d413de6dc037e34d58948f779a4c6bdeeacf1748d850c5daad6",
      "size": 215417984
    }
  }
}
```

The published binary exists at the manifest-declared path:

```bash
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/claude
```

Observed:

```text
HTTP/2 200
content-type: application/octet-stream
content-length: 215417984
```

But the Clavue installer requests this path:

```bash
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/clavue
```

Observed:

```text
HTTP/2 404
```

## Installed Code Evidence

In the installed `clavue@8.8.94` bundle, the native installer computes the binary path with a hardcoded executable name:

```js
function T_t(e) {
  return e.startsWith("win32") ? `${kT}.exe` : kT
}
```

The constants in the same bundle include:

```js
Lci = "clavue"
Fci = "clavue"
kT = Fci
```

The native download path is then built as:

```js
let i = Y2()
let c = manifest.platforms[i]
let u = c.checksum
let A = T_t(i)
let d = `${releaseBase}/${version}/${i}/${A}`
```

This ignores `manifest.platforms[platform].binary`. On `darwin-arm64`, the manifest says the binary is `claude`, but the installer downloads `clavue`.

That mismatch directly produces the 404.

## Root Cause

The true Clavue-side root cause is:

```text
clavue@8.8.94 native installer hardcodes the native artifact filename as "clavue",
but the Claude Code native release manifest publishes the artifact as "claude".
```

Therefore:

```text
expected by installer:
  claude-code-releases/2.1.121/darwin-arm64/clavue

actually published:
  claude-code-releases/2.1.121/darwin-arm64/claude
```

This is not caused by:

- npm global install failure
- missing npm `bin`
- broken `/opt/homebrew/bin/clavue` symlink
- local shell PATH
- missing Node.js
- filesystem permissions

## Secondary Documentation Problem

The npm package includes `install.sh`, which performs:

```bash
npm install -g "${PACKAGE}@${version}"
clavue install --force
```

Because `clavue install --force` is currently broken, any install flow based on `install.sh` reports failure after the npm install has already succeeded.

This creates a misleading user experience: users believe Clavue did not install, even though the npm CLI is already present and `clavue --version` works.

## Recommended Fixes

Preferred fix:

Use the `binary` field from the release manifest:

```js
const platformInfo = manifest.platforms[platform]
const artifactName = platformInfo.binary || defaultBinaryNameForPlatform(platform)
const url = `${releaseBase}/${version}/${platform}/${artifactName}`
```

Then install or wrap the downloaded `claude` artifact as the local `clavue` command if that is the intended product behavior.

Alternative fixes:

- Publish alias objects named `clavue` and `clavue.exe` for each platform/version in the same GCS release bucket.
- Disable or bypass `clavue install --force` in public install flows until Clavue owns a native artifact stream.
- If native installation is optional, make `clavue install --force` detect this state and exit with a clear message instead of failing with a raw 404.

## Suggested User-Facing Install Guidance

Until the native installer is fixed:

```bash
npm install -g clavue
clavue --version
clavue
```

Avoid:

```bash
npx -g install clavue
clavue install --force
```

## Additional CLI Usability Notes

These are not the root cause but were observed during diagnosis:

- `clavue --debug install --force` currently reports `unknown option '--force'`; the top-level `--debug [filter]` option appears to consume `install` as its optional filter, causing command option parsing confusion.
- `clavue doctor` uses an Ink raw-mode UI and fails in a non-TTY automation session with `Raw mode is not supported on the current process.stdin`. This makes `doctor` hard to use in CI/headless diagnostics unless a non-interactive mode is provided.

## Minimal Reproduction For Maintainers

```bash
npm install -g clavue
clavue --version
clavue install --force
curl -sS https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/latest
curl -sS https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/manifest.json
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/clavue
curl -I https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/2.1.121/darwin-arm64/claude
```

Expected current result:

```text
clavue --version => 8.8.94 (Clavue)
clavue install --force => HTTP 404 failure
.../darwin-arm64/clavue => HTTP 404
.../darwin-arm64/claude => HTTP 200
```
