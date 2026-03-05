# Terminal Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **terminal**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Terminal module provides terminal UI components and interaction utilities. It handles colored output, progress indicators, interactive prompts, and terminal formatting.

## 🎯 Core Responsibilities

- **Colored Output**: ANSI color and style formatting
- **Progress Indicators**: Spinners, progress bars, and status updates
- **Interactive Prompts**: User input collection with validation
- **Table Formatting**: Structured data display in terminal
- **Terminal Detection**: Detect terminal capabilities and dimensions

## 📁 Module Structure

```
src/terminal/
├── index.ts              # Terminal utilities
└── (UI components and formatters)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/i18n` - Internationalized UI text

### External Dependencies
- `chalk` or similar for colors
- `ora` for spinners
- `cli-table3` for tables
- `inquirer` for prompts

## 🚀 Key Interfaces

```typescript
interface Terminal {
  print(message: string, style?: Style): void
  spinner(text: string): Spinner
  progressBar(total: number): ProgressBar
  table(data: any[][], options?: TableOptions): void
  prompt(question: Question): Promise<any>
}

interface Spinner {
  start(): void
  stop(): void
  succeed(text?: string): void
  fail(text?: string): void
  text: string
}

interface ProgressBar {
  update(current: number): void
  increment(delta?: number): void
  complete(): void
}

type Style = 'info' | 'success' | 'warning' | 'error' | 'dim'
```

## 📊 Performance Metrics

- **Render Speed**: <5ms for typical output
- **Memory Usage**: Minimal overhead

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for formatting functions
- Mock terminal output for testing
- Visual regression tests for UI components
- Cross-platform terminal compatibility tests

## 📝 Usage Example

```typescript
import { terminal } from '@/terminal'

// Colored output
terminal.print('Success!', 'success')
terminal.print('Warning: Check configuration', 'warning')

// Spinner
const spinner = terminal.spinner('Loading...')
spinner.start()
await someAsyncOperation()
spinner.succeed('Done!')

// Progress bar
const progress = terminal.progressBar(100)
for (let i = 0; i <= 100; i++) {
  progress.update(i)
  await delay(10)
}
progress.complete()

// Table
terminal.table([
  ['Name', 'Status', 'Version'],
  ['Service A', 'Running', '1.0.0'],
  ['Service B', 'Stopped', '2.1.0']
])
```

## 🚧 Future Enhancements

- [ ] Add terminal theme support
- [ ] Implement rich text formatting
- [ ] Add terminal recording/playback
- [ ] Create interactive menu components

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Stable
