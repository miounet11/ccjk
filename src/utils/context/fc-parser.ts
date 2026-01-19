/**
 * FC Output Parser - Streaming parser for Claude Code function call outputs
 * Implements a state machine to parse tool invocations and results
 */

import type { Buffer } from 'node:buffer'
import type { FCLogEntry } from './storage-types'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import {
  estimateTokens,
  extractErrorMessage,
  extractParameter,
  extractSystemMessage,
  extractToolName,
  getToolCategory,
  isFunctionCallsEnd,
  isFunctionCallsStart,
  isFunctionResultsEnd,
  isFunctionResultsStart,
  isInvokeEnd,
  isInvokeStart,
  PARSER_CONFIG,
  TOKEN_ESTIMATION,
  TOOL_PATTERNS,
  truncateText,
} from './parser-patterns'

/**
 * Parser state enumeration
 */
export enum ParserState {
  /** Idle state, waiting for function_calls block */
  IDLE = 'IDLE',
  /** Inside function_calls block, waiting for invoke */
  IN_FUNCTION_CALLS = 'IN_FUNCTION_CALLS',
  /** Inside invoke block, parsing tool name and parameters */
  IN_INVOKE = 'IN_INVOKE',
  /** Inside parameter tag, collecting multi-line parameter value */
  IN_PARAMETER = 'IN_PARAMETER',
  /** Waiting for function_results block */
  WAITING_RESULTS = 'WAITING_RESULTS',
  /** Inside function_results block, collecting results */
  IN_RESULTS = 'IN_RESULTS',
}

/**
 * Partial function call data during parsing
 */
export interface PartialFCCall {
  id: string
  name?: string
  arguments: Record<string, unknown>
  result: string[]
  startTime: Date
  endTime?: Date
  status?: 'success' | 'error'
  error?: string
  currentParam?: {
    name: string
    value: string[]
  }
}

/**
 * Complete function call data
 */
export interface FCCall extends Omit<FCLogEntry, 'ts' | 'fc' | 'args'> {
  name: string
  arguments: Record<string, unknown>
  startTime: Date
  endTime: Date
}

/**
 * Parser events
 */
export interface FCParserEvents {
  'fc:start': (fc: PartialFCCall) => void
  'fc:end': (fc: FCCall) => void
  'fc:error': (error: Error, fc?: PartialFCCall) => void
  'state:change': (oldState: ParserState, newState: ParserState) => void
}

/**
 * FC Output Parser
 * Parses Claude Code's streaming output to extract function call information
 */
export class FCParser extends EventEmitter {
  private state: ParserState = ParserState.IDLE
  private currentFC: PartialFCCall | null = null
  private incompleteFCs: Map<string, PartialFCCall> = new Map()
  private lineBuffer: string = ''

  constructor() {
    super()
  }

  /**
   * Parse a chunk of output data
   * @param chunk - Buffer or string chunk from stdout/stderr
   * @returns Array of completed function calls
   */
  parse(chunk: Buffer | string): FCCall[] {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
    const completedFCs: FCCall[] = []

    // Add to line buffer
    this.lineBuffer += text

    // Process complete lines
    const lines = this.lineBuffer.split('\n')
    // Keep the last incomplete line in buffer
    this.lineBuffer = lines.pop() || ''

    for (const line of lines) {
      const completed = this.parseLine(line)
      if (completed) {
        completedFCs.push(completed)
      }
    }

    return completedFCs
  }

  /**
   * Parse a single line
   * @param line - Line of text to parse
   * @returns Completed FC call if line completes a call, null otherwise
   */
  private parseLine(line: string): FCCall | null {
    const trimmedLine = line.trim()
    if (!trimmedLine)
      return null

    switch (this.state) {
      case ParserState.IDLE:
        return this.handleIdleState(trimmedLine)

      case ParserState.IN_FUNCTION_CALLS:
        return this.handleInFunctionCallsState(trimmedLine)

      case ParserState.IN_INVOKE:
        return this.handleInInvokeState(trimmedLine)

      case ParserState.IN_PARAMETER:
        return this.handleInParameterState(trimmedLine)

      case ParserState.WAITING_RESULTS:
        return this.handleWaitingResultsState(trimmedLine)

      case ParserState.IN_RESULTS:
        return this.handleInResultsState(trimmedLine)

      default:
        return null
    }
  }

  /**
   * Handle IDLE state
   */
  private handleIdleState(line: string): FCCall | null {
    if (isFunctionCallsStart(line)) {
      this.changeState(ParserState.IN_FUNCTION_CALLS)
    }
    return null
  }

  /**
   * Handle IN_FUNCTION_CALLS state
   */
  private handleInFunctionCallsState(line: string): FCCall | null {
    if (isInvokeStart(line)) {
      const toolName = extractToolName(line)
      if (toolName) {
        this.currentFC = {
          id: randomUUID(),
          name: toolName,
          arguments: {},
          result: [],
          startTime: new Date(),
        }
        this.emit('fc:start', this.currentFC)
        this.changeState(ParserState.IN_INVOKE)
      }
    }
    else if (isFunctionCallsEnd(line)) {
      this.changeState(ParserState.IDLE)
    }
    return null
  }

  /**
   * Handle IN_INVOKE state
   */
  private handleInInvokeState(line: string): FCCall | null {
    if (!this.currentFC)
      return null

    // Check for single-line parameter first (more specific pattern)
    const param = extractParameter(line)
    if (param) {
      this.currentFC.arguments[param.name] = param.value
      return null
    }

    // Check for parameter start (multi-line)
    const paramStartMatch = line.match(TOOL_PATTERNS.PARAMETER_START)
    if (paramStartMatch) {
      this.currentFC.currentParam = {
        name: paramStartMatch[1],
        value: [],
      }
      this.changeState(ParserState.IN_PARAMETER)
      return null
    }

    // Check for invoke end
    if (isInvokeEnd(line)) {
      // Store incomplete FC and wait for results
      this.incompleteFCs.set(this.currentFC.id, this.currentFC)
      this.changeState(ParserState.WAITING_RESULTS)

      // Cleanup old incomplete FCs
      if (this.incompleteFCs.size > PARSER_CONFIG.MAX_INCOMPLETE_TOOLS) {
        const oldestId = this.incompleteFCs.keys().next().value as string | undefined
        if (oldestId) {
          this.incompleteFCs.delete(oldestId)
        }
      }
    }

    return null
  }

  /**
   * Handle IN_PARAMETER state (multi-line parameter value)
   */
  private handleInParameterState(line: string): FCCall | null {
    if (!this.currentFC || !this.currentFC.currentParam)
      return null

    // Check for parameter end
    if (TOOL_PATTERNS.PARAMETER_END.test(line)) {
      const paramValue = this.currentFC.currentParam.value.join('\n')
      this.currentFC.arguments[this.currentFC.currentParam.name] = truncateText(
        paramValue,
        TOKEN_ESTIMATION.MAX_ARG_LENGTH,
      )
      this.currentFC.currentParam = undefined
      this.changeState(ParserState.IN_INVOKE)
      return null
    }

    // Accumulate parameter value
    this.currentFC.currentParam.value.push(line)
    return null
  }

  /**
   * Handle WAITING_RESULTS state
   */
  private handleWaitingResultsState(line: string): FCCall | null {
    if (isFunctionResultsStart(line)) {
      // Restore the most recent incomplete FC
      if (this.incompleteFCs.size > 0) {
        const lastId = Array.from(this.incompleteFCs.keys()).pop()
        if (lastId) {
          this.currentFC = this.incompleteFCs.get(lastId)!
          this.incompleteFCs.delete(lastId)
        }
      }
      this.changeState(ParserState.IN_RESULTS)
    }
    return null
  }

  /**
   * Handle IN_RESULTS state
   */
  private handleInResultsState(line: string): FCCall | null {
    // Check for results end
    if (isFunctionResultsEnd(line)) {
      const completed = this.completeCurrentFC()
      this.changeState(ParserState.IDLE)
      return completed
    }

    // Extract system message
    const systemMsg = extractSystemMessage(line)
    if (systemMsg && this.currentFC) {
      this.currentFC.result.push(systemMsg)
      return null
    }

    // Extract error message
    const errorMsg = extractErrorMessage(line)
    if (errorMsg && this.currentFC) {
      this.currentFC.error = errorMsg
      this.currentFC.status = 'error'
      this.currentFC.result.push(`ERROR: ${errorMsg}`)
      return null
    }

    // Accumulate result content
    if (this.currentFC) {
      this.currentFC.result.push(line)
    }

    return null
  }

  /**
   * Complete the current FC call
   */
  private completeCurrentFC(): FCCall | null {
    if (!this.currentFC || !this.currentFC.name) {
      return null
    }

    const endTime = new Date()
    const resultText = this.currentFC.result.join('\n')
    const truncatedResult = truncateText(resultText, TOKEN_ESTIMATION.MAX_RESULT_LENGTH)

    const completedFC: FCCall = {
      id: this.currentFC.id,
      name: this.currentFC.name,
      arguments: this.currentFC.arguments,
      result: truncatedResult,
      startTime: this.currentFC.startTime,
      endTime,
      duration: endTime.getTime() - this.currentFC.startTime.getTime(),
      tokens: estimateTokens(resultText) + estimateTokens(JSON.stringify(this.currentFC.arguments)),
      summary: '', // Will be filled by summarizer
      status: this.currentFC.status || 'success',
      error: this.currentFC.error,
    }

    // Remove from incomplete FCs
    this.incompleteFCs.delete(this.currentFC.id)

    // Emit completion event
    this.emit('fc:end', completedFC)

    // Clear current FC
    this.currentFC = null

    return completedFC
  }

  /**
   * Change parser state and emit event
   */
  private changeState(newState: ParserState): void {
    const oldState = this.state
    this.state = newState
    this.emit('state:change', oldState, newState)
  }

  /**
   * Get current parser state
   */
  getState(): ParserState {
    return this.state
  }

  /**
   * Get current incomplete FC
   */
  getCurrentFC(): PartialFCCall | null {
    return this.currentFC
  }

  /**
   * Get all incomplete FCs
   */
  getIncompleteFCs(): PartialFCCall[] {
    return Array.from(this.incompleteFCs.values())
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.state = ParserState.IDLE
    this.currentFC = null
    this.incompleteFCs.clear()
    this.lineBuffer = ''
  }

  /**
   * Flush any remaining buffered data
   * Call this when stream ends to process incomplete lines
   */
  flush(): FCCall[] {
    const completedFCs: FCCall[] = []

    // Process remaining buffer
    if (this.lineBuffer.trim()) {
      const completed = this.parseLine(this.lineBuffer)
      if (completed) {
        completedFCs.push(completed)
      }
      this.lineBuffer = ''
    }

    // Complete any pending FC
    if (this.currentFC && this.state === ParserState.IN_RESULTS) {
      const completed = this.completeCurrentFC()
      if (completed) {
        completedFCs.push(completed)
      }
    }

    return completedFCs
  }

  /**
   * Get parser statistics
   */
  getStats(): {
    state: ParserState
    incompleteFCCount: number
    bufferSize: number
  } {
    return {
      state: this.state,
      incompleteFCCount: this.incompleteFCs.size,
      bufferSize: this.lineBuffer.length,
    }
  }
}

/**
 * Create a new FC parser instance
 */
export function createFCParser(): FCParser {
  return new FCParser()
}

/**
 * Helper function to get tool category for a completed FC
 */
export function getFCCategory(fc: FCCall): string | null {
  return getToolCategory(fc.name)
}

/**
 * Helper function to format FC for logging
 */
export function formatFCForLog(fc: FCCall): string {
  const duration = fc.duration.toFixed(0)
  const tokens = fc.tokens
  const status = fc.status === 'error' ? '❌' : '✅'
  return `${status} ${fc.name} (${duration}ms, ~${tokens} tokens)`
}

/**
 * Helper function to convert FCCall to FCLogEntry
 */
export function fcCallToLogEntry(fc: FCCall, summary: string): FCLogEntry {
  return {
    ts: fc.endTime.toISOString(),
    id: fc.id,
    fc: fc.name,
    args: fc.arguments,
    result: fc.result,
    tokens: fc.tokens,
    duration: fc.duration,
    summary,
    status: fc.status,
    error: fc.error,
  }
}
