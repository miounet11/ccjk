import type { EvalRunResult, EvalScenario } from './types.js'
import { spawn } from 'node:child_process'

export async function runScenario(scenario: EvalScenario): Promise<EvalRunResult[]> {
  const runs = scenario.runs || 1
  const results: EvalRunResult[] = []

  for (let i = 0; i < runs; i++) {
    const result = await runOnce(scenario, i)
    results.push(result)
  }

  return results
}

async function runOnce(scenario: EvalScenario, runIndex: number): Promise<EvalRunResult> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const [cmd, ...args] = scenario.command.split(/\s+/)
    const proc = spawn(cmd, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime
      const exitCode = code ?? -1

      resolve({
        scenarioId: scenario.id,
        runIndex,
        success: false, // grader will set this
        durationMs,
        exitCode,
        metrics: {
          duration_ms: durationMs,
          output_bytes: stdout.length + stderr.length,
        },
        assertionResults: [],
        stdout,
        stderr,
      })
    })

    proc.on('error', (err) => {
      const durationMs = Date.now() - startTime
      resolve({
        scenarioId: scenario.id,
        runIndex,
        success: false,
        durationMs,
        exitCode: -1,
        metrics: { duration_ms: durationMs },
        assertionResults: [{
          type: 'spawn_error',
          success: false,
          message: `Failed to spawn process: ${err.message}`,
        }],
        stderr: err.message,
      })
    })
  })
}
