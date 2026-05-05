import type { ResearchProgram, ResearchProgramObjective } from './research-program';
import type { ResearchComparisonSummary, ResearchObjective, ResearchRunResult, ResearchSessionStatus } from './research-runner';
import { nanoid } from 'nanoid';
import { TaskPersistence } from '../brain/task-persistence';
import {
  readResearchProgram,

} from './research-program';
import {
  getResearchReport,
  getResearchSessionStatus,

  runResearchExperiment,
} from './research-runner';

const RESEARCH_LOOP_SESSION_KIND = 'research-loop';
const DEFAULT_FAILURE_STREAK_LIMIT = 2;

export type ResearchLoopStatusValue = 'running' | 'stopped' | 'completed' | 'failed';
export type ResearchLoopStopReason
  = | 'max-rounds-reached'
    | 'max-no-improve-rounds-reached'
    | 'target-metric-reached'
    | 'baseline-failed'
    | 'candidate-failed-repeatedly'
    | 'manual-stop'
    | 'resume-complete';

export interface ResearchLoopCliOverrides {
  maxRounds?: number;
  maxNoImproveRounds?: number;
  targetMetric?: number;
  budgetMs?: number;
  cwd?: string;
}

export interface ResearchLoopSessionMetadata {
  kind: 'research-loop';
  name: string;
  programPath: string;
  metric?: string;
  objective: ResearchProgramObjective;
  cwd: string;
  budgetMs: number;
  maxRounds: number;
  maxNoImproveRounds: number;
  targetMetric?: number;
  status: ResearchLoopStatusValue;
  baselineSessionId?: string;
  currentRound: number;
  bestSessionId?: string;
  bestMetricValue?: number;
  acceptedRoundSessionIds: string[];
  rejectedRoundSessionIds: string[];
  roundSessionIds: string[];
  noImproveStreak: number;
  failureStreak: number;
  stopReason?: ResearchLoopStopReason;
  createdAt: string;
  updatedAt: string;
  lastRoundSessionId?: string;
  notes?: string;
}

export interface ResearchLoopRoundRecord {
  round: number;
  sessionId: string;
  name: string;
  status: string;
  verdict: string;
  metricName?: string;
  metricValue?: number;
  accepted: boolean;
  objective: ResearchObjective;
  command: string;
  reason: string;
  baselineSessionId?: string;
  comparison?: ResearchComparisonSummary;
  createdAt: string;
}

export interface ResearchLoopStatus {
  sessionId: string;
  metadata: ResearchLoopSessionMetadata;
  baseline?: ResearchRunResult | null;
  latestRound?: ResearchLoopRoundRecord;
  rounds: ResearchLoopRoundRecord[];
}

export interface ResearchLoopReport {
  sessionId: string;
  name: string;
  status: ResearchLoopStatusValue;
  stopReason?: ResearchLoopStopReason;
  currentRound: number;
  maxRounds: number;
  noImproveStreak: number;
  maxNoImproveRounds: number;
  acceptedRounds: number;
  rejectedRounds: number;
  bestSessionId?: string;
  bestMetricValue?: number;
  metric?: string;
  objective: ResearchProgramObjective;
  targetMetric?: number;
  baselineSessionId?: string;
  createdAt: string;
  updatedAt: string;
  content: string;
}

export interface StartResearchLoopOptions {
  programPath?: string;
  cwd?: string;
  dbPath?: string;
  overrides?: ResearchLoopCliOverrides;
}

export interface RunResearchRoundOptions extends StartResearchLoopOptions {
  sessionId?: string;
}

export interface ResumeResearchLoopOptions extends StartResearchLoopOptions {
  sessionId?: string;
}

export interface StopResearchLoopOptions {
  sessionId?: string;
  dbPath?: string;
}

function createPersistence(dbPath?: string): TaskPersistence {
  return new TaskPersistence(dbPath);
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function toOptionalFiniteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function applyProgramOverrides(program: ResearchProgram, overrides: ResearchLoopCliOverrides = {}): ResearchProgram {
  return {
    ...program,
    cwd: overrides.cwd || program.cwd,
    budgetMs: toPositiveInteger(overrides.budgetMs, program.budgetMs),
    maxRounds: toPositiveInteger(overrides.maxRounds, program.maxRounds),
    maxNoImproveRounds: toPositiveInteger(overrides.maxNoImproveRounds, program.maxNoImproveRounds),
    targetMetric: toOptionalFiniteNumber(overrides.targetMetric) ?? program.targetMetric,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function toObjective(value: ResearchProgramObjective, metricName?: string): ResearchObjective {
  if (value === 'maximize' || value === 'minimize') {
    return value;
  }

  const normalized = (metricName || '').toLowerCase();
  if (!normalized) {
    return 'maximize';
  }

  const lowerIsBetter = ['loss', 'error', 'bpb', 'perplexity', 'ppl', 'latency', 'duration', 'time', 'cost', 'price', 'wer', 'cer'];
  return lowerIsBetter.some(keyword => normalized.includes(keyword)) ? 'minimize' : 'maximize';
}

function isAcceptedResult(result: ResearchRunResult): boolean {
  return result.verdict === 'PASS';
}

function cloneLoopMetadata(metadata: ResearchLoopSessionMetadata, patch: Partial<ResearchLoopSessionMetadata> = {}): ResearchLoopSessionMetadata {
  return {
    ...metadata,
    ...patch,
    acceptedRoundSessionIds: patch.acceptedRoundSessionIds || [...metadata.acceptedRoundSessionIds],
    rejectedRoundSessionIds: patch.rejectedRoundSessionIds || [...metadata.rejectedRoundSessionIds],
    roundSessionIds: patch.roundSessionIds || [...metadata.roundSessionIds],
    updatedAt: patch.updatedAt || nowIso(),
  };
}

function ensureLoopMetadata(raw: Record<string, any>, sessionId: string): ResearchLoopSessionMetadata {
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso();
  return {
    kind: 'research-loop',
    name: typeof raw.name === 'string' && raw.name ? raw.name : sessionId,
    programPath: typeof raw.programPath === 'string' ? raw.programPath : '.ccjk/research/program.md',
    metric: typeof raw.metric === 'string' && raw.metric ? raw.metric : undefined,
    objective: raw.objective === 'maximize' || raw.objective === 'minimize' || raw.objective === 'auto' ? raw.objective : 'auto',
    cwd: typeof raw.cwd === 'string' && raw.cwd ? raw.cwd : process.cwd(),
    budgetMs: toPositiveInteger(raw.budgetMs, 5 * 60 * 1000),
    maxRounds: toPositiveInteger(raw.maxRounds, 10),
    maxNoImproveRounds: toPositiveInteger(raw.maxNoImproveRounds, 3),
    targetMetric: typeof raw.targetMetric === 'number' && Number.isFinite(raw.targetMetric) ? raw.targetMetric : undefined,
    status: raw.status === 'running' || raw.status === 'stopped' || raw.status === 'completed' || raw.status === 'failed' ? raw.status : 'running',
    baselineSessionId: typeof raw.baselineSessionId === 'string' && raw.baselineSessionId ? raw.baselineSessionId : undefined,
    currentRound: toPositiveInteger(raw.currentRound, 0) - 1 >= 0 ? toPositiveInteger(raw.currentRound, 0) : 0,
    bestSessionId: typeof raw.bestSessionId === 'string' && raw.bestSessionId ? raw.bestSessionId : undefined,
    bestMetricValue: typeof raw.bestMetricValue === 'number' && Number.isFinite(raw.bestMetricValue) ? raw.bestMetricValue : undefined,
    acceptedRoundSessionIds: Array.isArray(raw.acceptedRoundSessionIds) ? raw.acceptedRoundSessionIds.filter((value): value is string => typeof value === 'string') : [],
    rejectedRoundSessionIds: Array.isArray(raw.rejectedRoundSessionIds) ? raw.rejectedRoundSessionIds.filter((value): value is string => typeof value === 'string') : [],
    roundSessionIds: Array.isArray(raw.roundSessionIds) ? raw.roundSessionIds.filter((value): value is string => typeof value === 'string') : [],
    noImproveStreak: typeof raw.noImproveStreak === 'number' && raw.noImproveStreak >= 0 ? raw.noImproveStreak : 0,
    failureStreak: typeof raw.failureStreak === 'number' && raw.failureStreak >= 0 ? raw.failureStreak : 0,
    stopReason: raw.stopReason,
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt,
    lastRoundSessionId: typeof raw.lastRoundSessionId === 'string' && raw.lastRoundSessionId ? raw.lastRoundSessionId : undefined,
    notes: typeof raw.notes === 'string' && raw.notes ? raw.notes : undefined,
  };
}

function getLoopSessionRecord(sessionId: string, dbPath?: string): { id: string; createdAt: number; updatedAt: number; metadata: ResearchLoopSessionMetadata } | null {
  const persistence = createPersistence(dbPath);
  const session = persistence.getSession(sessionId);
  if (!session || session.metadata?.kind !== RESEARCH_LOOP_SESSION_KIND) {
    return null;
  }

  return {
    id: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    metadata: ensureLoopMetadata(session.metadata, session.id),
  };
}

function getLatestLoopSession(dbPath?: string): { id: string; createdAt: number; metadata: ResearchLoopSessionMetadata } | null {
  const persistence = createPersistence(dbPath);
  const session = persistence
    .listSessions(100)
    .find(item => item.metadata?.kind === RESEARCH_LOOP_SESSION_KIND);

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    createdAt: session.createdAt,
    metadata: ensureLoopMetadata(session.metadata, session.id),
  };
}

function getResolvedLoopSessionId(sessionId: string | undefined, dbPath?: string): string | undefined {
  return sessionId || getLatestLoopSession(dbPath)?.id;
}

function saveLoopMetadata(sessionId: string, metadata: ResearchLoopSessionMetadata, dbPath?: string): ResearchLoopSessionMetadata {
  const persistence = createPersistence(dbPath);
  const normalized = ensureLoopMetadata({ ...metadata, updatedAt: nowIso() }, sessionId);
  persistence.saveSession(sessionId, normalized);
  return normalized;
}

function buildRoundRecord(round: number, result: ResearchRunResult): ResearchLoopRoundRecord {
  return {
    round,
    sessionId: result.sessionId,
    name: result.name,
    status: result.status,
    verdict: result.verdict,
    metricName: result.metricName,
    metricValue: result.metricValue,
    accepted: isAcceptedResult(result),
    objective: result.objective,
    command: result.command,
    reason: result.verdictReason,
    baselineSessionId: result.baselineSessionId,
    comparison: result.comparison,
    createdAt: result.createdAt,
  };
}

function getRoundRecords(metadata: ResearchLoopSessionMetadata, dbPath?: string): ResearchLoopRoundRecord[] {
  return metadata.roundSessionIds
    .map((sessionId, index): ResearchLoopRoundRecord | null => {
      const report = getResearchReport(sessionId, dbPath);
      if (!report) {
        return null;
      }

      const record: ResearchLoopRoundRecord = {
        round: index + 1,
        sessionId,
        name: report.name,
        status: report.status,
        verdict: report.verdict,
        metricName: report.metricName,
        metricValue: report.metricValue,
        accepted: metadata.acceptedRoundSessionIds.includes(sessionId),
        objective: report.objective || toObjective(metadata.objective, metadata.metric),
        command: report.command,
        reason: report.verdictReason,
        baselineSessionId: report.baselineSessionId,
        comparison: report.comparison,
        createdAt: report.createdAt,
      };

      return record;
    })
    .filter((value): value is ResearchLoopRoundRecord => value !== null);
}

function isTargetReached(metricValue: number | undefined, objective: ResearchObjective, targetMetric: number | undefined): boolean {
  if (metricValue === undefined || targetMetric === undefined) {
    return false;
  }

  return objective === 'minimize' ? metricValue <= targetMetric : metricValue >= targetMetric;
}

function evaluateLoopStopCondition(input: {
  metadata: ResearchLoopSessionMetadata;
  latestResult?: ResearchRunResult;
  program: ResearchProgram;
  phase?: 'baseline' | 'round';
}): { shouldStop: boolean; reason?: ResearchLoopStopReason; status?: ResearchLoopStatusValue } {
  const objective = toObjective(input.metadata.objective, input.metadata.metric);

  if (input.metadata.status === 'completed' || input.metadata.status === 'failed') {
    return { shouldStop: true, reason: input.metadata.stopReason, status: input.metadata.status };
  }

  if (input.metadata.status === 'stopped') {
    return { shouldStop: true, reason: input.metadata.stopReason || 'manual-stop', status: 'stopped' };
  }

  if (input.phase === 'baseline' && input.latestResult && !input.latestResult.success) {
    return { shouldStop: true, reason: 'baseline-failed', status: 'failed' };
  }

  if (input.metadata.currentRound >= input.program.maxRounds) {
    return { shouldStop: true, reason: 'max-rounds-reached', status: 'completed' };
  }

  if (input.metadata.noImproveStreak >= input.program.maxNoImproveRounds) {
    return { shouldStop: true, reason: 'max-no-improve-rounds-reached', status: 'completed' };
  }

  if (isTargetReached(input.metadata.bestMetricValue, objective, input.program.targetMetric)) {
    return { shouldStop: true, reason: 'target-metric-reached', status: 'completed' };
  }

  if (input.phase === 'round' && input.metadata.failureStreak >= DEFAULT_FAILURE_STREAK_LIMIT) {
    return { shouldStop: true, reason: 'candidate-failed-repeatedly', status: 'failed' };
  }

  return { shouldStop: false };
}

function createLoopSession(program: ResearchProgram, dbPath?: string): { sessionId: string; metadata: ResearchLoopSessionMetadata } {
  const sessionId = `research-loop-${Date.now()}-${nanoid(6)}`;
  const createdAt = nowIso();
  const metadata: ResearchLoopSessionMetadata = {
    kind: 'research-loop',
    name: program.name,
    programPath: program.programPath,
    metric: program.metric,
    objective: program.objective,
    cwd: program.cwd,
    budgetMs: program.budgetMs,
    maxRounds: program.maxRounds,
    maxNoImproveRounds: program.maxNoImproveRounds,
    targetMetric: program.targetMetric,
    status: 'running',
    baselineSessionId: undefined,
    currentRound: 0,
    bestSessionId: undefined,
    bestMetricValue: undefined,
    acceptedRoundSessionIds: [],
    rejectedRoundSessionIds: [],
    roundSessionIds: [],
    noImproveStreak: 0,
    failureStreak: 0,
    createdAt,
    updatedAt: createdAt,
    notes: program.notes,
  };

  return {
    sessionId,
    metadata: saveLoopMetadata(sessionId, metadata, dbPath),
  };
}

async function ensureBaseline(sessionId: string, metadata: ResearchLoopSessionMetadata, program: ResearchProgram, dbPath?: string): Promise<{ metadata: ResearchLoopSessionMetadata; baseline: ResearchRunResult }> {
  if (metadata.baselineSessionId) {
    const report = getResearchReport(metadata.baselineSessionId, dbPath);
    if (report) {
      return {
        metadata,
        baseline: {
          sessionId: report.sessionId,
          taskId: '',
          name: report.name,
          command: report.command,
          cwd: report.cwd,
          metricName: report.metricName,
          metricValue: report.metricValue,
          success: report.status === 'completed',
          status: report.status as 'completed' | 'failed' | 'timeout',
          exitCode: report.exitCode,
          stdout: '',
          stderr: '',
          durationMs: report.durationMs,
          phase: 'baseline',
          objective: report.objective || toObjective(program.objective, program.metric),
          verdict: report.verdict,
          verdictReason: report.verdictReason,
          baselineSessionId: report.baselineSessionId,
          comparison: report.comparison,
          phaseHistory: report.phaseHistory,
          createdAt: report.createdAt,
        },
      };
    }
  }

  const baseline = await runResearchExperiment({
    name: `${program.name}-baseline`,
    command: program.baselineCommand,
    metricName: program.metric,
    budgetMs: program.budgetMs,
    cwd: program.cwd,
    objective: program.objective,
    dbPath,
  });

  const nextMetadata = cloneLoopMetadata(metadata, {
    baselineSessionId: baseline.sessionId,
    bestSessionId: baseline.sessionId,
    bestMetricValue: baseline.metricValue,
    failureStreak: baseline.success ? 0 : metadata.failureStreak + 1,
  });

  return {
    metadata: saveLoopMetadata(sessionId, nextMetadata, dbPath),
    baseline,
  };
}

async function executeResearchRound(sessionId: string, metadata: ResearchLoopSessionMetadata, program: ResearchProgram, dbPath?: string): Promise<{ metadata: ResearchLoopSessionMetadata; result: ResearchRunResult; round: ResearchLoopRoundRecord }> {
  const roundNumber = metadata.currentRound + 1;
  const baselineSessionId = metadata.bestSessionId || metadata.baselineSessionId;
  const result = await runResearchExperiment({
    name: `${program.name}-round-${roundNumber}`,
    command: program.candidateCommand,
    metricName: program.metric,
    budgetMs: program.budgetMs,
    cwd: program.cwd,
    objective: program.objective,
    baselineSessionId,
    dbPath,
  });

  const accepted = isAcceptedResult(result);
  const acceptedRoundSessionIds = accepted
    ? [...metadata.acceptedRoundSessionIds, result.sessionId]
    : [...metadata.acceptedRoundSessionIds];
  const rejectedRoundSessionIds = accepted
    ? [...metadata.rejectedRoundSessionIds]
    : [...metadata.rejectedRoundSessionIds, result.sessionId];
  const bestSessionId = accepted ? result.sessionId : metadata.bestSessionId;
  const bestMetricValue = accepted ? result.metricValue : metadata.bestMetricValue;
  const nextMetadata = cloneLoopMetadata(metadata, {
    currentRound: roundNumber,
    bestSessionId,
    bestMetricValue,
    roundSessionIds: [...metadata.roundSessionIds, result.sessionId],
    acceptedRoundSessionIds,
    rejectedRoundSessionIds,
    noImproveStreak: accepted ? 0 : metadata.noImproveStreak + 1,
    failureStreak: result.success ? 0 : metadata.failureStreak + 1,
    lastRoundSessionId: result.sessionId,
  });

  return {
    metadata: saveLoopMetadata(sessionId, nextMetadata, dbPath),
    result,
    round: buildRoundRecord(roundNumber, result),
  };
}

function getResearchLoopStatusInternal(sessionId: string, dbPath?: string): ResearchLoopStatus | null {
  const loopSession = getLoopSessionRecord(sessionId, dbPath);
  if (!loopSession) {
    return null;
  }

  const baselineReport = loopSession.metadata.baselineSessionId
    ? getResearchReport(loopSession.metadata.baselineSessionId, dbPath)
    : null;
  const rounds = getRoundRecords(loopSession.metadata, dbPath);

  return {
    sessionId,
    metadata: loopSession.metadata,
    baseline: baselineReport
      ? {
          sessionId: baselineReport.sessionId,
          taskId: '',
          name: baselineReport.name,
          command: baselineReport.command,
          cwd: baselineReport.cwd,
          metricName: baselineReport.metricName,
          metricValue: baselineReport.metricValue,
          success: baselineReport.status === 'completed',
          status: baselineReport.status as 'completed' | 'failed' | 'timeout',
          exitCode: baselineReport.exitCode,
          stdout: '',
          stderr: '',
          durationMs: baselineReport.durationMs,
          phase: 'baseline',
          objective: baselineReport.objective || toObjective(loopSession.metadata.objective, loopSession.metadata.metric),
          verdict: baselineReport.verdict,
          verdictReason: baselineReport.verdictReason,
          baselineSessionId: baselineReport.baselineSessionId,
          comparison: baselineReport.comparison,
          phaseHistory: baselineReport.phaseHistory,
          createdAt: baselineReport.createdAt,
        }
      : null,
    latestRound: rounds[rounds.length - 1],
    rounds,
  };
}

export async function startResearchLoop(options: StartResearchLoopOptions = {}): Promise<ResearchLoopStatus> {
  const program = applyProgramOverrides(readResearchProgram(options.programPath, options.cwd), options.overrides);
  const { sessionId } = createLoopSession(program, options.dbPath);
  return await resumeResearchLoop({ ...options, sessionId });
}

export async function runResearchRound(options: RunResearchRoundOptions = {}): Promise<ResearchLoopStatus> {
  const resolvedSessionId = getResolvedLoopSessionId(options.sessionId, options.dbPath);
  if (!resolvedSessionId) {
    throw new Error('No research loop session found.');
  }

  const loopSession = getLoopSessionRecord(resolvedSessionId, options.dbPath);
  if (!loopSession) {
    throw new Error(`Research loop session not found: ${resolvedSessionId}`);
  }

  const program = applyProgramOverrides(readResearchProgram(loopSession.metadata.programPath, options.cwd), options.overrides);
  let metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(loopSession.metadata, { status: 'running', stopReason: undefined }), options.dbPath);

  const baselineState = await ensureBaseline(resolvedSessionId, metadata, program, options.dbPath);
  metadata = baselineState.metadata;

  const stopAfterBaseline = evaluateLoopStopCondition({ metadata, latestResult: baselineState.baseline, program, phase: 'baseline' });
  if (stopAfterBaseline.shouldStop) {
    metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(metadata, {
      status: stopAfterBaseline.status || metadata.status,
      stopReason: stopAfterBaseline.reason,
    }), options.dbPath);
    return getResearchLoopStatusInternal(resolvedSessionId, options.dbPath)!;
  }

  const roundState = await executeResearchRound(resolvedSessionId, metadata, program, options.dbPath);
  metadata = roundState.metadata;
  const stopState = evaluateLoopStopCondition({ metadata, latestResult: roundState.result, program, phase: 'round' });

  if (stopState.shouldStop) {
    metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(metadata, {
      status: stopState.status || metadata.status,
      stopReason: stopState.reason,
    }), options.dbPath);
  }

  return getResearchLoopStatusInternal(resolvedSessionId, options.dbPath)!;
}

export async function resumeResearchLoop(options: ResumeResearchLoopOptions = {}): Promise<ResearchLoopStatus> {
  const resolvedSessionId = getResolvedLoopSessionId(options.sessionId, options.dbPath);
  if (!resolvedSessionId) {
    throw new Error('No research loop session found.');
  }

  const loopSession = getLoopSessionRecord(resolvedSessionId, options.dbPath);
  if (!loopSession) {
    throw new Error(`Research loop session not found: ${resolvedSessionId}`);
  }

  const program = applyProgramOverrides(readResearchProgram(loopSession.metadata.programPath, options.cwd), options.overrides);
  let metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(loopSession.metadata, {
    status: loopSession.metadata.status === 'completed' || loopSession.metadata.status === 'failed'
      ? loopSession.metadata.status
      : 'running',
    stopReason: loopSession.metadata.status === 'stopped' ? undefined : loopSession.metadata.stopReason,
  }), options.dbPath);

  const baselineState = await ensureBaseline(resolvedSessionId, metadata, program, options.dbPath);
  metadata = baselineState.metadata;

  while (true) {
    const stopBeforeRound = evaluateLoopStopCondition({ metadata, program });
    if (stopBeforeRound.shouldStop) {
      metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(metadata, {
        status: stopBeforeRound.status || metadata.status,
        stopReason: stopBeforeRound.reason,
      }), options.dbPath);
      return getResearchLoopStatusInternal(resolvedSessionId, options.dbPath)!;
    }

    const roundState = await executeResearchRound(resolvedSessionId, metadata, program, options.dbPath);
    metadata = roundState.metadata;

    const stopAfterRound = evaluateLoopStopCondition({ metadata, latestResult: roundState.result, program, phase: 'round' });
    if (stopAfterRound.shouldStop) {
      metadata = saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(metadata, {
        status: stopAfterRound.status || metadata.status,
        stopReason: stopAfterRound.reason || 'resume-complete',
      }), options.dbPath);
      return getResearchLoopStatusInternal(resolvedSessionId, options.dbPath)!;
    }
  }
}

export function stopResearchLoop(options: StopResearchLoopOptions = {}): ResearchLoopStatus | null {
  const resolvedSessionId = getResolvedLoopSessionId(options.sessionId, options.dbPath);
  if (!resolvedSessionId) {
    return null;
  }

  const loopSession = getLoopSessionRecord(resolvedSessionId, options.dbPath);
  if (!loopSession) {
    return null;
  }

  saveLoopMetadata(resolvedSessionId, cloneLoopMetadata(loopSession.metadata, {
    status: 'stopped',
    stopReason: 'manual-stop',
  }), options.dbPath);

  return getResearchLoopStatusInternal(resolvedSessionId, options.dbPath);
}

export function getResearchLoopStatus(sessionId?: string, dbPath?: string): ResearchLoopStatus | null {
  const resolvedSessionId = getResolvedLoopSessionId(sessionId, dbPath);
  if (!resolvedSessionId) {
    return null;
  }

  return getResearchLoopStatusInternal(resolvedSessionId, dbPath);
}

export function getResearchLoopReport(sessionId?: string, dbPath?: string): ResearchLoopReport | null {
  const status = getResearchLoopStatus(sessionId, dbPath);
  if (!status) {
    return null;
  }

  const lines: string[] = [];
  lines.push('# CCJK Research Loop Report');
  lines.push('');
  lines.push(`**Session**: ${status.sessionId}`);
  lines.push(`**Name**: ${status.metadata.name}`);
  lines.push(`**Status**: ${status.metadata.status}`);
  lines.push(`**Stop Reason**: ${status.metadata.stopReason || 'running'}`);
  lines.push(`**Rounds**: ${status.metadata.currentRound}/${status.metadata.maxRounds}`);
  lines.push(`**No-Improve Streak**: ${status.metadata.noImproveStreak}/${status.metadata.maxNoImproveRounds}`);
  lines.push(`**Metric**: ${status.metadata.metric || 'not configured'}`);
  lines.push(`**Objective**: ${status.metadata.objective}`);
  lines.push(`**Target Metric**: ${status.metadata.targetMetric ?? 'not configured'}`);
  lines.push(`**Best Session**: ${status.metadata.bestSessionId || 'none'}`);
  lines.push(`**Best Metric**: ${status.metadata.bestMetricValue ?? 'not found'}`);
  lines.push(`**Created**: ${status.metadata.createdAt}`);
  lines.push(`**Updated**: ${status.metadata.updatedAt}`);

  if (status.baseline) {
    lines.push('');
    lines.push('## Baseline');
    lines.push('');
    lines.push(`- Session: ${status.baseline.sessionId}`);
    lines.push(`- Verdict: ${status.baseline.verdict}`);
    lines.push(`- Metric: ${status.baseline.metricName ? `${status.baseline.metricName}=${status.baseline.metricValue ?? 'not found'}` : 'not configured'}`);
    lines.push(`- Reason: ${status.baseline.verdictReason}`);
  }

  if (status.rounds.length > 0) {
    lines.push('');
    lines.push('## Rounds');
    lines.push('');
    for (const round of status.rounds) {
      lines.push(`- Round ${round.round}: ${round.sessionId} · ${round.verdict} · ${round.metricName ? `${round.metricName}=${round.metricValue ?? 'not found'}` : 'no metric'} · ${round.accepted ? 'accepted' : 'rejected'}`);
    }
  }

  return {
    sessionId: status.sessionId,
    name: status.metadata.name,
    status: status.metadata.status,
    stopReason: status.metadata.stopReason,
    currentRound: status.metadata.currentRound,
    maxRounds: status.metadata.maxRounds,
    noImproveStreak: status.metadata.noImproveStreak,
    maxNoImproveRounds: status.metadata.maxNoImproveRounds,
    acceptedRounds: status.metadata.acceptedRoundSessionIds.length,
    rejectedRounds: status.metadata.rejectedRoundSessionIds.length,
    bestSessionId: status.metadata.bestSessionId,
    bestMetricValue: status.metadata.bestMetricValue,
    metric: status.metadata.metric,
    objective: status.metadata.objective,
    targetMetric: status.metadata.targetMetric,
    baselineSessionId: status.metadata.baselineSessionId,
    createdAt: status.metadata.createdAt,
    updatedAt: status.metadata.updatedAt,
    content: lines.join('\n'),
  };
}

export function getResearchLoopSessionStatus(sessionId: string, dbPath?: string): ResearchSessionStatus | null {
  return getResearchSessionStatus(sessionId, dbPath);
}
