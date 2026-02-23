/**
 * Mock Logger for Testing
 */

import type { ILogger, LogEntry, LogLevel, OutputMode } from '../../src/utils/logger/types'

export class MockLogger implements ILogger {
  public logs: LogEntry[] = []
  private mode: OutputMode = 'silent'
  private level: LogLevel = 'info'

  debug(message: string, data?: unknown): void {
    this.logs.push({ level: 'debug', message, timestamp: new Date().toISOString(), data })
  }

  info(message: string, data?: unknown): void {
    this.logs.push({ level: 'info', message, timestamp: new Date().toISOString(), data })
  }

  success(message: string, data?: unknown): void {
    this.logs.push({ level: 'success', message, timestamp: new Date().toISOString(), data })
  }

  warn(message: string, data?: unknown): void {
    this.logs.push({ level: 'warn', message, timestamp: new Date().toISOString(), data })
  }

  error(message: string, data?: unknown): void {
    this.logs.push({ level: 'error', message, timestamp: new Date().toISOString(), data })
  }

  setMode(mode: OutputMode): void {
    this.mode = mode
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  clear(): void {
    this.logs = []
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  hasLog(message: string): boolean {
    return this.logs.some(log => log.message.includes(message))
  }
}

export function createMockLogger(): MockLogger {
  return new MockLogger()
}
