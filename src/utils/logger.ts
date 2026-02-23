/**
 * CCJK Logger - MUD Style
 *
 * Structured logging with terminal green aesthetics
 */

import ansis from 'ansis'
import type { ILogger, LogEntry, LoggerOptions, LogLevel, OutputMode } from './logger/types'

export type { ILogger, LogEntry, LoggerOptions, LogLevel, OutputMode }

class Logger implements ILogger {
  private level: LogLevel
  private mode: OutputMode
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    success: 1,
    warn: 2,
    error: 3,
  }

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info'
    this.mode = options.mode || 'text'
    if (options.silent) this.mode = 'silent'
  }

  private shouldLog(level: LogLevel): boolean {
    return this.mode !== 'silent' && this.levels[level] >= this.levels[this.level]
  }

  private createEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    }
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    if (this.mode === 'json') {
      console.log(JSON.stringify(entry))
      return
    }

    // Text mode with ansis colors
    const prefix = this.colorizePrefix(entry.level)
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
    console.log(`${prefix} ${entry.message}${dataStr}`)
  }

  private colorizePrefix(level: LogLevel): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    switch (level) {
      case 'debug': return ansis.gray(prefix)
      case 'info': return ansis.green(prefix)
      case 'success': return ansis.cyan(prefix)
      case 'warn': return ansis.yellow(prefix)
      case 'error': return ansis.red(prefix)
    }
  }


  debug(message: string, data?: unknown): void {
    this.output(this.createEntry('debug', message, data))
  }

  info(message: string, data?: unknown): void {
    this.output(this.createEntry('info', message, data))
  }

  success(message: string, data?: unknown): void {
    this.output(this.createEntry('success', message, data))
  }

  warn(message: string, data?: unknown): void {
    this.output(this.createEntry('warn', message, data))
  }

  error(message: string, data?: unknown): void {
    this.output(this.createEntry('error', message, data))
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setMode(mode: OutputMode): void {
    this.mode = mode
  }

  setSilent(silent: boolean): void {
    this.mode = silent ? 'silent' : 'text'
  }
}

export const logger = new Logger()
export { Logger }
