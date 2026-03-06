import type { Ora } from 'ora'
import ansis from 'ansis'
import ora from 'ora'

/**
 * Progress step status
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/**
 * Progress step definition
 */
export interface ProgressStep {
  id: string
  name: string
  status: StepStatus
  progress: number // 0-100
  weight: number // For total progress calculation
  startTime?: number
  endTime?: number
  error?: Error
  spinner?: Ora
}

/**
 * Enhanced progress tracker with real-time updates
 */
export class EnhancedProgressTracker {
  private steps: Map<string, ProgressStep> = new Map()
  private totalWeight = 0
  private startTime = 0
  private updateInterval?: NodeJS.Timeout
  private lastRender = 0
  private renderThrottle = 100 // ms

  constructor(private enableSpinners = true) {
    this.startTime = Date.now()
  }

  /**
   * Add a step to track
   */
  addStep(id: string, name: string, weight: number): void {
    this.steps.set(id, {
      id,
      name,
      status: 'pending',
      progress: 0,
      weight,
    })
    this.totalWeight += weight
  }

  /**
   * Start a step
   */
  startStep(id: string): void {
    const step = this.steps.get(id)
    if (!step)
      return

    step.status = 'running'
    step.startTime = Date.now()
    step.progress = 0

    if (this.enableSpinners) {
      step.spinner = ora({
        text: step.name,
        color: 'cyan',
      }).start()
    }

    this.render()
  }

  /**
   * Update step progress
   */
  updateStep(id: string, progress: number): void {
    const step = this.steps.get(id)
    if (!step)
      return

    step.progress = Math.min(100, Math.max(0, progress))

    if (step.spinner) {
      step.spinner.text = `${step.name} (${step.progress}%)`
    }

    this.render()
  }

  /**
   * Complete a step
   */
  completeStep(id: string): void {
    const step = this.steps.get(id)
    if (!step)
      return

    step.status = 'completed'
    step.progress = 100
    step.endTime = Date.now()

    if (step.spinner) {
      step.spinner.succeed(ansis.green(step.name))
      step.spinner = undefined
    }

    this.render()
  }

  /**
   * Fail a step
   */
  failStep(id: string, error: Error): void {
    const step = this.steps.get(id)
    if (!step)
      return

    step.status = 'failed'
    step.endTime = Date.now()
    step.error = error

    if (step.spinner) {
      step.spinner.fail(ansis.red(`${step.name}: ${error.message}`))
      step.spinner = undefined
    }

    this.render()
  }

  /**
   * Skip a step
   */
  skipStep(id: string, reason?: string): void {
    const step = this.steps.get(id)
    if (!step)
      return

    step.status = 'skipped'
    step.endTime = Date.now()

    if (step.spinner) {
      const text = reason ? `${step.name} (${reason})` : step.name
      step.spinner.info(ansis.dim(text))
      step.spinner = undefined
    }

    this.render()
  }

  /**
   * Render progress (throttled)
   */
  private render(): void {
    const now = Date.now()
    if (now - this.lastRender < this.renderThrottle) {
      return
    }
    this.lastRender = now

    // Don't render if using spinners (they handle their own output)
    if (this.enableSpinners) {
      return
    }

    // Calculate total progress
    const totalProgress = this.calculateTotalProgress()
    const eta = this.calculateETA()

    // Clear and render
    console.clear()
    console.log(ansis.bold.cyan(`\n📦 Installation Progress: ${totalProgress.toFixed(0)}%\n`))

    // Render progress bar
    const barWidth = 40
    const filled = Math.round(barWidth * totalProgress / 100)
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled)
    console.log(`[${ansis.cyan(bar)}] ${totalProgress.toFixed(1)}%\n`)

    // Render steps
    for (const step of this.steps.values()) {
      const icon = this.getStatusIcon(step.status)
      const progressBar = this.renderStepProgress(step)
      console.log(`${icon} ${step.name} ${progressBar}`)
    }

    // Render ETA
    if (eta) {
      console.log(ansis.dim(`\n⏱️  Estimated time remaining: ${eta}`))
    }
  }

  /**
   * Calculate total progress
   */
  private calculateTotalProgress(): number {
    if (this.totalWeight === 0)
      return 0

    let weightedProgress = 0
    for (const step of this.steps.values()) {
      weightedProgress += (step.progress / 100) * step.weight
    }

    return (weightedProgress / this.totalWeight) * 100
  }

  /**
   * Calculate ETA
   */
  private calculateETA(): string | null {
    const completed = Array.from(this.steps.values())
      .filter(s => s.status === 'completed')

    if (completed.length === 0)
      return null

    const avgTime = completed.reduce((sum, s) =>
      sum + (s.endTime! - s.startTime!), 0) / completed.length

    const remaining = Array.from(this.steps.values())
      .filter(s => s.status === 'pending' || s.status === 'running')
      .length

    if (remaining === 0)
      return null

    const etaMs = avgTime * remaining
    const etaSec = Math.ceil(etaMs / 1000)

    if (etaSec < 60) {
      return `${etaSec}s`
    }
    else {
      const min = Math.floor(etaSec / 60)
      const sec = etaSec % 60
      return `${min}m ${sec}s`
    }
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: StepStatus): string {
    switch (status) {
      case 'pending':
        return ansis.dim('⏳')
      case 'running':
        return ansis.cyan('🔄')
      case 'completed':
        return ansis.green('✅')
      case 'failed':
        return ansis.red('❌')
      case 'skipped':
        return ansis.dim('⊘')
      default:
        return '❓'
    }
  }

  /**
   * Render step progress bar
   */
  private renderStepProgress(step: ProgressStep): string {
    const width = 20
    const filled = Math.round(width * step.progress / 100)
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled)

    let color: (text: string) => string
    switch (step.status) {
      case 'completed':
        color = ansis.green
        break
      case 'failed':
        color = ansis.red
        break
      case 'running':
        color = ansis.cyan
        break
      default:
        color = ansis.dim
    }

    return ansis.dim(`[${color(bar)}] ${step.progress}%`)
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number
    completed: number
    failed: number
    skipped: number
    duration: number
    progress: number
  } {
    const steps = Array.from(this.steps.values())
    return {
      total: steps.length,
      completed: steps.filter(s => s.status === 'completed').length,
      failed: steps.filter(s => s.status === 'failed').length,
      skipped: steps.filter(s => s.status === 'skipped').length,
      duration: Date.now() - this.startTime,
      progress: this.calculateTotalProgress(),
    }
  }

  /**
   * Stop tracking and cleanup
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    // Stop all spinners
    for (const step of this.steps.values()) {
      if (step.spinner) {
        step.spinner.stop()
      }
    }
  }
}
