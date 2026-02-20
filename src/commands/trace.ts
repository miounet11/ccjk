/**
 * Trace Command
 *
 * View execution traces for Brain System operations.
 *
 * @module commands/trace
 */

import ansis from 'ansis'
import { executionTracer } from '../brain/execution-tracer'

export interface TraceOptions {
  sessionId?: string
  list?: boolean
  last?: boolean
  cleanup?: boolean
}

/**
 * Trace command handler
 */
export async function traceCommand(options: TraceOptions = {}): Promise<void> {
  // List all traces
  if (options.list) {
    const traces = executionTracer.listTraces()

    if (traces.length === 0) {
      console.log(ansis.yellow('\n⚠️  No execution traces found\n'))
      return
    }

    console.log(ansis.cyan.bold('\n📊 Execution Traces\n'))

    for (const trace of traces.sort((a, b) => b.startTime - a.startTime)) {
      const duration = trace.endTime
        ? `${trace.endTime - trace.startTime}ms`
        : 'running'

      console.log(ansis.white(`  ${trace.sessionId}`))
      console.log(ansis.gray(`    Started: ${new Date(trace.startTime).toLocaleString()}`))
      console.log(ansis.gray(`    Duration: ${duration}`))
      console.log(ansis.gray(`    Events: ${trace.metadata.totalEvents}`))
      console.log(ansis.gray(`    Agents: ${trace.metadata.agentCount}`))
      console.log(ansis.gray(`    Tool Calls: ${trace.metadata.toolCallCount}`))
      if (trace.metadata.errorCount > 0) {
        console.log(ansis.red(`    Errors: ${trace.metadata.errorCount}`))
      }
      console.log()
    }

    return
  }

  // Cleanup old traces
  if (options.cleanup) {
    executionTracer.cleanup(10)
    console.log(ansis.green('\n✅ Cleaned up old traces (kept last 10)\n'))
    return
  }

  // Show specific trace or last trace
  let sessionId = options.sessionId

  if (!sessionId && options.last) {
    const traces = executionTracer.listTraces()
    if (traces.length === 0) {
      console.log(ansis.yellow('\n⚠️  No execution traces found\n'))
      return
    }
    const lastTrace = traces.sort((a, b) => b.startTime - a.startTime)[0]
    sessionId = lastTrace.sessionId
  }

  if (!sessionId) {
    console.log(ansis.red('\n❌ Please specify --session-id or use --last\n'))
    console.log(ansis.gray('Usage:'))
    console.log(ansis.gray('  ccjk trace --list              # List all traces'))
    console.log(ansis.gray('  ccjk trace --last              # Show last trace'))
    console.log(ansis.gray('  ccjk trace --session-id <id>   # Show specific trace'))
    console.log(ansis.gray('  ccjk trace --cleanup           # Clean up old traces'))
    console.log()
    return
  }

  // Visualize trace
  const visualization = executionTracer.visualizeTrace(sessionId)
  console.log(visualization)
}
