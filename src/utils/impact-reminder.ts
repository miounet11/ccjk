import ansis from 'ansis'

export type ImpactReminderEvent
  = 'commit'
    | 'publish'
    | 'push'
    | 'sync'
    | 'release'

const EVENT_LABELS: Record<ImpactReminderEvent, string> = {
  commit: 'your changes',
  publish: 'your publish flow',
  push: 'your Git push',
  sync: 'your sync',
  release: 'your release',
}

export function showImpactReminder(event: ImpactReminderEvent): void {
  const label = EVENT_LABELS[event]

  console.log('')
  console.log(ansis.cyan('Impact tip:'))
  console.log(ansis.dim(`  After ${label}, check today's usage impact:`))
  console.log(ansis.white('  ccjk impact'))
  console.log(ansis.dim('  This helps you see today\'s token usage, savings, and trend changes immediately.'))
}
