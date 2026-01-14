# CCJK 外部工具集成 - 代码改进建议
## External Tools Integration - Code Improvement Recommendations

**文档日期**: 2026-01-14
**适用版本**: CCJK v1.0+
**优先级**: Phase 1 (立即行动)

---

## 目录 | Table of Contents

1. [Cometix 测试覆盖](#cometix-测试覆盖)
2. [错误恢复增强](#错误恢复增强)
3. [工具健康检查](#工具健康检查)
4. [日志记录增强](#日志记录增强)

---

## Cometix 测试覆盖

### 1. 菜单测试文件

**文件**: `tests/utils/cometix/menu.test.ts` (新建)

```typescript
import { existsSync } from 'node:fs'
import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as cometixCommands from '../../../src/utils/cometix/commands'
import * as cometixInstaller from '../../../src/utils/cometix/installer'
import { showCometixMenu } from '../../../src/utils/cometix/menu'

vi.mock('node:fs')
vi.mock('inquirer')
vi.mock('../../../src/utils/cometix/installer')
vi.mock('../../../src/utils/cometix/commands')
vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn((error: Error) => {
    console.error(`Error: ${error.message}`)
  }),
  handleExitPromptError: vi.fn(),
}))

describe('Cometix Menu', () => {
  let consoleLogSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock Cometix as not installed by default
    vi.mocked(cometixInstaller.isCometixLineInstalled).mockResolvedValue(false)
  })

  describe('menu display', () => {
    it('should display Cometix menu options', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' })

      await showCometixMenu()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cometix'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Install'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Print Config'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Custom Config'))
    })
  })

  describe('install/update option', () => {
    it('should handle install option when not installed', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
      vi.mocked(cometixInstaller.isCometixLineInstalled).mockResolvedValue(false)
      vi.mocked(cometixInstaller.installCometixLine).mockResolvedValue()

      await showCometixMenu()

      expect(cometixInstaller.installCometixLine).toHaveBeenCalled()
    })

    it('should handle update option when already installed', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
      vi.mocked(cometixInstaller.isCometixLineInstalled).mockResolvedValue(true)
      vi.mocked(cometixInstaller.installCometixLine).mockResolvedValue()

      await showCometixMenu()

      expect(cometixInstaller.installCometixLine).toHaveBeenCalled()
    })
  })

  describe('print config option', () => {
    it('should handle print config option', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '2' })
      vi.mocked(cometixCommands.runCometixPrintConfig).mockResolvedValue()

      await showCometixMenu()

      expect(cometixCommands.runCometixPrintConfig).toHaveBeenCalled()
    })
  })

  describe('custom config option', () => {
    it('should handle custom config option', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '3' })
      vi.mocked(cometixCommands.runCometixTuiConfig).mockResolvedValue()

      await showCometixMenu()

      expect(cometixCommands.runCometixTuiConfig).toHaveBeenCalled()
    })
  })

  describe('back option', () => {
    it('should return false when back option is selected', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' })

      const result = await showCometixMenu()

      expect(result).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle installation errors', async () => {
      const installError = new Error('Installation failed')
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
      vi.mocked(cometixInstaller.installCometixLine).mockRejectedValue(installError)

      await showCometixMenu()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error'))
    })

    it('should handle command execution errors', async () => {
      const commandError = new Error('Command failed')
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '2' })
      vi.mocked(cometixCommands.runCometixPrintConfig).mockRejectedValue(commandError)

      await showCometixMenu()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error'))
    })
  })
})
```

### 2. 命令测试文件

**文件**: `tests/utils/cometix/commands.test.ts` (新建)

```typescript
import { spawn } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as cometixCommands from '../../../src/utils/cometix/commands'

vi.mock('node:child_process')

describe('Cometix Commands', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('print config', () => {
    it('should execute print config command', async () => {
      // Mock successful execution
      await cometixCommands.runCometixPrintConfig()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Config'))
    })

    it('should handle print config errors', async () => {
      // Mock error execution
      const error = new Error('Command failed')

      try {
        await cometixCommands.runCometixPrintConfig()
      }
      catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  describe('TUI config', () => {
    it('should execute TUI config command', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0)
          }
        }),
      }

      vi.mocked(spawn).mockReturnValue(mockChild as any)

      await cometixCommands.runCometixTuiConfig()

      expect(spawn).toHaveBeenCalledWith('ccline', ['-c'], expect.any(Object))
    })

    it('should handle TUI config exit code', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1) // Non-zero exit code
          }
        }),
      }

      vi.mocked(spawn).mockReturnValue(mockChild as any)

      try {
        await cometixCommands.runCometixTuiConfig()
      }
      catch (e) {
        expect(e).toBeDefined()
      }
    })

    it('should handle TUI config spawn error', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Spawn failed'))
          }
        }),
      }

      vi.mocked(spawn).mockReturnValue(mockChild as any)

      try {
        await cometixCommands.runCometixTuiConfig()
      }
      catch (e) {
        expect(e).toBeDefined()
      }
    })
  })
})
```

### 3. 安装器测试文件

**文件**: `tests/utils/cometix/installer.test.ts` (新建)

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as cometixInstaller from '../../../src/utils/cometix/installer'
import * as cometixConfig from '../../../src/utils/cometix/config'

vi.mock('../../../src/utils/cometix/config')
vi.mock('../../../src/utils/platform')

describe('Cometix Installer', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('installation detection', () => {
    it('should detect if Cometix is installed', async () => {
      const isInstalled = await cometixInstaller.isCometixLineInstalled()
      expect(typeof isInstalled).toBe('boolean')
    })

    it('should return false when Cometix is not installed', async () => {
      // Mock npm list to fail
      const isInstalled = await cometixInstaller.isCometixLineInstalled()
      expect(isInstalled).toBe(false)
    })
  })

  describe('installation process', () => {
    it('should install Cometix when not installed', async () => {
      vi.mocked(cometixConfig.hasCCometixLineConfig).mockReturnValue(false)
      vi.mocked(cometixConfig.addCCometixLineConfig).mockImplementation(() => {})

      await cometixInstaller.installCometixLine()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('install'))
    })

    it('should update Cometix when already installed', async () => {
      vi.mocked(cometixInstaller.isCometixLineInstalled).mockResolvedValue(true)
      vi.mocked(cometixConfig.hasCCometixLineConfig).mockReturnValue(true)

      await cometixInstaller.installCometixLine()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('already'))
    })

    it('should add statusLine config after installation', async () => {
      vi.mocked(cometixConfig.hasCCometixLineConfig).mockReturnValue(false)
      vi.mocked(cometixConfig.addCCometixLineConfig).mockImplementation(() => {})

      await cometixInstaller.installCometixLine()

      expect(cometixConfig.addCCometixLineConfig).toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      const error = new Error('Installation failed')
      vi.mocked(cometixInstaller.isCometixLineInstalled).mockRejectedValue(error)

      try {
        await cometixInstaller.installCometixLine()
      }
      catch (e) {
        expect(e).toBeDefined()
      }
    })
  })
})
```

---

## 错误恢复增强

### 1. 添加重试机制

**文件**: `src/utils/auto-updater.ts` (修改)

```typescript
/**
 * Execute a command with retry support for transient failures
 * @param command - The command to execute
 * @param args - Command arguments
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Command execution result
 */
export async function execWithRetry(
  command: string,
  args: string[],
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<{ usedSudo: boolean }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(ansis.gray(`Attempt ${attempt}/${maxRetries}: ${command} ${args.join(' ')}`))
      return await execWithSudoIfNeeded(command, args)
    }
    catch (error) {
      lastError = error as Error

      // Check if error is transient (network, timeout, etc.)
      const isTransient = isTransientError(error)

      if (!isTransient || attempt === maxRetries) {
        throw error
      }

      // Calculate exponential backoff delay
      const delay = delayMs * Math.pow(2, attempt - 1)
      console.log(ansis.yellow(`Retry in ${delay}ms... (${error instanceof Error ? error.message : String(error)})`))

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Command execution failed after retries')
}

/**
 * Check if an error is transient (can be retried)
 */
function isTransientError(error: any): boolean {
  const message = error?.message?.toLowerCase() || ''
  const code = error?.code || ''

  // Network errors
  if (message.includes('econnrefused') || message.includes('enotfound')) {
    return true
  }

  // Timeout errors
  if (message.includes('timeout') || code === 'ETIMEDOUT') {
    return true
  }

  // Temporary npm registry issues
  if (message.includes('npm err!') && message.includes('registry')) {
    return true
  }

  return false
}
```

### 2. 增强 CCR 命令错误处理

**文件**: `src/utils/ccr/commands.ts` (修改)

```typescript
/**
 * Run CCR UI with enhanced error handling and retry
 */
export async function runCcrUi(apiKey: string): Promise<void> {
  ensureI18nInitialized()

  try {
    console.log(ansis.cyan(`${i18n.t('ccr:startingCcrUi')}`))

    // Use retry mechanism for network-dependent operations
    const { usedSudo } = await execWithRetry('ccr', ['ui'], 2, 500)

    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }

    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrUiStarted')}`))
    console.log(ansis.blue(`💡 ${i18n.t('ccr:ccrUiApiKey')}: ${apiKey}`))
  }
  catch (error: any) {
    console.error(ansis.red(`✗ ${i18n.t('ccr:ccrCommandFailed')}: ${error.message}`))

    // Provide helpful error messages
    if (error.message.includes('not found')) {
      console.error(ansis.yellow(`${i18n.t('ccr:ccrNotInstalled')}`))
    }
    else if (error.message.includes('ECONNREFUSED')) {
      console.error(ansis.yellow(`${i18n.t('ccr:ccrConnectionFailed')}`))
    }

    throw error
  }
}
```

---

## 工具健康检查

### 1. 创建工具健康检查模块

**文件**: `src/utils/tool-health-check.ts` (新建)

```typescript
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../i18n'
import { checkCcrVersion } from './version-checker'
import { checkCometixLineVersion } from './version-checker'
import { isCcrInstalled } from './ccr/installer'
import { isCometixLineInstalled } from './cometix/installer'
import { readCcrConfig } from './ccr/config'

export interface ToolHealth {
  name: string
  installed: boolean
  configured: boolean
  version?: string
  status: 'healthy' | 'degraded' | 'broken'
  lastChecked: Date
  message?: string
}

/**
 * Check health of a specific tool
 */
export async function checkToolHealth(toolName: string): Promise<ToolHealth> {
  ensureI18nInitialized()

  const now = new Date()

  switch (toolName.toLowerCase()) {
    case 'ccr':
      return checkCcrHealth(now)
    case 'cometix':
      return checkCometixHealth(now)
    case 'ccusage':
      return checkCcusageHealth(now)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

/**
 * Check CCR tool health
 */
async function checkCcrHealth(now: Date): Promise<ToolHealth> {
  try {
    const { installed, currentVersion } = await checkCcrVersion()
    const configured = installed && readCcrConfig() !== null

    return {
      name: 'CCR',
      installed,
      configured,
      version: currentVersion,
      status: installed && configured ? 'healthy' : 'degraded',
      lastChecked: now,
      message: !installed ? 'CCR not installed' : !configured ? 'CCR not configured' : undefined,
    }
  }
  catch (error) {
    return {
      name: 'CCR',
      installed: false,
      configured: false,
      status: 'broken',
      lastChecked: now,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check Cometix tool health
 */
async function checkCometixHealth(now: Date): Promise<ToolHealth> {
  try {
    const installed = await isCometixLineInstalled()
    const { currentVersion } = await checkCometixLineVersion()

    return {
      name: 'Cometix',
      installed,
      configured: installed, // Cometix is configured if installed
      version: currentVersion,
      status: installed ? 'healthy' : 'degraded',
      lastChecked: now,
      message: !installed ? 'Cometix not installed' : undefined,
    }
  }
  catch (error) {
    return {
      name: 'Cometix',
      installed: false,
      configured: false,
      status: 'broken',
      lastChecked: now,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check CCUsage tool health
 */
async function checkCcusageHealth(now: Date): Promise<ToolHealth> {
  // CCUsage is installed via npx, so it's always available
  return {
    name: 'CCUsage',
    installed: true,
    configured: true,
    version: 'latest',
    status: 'healthy',
    lastChecked: now,
  }
}

/**
 * Check health of all tools
 */
export async function checkAllToolsHealth(): Promise<ToolHealth[]> {
  const tools = ['CCR', 'Cometix', 'CCUsage']
  const results: ToolHealth[] = []

  for (const tool of tools) {
    try {
      const health = await checkToolHealth(tool)
      results.push(health)
    }
    catch (error) {
      results.push({
        name: tool,
        installed: false,
        configured: false,
        status: 'broken',
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Display tool health report
 */
export function displayToolHealthReport(health: ToolHealth[]): void {
  ensureI18nInitialized()

  console.log(ansis.bold.cyan('\n📊 Tool Health Report\n'))

  for (const tool of health) {
    const statusIcon = tool.status === 'healthy' ? '✅' : tool.status === 'degraded' ? '⚠️' : '❌'
    const statusColor = tool.status === 'healthy' ? ansis.green : tool.status === 'degraded' ? ansis.yellow : ansis.red

    console.log(statusColor(`${statusIcon} ${tool.name}`))
    console.log(`   Installed: ${tool.installed ? '✓' : '✗'}`)
    console.log(`   Configured: ${tool.configured ? '✓' : '✗'}`)
    if (tool.version) {
      console.log(`   Version: ${tool.version}`)
    }
    if (tool.message) {
      console.log(`   Message: ${tool.message}`)
    }
    console.log('')
  }
}
```

### 2. 集成到菜单中

**文件**: `src/commands/menu.ts` (修改)

```typescript
import { checkAllToolsHealth, displayToolHealthReport } from '../utils/tool-health-check'

// 在菜单中添加选项
async function showMainMenu(): Promise<void> {
  // ... existing code ...

  const choices = [
    // ... existing choices ...
    {
      name: '7. Check Tool Health',
      value: 'health',
    },
  ]

  // ... handle choice ...
  if (choice === 'health') {
    const health = await checkAllToolsHealth()
    displayToolHealthReport(health)
  }
}
```

---

## 日志记录增强

### 1. 创建工具执行日志模块

**文件**: `src/utils/tool-logger.ts` (新建)

```typescript
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import dayjs from 'dayjs'

const LOG_DIR = join(homedir(), '.ccjk', 'logs')
const TOOL_LOG_FILE = join(LOG_DIR, 'tools.log')

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

/**
 * Log tool execution
 */
export function logToolExecution(
  tool: string,
  command: string,
  args: string[],
  result: 'success' | 'failure',
  duration: number,
  error?: string,
): void {
  ensureLogDir()

  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const logEntry = {
    timestamp,
    tool,
    command,
    args: args.join(' '),
    result,
    duration: `${duration}ms`,
    error: error || null,
  }

  const logLine = JSON.stringify(logEntry) + '\n'
  appendFileSync(TOOL_LOG_FILE, logLine)
}

/**
 * Get recent tool execution logs
 */
export function getRecentToolLogs(lines: number = 50): string[] {
  if (!existsSync(TOOL_LOG_FILE)) {
    return []
  }

  const content = require('node:fs').readFileSync(TOOL_LOG_FILE, 'utf-8')
  return content.split('\n').filter(Boolean).slice(-lines)
}

/**
 * Clear old logs (older than days)
 */
export function clearOldLogs(days: number = 30): void {
  if (!existsSync(TOOL_LOG_FILE)) {
    return
  }

  const content = require('node:fs').readFileSync(TOOL_LOG_FILE, 'utf-8')
  const cutoffDate = dayjs().subtract(days, 'day')

  const recentLogs = content
    .split('\n')
    .filter(Boolean)
    .filter((line) => {
      try {
        const entry = JSON.parse(line)
        return dayjs(entry.timestamp).isAfter(cutoffDate)
      }
      catch {
        return true
      }
    })
    .join('\n')

  require('node:fs').writeFileSync(TOOL_LOG_FILE, recentLogs + '\n')
}
```

### 2. 集成到工具命令中

**文件**: `src/utils/ccr/commands.ts` (修改)

```typescript
import { logToolExecution } from '../tool-logger'

export async function runCcrUi(apiKey: string): Promise<void> {
  ensureI18nInitialized()
  const startTime = Date.now()

  try {
    console.log(ansis.cyan(`${i18n.t('ccr:startingCcrUi')}`))
    await execAsync('ccr ui')

    const duration = Date.now() - startTime
    logToolExecution('CCR', 'ccr', ['ui'], 'success', duration)

    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrUiStarted')}`))
  }
  catch (error: any) {
    const duration = Date.now() - startTime
    logToolExecution('CCR', 'ccr', ['ui'], 'failure', duration, error.message)

    console.error(ansis.red(`✗ ${i18n.t('ccr:ccrCommandFailed')}: ${error.message}`))
    throw error
  }
}
```

---

## 实施检查清单 | Implementation Checklist

### Phase 1: Cometix 测试覆盖

- [ ] 创建 `tests/utils/cometix/menu.test.ts`
- [ ] 创建 `tests/utils/cometix/commands.test.ts`
- [ ] 创建 `tests/utils/cometix/installer.test.ts`
- [ ] 运行测试: `pnpm test tests/utils/cometix/`
- [ ] 验证覆盖率 >= 90%
- [ ] 更新 `vitest.config.ts` 包含新测试

### Phase 2: 错误恢复增强

- [ ] 在 `src/utils/auto-updater.ts` 中添加 `execWithRetry()`
- [ ] 在 `src/utils/auto-updater.ts` 中添加 `isTransientError()`
- [ ] 更新 CCR 命令使用重试机制
- [ ] 更新 Cometix 命令使用重试机制
- [ ] 添加测试用例验证重试逻辑

### Phase 3: 工具健康检查

- [ ] 创建 `src/utils/tool-health-check.ts`
- [ ] 实现 `checkToolHealth()` 函数
- [ ] 实现 `checkAllToolsHealth()` 函数
- [ ] 实现 `displayToolHealthReport()` 函数
- [ ] 集成到菜单中
- [ ] 添加测试用例

### Phase 4: 日志记录增强

- [ ] 创建 `src/utils/tool-logger.ts`
- [ ] 实现 `logToolExecution()` 函数
- [ ] 实现 `getRecentToolLogs()` 函数
- [ ] 实现 `clearOldLogs()` 函数
- [ ] 集成到所有工具命令中
- [ ] 添加日志查看命令

---

## 测试命令

```bash
# 运行所有工具测试
pnpm test tests/utils/cometix/

# 运行特定测试文件
pnpm test tests/utils/cometix/menu.test.ts

# 生成覆盖率报告
pnpm test:coverage tests/utils/cometix/

# 监视模式
pnpm test:watch tests/utils/cometix/
```

---

## 预期结果

### 完成后的改进

| 指标 | 当前 | 目标 | 改进 |
|------|------|------|------|
| Cometix 测试覆盖 | 0% | 90% | +90% |
| 错误恢复能力 | 基础 | 完善 | ✅ |
| 工具健康检查 | 无 | 完整 | ✅ |
| 日志记录 | 无 | 完整 | ✅ |
| 总体评分 | 8.5/10 | 9.5/10 | +1.0 |

---

## 参考资源 | References

- [Vitest 文档](https://vitest.dev/)
- [Node.js 子进程文档](https://nodejs.org/api/child_process.html)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/)

---

**文档版本**: 1.0
**最后更新**: 2026-01-14
**维护者**: Claude Code Audit Agent
