import matter from 'gray-matter'
import { join } from 'pathe'
import { readFile, writeFile } from '../utils/fs-operations'

export const DEFAULT_RESEARCH_PROGRAM_PATH = '.ccjk/research/program.md'
export const DEFAULT_RESEARCH_MAX_ROUNDS = 10
export const DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS = 3
export const DEFAULT_RESEARCH_BUDGET_MS = 5 * 60 * 1000

export type ResearchProgramObjective = 'maximize' | 'minimize' | 'auto'

export interface ResearchProgramFrontmatter {
  name?: string
  metric?: string
  objective?: string
  baselineCommand?: string
  candidateCommand?: string
  cwd?: string
  maxRounds?: number | string
  maxNoImproveRounds?: number | string
  budgetMs?: number | string
  targetMetric?: number | string
}

export interface ResearchProgram {
  name: string
  metric?: string
  objective: ResearchProgramObjective
  baselineCommand: string
  candidateCommand: string
  cwd: string
  maxRounds: number
  maxNoImproveRounds: number
  budgetMs: number
  targetMetric?: number
  notes: string
  programPath: string
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return fallback
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value.trim())
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function normalizeObjective(value: unknown): ResearchProgramObjective {
  return value === 'maximize' || value === 'minimize' || value === 'auto'
    ? value
    : 'auto'
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

export function resolveResearchProgramPath(programPath?: string, cwd?: string): string {
  return programPath
    ? join(cwd || process.cwd(), programPath)
    : join(cwd || process.cwd(), DEFAULT_RESEARCH_PROGRAM_PATH)
}

export function createDefaultResearchProgramTemplate(cwd?: string): string {
  const workingDirectory = cwd || process.cwd()

  return `---
name: repo-research
metric: test_pass_rate
objective: maximize
baselineCommand: pnpm test:run
candidateCommand: pnpm test:run
cwd: ${workingDirectory}
maxRounds: ${DEFAULT_RESEARCH_MAX_ROUNDS}
maxNoImproveRounds: ${DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS}
budgetMs: ${DEFAULT_RESEARCH_BUDGET_MS}
targetMetric:
---

# Research Goal

Describe the optimization target for this repository.

## Guardrails

- Keep changes scoped and measurable.
- Prefer one candidate change per round.
- Stop when the target metric is reached or repeated no-improvement rounds occur.

## Notes

Document hypotheses, constraints, and any files or modules that must not change.
`
}

export function parseResearchProgram(content: string, programPath: string = DEFAULT_RESEARCH_PROGRAM_PATH): ResearchProgram {
  const parsed = matter(content)
  const data = (parsed.data || {}) as ResearchProgramFrontmatter

  const baselineCommand = normalizeString(data.baselineCommand)
  if (!baselineCommand) {
    throw new Error(`Missing required 'baselineCommand' in ${programPath}`)
  }

  const candidateCommand = normalizeString(data.candidateCommand)
  if (!candidateCommand) {
    throw new Error(`Missing required 'candidateCommand' in ${programPath}`)
  }

  return {
    name: normalizeString(data.name) || 'repo-research',
    metric: normalizeString(data.metric),
    objective: normalizeObjective(data.objective),
    baselineCommand,
    candidateCommand,
    cwd: normalizeString(data.cwd) || process.cwd(),
    maxRounds: normalizePositiveInteger(data.maxRounds, DEFAULT_RESEARCH_MAX_ROUNDS),
    maxNoImproveRounds: normalizePositiveInteger(data.maxNoImproveRounds, DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS),
    budgetMs: normalizePositiveInteger(data.budgetMs, DEFAULT_RESEARCH_BUDGET_MS),
    targetMetric: normalizeOptionalNumber(data.targetMetric),
    notes: parsed.content.trim(),
    programPath,
  }
}

export function readResearchProgram(programPath?: string, cwd?: string): ResearchProgram {
  const resolvedPath = resolveResearchProgramPath(programPath, cwd)
  const content = readFile(resolvedPath)
  return parseResearchProgram(content, resolvedPath)
}

export function initResearchProgram(programPath?: string, cwd?: string): { programPath: string, content: string } {
  const resolvedPath = resolveResearchProgramPath(programPath, cwd)
  const content = createDefaultResearchProgramTemplate(cwd)
  writeFile(resolvedPath, content)
  return {
    programPath: resolvedPath,
    content,
  }
}
