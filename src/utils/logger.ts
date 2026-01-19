/**
 * CCJK Logger - MUD Style
 *
 * Structured logging with terminal green aesthetics
 */

import ansis from 'ansis'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  level?: LogLevel
  silent?: boolean
}

class Logger {
  private level: LogLevel
  private silent: boolean
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info'
    this.silent = options.silent || false
  }

  private shouldLog(level: LogLevel): boolean {
    return !this.silent && this.levels[level] >= this.levels[this.level]
  }

  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    const coloredPrefix = this.colorize(level, prefix)
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    return `${coloredPrefix} ${message}${dataStr}`
  }

  /** MUD-style color scheme for log levels */
  private colorize(level: LogLevel, text: string): string {
    switch (level) {
      case 'debug': return ansis.gray(text)
      case 'info': return ansis.green(text) // MUD green for info
      case 'warn': return ansis.yellow(text)
      case 'error': return ansis.red(text)
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message, data))
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, data))
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, data))
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, data))
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setSilent(silent: boolean): void {
    this.silent = silent
  }
}

export const logger = new Logger()
export { Logger, type LoggerOptions, type LogLevel }
