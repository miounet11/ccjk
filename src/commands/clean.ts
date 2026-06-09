import { resolveCodeToolType } from '../constants'
import { ensureI18nInitialized } from '../i18n'
import { runEnvironmentCleanup } from '../utils/environment-cleaner'

export interface CleanOptions {
  codeType?: string
  skipPrompt?: boolean
  aggressive?: boolean
  purgeAll?: boolean
}

export async function cleanCommand(options: CleanOptions = {}): Promise<void> {
  ensureI18nInitialized()

  const codeToolType = options.codeType
    ? resolveCodeToolType(options.codeType)
    : undefined

  await runEnvironmentCleanup({
    codeToolType,
    skipPrompt: options.skipPrompt,
    aggressive: options.aggressive,
    purgeAll: options.purgeAll,
  })
}