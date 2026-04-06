# Command Discovery Banner Implementation

## Overview

Enhanced the CCJK CLI startup experience with a bilingual command discovery banner that displays shipped `ccjk` slash-style commands on first run or with `--help`.

The banner is intentionally limited to commands surfaced by the shipped `ccjk` CLI startup experience. It should not advertise native session commands from another runtime unless that runtime is actually what the user is in.

## Implementation Details

### 1. I18n Strings Added

**Files Modified:**
- `/Users/lu/ccjk-public/src/i18n/locales/zh-CN/cli.json`
- `/Users/lu/ccjk-public/src/i18n/locales/en/cli.json`

### 2. Banner Function Implementation

**File:** `/Users/lu/ccjk-public/src/utils/banner.ts`

**Function:** `displayCommandDiscovery()`

**Features:**
- Detects locale from `i18n.language`
- Displays Chinese descriptions with English translations in gray for zh-CN locale
- Displays English-only descriptions for en locale
- Shows shipped CCJK startup commands:
  - `/status`, `/health`, `/search`, `/compress`, `/tasks`, `/backup`, `/optimize`
- Includes footer with help command reference

### 3. CLI Integration

**File:** `/Users/lu/ccjk-public/src/cli-lazy.ts`

**Changes:**

1. Added `noBanner` option to `CliOptions`
2. Added `--no-banner` flag to commands
3. Added `showCommandDiscoveryBanner()`
4. Integrated banner display into `runLazyCli()`

## Usage

### Display Banner

```bash
# First run (automatic)
ccjk

# With --help flag
ccjk --help
```

### Skip Banner

```bash
ccjk --no-banner
```

## Notes

- The banner should stay aligned with the actual shipped runtime surface.
- Do not list native session commands like `/clear` or `/reset` here unless the active runtime really provides them in this startup context.
- Keep this document aligned with `src/utils/banner.ts` and the current CLI entry path.
