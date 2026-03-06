import type { SupportedLang } from '../constants'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../constants'
import { writeJsonConfig } from './json-config'

export const ORCHESTRATION_LEVELS = ['off', 'minimal', 'standard', 'max'] as const
export type OrchestrationLevel = (typeof ORCHESTRATION_LEVELS)[number]

export interface OrchestrationPolicy {
  version: string
  enabled: boolean
  level: OrchestrationLevel
  language: SupportedLang
  defaults: {
    planForNonTrivial: boolean
    useSubagentsForResearch: boolean
    verifyBeforeDone: boolean
    rootCauseFirst: boolean
    lessonsLoop: boolean
  }
  generatedAt: string
  source: 'init' | 'simplified-init' | 'silent-init'
}

export function parseOrchestrationLevel(value?: string): OrchestrationLevel {
  if (!value) {
    return 'max'
  }

  const normalized = value.trim().toLowerCase()
  if (ORCHESTRATION_LEVELS.includes(normalized as OrchestrationLevel)) {
    return normalized as OrchestrationLevel
  }

  throw new Error(`Invalid orchestration level: ${value}. Valid values: ${ORCHESTRATION_LEVELS.join(', ')}`)
}

function buildDefaults(level: OrchestrationLevel): OrchestrationPolicy['defaults'] {
  if (level === 'off') {
    return {
      planForNonTrivial: false,
      useSubagentsForResearch: false,
      verifyBeforeDone: false,
      rootCauseFirst: true,
      lessonsLoop: false,
    }
  }

  if (level === 'minimal') {
    return {
      planForNonTrivial: true,
      useSubagentsForResearch: false,
      verifyBeforeDone: true,
      rootCauseFirst: true,
      lessonsLoop: false,
    }
  }

  if (level === 'max') {
    return {
      planForNonTrivial: true,
      useSubagentsForResearch: true,
      verifyBeforeDone: true,
      rootCauseFirst: true,
      lessonsLoop: true,
    }
  }

  return {
    planForNonTrivial: true,
    useSubagentsForResearch: true,
    verifyBeforeDone: true,
    rootCauseFirst: true,
    lessonsLoop: true,
  }
}

export function resolveOrchestrationLevelFromRuntime(runtime?: {
  isCI?: boolean
  isContainer?: boolean
  isSSH?: boolean
}): OrchestrationLevel {
  if (!runtime) {
    return 'max'
  }

  if (runtime.isCI || runtime.isContainer) {
    return 'minimal'
  }

  if (runtime.isSSH) {
    return 'minimal'
  }

  return 'max'
}

export function writeOrchestrationPolicy(params: {
  level: OrchestrationLevel
  language: SupportedLang
  source: OrchestrationPolicy['source']
}): string {
  const filePath = join(CCJK_CONFIG_DIR, 'orchestration.json')
  const policy: OrchestrationPolicy = {
    version: '1.0.0',
    enabled: params.level !== 'off',
    level: params.level,
    language: params.language,
    defaults: buildDefaults(params.level),
    generatedAt: new Date().toISOString(),
    source: params.source,
  }

  writeJsonConfig(filePath, policy, { atomic: true })
  return filePath
}
