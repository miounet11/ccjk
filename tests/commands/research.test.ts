import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS } from '../../src/cli-commands'

const {
  getBestResearchResultMock,
  getLatestResearchSessionMock,
  getResearchReportMock,
  getResearchSessionStatusMock,
  listResearchResultsMock,
  listResearchSessionsMock,
  runResearchExperimentMock,
  initResearchProgramMock,
  getResearchLoopReportMock,
  getResearchLoopStatusMock,
  resumeResearchLoopMock,
  runResearchRoundMock,
  startResearchLoopMock,
  stopResearchLoopMock,
} = vi.hoisted(() => ({
  getBestResearchResultMock: vi.fn(),
  getLatestResearchSessionMock: vi.fn(),
  getResearchReportMock: vi.fn(),
  getResearchSessionStatusMock: vi.fn(),
  listResearchResultsMock: vi.fn(),
  listResearchSessionsMock: vi.fn(),
  runResearchExperimentMock: vi.fn(),
  initResearchProgramMock: vi.fn(),
  getResearchLoopReportMock: vi.fn(),
  getResearchLoopStatusMock: vi.fn(),
  resumeResearchLoopMock: vi.fn(),
  runResearchRoundMock: vi.fn(),
  startResearchLoopMock: vi.fn(),
  stopResearchLoopMock: vi.fn(),
}))

vi.mock('../../src/services/research-runner', () => ({
  getBestResearchResult: getBestResearchResultMock,
  getLatestResearchSession: getLatestResearchSessionMock,
  getResearchReport: getResearchReportMock,
  getResearchSessionStatus: getResearchSessionStatusMock,
  listResearchResults: listResearchResultsMock,
  listResearchSessions: listResearchSessionsMock,
  runResearchExperiment: runResearchExperimentMock,
}))

vi.mock('../../src/services/research-program', () => ({
  initResearchProgram: initResearchProgramMock,
}))

vi.mock('../../src/services/research-loop', () => ({
  getResearchLoopReport: getResearchLoopReportMock,
  getResearchLoopStatus: getResearchLoopStatusMock,
  resumeResearchLoop: resumeResearchLoopMock,
  runResearchRound: runResearchRoundMock,
  startResearchLoop: startResearchLoopMock,
  stopResearchLoop: stopResearchLoopMock,
}))

describe('research command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('runs a research experiment with explicit objective and baseline comparison', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    runResearchExperimentMock.mockResolvedValue({
      sessionId: 'research-1',
      taskId: 'task-1',
      name: 'candidate',
      command: 'python train.py --lr 1e-4',
      cwd: '/repo',
      metricName: 'val_bpb',
      metricValue: 1.23,
      success: true,
      status: 'completed',
      exitCode: 0,
      stdout: 'val_bpb=1.23',
      stderr: '',
      durationMs: 1234,
      phase: 'experiment',
      objective: 'minimize',
      verdict: 'PASS',
      verdictReason: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
      baselineSessionId: 'research-0',
      comparison: {
        baselineSessionId: 'research-0',
        baselineName: 'baseline',
        objective: 'minimize',
        result: 'better',
        baselineMetricValue: 1.4,
        candidateMetricValue: 1.23,
        delta: -0.17,
        percentDelta: -12.14,
        summary: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
      },
      phaseHistory: ['brief', 'experiment', 'verify', 'report'],
      createdAt: '2026-04-05T12:00:00.000Z',
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await researchCommand('run', [], {
      name: 'candidate',
      cmd: 'python train.py --lr 1e-4',
      metric: 'val_bpb',
      cwd: '/repo',
      budgetMs: 5000,
      objective: 'minimize',
      baseline: 'research-0',
    })

    expect(runResearchExperimentMock).toHaveBeenCalledWith({
      name: 'candidate',
      command: 'python train.py --lr 1e-4',
      metricName: 'val_bpb',
      budgetMs: 5000,
      cwd: '/repo',
      baselineSessionId: 'research-0',
      objective: 'minimize',
      dbPath: undefined,
    })
    expect(logs.join('\n')).toContain('Research Run')
    expect(logs.join('\n')).toContain('Phase:     experiment')
    expect(logs.join('\n')).toContain('Objective: minimize')
    expect(logs.join('\n')).toContain('Verdict:   PASS')
    expect(logs.join('\n')).toContain('Baseline:  baseline (research-0)')
    expect(logs.join('\n')).toContain('Compare:   better')
    expect(logs.join('\n')).toContain('val_bpb=1.23')
  })

  it('shows a guardrail when run is missing --cmd', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    const errors: string[] = []
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.join(' '))
    })

    await researchCommand('run', [], { name: 'baseline' })

    expect(runResearchExperimentMock).not.toHaveBeenCalled()
    expect(errors.join('\n')).toContain('--cmd is required')
  })

  it('initializes a research program template', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    initResearchProgramMock.mockReturnValue({
      programPath: '/repo/.ccjk/research/program.md',
      content: 'template',
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('init', [], { program: '.ccjk/research/program.md', cwd: '/repo' })

    expect(initResearchProgramMock).toHaveBeenCalledWith('.ccjk/research/program.md', '/repo')
    expect(logs.join('\n')).toContain('Research Program')
    expect(logs.join('\n')).toContain('/repo/.ccjk/research/program.md')
  })

  it('starts a research loop with CLI overrides', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    startResearchLoopMock.mockResolvedValue({
      sessionId: 'loop-1',
      metadata: {
        name: 'repo-research',
        status: 'running',
        stopReason: undefined,
        currentRound: 2,
        maxRounds: 5,
        objective: 'maximize',
        metric: 'score',
        bestMetricValue: 12,
        baselineSessionId: 'baseline-1',
        bestSessionId: 'round-2',
        acceptedRoundSessionIds: ['round-1', 'round-2'],
        rejectedRoundSessionIds: [],
        maxNoImproveRounds: 2,
        noImproveStreak: 0,
      },
      latestRound: {
        round: 2,
        verdict: 'PASS',
        metricName: 'score',
        metricValue: 12,
      },
      rounds: [],
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('loop', [], {
      program: '/repo/.ccjk/research/program.md',
      cwd: '/repo',
      dbPath: '/repo/.ccjk/research.db',
      budgetMs: 1000,
      maxRounds: 5,
      maxNoImproveRounds: 2,
      targetMetric: 12,
    })

    expect(startResearchLoopMock).toHaveBeenCalledWith({
      programPath: '/repo/.ccjk/research/program.md',
      cwd: '/repo',
      dbPath: '/repo/.ccjk/research.db',
      overrides: {
        cwd: '/repo',
        budgetMs: 1000,
        maxRounds: 5,
        maxNoImproveRounds: 2,
        targetMetric: 12,
      },
    })
    expect(logs.join('\n')).toContain('Research Loop Status')
    expect(logs.join('\n')).toContain('Rounds:    2/5')
    expect(logs.join('\n')).toContain('Latest:    round 2 · PASS · score=12')
  })

  it('rejects invalid numeric CLI options before invoking the command', async () => {
    const command = COMMANDS.find(item => item.name === 'research <action> [...args]')
    expect(command).toBeDefined()

    const loader = await command!.loader()

    await expect(loader({ maxRounds: 'abc' } as any, 'loop', [])).rejects.toThrow('--max-rounds must be a valid number')
    expect(startResearchLoopMock).not.toHaveBeenCalled()
  })

  it('shows latest research session status with phase, objective, and comparison details when no session id is passed', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    getLatestResearchSessionMock.mockReturnValue({ id: 'research-2' })
    getResearchSessionStatusMock.mockReturnValue({
      sessionId: 'research-2',
      metadata: {
        name: 'candidate',
        command: 'python train.py --lr 1e-4',
        metricName: 'val_bpb',
        metricValue: 1.23,
        currentPhase: 'report',
        objective: 'minimize',
        verdict: 'PASS',
        verdictReason: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
        status: 'completed',
        exitCode: 0,
        durationMs: 1200,
        comparison: {
          baselineName: 'baseline',
          baselineSessionId: 'research-0',
          result: 'better',
          summary: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
        },
      },
      metrics: {
        totalTasks: 1,
        completedTasks: 1,
        failedTasks: 0,
        avgExecutionTime: 1200,
        successRate: 1,
        totalRetries: 0,
      },
      decisions: [
        {
          id: 'decision-1',
          outcome: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
          decision: 'record research run',
        },
      ],
      recovery: {
        nextExecutable: [],
      },
      tasks: [],
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('status', [], {})

    expect(getLatestResearchSessionMock).toHaveBeenCalledWith(undefined)
    expect(getResearchSessionStatusMock).toHaveBeenCalledWith('research-2', undefined)
    expect(logs.join('\n')).toContain('Research Status')
    expect(logs.join('\n')).toContain('Phase:     report')
    expect(logs.join('\n')).toContain('Objective: minimize')
    expect(logs.join('\n')).toContain('Verdict:   PASS')
    expect(logs.join('\n')).toContain('Reason:    Candidate is better than baseline')
    expect(logs.join('\n')).toContain('Baseline:  baseline')
    expect(logs.join('\n')).toContain('Compare:   better')
    expect(logs.join('\n')).toContain('Summary:   Candidate is better than baseline')
  })

  it('lists recent research sessions with objective and baseline metadata', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    listResearchSessionsMock.mockReturnValue([
      {
        id: 'research-3',
        name: 'candidate',
        command: 'python train.py --lr 1e-4',
        metricName: 'val_bpb',
        cwd: '/repo',
        createdAt: 123,
        budgetMs: 5000,
        currentPhase: 'report',
        objective: 'minimize',
        verdict: 'PASS',
        baselineSessionId: 'research-0',
      },
    ])

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('sessions', [], { limit: 5 })

    expect(listResearchSessionsMock).toHaveBeenCalledWith(5, undefined)
    expect(logs.join('\n')).toContain('Research Sessions')
    expect(logs.join('\n')).toContain('phase: report')
    expect(logs.join('\n')).toContain('objective: minimize')
    expect(logs.join('\n')).toContain('verdict: PASS')
    expect(logs.join('\n')).toContain('baseline: research-0')
    expect(logs.join('\n')).toContain('python train.py --lr 1e-4')
  })

  it('shows compact recent research results and the current best run', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    listResearchResultsMock.mockReturnValue([
      {
        timestamp: '2026-04-05T12:00:00.000Z',
        sessionId: 'research-4',
        taskId: 'task-4',
        name: 'experiment-a',
        phase: 'experiment',
        verdict: 'PASS',
        status: 'completed',
        exitCode: 0,
        metricName: 'val_bpb',
        metricValue: 1.11,
        durationMs: 2200,
        cwd: '/repo',
        command: 'python train.py --lr 1e-4 --dropout 0.1',
      },
    ])
    getBestResearchResultMock.mockReturnValue({
      timestamp: '2026-04-05T12:00:00.000Z',
      sessionId: 'research-4',
      taskId: 'task-4',
      name: 'experiment-a',
      phase: 'experiment',
      verdict: 'PASS',
      status: 'completed',
      exitCode: 0,
      metricName: 'val_bpb',
      metricValue: 1.11,
      durationMs: 2200,
      cwd: '/repo',
      command: 'python train.py --lr 1e-4 --dropout 0.1',
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('results', [], { limit: 3 })

    expect(listResearchResultsMock).toHaveBeenCalledWith(3, undefined)
    expect(getBestResearchResultMock).toHaveBeenCalledWith(undefined)
    expect(logs.join('\n')).toContain('Research Results')
    expect(logs.join('\n')).toContain('Best')
    expect(logs.join('\n')).toContain('experiment-a · val_bpb=1.11 · completed · 2200ms')
    expect(logs.join('\n')).toContain('2026-04-05T12:00:00.000Z · experiment-a · completed · val_bpb=1.11 · 2200ms')
  })

  it('renders a compact persisted research report with comparison reasoning', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    getResearchReportMock.mockReturnValue({
      sessionId: 'research-5',
      name: 'candidate',
      createdAt: '2026-04-05T12:00:00.000Z',
      currentPhase: 'report',
      verdict: 'PASS',
      verdictReason: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
      command: 'python train.py --lr 1e-4',
      cwd: '/repo',
      status: 'completed',
      exitCode: 0,
      metricName: 'val_bpb',
      metricValue: 1.23,
      objective: 'minimize',
      baselineSessionId: 'research-0',
      comparison: {
        baselineName: 'baseline',
        baselineSessionId: 'research-0',
        result: 'better',
      },
      durationMs: 1300,
      phaseHistory: ['brief', 'experiment', 'verify', 'report'],
      outcome: 'Candidate is better than baseline (1.23 vs 1.4, Δ -0.17 / -12.14%).',
      content: '# CCJK Research Report\n\n**Verdict**: PASS',
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await researchCommand('report', ['research-5'], {})

    expect(getResearchReportMock).toHaveBeenCalledWith('research-5', undefined)
    expect(logs.join('\n')).toContain('Research Report')
    expect(logs.join('\n')).toContain('Created:   2026-04-05T12:00:00.000Z')
    expect(logs.join('\n')).toContain('Metric:    val_bpb=1.23')
    expect(logs.join('\n')).toContain('Objective: minimize')
    expect(logs.join('\n')).toContain('Reason:    Candidate is better than baseline')
    expect(logs.join('\n')).toContain('Baseline:  baseline (research-0)')
    expect(logs.join('\n')).toContain('Compare:   better')
    expect(logs.join('\n')).toContain('Outcome:   Candidate is better than baseline')
  })
})
