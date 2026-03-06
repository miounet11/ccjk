import type { ClaudeSettings } from '../types/config'

export interface AdaptiveModelInput {
  primaryModel?: string
  defaultHaikuModel?: string
  defaultSonnetModel?: string
  defaultOpusModel?: string
}

export function applyAdaptiveModelEnv(
  env: NonNullable<ClaudeSettings['env']>,
  models: AdaptiveModelInput,
): void {
  const primaryModel = models.primaryModel?.trim()
  const defaultHaikuModel = models.defaultHaikuModel?.trim()
  const defaultSonnetModel = models.defaultSonnetModel?.trim()
  const defaultOpusModel = models.defaultOpusModel?.trim()

  if (primaryModel) {
    env.ANTHROPIC_MODEL = primaryModel
  }

  if (defaultHaikuModel) {
    env.ANTHROPIC_SMALL_FAST_MODEL = defaultHaikuModel
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = defaultHaikuModel
  }

  if (defaultSonnetModel) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = defaultSonnetModel
  }

  if (defaultOpusModel) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = defaultOpusModel
  }
}
