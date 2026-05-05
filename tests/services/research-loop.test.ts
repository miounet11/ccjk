import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSessionMock,
  listSessionsMock,
  saveSessionMock,
  readResearchProgramMock,
  getResearchReportMock,
  getResearchSessionStatusMock,
  runResearchExperimentMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  listSessionsMock: vi.fn(),
  saveSessionMock: vi.fn(),
  readResearchProgramMock: vi.fn(),
  getResearchReportMock: vi.fn(),
  getResearchSessionStatusMock: vi.fn(),
  runResearchExperimentMock: vi.fn(),
}));

vi.mock('../../src/brain/task-persistence', () => ({
  TaskPersistence: vi.fn().mockImplementation(() => ({
    getSession: getSessionMock,
    listSessions: listSessionsMock,
    saveSession: saveSessionMock,
  })),
}));

vi.mock('../../src/services/research-program', () => ({
  readResearchProgram: readResearchProgramMock,
}));

vi.mock('../../src/services/research-runner', () => ({
  getResearchReport: getResearchReportMock,
  getResearchSessionStatus: getResearchSessionStatusMock,
  runResearchExperiment: runResearchExperimentMock,
}));

describe('research loop service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    readResearchProgramMock.mockReturnValue({
      name: 'repo-research',
      metric: 'score',
      objective: 'maximize',
      baselineCommand: 'pnpm bench:baseline',
      candidateCommand: 'pnpm bench:candidate',
      cwd: '/repo',
      maxRounds: 3,
      maxNoImproveRounds: 2,
      budgetMs: 1000,
      targetMetric: undefined,
      notes: 'notes',
      programPath: '/repo/.ccjk/research/program.md',
    });

    getResearchSessionStatusMock.mockReturnValue(null);
  });

  it('starts a loop, runs baseline and rounds until maxRounds', async () => {
    const { startResearchLoop } = await import('../../src/services/research-loop');

    const sessions = new Map<string, any>();
    const orderedSessions: Array<{ id: string; createdAt: number; metadata: any }> = [];
    let createdAt = 1;

    saveSessionMock.mockImplementation((id: string, metadata: any) => {
      const record = {
        id,
        createdAt: sessions.get(id)?.createdAt || createdAt++,
        updatedAt: createdAt,
        metadata: structuredClone(metadata),
      };
      sessions.set(id, record);
      const existingIndex = orderedSessions.findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        orderedSessions.splice(existingIndex, 1);
      }
      orderedSessions.unshift({ id, createdAt: record.createdAt, metadata: record.metadata });
    });

    getSessionMock.mockImplementation((id: string) => sessions.get(id));
    listSessionsMock.mockImplementation(() => [...orderedSessions]);

    const reports = new Map<string, any>();
    getResearchReportMock.mockImplementation((id: string) => reports.get(id) || null);

    runResearchExperimentMock
      .mockImplementationOnce(async () => {
        const result = {
          sessionId: 'baseline-1',
          taskId: 'task-baseline-1',
          name: 'repo-research-baseline',
          command: 'pnpm bench:baseline',
          cwd: '/repo',
          metricName: 'score',
          metricValue: 10,
          success: true,
          status: 'completed',
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 10,
          phase: 'baseline',
          objective: 'maximize',
          verdict: 'PASS',
          verdictReason: 'baseline ok',
          baselineSessionId: undefined,
          comparison: undefined,
          phaseHistory: ['brief', 'baseline', 'verify', 'report'],
          createdAt: '2026-04-08T00:00:00.000Z',
        };
        reports.set(result.sessionId, {
          ...result,
          currentPhase: 'report',
          outcome: result.verdictReason,
          content: '',
        });
        return result;
      })
      .mockImplementationOnce(async () => {
        const result = {
          sessionId: 'round-1',
          taskId: 'task-round-1',
          name: 'repo-research-round-1',
          command: 'pnpm bench:candidate',
          cwd: '/repo',
          metricName: 'score',
          metricValue: 11,
          success: true,
          status: 'completed',
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 10,
          phase: 'experiment',
          objective: 'maximize',
          verdict: 'PASS',
          verdictReason: 'better',
          baselineSessionId: 'baseline-1',
          comparison: {
            baselineSessionId: 'baseline-1',
            baselineName: 'repo-research-baseline',
            objective: 'maximize',
            result: 'better',
            baselineMetricValue: 10,
            candidateMetricValue: 11,
            delta: 1,
            percentDelta: 10,
            summary: 'better',
          },
          phaseHistory: ['brief', 'experiment', 'verify', 'report'],
          createdAt: '2026-04-08T00:01:00.000Z',
        };
        reports.set(result.sessionId, {
          ...result,
          currentPhase: 'report',
          outcome: result.verdictReason,
          content: '',
        });
        return result;
      })
      .mockImplementationOnce(async () => {
        const result = {
          sessionId: 'round-2',
          taskId: 'task-round-2',
          name: 'repo-research-round-2',
          command: 'pnpm bench:candidate',
          cwd: '/repo',
          metricName: 'score',
          metricValue: 9,
          success: true,
          status: 'completed',
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 10,
          phase: 'experiment',
          objective: 'maximize',
          verdict: 'FAIL',
          verdictReason: 'worse',
          baselineSessionId: 'round-1',
          comparison: {
            baselineSessionId: 'round-1',
            baselineName: 'repo-research-round-1',
            objective: 'maximize',
            result: 'worse',
            baselineMetricValue: 11,
            candidateMetricValue: 9,
            delta: -2,
            percentDelta: -18.18,
            summary: 'worse',
          },
          phaseHistory: ['brief', 'experiment', 'verify', 'report'],
          createdAt: '2026-04-08T00:02:00.000Z',
        };
        reports.set(result.sessionId, {
          ...result,
          currentPhase: 'report',
          outcome: result.verdictReason,
          content: '',
        });
        return result;
      })
      .mockImplementationOnce(async () => {
        const result = {
          sessionId: 'round-3',
          taskId: 'task-round-3',
          name: 'repo-research-round-3',
          command: 'pnpm bench:candidate',
          cwd: '/repo',
          metricName: 'score',
          metricValue: 12,
          success: true,
          status: 'completed',
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 10,
          phase: 'experiment',
          objective: 'maximize',
          verdict: 'PASS',
          verdictReason: 'better again',
          baselineSessionId: 'round-1',
          comparison: {
            baselineSessionId: 'round-1',
            baselineName: 'repo-research-round-1',
            objective: 'maximize',
            result: 'better',
            baselineMetricValue: 11,
            candidateMetricValue: 12,
            delta: 1,
            percentDelta: 9.09,
            summary: 'better again',
          },
          phaseHistory: ['brief', 'experiment', 'verify', 'report'],
          createdAt: '2026-04-08T00:03:00.000Z',
        };
        reports.set(result.sessionId, {
          ...result,
          currentPhase: 'report',
          outcome: result.verdictReason,
          content: '',
        });
        return result;
      });

    const status = await startResearchLoop({});

    expect(runResearchExperimentMock).toHaveBeenCalledTimes(4);
    expect(status.metadata.status).toBe('completed');
    expect(status.metadata.stopReason).toBe('max-rounds-reached');
    expect(status.metadata.currentRound).toBe(3);
    expect(status.metadata.bestSessionId).toBe('round-3');
    expect(status.metadata.bestMetricValue).toBe(12);
    expect(status.metadata.acceptedRoundSessionIds).toEqual(['round-1', 'round-3']);
    expect(status.metadata.rejectedRoundSessionIds).toEqual(['round-2']);
    expect(status.latestRound?.sessionId).toBe('round-3');
    expect(status.rounds).toHaveLength(3);
  });

  it('stops when no-improve streak reaches the limit', async () => {
    const { runResearchRound } = await import('../../src/services/research-loop');

    let loopSession = {
      id: 'loop-1',
      createdAt: 1,
      updatedAt: 2,
      metadata: {
        kind: 'research-loop',
        name: 'repo-research',
        programPath: '/repo/.ccjk/research/program.md',
        metric: 'score',
        objective: 'maximize',
        cwd: '/repo',
        budgetMs: 1000,
        maxRounds: 5,
        maxNoImproveRounds: 2,
        status: 'running',
        baselineSessionId: 'baseline-1',
        bestSessionId: 'baseline-1',
        bestMetricValue: 10,
        currentRound: 1,
        acceptedRoundSessionIds: [],
        rejectedRoundSessionIds: ['round-0'],
        roundSessionIds: ['round-0'],
        noImproveStreak: 1,
        failureStreak: 0,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:01:00.000Z',
      },
    };

    getSessionMock.mockImplementation(() => loopSession);
    saveSessionMock.mockImplementation((id: string, metadata: any) => {
      loopSession = {
        ...loopSession,
        id,
        updatedAt: loopSession.updatedAt + 1,
        metadata: structuredClone(metadata),
      };
    });

    getResearchReportMock.mockImplementation((id: string) => {
      if (id === 'baseline-1') {
        return {
          sessionId: 'baseline-1',
          name: 'baseline',
          createdAt: '2026-04-08T00:00:00.000Z',
          currentPhase: 'report',
          verdict: 'PASS',
          verdictReason: 'baseline ok',
          command: 'pnpm bench:baseline',
          cwd: '/repo',
          status: 'completed',
          exitCode: 0,
          metricName: 'score',
          metricValue: 10,
          objective: 'maximize',
          durationMs: 10,
          phaseHistory: ['brief', 'baseline', 'verify', 'report'],
          outcome: 'baseline ok',
          content: '',
        };
      }

      if (id === 'round-0') {
        return {
          sessionId: 'round-0',
          name: 'round-0',
          createdAt: '2026-04-08T00:01:00.000Z',
          currentPhase: 'report',
          verdict: 'FAIL',
          verdictReason: 'worse',
          command: 'pnpm bench:candidate',
          cwd: '/repo',
          status: 'completed',
          exitCode: 0,
          metricName: 'score',
          metricValue: 9,
          objective: 'maximize',
          baselineSessionId: 'baseline-1',
          comparison: {
            baselineSessionId: 'baseline-1',
            baselineName: 'baseline',
            objective: 'maximize',
            result: 'worse',
            summary: 'worse',
          },
          durationMs: 10,
          phaseHistory: ['brief', 'experiment', 'verify', 'report'],
          outcome: 'worse',
          content: '',
        };
      }

      if (id === 'round-2') {
        return {
          sessionId: 'round-2',
          name: 'round-2',
          createdAt: '2026-04-08T00:02:00.000Z',
          currentPhase: 'report',
          verdict: 'FAIL',
          verdictReason: 'still worse',
          command: 'pnpm bench:candidate',
          cwd: '/repo',
          status: 'completed',
          exitCode: 0,
          metricName: 'score',
          metricValue: 8,
          objective: 'maximize',
          baselineSessionId: 'baseline-1',
          comparison: {
            baselineSessionId: 'baseline-1',
            baselineName: 'baseline',
            objective: 'maximize',
            result: 'worse',
            summary: 'still worse',
          },
          durationMs: 10,
          phaseHistory: ['brief', 'experiment', 'verify', 'report'],
          outcome: 'still worse',
          content: '',
        };
      }

      return null;
    });

    runResearchExperimentMock.mockResolvedValue({
      sessionId: 'round-2',
      taskId: 'task-round-2',
      name: 'repo-research-round-2',
      command: 'pnpm bench:candidate',
      cwd: '/repo',
      metricName: 'score',
      metricValue: 8,
      success: true,
      status: 'completed',
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 10,
      phase: 'experiment',
      objective: 'maximize',
      verdict: 'FAIL',
      verdictReason: 'still worse',
      baselineSessionId: 'baseline-1',
      comparison: {
        baselineSessionId: 'baseline-1',
        baselineName: 'baseline',
        objective: 'maximize',
        result: 'worse',
        summary: 'still worse',
      },
      phaseHistory: ['brief', 'experiment', 'verify', 'report'],
      createdAt: '2026-04-08T00:02:00.000Z',
    });

    const status = await runResearchRound({ sessionId: 'loop-1' });

    expect(status.metadata.status).toBe('completed');
    expect(status.metadata.stopReason).toBe('max-no-improve-rounds-reached');
    expect(status.metadata.currentRound).toBe(2);
    expect(status.metadata.rejectedRoundSessionIds).toEqual(['round-0', 'round-2']);
    expect(status.metadata.noImproveStreak).toBe(2);
  });

  it('stops a loop manually', async () => {
    const { stopResearchLoop } = await import('../../src/services/research-loop');

    let loopSession = {
      id: 'loop-2',
      createdAt: 1,
      updatedAt: 2,
      metadata: {
        kind: 'research-loop',
        name: 'repo-research',
        programPath: '/repo/.ccjk/research/program.md',
        metric: 'score',
        objective: 'maximize',
        cwd: '/repo',
        budgetMs: 1000,
        maxRounds: 5,
        maxNoImproveRounds: 2,
        status: 'running',
        baselineSessionId: 'baseline-1',
        bestSessionId: 'baseline-1',
        bestMetricValue: 10,
        currentRound: 1,
        acceptedRoundSessionIds: [],
        rejectedRoundSessionIds: [],
        roundSessionIds: [],
        noImproveStreak: 0,
        failureStreak: 0,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:01:00.000Z',
      },
    };

    getSessionMock.mockImplementation(() => loopSession);
    saveSessionMock.mockImplementation((id: string, metadata: any) => {
      loopSession = {
        ...loopSession,
        id,
        updatedAt: loopSession.updatedAt + 1,
        metadata: structuredClone(metadata),
      };
    });

    getResearchReportMock.mockReturnValue({
      sessionId: 'baseline-1',
      name: 'baseline',
      createdAt: '2026-04-08T00:00:00.000Z',
      currentPhase: 'report',
      verdict: 'PASS',
      verdictReason: 'baseline ok',
      command: 'pnpm bench:baseline',
      cwd: '/repo',
      status: 'completed',
      exitCode: 0,
      metricName: 'score',
      metricValue: 10,
      objective: 'maximize',
      durationMs: 10,
      phaseHistory: ['brief', 'baseline', 'verify', 'report'],
      outcome: 'baseline ok',
      content: '',
    });

    const status = stopResearchLoop({ sessionId: 'loop-2' });

    expect(saveSessionMock).toHaveBeenCalled();
    expect(status?.metadata.status).toBe('stopped');
    expect(status?.metadata.stopReason).toBe('manual-stop');
  });
});
