export interface ClaudeFamilyModelSlots {
  primaryModel?: string
  haikuModel?: string
  sonnetModel?: string
  opusModel?: string
}

export interface ResolveClaudeFamilyModelSlotsOptions {
  defaultModels?: readonly unknown[]
  selectedModel?: unknown
}

function normalizeExactModelId(model: unknown): string | undefined {
  if (typeof model !== 'string') {
    return undefined
  }

  const trimmed = model.trim()
  return trimmed || undefined
}

/**
 * Resolve Claude-family model routing slots without fuzzy matching.
 *
 * Provider presets use positional slots:
 *   [primary, haiku, sonnet, opus]
 *
 * A direct user selection is an exact single-model lock, so every slot receives
 * that selected model ID. This avoids a Clavue quick-selection silently mixing
 * a selected model with unrelated provider defaults.
 */
export function resolveClaudeFamilyModelSlots(
  options: ResolveClaudeFamilyModelSlotsOptions = {},
): ClaudeFamilyModelSlots {
  const selectedModel = normalizeExactModelId(options.selectedModel)
  if (selectedModel) {
    return {
      primaryModel: selectedModel,
      haikuModel: selectedModel,
      sonnetModel: selectedModel,
      opusModel: selectedModel,
    }
  }

  const defaults = options.defaultModels || []
  const primaryModel = normalizeExactModelId(defaults[0])
  const haikuModel = normalizeExactModelId(defaults[1]) || primaryModel
  const sonnetModel = normalizeExactModelId(defaults[2]) || primaryModel
  const opusModel = normalizeExactModelId(defaults[3]) || primaryModel

  return {
    primaryModel,
    haikuModel,
    sonnetModel,
    opusModel,
  }
}
