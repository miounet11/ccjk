import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getBestResearchResultMock,
  getLatestResearchSessionMock,
  getResearchReportMock,
  getResearchSessionStatusMock,
  listResearchResultsMock,
  listResearchSessionsMock,
  runResearchExperimentMock,
} = vi.hoisted(() => ({
  getBestResearchResultMock: vi.fn(),
  getLatestResearchSessionMock: vi.fn(),
  getResearchReportMock: vi.fn(),
  getResearchSessionStatusMock: vi.fn(),
  listResearchResultsMock: vi.fn(),
  listResearchSessionsMock: vi.fn(),
  runResearchExperimentMock: vi.fn(),
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

describe('research command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('runs a research experiment and prints phase, verdict, and parsed metric', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    runResearchExperimentMock.mockResolvedValue({
      sessionId: 'research-1',
      taskId: 'task-1',
      name: 'baseline',
      command: 'python train.py',
      cwd: '/repo',
      metricName: 'val_bpb',
      metricValue: 1.23,
      success: true,
      status: 'completed',
      exitCode: 0,
      stdout: 'val_bpb=1.23',
      stderr: '',
      durationMs: 1234,
      phase: 'baseline',
      verdict: 'PASS',
      phaseHistory: ['brief', 'baseline', 'verify', 'report'],
      createdAt: '2026-04-05T12:00:00.000Z',
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await researchCommand('run', [], {
      name: 'baseline',
      cmd: 'python train.py',
      metric: 'val_bpb',
      cwd: '/repo',
      budgetMs: 5000,
    })

    expect(runResearchExperimentMock).toHaveBeenCalledWith({
      name: 'baseline',
      command: 'python train.py',
      metricName: 'val_bpb',
      budgetMs: 5000,
      cwd: '/repo',
      dbPath: undefined,
    })
    expect(logs.join('\n')).toContain('Research Run')
    expect(logs.join('\n')).toContain('Phase:     baseline')
    expect(logs.join('\n')).toContain('Verdict:   PASS')
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

  it('shows latest research session status with phase and verdict when no session id is passed', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    getLatestResearchSessionMock.mockReturnValue({ id: 'research-2' })
    getResearchSessionStatusMock.mockReturnValue({
      sessionId: 'research-2',
      metadata: {
        name: 'baseline',
        command: 'python train.py',
        metricName: 'val_bpb',
        metricValue: 1.23,
        currentPhase: 'report',
        verdict: 'PASS',
        status: 'completed',
        exitCode: 0,
        durationMs: 1200,
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
          outcome: 'val_bpb=1.23',
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
    expect(logs.join('\n')).toContain('Verdict:   PASS')
    expect(logs.join('\n')).toContain('val_bpb=1.23')
  })

  it('lists recent research sessions with workflow metadata', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    listResearchSessionsMock.mockReturnValue([
      {
        id: 'research-3',
        name: 'baseline',
        command: 'python train.py',
        metricName: 'val_bpb',
        cwd: '/repo',
        createdAt: 123,
        budgetMs: 5000,
        currentPhase: 'report',
        verdict: 'PASS',
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
    expect(logs.join('\n')).toContain('verdict: PASS')
    expect(logs.join('\n')).toContain('python train.py')
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

  it('renders a compact persisted research report', async () => {
    const { researchCommand } = await import('../../src/commands/research')

    getResearchReportMock.mockReturnValue({
      sessionId: 'research-5',
      name: 'baseline',
      createdAt: '2026-04-05T12:00:00.000Z',
      currentPhase: 'report',
      verdict: 'PASS',
      command: 'python train.py',
      cwd: '/repo',
      status: 'completed',
      exitCode: 0,
      metricName: 'val_bpb',
      metricValue: 1.23,
      durationMs: 1300,
      phaseHistory: ['brief', 'baseline', 'verify', 'report'],
      outcome: 'val_bpb=1.23',
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
    expect(logs.join('\n')).toContain('Outcome:   val_bpb=1.23')
  })
})
