/**
 * Logger Type Definitions
 */

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'
export type OutputMode = 'text' | 'json' | 'silent'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown
}

export interface LoggerOptions {
  level?: LogLevel
  mode?: OutputMode
  silent?: boolean
}

export interface ILogger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  success(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
  setMode(mode: OutputMode): void
  setLevel(level: LogLevel): void
}
