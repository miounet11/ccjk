/**
 * Progress Tracker for Multi-Step Operations
 *
 * Provides visual feedback during long-running operations
 */

import ansis from 'ansis'

export class ProgressTracker {
  private currentStep = 0
  private totalSteps: number
  private steps: string[]
  private startTime: number

  constructor(steps: string[]) {
    this.steps = steps
    this.totalSteps = steps.length
    this.startTime = Date.now()
  }

  start(): void {
    console.log()
    console.log(ansis.cyan.bold('🚀 Starting setup...'))
    console.log(ansis.gray(`   ${this.totalSteps} steps to complete`))
    console.log()
  }

  nextStep(message?: string): void {
    this.currentStep++
    const stepName = message || this.steps[this.currentStep - 1]
    const progress = Math.round((this.currentStep / this.totalSteps) * 100)
    const bar = this.renderProgressBar(progress)

    console.log()
    console.log(ansis.cyan(`[${this.currentStep}/${this.totalSteps}]`), ansis.white(stepName))
    console.log(ansis.gray(`   ${bar} ${progress}%`))
  }

  complete(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1)
    console.log()
    console.log(ansis.green.bold('✅ Setup complete!'))
    console.log(ansis.gray(`   Completed in ${duration}s`))
    console.log()
  }

  error(message: string): void {
    console.log()
    console.log(ansis.red.bold('❌ Setup failed'))
    console.log(ansis.white(`   ${message}`))
    console.log()
  }

  private renderProgressBar(percent: number): string {
    const width = 20
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled
    return ansis.green('█'.repeat(filled)) + ansis.gray('░'.repeat(empty))
  }
}

/**
 * Quick helper for simple progress tracking
 */
export function trackProgress<T>(
  steps: string[],
  executor: (tracker: ProgressTracker) => Promise<T>,
): Promise<T> {
  const tracker = new ProgressTracker(steps)
  tracker.start()

  return executor(tracker)
    .then((result) => {
      tracker.complete()
      return result
    })
    .catch((error) => {
      tracker.error(error.message)
      throw error
    })
}
