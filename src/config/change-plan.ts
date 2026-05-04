import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import { dirname } from 'pathe'
import { formatDiff, generateDiff } from '../utils/diff-preview'
import { ensureDir, writeFileAtomic } from '../utils/fs-operations'
import { createConfigSnapshot } from './snapshot-manager'

export type ConfigChangeTarget = string
export type ConfigChangeRisk = 'safe' | 'medium' | 'dangerous'
export type ConfigChangeOperation = 'create-file' | 'write-file' | 'merge-json' | 'merge-toml' | 'delete-file'

export interface ConfigChange {
  id: string
  target: ConfigChangeTarget
  file: string
  operation: ConfigChangeOperation
  risk: ConfigChangeRisk
  reason: string
  beforeHash: string
  afterHash: string
  beforeExists: boolean
  reversible: boolean
  rollbackCommand?: string
  beforeContent?: string
  afterContent?: string
}

export interface ConfigPlan {
  id: string
  title: string
  description?: string
  createdAt: string
  risk: ConfigChangeRisk
  requiresApproval: boolean
  changes: ConfigChange[]
}

export interface ApplyConfigPlanOptions {
  createSnapshot?: boolean
}

export interface ApplyConfigPlanResult {
  appliedChanges: ConfigChange[]
  skippedChanges: ConfigChange[]
  snapshotId?: string
  snapshotPath?: string
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function readFileContentIfExists(path: string): string {
  if (!existsSync(path)) {
    return ''
  }

  try {
    return readFileSync(path, 'utf-8')
  }
  catch {
    return ''
  }
}

export function getPlanRisk(changes: ConfigChange[]): ConfigChangeRisk {
  if (changes.some(change => change.risk === 'dangerous')) {
    return 'dangerous'
  }
  if (changes.some(change => change.risk === 'medium')) {
    return 'medium'
  }
  return 'safe'
}

export function createFileChange(input: {
  target: ConfigChangeTarget
  file: string
  operation: ConfigChangeOperation
  risk: ConfigChangeRisk
  reason: string
  beforeContent?: string
  afterContent: string
}): ConfigChange {
  const beforeExists = existsSync(input.file)
  const beforeContent = input.beforeContent ?? readFileContentIfExists(input.file)
  const afterContent = input.afterContent

  return {
    id: randomUUID(),
    target: input.target,
    file: input.file,
    operation: input.operation,
    risk: input.risk,
    reason: input.reason,
    beforeHash: hashContent(beforeContent),
    afterHash: hashContent(afterContent),
    beforeExists,
    reversible: true,
    rollbackCommand: 'ccjk rollback <snapshot-id>',
    beforeContent,
    afterContent,
  }
}

export function createConfigPlan(input: {
  title: string
  description?: string
  changes: ConfigChange[]
  requiresApproval?: boolean
}): ConfigPlan {
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    createdAt: new Date().toISOString(),
    risk: getPlanRisk(input.changes),
    requiresApproval: input.requiresApproval ?? false,
    changes: input.changes,
  }
}

export function hasConfigChange(change: ConfigChange): boolean {
  return change.beforeHash !== change.afterHash
}

export function getChangedConfigChanges(plan: ConfigPlan): ConfigChange[] {
  return plan.changes.filter(hasConfigChange)
}

export function formatConfigPlan(plan: ConfigPlan, options: { color?: boolean, includeDiff?: boolean } = {}): string {
  const { color = true, includeDiff = true } = options
  const changed = getChangedConfigChanges(plan)
  const lines: string[] = []
  const riskLabel = color ? colorRisk(plan.risk) : plan.risk

  lines.push(color ? ansis.bold.cyan('Configuration Plan') : 'Configuration Plan')
  lines.push(`Plan: ${plan.title}`)
  if (plan.description) {
    lines.push(`Reason: ${plan.description}`)
  }
  lines.push(`Risk: ${riskLabel}`)
  lines.push(`Changes: ${changed.length}/${plan.changes.length}`)

  for (const change of plan.changes) {
    const status = hasConfigChange(change) ? 'change' : 'no-op'
    const target = color ? ansis.green(change.target) : change.target
    const statusText = color && status === 'change' ? ansis.yellow(status) : status
    lines.push('')
    lines.push(`${statusText}: ${target} ${change.operation}`)
    lines.push(`  File: ${change.file}`)
    lines.push(`  Why: ${change.reason}`)

    if (includeDiff && hasConfigChange(change) && change.beforeContent !== undefined && change.afterContent !== undefined) {
      const diff = generateDiff(change.beforeContent, change.afterContent, 3)
      if (diff.hasChanges) {
        lines.push(formatDiff(diff, change.file, { color, lineNumbers: false }))
      }
    }
  }

  return lines.join('\n')
}

export function applyConfigPlan(
  plan: ConfigPlan,
  options: ApplyConfigPlanOptions = {},
): ApplyConfigPlanResult {
  const changed = getChangedConfigChanges(plan)
  const skippedChanges = plan.changes.filter(change => !hasConfigChange(change))
  let snapshotId: string | undefined
  let snapshotPath: string | undefined

  if (options.createSnapshot !== false && changed.length > 0) {
    const snapshot = createConfigSnapshot(plan)
    snapshotId = snapshot.id
    snapshotPath = snapshot.path
  }

  for (const change of changed) {
    if (change.operation === 'delete-file') {
      continue
    }

    if (change.afterContent === undefined) {
      throw new Error(`Missing afterContent for config change: ${change.file}`)
    }

    ensureDir(dirname(change.file))
    writeFileAtomic(change.file, change.afterContent)
  }

  return {
    appliedChanges: changed,
    skippedChanges,
    snapshotId,
    snapshotPath,
  }
}

function colorRisk(risk: ConfigChangeRisk): string {
  if (risk === 'dangerous') {
    return ansis.red(risk)
  }
  if (risk === 'medium') {
    return ansis.yellow(risk)
  }
  return ansis.green(risk)
}
