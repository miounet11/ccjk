/**
 * User-Friendly Error Formatter
 *
 * Converts technical errors into actionable user messages
 */

import ansis from 'ansis'

export interface FormattedError {
  title: string
  message: string
  suggestion?: string
  command?: string
  docsUrl?: string
}

/**
 * Format error for user display
 */
export function formatError(error: Error | string, context?: string): FormattedError {
  const errorMsg = typeof error === 'string' ? error : error.message

  // Match common error patterns and provide helpful suggestions
  const patterns: Array<{ pattern: RegExp, formatter: (match: RegExpMatchArray) => FormattedError }> = [
    {
      pattern: /not initialized|Call initialize/i,
      formatter: () => ({
        title: '⚠️  Configuration Not Ready',
        message: 'CCJK needs to be initialized first.',
        suggestion: 'Run the initialization command to set up your environment.',
        command: 'ccjk init',
      }),
    },
    {
      pattern: /Failed to (start|connect|fetch)/i,
      formatter: (match) => ({
        title: '❌ Connection Failed',
        message: `Unable to ${match[1]} the service.`,
        suggestion: 'Check your internet connection and try again.',
        command: 'ccjk doctor',
      }),
    },
    {
      pattern: /does not exist|not found/i,
      formatter: () => ({
        title: '🔍 File Not Found',
        message: 'The requested file or directory does not exist.',
        suggestion: 'Verify the path and try again.',
      }),
    },
    {
      pattern: /permission denied|EACCES/i,
      formatter: () => ({
        title: '🔒 Permission Denied',
        message: 'You do not have permission to access this resource.',
        suggestion: 'Check file permissions or run with appropriate privileges.',
        command: 'sudo ccjk <command>',
      }),
    },
    {
      pattern: /network|timeout|ETIMEDOUT|ECONNREFUSED/i,
      formatter: () => ({
        title: '🌐 Network Error',
        message: 'Unable to connect to the server.',
        suggestion: 'Check your internet connection and firewall settings.',
      }),
    },
  ]

  // Try to match error patterns
  for (const { pattern, formatter } of patterns) {
    const match = errorMsg.match(pattern)
    if (match) {
      return formatter(match)
    }
  }

  // Default fallback
  return {
    title: '❌ Error',
    message: errorMsg,
    suggestion: context ? `Context: ${context}` : 'Run ccjk doctor for diagnostics.',
    command: 'ccjk doctor',
  }
}

/**
 * Display formatted error to console
 */
export function displayError(error: Error | string, context?: string): void {
  const formatted = formatError(error, context)

  console.error()
  console.error(ansis.red.bold(formatted.title))
  console.error(ansis.white(formatted.message))

  if (formatted.suggestion) {
    console.error()
    console.error(ansis.yellow('💡 Suggestion:'), ansis.white(formatted.suggestion))
  }

  if (formatted.command) {
    console.error(ansis.cyan('   Run:'), ansis.green(formatted.command))
  }

  if (formatted.docsUrl) {
    console.error(ansis.cyan('   Docs:'), ansis.blue(formatted.docsUrl))
  }

  console.error()
}

/**
 * Wrap async function with error formatting
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    }
    catch (error) {
      displayError(error as Error, context)
      process.exit(1)
    }
  }) as T
}
