# Remote JSON Contract

This document defines machine-readable output for remote onboarding commands.

## Version

- Current version: `v1`
- JSON Schema: `schema/remote-json-contract.schema.json`
- Schema `$id`: `https://ccjk.dev/schema/remote-json-contract.v1.json`

## `ccjk remote setup --json`

### Success

```json
{
  "success": true,
  "daemonRunning": true,
  "bound": true,
  "serverUrl": "https://remote.example.com",
  "machineId": "machine-1700000000000-abc1234"
}
```

### Failure

```json
{
  "success": false,
  "error": "remote:setup.failed_enable"
}
```

### Non-interactive usage

```bash
ccjk remote setup --json --non-interactive \
  --server-url <url> \
  --auth-token <token> \
  --binding-code <code>
```

If any required value is missing in non-interactive mode, command exits with non-zero code.

## `ccjk remote doctor --json`

### Output

```json
{
  "success": false,
  "checks": [
    {
      "label": "Remote enabled",
      "ok": false,
      "detail": "disabled",
      "fixHint": "Run 'ccjk remote enable'"
    }
  ],
  "bindingStatus": "not bound"
}
```

- `success = true` means all checks passed.
- Command exits non-zero when `success = false`.

## Validation

Use the official schema file to validate outputs:

```bash
# Example (ajv-cli)
ajv validate -s schema/remote-json-contract.schema.json -d ./remote-output.json
```

## Source of truth (TypeScript)

- `SetupRemoteJsonResult`
- `DoctorRemoteJsonResult`

Defined in:
- `src/commands/remote.ts`
