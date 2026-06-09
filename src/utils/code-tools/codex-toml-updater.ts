/**
 * Codex TOML Updater Module
 *
 * Provides targeted TOML editing capabilities for Codex configuration.
 * Uses @rainbowatcher/toml-edit-js for format-preserving modifications.
 *
 * Key principle: Only modify what needs to be modified, preserve everything else.
 * - API modifications should NOT affect MCP configurations
 * - MCP modifications should NOT affect API configurations
 */

import type { CodexMcpService, CodexProvider } from './codex'
import { CODEX_CONFIG_FILE, CODEX_DIR } from '../../constants'
import { ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { normalizeTomlPath } from '../platform'
import { syncCodexProfileFileAfterApiUpdate } from '../codex-profile-v2'
import { editToml, parseToml } from '../toml-edit'

/**
 * Update top-level TOML fields using regex-based replacement
 * This is needed because toml-edit's edit function requires dot-notation paths,
 * and top-level fields like 'model' don't work well with it.
 *
 * @param content - Original TOML content
 * @param field - Field name (e.g., 'model', 'model_provider')
 * @param value - New value (string or null to remove)
 * @param options - Additional options
 * @param options.commented - Whether to comment out the field
 * @returns Updated TOML content
 */
export function updateTopLevelTomlField(
  content: string,
  field: string,
  value: string | null,
  options: { commented?: boolean } = {},
): string {
  // Handle empty or undefined content
  if (!content) {
    if (value === null) {
      return ''
    }
    const commentPrefix = options.commented ? '# ' : ''
    return `${commentPrefix}${field} = "${value}"\n`
  }

  // Find the first [section] to determine top-level boundary
  const firstSectionMatch = content.match(/^\[/m)
  const topLevelEnd = firstSectionMatch?.index ?? content.length

  // Split content into top-level area and rest (sections)
  let topLevel = content.slice(0, topLevelEnd)
  const rest = content.slice(topLevelEnd)

  // Support inline comments like: field = "value" # comment
  // Also support commented-out fields like: # model_provider = "value"
  const fieldRegex = new RegExp(`^(#\\s*)?${field}\\s*=\\s*["'][^"']*["'][ \\t]*(?:#.*)?$`, 'm')
  const existingMatch = topLevel.match(fieldRegex)

  if (value === null) {
    // Remove the field entirely
    if (existingMatch) {
      topLevel = topLevel.replace(fieldRegex, '').replace(/\n{2,}/g, '\n\n')
    }
  }
  else {
    const commentPrefix = options.commented ? '# ' : ''
    const newLine = `${commentPrefix}${field} = "${value}"`

    if (existingMatch) {
      // Update existing field
      topLevel = topLevel.replace(fieldRegex, newLine)
    }
    else {
      // Add new field at end of top-level area
      topLevel = `${topLevel.trimEnd()}\n${newLine}\n`
    }
  }

  // Ensure proper spacing before sections
  if (rest.length > 0 && !topLevel.endsWith('\n\n')) {
    topLevel = `${topLevel.trimEnd()}\n\n`
  }

  return topLevel + rest
}

/**
 * Update multiple top-level API fields in Codex config
 * Only modifies: model, model_provider
 * Does NOT touch: mcp_servers, other sections
 *
 * @param fields - Fields to update
 * @param fields.model - Model name (string or null to remove)
 * @param fields.modelProvider - Model provider name (string or null to remove)
 * @param fields.modelProviderCommented - Whether to comment out model_provider field
 */
export function updateCodexApiFields(fields: {
  model?: string | null
  modelProvider?: string | null
  modelProviderCommented?: boolean
}): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = readFile(CODEX_CONFIG_FILE) || ''

  if (fields.model !== undefined) {
    content = updateTopLevelTomlField(content, 'model', fields.model)
  }

  if (fields.modelProvider !== undefined) {
    content = updateTopLevelTomlField(
      content,
      'model_provider',
      fields.modelProvider,
      { commented: fields.modelProviderCommented },
    )
  }

  writeFile(CODEX_CONFIG_FILE, content)

  // CCJK: Codex 0.135+ 同步写 <provider>.config.toml
  if (fields.model && fields.modelProvider && !fields.modelProviderCommented) {
    syncCodexProfileFileAfterApiUpdate(fields.model, fields.modelProvider)
  }
}

/**
 * Add or update a provider section in Codex config
 * Only modifies: model_providers.{providerId}
 * Does NOT touch: mcp_servers, top-level fields, other providers
 *
 * @param providerId - Provider ID
 * @param provider - Provider configuration
 */
export function upsertCodexProvider(providerId: string, provider: CodexProvider): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = readFile(CODEX_CONFIG_FILE) || ''
  const basePath = `model_providers.${providerId}`

  // Update each field individually to preserve formatting
  content = editToml(content, `${basePath}.name`, provider.name)
  content = editToml(content, `${basePath}.base_url`, provider.baseUrl)
  content = editToml(content, `${basePath}.wire_api`, provider.wireApi)
  content = editToml(content, `${basePath}.temp_env_key`, provider.tempEnvKey)
  content = editToml(content, `${basePath}.requires_openai_auth`, provider.requiresOpenaiAuth)

  if (provider.model) {
    content = editToml(content, `${basePath}.model`, provider.model)
  }

  writeFile(CODEX_CONFIG_FILE, content)
}

/**
 * Delete a provider section from Codex config
 * Only removes: model_providers.{providerId}
 * Does NOT touch: mcp_servers, top-level fields, other providers
 *
 * @param providerId - Provider ID to delete
 */
export function deleteCodexProvider(providerId: string): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    return
  }

  const content = readFile(CODEX_CONFIG_FILE) || ''

  // Use regex to remove the entire section
  // Match [model_providers.{providerId}] and all content until next section or EOF
  const sectionRegex = new RegExp(
    `\\n?\\[model_providers\\.${escapeRegex(providerId)}\\][\\s\\S]*?(?=\\n\\[|$)`,
    'g',
  )

  const updatedContent = content.replace(sectionRegex, '')
  writeFile(CODEX_CONFIG_FILE, updatedContent)
}

/**
 * Add or update an MCP service section in Codex config
 * Only modifies: mcp_servers.{serviceId}
 * Does NOT touch: model_providers, top-level fields, other MCP services
 *
 * IMPORTANT: This preserves existing fields that CCJK doesn't manage (like 'url' for SSE services)
 *
 * @param serviceId - Service ID
 * @param service - Service configuration (only CCJK-managed fields)
 */
export function upsertCodexMcpService(serviceId: string, service: CodexMcpService): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = repairBareInlineTableLines(readFile(CODEX_CONFIG_FILE) || '')
  const basePath = `mcp_servers.${serviceId}`

  // Check if this is an existing service with 'url' field (SSE protocol)
  // If so, we should NOT add command/args fields
  let existingService: { url?: string, command?: string } | undefined
  try {
    const parsed = content
      ? parseToml<{ mcp_servers?: Record<string, { url?: string, command?: string }> }>(content)
      : {}
    existingService = parsed.mcp_servers?.[serviceId]
  }
  catch {
    existingService = undefined
  }

  if (existingService?.url && !existingService?.command) {
    // This is an SSE-type service, only update non-conflicting fields
    if (service.env && Object.keys(service.env).length > 0) {
      content = upsertMcpEnv(content, serviceId, service.env)
    }
    if (service.startup_timeout_sec) {
      content = editToml(content, `${basePath}.startup_timeout_sec`, service.startup_timeout_sec)
    }
  }
  else {
    // This is a stdio-type service or new service, update all fields
    const normalizedCommand = normalizeTomlPath(service.command)
    content = editToml(content, `${basePath}.command`, normalizedCommand)
    content = editToml(content, `${basePath}.args`, service.args || [])

    if (service.env && Object.keys(service.env).length > 0) {
      content = upsertMcpEnv(content, serviceId, service.env)
    }
    if (service.startup_timeout_sec) {
      content = editToml(content, `${basePath}.startup_timeout_sec`, service.startup_timeout_sec)
    }
  }

  writeFile(CODEX_CONFIG_FILE, content)
}

/**
 * Build regex that matches an MCP service section and any nested sub-sections
 * e.g. [mcp_servers.foo], [mcp_servers.foo.env], [mcp_servers.foo.tools.search]
 */
function buildMcpServiceSectionRegex(serviceId: string): RegExp {
  return new RegExp(
    `\\n?\\[mcp_servers\\.${escapeRegex(serviceId)}(?:\\.[^\\]]+)?\\][\\s\\S]*?(?=\\n\\[|$)`,
    'g',
  )
}

/**
 * Delete an MCP service section from Codex config
 * Removes: mcp_servers.{serviceId} and nested sections (e.g. .env, .tools.search)
 * Does NOT touch: model_providers, top-level fields, other MCP services
 *
 * @param serviceId - Service ID to delete
 */
export function deleteCodexMcpService(serviceId: string): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    return
  }

  const content = readFile(CODEX_CONFIG_FILE) || ''
  const updatedContent = content.replace(buildMcpServiceSectionRegex(serviceId), '')
  writeFile(CODEX_CONFIG_FILE, updatedContent)
}

/**
 * List root MCP service IDs still present in config.toml (including orphan nested-only sections)
 */
export function listCodexMcpServiceIds(): string[] {
  if (!exists(CODEX_CONFIG_FILE))
    return []

  const content = readFile(CODEX_CONFIG_FILE) || ''
  const ids = new Set<string>()
  const sectionRegex = /^\[mcp_servers\.([^\]]+)\]/gm

  for (const match of content.matchAll(sectionRegex)) {
    const rootId = match[1].split('.')[0]
    if (rootId)
      ids.add(rootId)
  }

  return Array.from(ids)
}

/**
 * Remove every mcp_servers.* section from Codex config.toml
 */
export function deleteAllCodexMcpServices(): void {
  if (!exists(CODEX_CONFIG_FILE))
    return

  const content = readFile(CODEX_CONFIG_FILE) || ''
  const updatedContent = content
    .replace(/\n?\[mcp_servers\.[^\]]+\][\s\S]*?(?=\n\[|$)/g, '')
    .replace(/\n?#\s*---\s*MCP servers added by CCJK\s*---\s*/gi, '')

  writeFile(CODEX_CONFIG_FILE, updatedContent)
}

/**
 * Batch update multiple MCP services
 * Preserves existing MCP services that are not in the update list
 *
 * @param services - Services to add/update
 * @param options - Options for the update
 * @param options.replaceAll - Whether to replace all existing services instead of merging
 */
export function batchUpdateCodexMcpServices(
  services: CodexMcpService[],
  options: { replaceAll?: boolean } = {},
): void {
  if (options.replaceAll) {
    // Remove all existing MCP services first
    if (exists(CODEX_CONFIG_FILE)) {
      let content = readFile(CODEX_CONFIG_FILE) || ''

      // Remove all mcp_servers sections
      content = content.replace(/\n?\[mcp_servers\.[^\]]+\][\s\S]*?(?=\n\[|$)/g, '')

      // Also remove the MCP header comment if present
      content = content.replace(/\n?#\s*---\s*MCP servers added by CCJK\s*---\s*/gi, '')

      writeFile(CODEX_CONFIG_FILE, content)
    }
  }

  // Add/update each service
  for (const service of services) {
    upsertCodexMcpService(service.id, service)
  }
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function repairBareInlineTableLines(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*)(\{.*\})\s*$/)
      if (!match)
        return line

      const table = match[2]
      return /[A-Za-z0-9_-]+\s*=/.test(table) ? `${match[1]}env = ${table}` : line
    })
    .join('\n')
}

function upsertMcpEnv(content: string, serviceId: string, env: Record<string, string>): string {
  const sectionHeader = `[mcp_servers.${serviceId}]`
  const sectionIndex = content.indexOf(sectionHeader)

  if (sectionIndex === -1)
    return editToml(content, `mcp_servers.${serviceId}.env`, env)

  const envLine = `env = { ${Object.entries(env)
    .map(([key, value]) => `${formatTomlKey(key)} = ${formatTomlString(value)}`)
    .join(', ')} }`

  const bodyStart = sectionIndex + sectionHeader.length
  const nextSectionOffset = content.slice(bodyStart).search(/\n\[/)
  const sectionEnd = nextSectionOffset === -1 ? content.length : bodyStart + nextSectionOffset
  const section = content.slice(sectionIndex, sectionEnd)

  if (/^env\s*=/m.test(section)) {
    const updatedSection = section.replace(/^env\s*=.*$/m, envLine)
    return content.slice(0, sectionIndex) + updatedSection + content.slice(sectionEnd)
  }

  const insertAt = bodyStart
  const prefix = content.slice(0, insertAt)
  const suffix = content.slice(insertAt)
  return `${prefix}\n${envLine}${suffix}`
}

function formatTomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key)
}

function formatTomlString(value: string): string {
  return JSON.stringify(normalizeTomlPath(String(value)))
}
