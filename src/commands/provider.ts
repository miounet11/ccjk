import ansis from 'ansis'
import {
  listProviderProfiles,
  getActiveProviderProfileId,
  getProviderProfile,
  readCredentials,
} from '../utils/clavue-provider-profile'
import type { ClavueProviderProfile } from '../utils/clavue-provider-profile'

export interface ProviderCommandOptions {
  action?: string
  profileId?: string
  json?: boolean
}

export async function providerCommand(options: ProviderCommandOptions): Promise<void> {
  const { action, profileId, json } = options

  const subAction = action || 'list'

  if (subAction === 'list') {
    await listAction(json)
  }
  else if (subAction === 'current') {
    await currentAction(json)
  }
  else if (subAction === 'validate') {
    await validateAction(profileId, json)
  }
  else {
    // Treat unrecognized sub-action as profileId for validate
    await validateAction(subAction, json)
  }
}

// ── list ────────────────────────────────────────────────

async function listAction(json?: boolean): Promise<void> {
  const profiles = listProviderProfiles()
  const activeId = getActiveProviderProfileId()

  if (json) {
    console.log(JSON.stringify({ profiles, activeId }, null, 2))
    return
  }

  if (profiles.length === 0) {
    console.log(ansis.dim('\n  No provider profiles found.\n'))
    return
  }

  console.log(ansis.bold('\nProvider Profiles (Clavue 9.x)'))
  console.log(ansis.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))

  for (const profile of profiles) {
    const isActive = profile.id === activeId
    const prefix = isActive ? ansis.green('\u25b6') : ' '
    const activeLabel = isActive ? ansis.green(' (active)') : ''
    const modeLabel = profile.modelMode ? ansis.dim(`  ${profile.modelMode}`) : ''

    console.log(`${prefix} ${ansis.cyan(profile.id)}${activeLabel}${modeLabel}`)
    console.log(`  URL: ${ansis.dim(profile.baseUrl)}`)
    console.log(`  Auth: ${ansis.dim(profile.authType)}`)

    const mr = profile.modelRouting
    const parts: string[] = []
    if (mr.primaryModel) parts.push(`Primary: ${mr.primaryModel}`)
    if (mr.smallFastModel) parts.push(`Haiku: ${mr.smallFastModel}`)
    if (mr.subagentModel) parts.push(`Sonnet: ${mr.subagentModel}`)
    if (mr.planModel) parts.push(`Opus: ${mr.planModel}`)
    console.log(`  ${ansis.dim(parts.join(' | '))}`)
    console.log()
  }
}

// ── current ─────────────────────────────────────────────

async function currentAction(json?: boolean): Promise<void> {
  const activeId = getActiveProviderProfileId()

  if (!activeId) {
    if (json) {
      console.log(JSON.stringify({ error: 'No active profile' }))
    }
    else {
      console.log(ansis.yellow('\n  No active provider profile.\n'))
    }
    return
  }

  const profile = getProviderProfile(activeId)
  if (!profile) {
    if (json) {
      console.log(JSON.stringify({ error: `Active profile "${activeId}" not found` }))
    }
    else {
      console.log(ansis.red(`\n  Active profile "${activeId}" not found.\n`))
    }
    return
  }

  if (json) {
    console.log(JSON.stringify({ active: profile }, null, 2))
    return
  }

  renderProfileDetail(profile)
}

function renderProfileDetail(profile: ClavueProviderProfile): void {
  console.log(ansis.bold(`\nActive Profile: ${ansis.cyan(profile.name)}`))
  console.log(`  ID: ${ansis.dim(profile.id)}`)
  if (profile.modelMode) {
    console.log(`  Mode: ${ansis.dim(profile.modelMode)}`)
  }
  console.log(`  URL: ${ansis.dim(profile.baseUrl)}`)
  console.log(`  Auth: ${ansis.dim(profile.authType)}`)

  console.log('  Model Routing:')
  const mr = profile.modelRouting
  console.log(`    Primary:      ${ansis.dim(mr.primaryModel || '-')}`)
  console.log(`    Haiku:        ${ansis.dim(mr.smallFastModel || '-')}`)
  console.log(`    Sonnet:       ${ansis.dim(mr.subagentModel || '-')}`)
  console.log(`    Opus/Plan:    ${ansis.dim(mr.planModel || '-')}`)
  if (mr.subagentModel) {
    console.log(`    Subagent:     ${ansis.dim(mr.subagentModel)}`)
  }
  if (mr.generalModel) {
    console.log(`    General:      ${ansis.dim(mr.generalModel)}`)
  }

  const created = new Date(profile.createdAt).toISOString().slice(0, 10)
  const updated = new Date(profile.updatedAt).toISOString().slice(0, 10)
  console.log(`  Created: ${ansis.dim(created)}`)
  console.log(`  Updated: ${ansis.dim(updated)}`)
  console.log()
}

// ── validate ────────────────────────────────────────────

const PROBE_TIMEOUT_MS = 10_000

async function validateAction(profileId?: string, json?: boolean): Promise<void> {
  const targetId = profileId || getActiveProviderProfileId()

  if (!targetId) {
    if (json) {
      console.log(JSON.stringify({ error: 'No profile specified and no active profile' }))
    }
    else {
      console.log(ansis.yellow('\n  Please specify a profile ID or set an active profile.\n'))
    }
    return
  }

  const profile = getProviderProfile(targetId)
  if (!profile) {
    if (json) {
      console.log(JSON.stringify({ error: `Profile "${targetId}" not found` }))
    }
    else {
      console.log(ansis.red(`\n  Profile "${targetId}" not found.\n`))
    }
    return
  }

  if (json) {
    const result = await buildValidationResultJson(profile)
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(ansis.bold(`\nValidating ${ansis.cyan(targetId)}...`))

  // Probe base URL
  let probeOk = false
  let probeDisplay = ''
  try {
    const probeUrl = profile.baseUrl.replace(/\/$/, '')
    const res = await fetch(probeUrl, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    probeOk = res.ok
    probeDisplay = res.ok
      ? ansis.green(`OK (${res.status})`)
      : ansis.red(`${res.status}`)
  }
  catch (e) {
    probeDisplay = ansis.red(`Unreachable: ${(e as Error).message}`)
  }
  console.log(`  Probe ${ansis.dim(profile.baseUrl)}... ${probeDisplay}`)

  // Auth type
  console.log(`  Auth type: ${ansis.dim(profile.authType)}`)

  // Model routing slots
  const mr = profile.modelRouting
  console.log(`  Primary model: ${renderSlot(mr.primaryModel)}`)
  console.log(`  Haiku model: ${renderSlot(mr.smallFastModel)}`)
  console.log(`  Sonnet model: ${renderSlot(mr.subagentModel)}`)
  console.log(`  Opus model: ${renderSlot(mr.planModel)}`)

  // Credential check
  const credentials = readCredentials()
  const hasCredential = !!credentials.providerProfiles[profile.id]
  console.log(`  Credential: ${hasCredential ? ansis.green('stored \u2713') : ansis.red('missing')}`)

  // Overall status
  const issues: string[] = []
  if (!probeOk) issues.push('base URL unreachable')
  if (!mr.primaryModel) issues.push('primary model unset')
  if (!hasCredential) issues.push('credential missing')

  const statusLabel = issues.length === 0
    ? ansis.green('Healthy')
    : ansis.yellow(`Issues: ${issues.join(', ')}`)
  console.log(`Status: ${statusLabel}`)
  console.log()
}

function renderSlot(value: string | undefined): string {
  if (value) return ansis.green(`${value} (set)`)
  return ansis.yellow('(unset)')
}

async function buildValidationResultJson(profile: ClavueProviderProfile): Promise<Record<string, unknown>> {
  let probe: { ok: boolean; status?: number; error?: string } = { ok: false }
  try {
    const probeUrl = profile.baseUrl.replace(/\/$/, '')
    const res = await fetch(probeUrl, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    probe = { ok: res.ok, status: res.status }
  }
  catch (e) {
    probe = { ok: false, error: (e as Error).message }
  }

  const credentials = readCredentials()
  const hasCredential = !!credentials.providerProfiles[profile.id]
  const mr = profile.modelRouting
  const probeOk = probe.ok

  return {
    profile: profile.id,
    baseUrl: profile.baseUrl,
    probe,
    authType: profile.authType,
    modelRouting: {
      primaryModel: { value: mr.primaryModel || null, set: !!mr.primaryModel },
      haikuModel: { value: mr.smallFastModel || null, set: !!mr.smallFastModel },
      sonnetModel: { value: mr.subagentModel || null, set: !!mr.subagentModel },
      opusModel: { value: mr.planModel || null, set: !!mr.planModel },
    },
    credentialStored: hasCredential,
    healthy: probeOk && !!mr.primaryModel && hasCredential,
  }
}
