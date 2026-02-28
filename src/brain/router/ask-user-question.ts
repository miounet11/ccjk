import process from 'node:process'

export interface AskUserOption {
  value: string
  label: string
  description?: string
}

export interface AskUserQuestion {
  id: string
  prompt: string
  options: AskUserOption[]
  defaultValue?: string
}

export interface AskUserAnswer {
  value: string
  source: 'option' | 'default'
}

export type AskUserQuestionHandler = (question: AskUserQuestion) => Promise<AskUserAnswer | null>

/**
 * Default interactive question prompt for CLI mode.
 * Returns null when no TTY is available or prompt fails.
 */
export const promptUserQuestion: AskUserQuestionHandler = async (question) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null
  }

  try {
    const inquirer = (await import('inquirer')).default
    const choices = question.options.map(option => ({
      name: option.description ? `${option.label} — ${option.description}` : option.label,
      value: option.value,
    }))

    const defaultIndex = typeof question.defaultValue === 'string'
      ? Math.max(0, choices.findIndex(choice => choice.value === question.defaultValue))
      : 0

    const { selected } = await inquirer.prompt<{ selected: string }>([
      {
        type: 'list',
        name: 'selected',
        message: question.prompt,
        choices,
        default: defaultIndex,
      },
    ])

    return {
      value: selected,
      source: 'option',
    }
  }
  catch {
    return null
  }
}
