import type { CodeToolType } from '../constants';
import type {
  ClaudeConfiguration,
  ClavueCredentialsConfiguration,
  ClavueProviderAuthType,
  ClavueProviderModelMode,
  ClavueProviderProfile,
  McpServerConfig,
  MyclaudeProviderMode,
  MyclaudeProviderProfile,
} from '../types';
import type { ClaudeCodeConfigData, ClaudeCodeProfile } from '../types/claude-code-config';
import { chmodSync } from 'node:fs';
import { join } from 'pathe';
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services';
import { ClAUDE_CONFIG_FILE, CLAUDE_VSC_CONFIG_FILE, CLAVUE_CONFIG_FILE, CLAVUE_CREDENTIALS_FILE, CLAVUE_DIR, CLAVUE_SETTINGS_FILE } from '../constants';
import { ensureI18nInitialized, i18n } from '../i18n';
import { ClaudeCodeConfigManager } from './claude-code-config-manager';
import { applyTrustedOperatorPermissions, normalizeClaudeFamilySettings } from './claude-settings-normalizer';
import { clearLegacyTopLevelRuntimeSettings, overwriteModelSettings } from './config';
import { backupJsonConfig, readJsonConfig, writeJsonConfig } from './json-config';
import { deepClone } from './object-utils';
import { getMcpCommand, isWindows } from './platform';
import { resolveClaudeFamilySettingsTarget } from './runtime-settings';

export interface MyclaudeProviderSyncResult {
  /**
   * The real Clavue profile id that was activated.
   * CCJK-owned Clavue profiles are namespaced to avoid native-provider collisions.
   */
  activeProfileId: string;
  activeProfile: MyclaudeProviderProfile | null;
  profiles: MyclaudeProviderProfile[];
}

export interface ClavueModelSelectionSyncOptions {
  selectedModel?: string;
  primaryModel?: string;
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
  reset?: boolean;
}

export function getMcpConfigPath(): string {
  return ClAUDE_CONFIG_FILE;
}

export function getClavueConfigPath(): string {
  return CLAVUE_CONFIG_FILE;
}

export function readMcpConfig(codeTool?: CodeToolType): ClaudeConfiguration | null {
  return readJsonConfig<ClaudeConfiguration>(resolveClaudeFamilySettingsTarget(codeTool).runtimeConfigFile);
}

export function writeMcpConfig(config: ClaudeConfiguration, codeTool?: CodeToolType): void {
  writeJsonConfig(resolveClaudeFamilySettingsTarget(codeTool).runtimeConfigFile, config);
}

export function backupMcpConfig(codeTool?: CodeToolType): string | null {
  const target = resolveClaudeFamilySettingsTarget(codeTool);
  const backupBaseDir = join(target.configDir, target.runtimeBackupDirName);
  return backupJsonConfig(target.runtimeConfigFile, backupBaseDir);
}

export function readClavueConfig(): ClaudeConfiguration | null {
  return readJsonConfig<ClaudeConfiguration>(CLAVUE_CONFIG_FILE);
}

export function writeClavueConfig(config: ClaudeConfiguration): void {
  writeJsonConfig(CLAVUE_CONFIG_FILE, config);
}

export function backupClavueConfig(): string | null {
  const backupBaseDir = join(CLAVUE_DIR, 'backups');
  return backupJsonConfig(CLAVUE_CONFIG_FILE, backupBaseDir);
}

export function mergeMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing || { mcpServers: {} };

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Merge new servers into existing config
  Object.assign(config.mcpServers, newServers);

  return config;
}

/**
 * Replace MCP servers entirely (clean install, no leftover services)
 * Unlike mergeMcpServers, this removes services not in the new set.
 */
export function replaceMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing ? { ...existing } : { mcpServers: {} };
  config.mcpServers = { ...newServers };
  return config;
}

function applyPlatformCommand(config: McpServerConfig): void {
  // Only process if command exists (avoid wrapping configs without command, e.g., SSE services)
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command);
    // Only modify if command needs Windows wrapper (cmd /c)
    if (mcpCmd[0] === 'cmd') {
      config.command = mcpCmd[0];
      config.args = [...mcpCmd.slice(1), ...(config.args || [])];
    }
  }
}

export function buildMcpServerConfig(
  baseConfig: McpServerConfig,
  apiKey?: string,
  placeholder: string = 'YOUR_EXA_API_KEY',
  envVarName?: string,
): McpServerConfig {
  // Deep clone the config to avoid mutation
  const config = deepClone(baseConfig);

  // Apply platform-specific command
  applyPlatformCommand(config);

  if (!apiKey) {
    return config;
  }

  // New approach: If environment variable name is specified, set it directly
  if (envVarName && config.env) {
    config.env[envVarName] = apiKey;
    return config; // Return early for env-based configuration
  }

  // Legacy approach: Replace placeholder in args and URL
  if (config.args) {
    config.args = config.args.map((arg: string) => arg.replace(placeholder, apiKey));
  }

  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey);
  }

  return config;
}

export function fixWindowsMcpConfig(config: ClaudeConfiguration): ClaudeConfiguration {
  if (!isWindows() || !config.mcpServers) {
    return config;
  }

  const fixed = { ...config };

  // Fix each MCP server configuration
  for (const [, serverConfig] of Object.entries(fixed.mcpServers)) {
    if (serverConfig && typeof serverConfig === 'object' && 'command' in serverConfig) {
      applyPlatformCommand(serverConfig);
    }
  }

  return fixed;
}

export function addCompletedOnboarding(codeTool?: CodeToolType): void {
  try {
    // Read existing config or create new one
    let config = readMcpConfig(codeTool);
    if (!config) {
      config = { mcpServers: {} };
    }

    // Check if already set to avoid redundant operations
    if (config.hasCompletedOnboarding === true) {
      return; // Already set, no need to update
    }

    // Add hasCompletedOnboarding flag
    config.hasCompletedOnboarding = true;

    // Write updated config
    writeMcpConfig(config, codeTool);
  }
  catch (error) {
    console.error('Failed to add onboarding flag', error);
    throw error;
  }
}

/**
 * Ensures that an API key is in the approved list and not in the rejected list
 * @param config - Claude configuration object
 * @param apiKey - The API key to manage
 * @returns Updated configuration with API key properly approved
 */
export function ensureApiKeyApproved(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  // Handle invalid inputs gracefully
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return config;
  }

  // Truncate API key to maximum 20 characters for storage in customApiKeyResponses
  const truncatedApiKey = apiKey.substring(0, 20);

  const updatedConfig = { ...config };

  // Initialize customApiKeyResponses if it doesn't exist
  if (!updatedConfig.customApiKeyResponses) {
    updatedConfig.customApiKeyResponses = {
      approved: [],
      rejected: [],
    };
  }

  // Ensure approved and rejected arrays exist
  if (!Array.isArray(updatedConfig.customApiKeyResponses.approved)) {
    updatedConfig.customApiKeyResponses.approved = [];
  }
  if (!Array.isArray(updatedConfig.customApiKeyResponses.rejected)) {
    updatedConfig.customApiKeyResponses.rejected = [];
  }

  // Remove from rejected list if present
  const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey);
  if (rejectedIndex > -1) {
    updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1);
  }

  // Add to approved list if not already present
  if (!updatedConfig.customApiKeyResponses.approved.includes(truncatedApiKey)) {
    updatedConfig.customApiKeyResponses.approved.push(truncatedApiKey);
  }

  return updatedConfig;
}

/**
 * Removes an API key from the rejected list
 * @param config - Claude configuration object
 * @param apiKey - The API key to remove from rejected list
 * @returns Updated configuration with API key removed from rejected list
 */
export function removeApiKeyFromRejected(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  // Handle missing customApiKeyResponses
  if (!config.customApiKeyResponses || !Array.isArray(config.customApiKeyResponses.rejected)) {
    return config;
  }

  // Truncate API key to maximum 20 characters for storage in customApiKeyResponses
  const truncatedApiKey = apiKey.substring(0, 20);

  const updatedConfig = { ...config };

  // Ensure customApiKeyResponses exists after spreading
  if (updatedConfig.customApiKeyResponses) {
    const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey);

    if (rejectedIndex > -1) {
      updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1);
    }
  }

  return updatedConfig;
}

/**
 * Manages API key approval status by reading config, updating it, and writing it back
 * @param apiKey - The API key to ensure is approved (e.g., 'sk-ccjk-x-ccr')
 */
export function manageApiKeyApproval(apiKey: string, codeTool?: CodeToolType): void {
  try {
    // Read existing config or create new one
    let config = readMcpConfig(codeTool);
    if (!config) {
      config = { mcpServers: {} };
    }

    // Ensure the API key is approved
    const updatedConfig = ensureApiKeyApproved(config, apiKey);

    // Write updated config
    writeMcpConfig(updatedConfig, codeTool);
  }
  catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t('mcp:apiKeyApprovalFailed'), error);
    // Don't throw error to avoid breaking the main flow
    // This is a nice-to-have feature, not critical
  }
}

/**
 * Sets the primaryApiKey field in ~/.claude/config.json (VSCode extension config)
 * This is required for Claude Code 2.0 to properly recognize third-party API configurations
 * and prevent redirecting to official login page
 */
export function setPrimaryApiKey(codeTool?: CodeToolType): void {
  try {
    if (resolveClaudeFamilySettingsTarget(codeTool).codeTool !== 'claude-code') {
      return;
    }

    // Read existing VSCode config or create new one
    let config = readJsonConfig<{ primaryApiKey?: string }>(CLAUDE_VSC_CONFIG_FILE);
    if (!config) {
      config = {};
    }

    // Set primaryApiKey to "ccjk" for third-party API identification
    config.primaryApiKey = 'ccjk';

    // Write updated config to ~/.claude/config.json
    writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, config);
  }
  catch (error) {
    ensureI18nInitialized();
    console.error(i18n.t('mcp:primaryApiKeySetFailed'), error);
    // Don't throw error to avoid breaking the main flow
    // This is important but shouldn't block the configuration process
  }
}

function normalizeMyclaudeProviderProfile(profile: MyclaudeProviderProfile): MyclaudeProviderProfile {
  return {
    ...profile,
    ...describeMyclaudeProviderProfile(profile),
  };
}

function normalizeClavueBaseUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') {
    return undefined;
  }
  const normalized = url.trim().replace(/\/v1(?:\/messages|\/responses)?\/?$/i, '').replace(/\/+$/, '');
  return normalized || undefined;
}

function normalizeClavueAuthType(authType: unknown): ClavueProviderAuthType {
  return authType === 'auth_token' ? 'auth_token' : 'api_key';
}

function inferClavueProviderId(provider: unknown, baseUrl?: string): string {
  const providerId = typeof provider === 'string' ? provider.trim() : '';
  if (providerId && providerId !== 'ccr_proxy') {
    return providerId;
  }

  if (baseUrl === 'https://api.anthropic.com') {
    return 'anthropic';
  }

  return 'custom';
}

function isOpenAiFamilyModel(model: string): boolean {
  return /^(?:gpt-|o\d|codex|kimi|glm|moonshot|deepseek|qwen|doubao|yi-|minimax)/i.test(model.trim());
}

function inferClavueModelMode(profile: MyclaudeProviderProfile): ClavueProviderModelMode {
  if (profile.authType === 'ccr_proxy' || profile.mode === 'ccr-proxy') {
    return 'hybrid_compatible';
  }

  const routedModels = [
    profile.primaryModel,
    profile.model,
    profile.defaultHaikuModel,
    profile.fastModel,
    profile.defaultSonnetModel,
    profile.defaultOpusModel,
  ].filter((model): model is string => typeof model === 'string' && model.trim().length > 0);

  if (routedModels.length > 0 && routedModels.every(isOpenAiFamilyModel)) {
    return 'openai_native';
  }

  if (routedModels.length > 0 && !routedModels.some(isOpenAiFamilyModel)) {
    return 'anthropic_native';
  }

  if (routedModels.length > 0) {
    return 'hybrid_compatible';
  }

  if (profile.mode === 'openai-native') {
    return 'openai_native';
  }

  if (!profile.baseUrl || profile.provider === 'anthropic' || profile.mode === 'official') {
    return 'anthropic_native';
  }

  return routedModels.some(isOpenAiFamilyModel) ? 'hybrid_compatible' : 'anthropic_native';
}

function getClavueRoutingPresetId(profile: MyclaudeProviderProfile): string {
  const mode = inferClavueModelMode(profile);
  if (mode === 'openai_native') {
    return 'gpt_5_4_codex';
  }
  if (mode === 'anthropic_native') {
    return 'claude_code_heritage';
  }
  return 'custom';
}

function isCcjkClavueProfile(profile: ClavueProviderProfile): boolean {
  return profile.provenance?.kind === 'imported' && profile.provenance.sourceId === 'ccjk';
}

const CCJK_CLAVUE_PROFILE_ID_PREFIX = 'ccjk-';

interface ResolvedClavueProviderProfile {
  source: MyclaudeProviderProfile;
  clavueProfileId: string;
  existing?: ClavueProviderProfile;
}

function getSourceProfileId(profile: Pick<MyclaudeProviderProfile, 'id' | 'name'>): string {
  const id = typeof profile.id === 'string' ? profile.id.trim() : '';
  if (id) {
    return id;
  }

  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  return name || 'profile';
}

function getCcjkExternalProfileId(profile: ClavueProviderProfile): string {
  const externalProfileId = profile.provenance?.externalProfileId;
  if (typeof externalProfileId === 'string' && externalProfileId.trim()) {
    return externalProfileId.trim();
  }

  const profileId = typeof profile.id === 'string' ? profile.id.trim() : '';
  if (profileId.startsWith(CCJK_CLAVUE_PROFILE_ID_PREFIX) && profileId.length > CCJK_CLAVUE_PROFILE_ID_PREFIX.length) {
    return profileId.slice(CCJK_CLAVUE_PROFILE_ID_PREFIX.length);
  }

  return profileId || 'profile';
}

function getCcjkClavueProfileId(externalProfileId: string): string {
  const cleanExternalId = externalProfileId.trim() || 'profile';
  return cleanExternalId.startsWith(CCJK_CLAVUE_PROFILE_ID_PREFIX)
    ? cleanExternalId
    : `${CCJK_CLAVUE_PROFILE_ID_PREFIX}${cleanExternalId}`;
}

function getUniqueClavueProfileId(baseProfileId: string, reservedProfileIds: Set<string>): string {
  if (!reservedProfileIds.has(baseProfileId)) {
    return baseProfileId;
  }

  let index = 2;
  let candidate = `${baseProfileId}-${index}`;
  while (reservedProfileIds.has(candidate)) {
    index += 1;
    candidate = `${baseProfileId}-${index}`;
  }
  return candidate;
}

function buildExistingCcjkProfileByExternalId(
  existingProfiles: ClavueProviderProfile[],
): Map<string, ClavueProviderProfile> {
  const existingByExternalId = new Map<string, ClavueProviderProfile>();

  for (const profile of existingProfiles) {
    if (!isCcjkClavueProfile(profile)) {
      continue;
    }

    const externalProfileId = getCcjkExternalProfileId(profile);
    const current = existingByExternalId.get(externalProfileId);
    if (!current || profile.id.startsWith(CCJK_CLAVUE_PROFILE_ID_PREFIX)) {
      existingByExternalId.set(externalProfileId, profile);
    }
  }

  return existingByExternalId;
}

function resolveClavueProviderProfiles(
  profiles: MyclaudeProviderProfile[],
  existingProfiles: ClavueProviderProfile[],
): ResolvedClavueProviderProfile[] {
  const existingCcjkByExternalId = buildExistingCcjkProfileByExternalId(existingProfiles);
  const reservedProfileIds = new Set(existingProfiles
    .filter(profile => !isCcjkClavueProfile(profile))
    .map(profile => profile.id));

  return profiles.map((profile) => {
    const externalProfileId = getSourceProfileId(profile);
    const existing = existingCcjkByExternalId.get(externalProfileId);
    const canReuseExistingManagedId = Boolean(
      existing
      && existing.id.startsWith(CCJK_CLAVUE_PROFILE_ID_PREFIX)
      && !reservedProfileIds.has(existing.id),
    );
    const clavueProfileId = canReuseExistingManagedId
      ? existing!.id
      : getUniqueClavueProfileId(getCcjkClavueProfileId(externalProfileId), reservedProfileIds);

    reservedProfileIds.add(clavueProfileId);

    return {
      source: profile,
      clavueProfileId,
      existing,
    };
  });
}

function findResolvedClavueProfile(
  profiles: ResolvedClavueProviderProfile[],
  profileId?: string,
): ResolvedClavueProviderProfile | undefined {
  const requestedProfileId = typeof profileId === 'string' ? profileId.trim() : '';
  if (!requestedProfileId) {
    return undefined;
  }

  return profiles.find((profile) => {
    return profile.clavueProfileId === requestedProfileId
      || getSourceProfileId(profile.source) === requestedProfileId;
  });
}

function resolveClavueActiveProviderProfileId(config: ClaudeConfiguration, activeProfileId?: string): string | undefined {
  const requestedProfileId = typeof activeProfileId === 'string' ? activeProfileId.trim() : '';
  if (!requestedProfileId) {
    return undefined;
  }

  const existingProfiles = getClavueProviderProfiles(config);
  if (existingProfiles.some(profile => profile.id === requestedProfileId)) {
    return requestedProfileId;
  }

  return existingProfiles.find((profile) => {
    return isCcjkClavueProfile(profile) && getCcjkExternalProfileId(profile) === requestedProfileId;
  })?.id || requestedProfileId;
}

function createClavueModelRouting(profile: MyclaudeProviderProfile): ClavueProviderProfile['modelRouting'] {
  const primaryModel = (profile.primaryModel || profile.model || '').trim();
  const haikuModel = (profile.defaultHaikuModel || profile.fastModel || '').trim();
  const sonnetModel = (profile.defaultSonnetModel || primaryModel).trim();
  const opusModel = (profile.defaultOpusModel || primaryModel).trim();
  const executionModel = sonnetModel || primaryModel;

  return {
    presetId: getClavueRoutingPresetId(profile),
    primaryModel,
    subagentModel: executionModel && executionModel !== primaryModel ? executionModel : '',
    smallFastModel: haikuModel,
    planModel: opusModel || primaryModel,
    exploreModel: executionModel,
    generalModel: executionModel,
    teamModel: executionModel,
    guideModel: opusModel || primaryModel,
  };
}

function toClavueProviderProfile(
  profile: MyclaudeProviderProfile,
  clavueProfileId: string,
  existing?: ClavueProviderProfile,
): ClavueProviderProfile {
  const now = Date.now();
  const normalizedBaseUrl = normalizeClavueBaseUrl(profile.baseUrl);
  const createdAt = typeof existing?.createdAt === 'number' ? existing.createdAt : now;
  return {
    id: clavueProfileId,
    name: profile.name,
    providerId: inferClavueProviderId(profile.provider, normalizedBaseUrl),
    modelMode: inferClavueModelMode(profile),
    ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {}),
    authType: normalizeClavueAuthType(profile.authType),
    modelRouting: createClavueModelRouting(profile),
    provenance: {
      kind: 'imported',
      sourceId: 'ccjk',
      importedAt: typeof existing?.provenance?.importedAt === 'number' ? existing.provenance.importedAt : createdAt,
      externalProfileId: getSourceProfileId(profile),
    },
    createdAt,
    updatedAt: now,
  };
}

function readClavueCredentialsConfig(): ClavueCredentialsConfiguration {
  return readJsonConfig<ClavueCredentialsConfiguration>(CLAVUE_CREDENTIALS_FILE) || {};
}

function writeClavueCredentialsConfig(config: ClavueCredentialsConfiguration): void {
  writeJsonConfig(CLAVUE_CREDENTIALS_FILE, config);
  try {
    chmodSync(CLAVUE_CREDENTIALS_FILE, 0o600);
  }
  catch {
    // Best-effort parity with Clavue's own credential writer.
  }
}

function syncClavueProviderCredentials(
  profiles: ResolvedClavueProviderProfile[],
  replaceProfileIds: Set<string> = new Set(),
): void {
  const existingCredentials = readClavueCredentialsConfig();
  const providerProfiles = { ...(existingCredentials.providerProfiles || {}) };

  for (const profileId of replaceProfileIds) {
    delete providerProfiles[profileId];
  }

  for (const profile of profiles) {
    const credential = typeof profile.source.apiKey === 'string' ? profile.source.apiKey.trim() : '';
    if (!profile.clavueProfileId || !credential) {
      continue;
    }
    providerProfiles[profile.clavueProfileId] = {
      credential,
      authType: normalizeClavueAuthType(profile.source.authType),
    };
  }

  writeClavueCredentialsConfig({
    ...existingCredentials,
    providerProfiles: Object.keys(providerProfiles).length > 0 ? providerProfiles : undefined,
  });
}

function getClavueProviderProfiles(config: ClaudeConfiguration | null): ClavueProviderProfile[] {
  return Array.isArray(config?.clavueProviderProfiles) ? config.clavueProviderProfiles : [];
}

function getLegacyMyclaudeProviderProfiles(config: ClaudeConfiguration | null): MyclaudeProviderProfile[] {
  return Array.isArray(config?.myclaudeProviderProfiles) ? config.myclaudeProviderProfiles : [];
}

function toLegacyProviderProfile(profile: ClavueProviderProfile): MyclaudeProviderProfile {
  const routing = profile.modelRouting || createClavueModelRouting({ id: profile.id, name: profile.name, provider: profile.providerId });
  return {
    id: isCcjkClavueProfile(profile) ? getCcjkExternalProfileId(profile) : profile.id,
    name: profile.name,
    provider: profile.providerId || 'custom',
    baseUrl: profile.baseUrl,
    model: routing.primaryModel,
    fastModel: routing.smallFastModel,
    authType: profile.authType,
    primaryModel: routing.primaryModel,
    defaultHaikuModel: routing.smallFastModel,
    defaultSonnetModel: routing.generalModel || routing.subagentModel,
    defaultOpusModel: routing.planModel,
    ...describeMyclaudeProviderProfile({
      authType: profile.authType,
      baseUrl: profile.baseUrl,
      mode: profile.modelMode === 'openai_native'
        ? 'openai-native'
        : profile.modelMode === 'hybrid_compatible'
          ? 'ccr-proxy'
          : 'official',
    }),
  };
}

function normalizeModelSlot(model: unknown): string | undefined {
  return typeof model === 'string' && model.trim() ? model.trim() : undefined;
}

function resolveClavueModelSelectionSlots(options: ClavueModelSelectionSyncOptions): {
  primaryModel?: string;
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
} {
  if (options.reset) {
    return {};
  }

  const selectedModel = normalizeModelSlot(options.selectedModel);
  if (selectedModel) {
    return {
      primaryModel: selectedModel,
      haikuModel: selectedModel,
      sonnetModel: selectedModel,
      opusModel: selectedModel,
    };
  }

  const primaryModel = normalizeModelSlot(options.primaryModel);
  const haikuModel = normalizeModelSlot(options.haikuModel);
  const sonnetModel = normalizeModelSlot(options.sonnetModel);
  const opusModel = normalizeModelSlot(options.opusModel);

  if (primaryModel) {
    return {
      primaryModel,
      haikuModel: haikuModel || primaryModel,
      sonnetModel: sonnetModel || primaryModel,
      opusModel: opusModel || primaryModel,
    };
  }

  return {
    haikuModel,
    sonnetModel,
    opusModel,
  };
}

function getClavueActiveProfile(config: ClaudeConfiguration | null): MyclaudeProviderProfile | null {
  const activeId = config?.clavueActiveProviderProfileId || config?.myclaudeActiveProviderProfileId || '';
  const legacyProfiles = getLegacyMyclaudeProviderProfiles(config);
  const activeLegacyProfile = legacyProfiles.find(profile => profile.id === activeId);
  if (activeLegacyProfile) {
    return activeLegacyProfile;
  }

  const nativeProfiles = getClavueProviderProfiles(config);
  const activeNativeProfile = nativeProfiles.find(profile => profile.id === activeId);
  if (activeNativeProfile) {
    return toLegacyProviderProfile(activeNativeProfile);
  }

  return nativeProfiles.map(toLegacyProviderProfile).find(profile => profile.id === activeId) || null;
}

export function syncClavueActiveProviderModelSelection(options: ClavueModelSelectionSyncOptions): boolean {
  const config = readClavueConfig();
  const activeId = config?.clavueActiveProviderProfileId || config?.myclaudeActiveProviderProfileId || '';
  if (!config || !activeId) {
    return false;
  }

  const slots = resolveClavueModelSelectionSlots(options);
  const nativeProfiles = getClavueProviderProfiles(config);
  const nativeProfileIndex = nativeProfiles.findIndex(profile => profile.id === activeId);

  if (nativeProfileIndex >= 0) {
    const currentProfile = nativeProfiles[nativeProfileIndex];
    const routingProfile: MyclaudeProviderProfile = {
      id: currentProfile.id,
      name: currentProfile.name,
      provider: currentProfile.providerId,
      baseUrl: currentProfile.baseUrl,
      authType: currentProfile.authType,
      model: slots.primaryModel,
      fastModel: slots.haikuModel,
      primaryModel: slots.primaryModel,
      defaultHaikuModel: slots.haikuModel,
      defaultSonnetModel: slots.sonnetModel,
      defaultOpusModel: slots.opusModel,
      mode: currentProfile.modelMode === 'openai_native'
        ? 'openai-native'
        : currentProfile.modelMode === 'hybrid_compatible'
          ? 'ccr-proxy'
          : 'official',
    };

    const nextProfile: ClavueProviderProfile = {
      ...currentProfile,
      modelMode: options.reset ? currentProfile.modelMode : inferClavueModelMode(routingProfile),
      modelRouting: createClavueModelRouting(routingProfile),
      updatedAt: Date.now(),
    };
    config.clavueProviderProfiles = nativeProfiles.map((profile, index) => index === nativeProfileIndex ? nextProfile : profile);
    delete config.myclaudeProviderProfiles;
    delete config.myclaudeActiveProviderProfileId;
    writeClavueConfig(config);
    syncMyclaudeActiveProfileToSettings(toLegacyProviderProfile(nextProfile));
    return true;
  }

  const legacyProfiles = getLegacyMyclaudeProviderProfiles(config);
  const legacyProfileIndex = legacyProfiles.findIndex(profile => profile.id === activeId);
  if (legacyProfileIndex < 0) {
    return false;
  }

  const updatedProfiles = legacyProfiles.map((profile, index) => {
    if (index !== legacyProfileIndex) {
      return profile;
    }

    return {
      ...profile,
      model: slots.primaryModel,
      fastModel: slots.haikuModel,
      primaryModel: slots.primaryModel,
      defaultHaikuModel: slots.haikuModel,
      defaultSonnetModel: slots.sonnetModel,
      defaultOpusModel: slots.opusModel,
    };
  });
  setMyclaudeProviderProfiles(updatedProfiles, activeId);
  return true;
}

export function setMyclaudeProviderProfiles(profiles: MyclaudeProviderProfile[], activeProfileId?: string): string | undefined {
  const config = readClavueConfig() || { mcpServers: {} };
  const normalizedProfiles = profiles.map(normalizeMyclaudeProviderProfile);
  const existingProfiles = getClavueProviderProfiles(config);
  const resolvedProfiles = resolveClavueProviderProfiles(normalizedProfiles, existingProfiles);
  const selectedProfile = findResolvedClavueProfile(
    resolvedProfiles,
    activeProfileId ?? (normalizedProfiles[0] ? getSourceProfileId(normalizedProfiles[0]) : undefined),
  );
  const nextActiveProfileId = selectedProfile?.clavueProfileId;
  const existingCcjkProfileIds = new Set(existingProfiles
    .filter(isCcjkClavueProfile)
    .map(profile => profile.id));
  const preservedProfiles = existingProfiles.filter(profile => !isCcjkClavueProfile(profile));
  const preservedProfileIds = new Set(preservedProfiles.map(profile => profile.id));
  const replacedCredentialIds = new Set([...existingCcjkProfileIds].filter(profileId => !preservedProfileIds.has(profileId)));
  const clavueProfiles = resolvedProfiles.map(profile => toClavueProviderProfile(
    profile.source,
    profile.clavueProfileId,
    profile.existing,
  ));

  config.clavueProviderProfiles = [...preservedProfiles, ...clavueProfiles];
  if (nextActiveProfileId) {
    config.clavueActiveProviderProfileId = nextActiveProfileId;
  }
  else {
    delete config.clavueActiveProviderProfileId;
  }
  delete config.myclaudeProviderProfiles;
  delete config.myclaudeActiveProviderProfileId;
  writeClavueConfig(config);
  syncClavueProviderCredentials(resolvedProfiles, replacedCredentialIds);

  const activeProfile = selectedProfile?.source || null;
  syncMyclaudeActiveProfileToSettings(activeProfile);
  return nextActiveProfileId;
}

export function setMyclaudeActiveProviderProfile(activeProfileId?: string): void {
  const config = readClavueConfig() || { mcpServers: {} };
  const nextActiveProfileId = resolveClavueActiveProviderProfileId(config, activeProfileId);
  if (nextActiveProfileId) {
    config.clavueActiveProviderProfileId = nextActiveProfileId;
  }
  else {
    delete config.clavueActiveProviderProfileId;
  }
  delete config.myclaudeActiveProviderProfileId;
  writeClavueConfig(config);

  syncMyclaudeActiveProfileToSettings(getClavueActiveProfile(config));
}

function detectMyclaudeProviderMode(profile: Pick<MyclaudeProviderProfile, 'authType' | 'baseUrl'>): MyclaudeProviderMode {
  if (profile.authType === 'ccr_proxy') {
    return 'ccr-proxy';
  }
  if (profile.baseUrl) {
    return 'openai-native';
  }
  return 'official';
}

export function describeMyclaudeProviderProfile(profile: Partial<MyclaudeProviderProfile>): Pick<MyclaudeProviderProfile, 'mode'> {
  const mode = profile.mode || detectMyclaudeProviderMode({
    authType: profile.authType,
    baseUrl: profile.baseUrl,
  });

  return { mode };
}

export interface MyclaudeProviderPresentation {
  modeLabel?: string;
  sourceLabel?: string;
  routeLabel?: string;
  strategyLabel?: string;
}

export function buildMyclaudeProviderPresentation(profile: Partial<MyclaudeProviderProfile>): MyclaudeProviderPresentation {
  const mode = profile.mode || detectMyclaudeProviderMode({
    authType: profile.authType,
    baseUrl: profile.baseUrl,
  });
  const hasAdaptiveRouting = Boolean(profile.defaultHaikuModel || profile.defaultSonnetModel || profile.defaultOpusModel);
  const hasPrimaryModel = Boolean(profile.primaryModel || profile.model);

  const modeLabel = mode === 'ccr-proxy'
    ? 'CCR-proxy'
    : mode === 'openai-native'
      ? 'OpenAI-native'
      : 'Anthropic-native';

  const routeLabel = mode === 'ccr-proxy'
    ? profile.baseUrl ? `Claude-family route through CCR · ${profile.baseUrl}` : 'Claude-family route through CCR'
    : mode === 'openai-native'
      ? profile.baseUrl ? `OpenAI-family route through a compatible gateway · ${profile.baseUrl}` : 'OpenAI-family route through a compatible gateway'
      : 'Official Anthropic route';

  const strategyLabel = hasAdaptiveRouting
    ? 'Custom routing · Advanced custom routing. Validate carefully when mixing model families.'
    : hasPrimaryModel
      ? 'Single-model override · Primary model is pinned for the active profile.'
      : 'Native runtime default · Runtime follows the official provider defaults.';

  return {
    modeLabel,
    sourceLabel: 'Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.',
    routeLabel,
    strategyLabel,
  };
}

function toMyclaudeProviderProfile(
  profile: ClaudeCodeProfile,
  existing?: MyclaudeProviderProfile,
): MyclaudeProviderProfile {
  return {
    id: profile.id || existing?.id || profile.name,
    name: profile.name,
    provider: profile.provider || existing?.provider || 'custom',
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    model: profile.primaryModel,
    fastModel: profile.defaultHaikuModel,
    authType: profile.authType,
    primaryModel: profile.primaryModel,
    defaultHaikuModel: profile.defaultHaikuModel,
    defaultSonnetModel: profile.defaultSonnetModel,
    defaultOpusModel: profile.defaultOpusModel,
    ...describeMyclaudeProviderProfile({
      authType: profile.authType,
      baseUrl: profile.baseUrl,
      mode: existing?.mode,
    }),
  };
}

function syncMyclaudeActiveProfileToSettings(profile: MyclaudeProviderProfile | null): void {
  const settings = readJsonConfig<Record<string, any>>(CLAVUE_SETTINGS_FILE) || {};
  settings.env = settings.env || {};

  clearLegacyTopLevelRuntimeSettings(settings);
  delete settings.env.ANTHROPIC_API_KEY;
  delete settings.env.ANTHROPIC_AUTH_TOKEN;

  if (profile?.baseUrl) {
    settings.env.ANTHROPIC_BASE_URL = normalizeClavueBaseUrl(profile.baseUrl);
  }
  else {
    delete settings.env.ANTHROPIC_BASE_URL;
  }

  overwriteModelSettings(settings, {
    primaryModel: typeof profile?.primaryModel === 'string' ? profile.primaryModel : typeof profile?.model === 'string' ? profile.model : undefined,
    haikuModel: typeof profile?.defaultHaikuModel === 'string' ? profile.defaultHaikuModel : typeof profile?.fastModel === 'string' ? profile.fastModel : undefined,
    sonnetModel: typeof profile?.defaultSonnetModel === 'string' ? profile.defaultSonnetModel : undefined,
    opusModel: typeof profile?.defaultOpusModel === 'string' ? profile.defaultOpusModel : undefined,
  }, profile ? 'override' : 'reset');

  const primaryModel = typeof profile?.primaryModel === 'string'
    ? profile.primaryModel.trim()
    : typeof profile?.model === 'string'
      ? profile.model.trim()
      : '';
  const subagentModel = typeof profile?.defaultSonnetModel === 'string'
    ? profile.defaultSonnetModel.trim()
    : '';

  if (primaryModel) {
    settings.env.ANTHROPIC_MODEL = primaryModel;
    settings.env.ANTHROPIC_CUSTOM_MODEL_OPTION = primaryModel;
    settings.model = primaryModel;
  }
  else if (profile) {
    delete settings.env.ANTHROPIC_MODEL;
    delete settings.env.ANTHROPIC_CUSTOM_MODEL_OPTION;
    delete settings.model;
  }
  else {
    delete settings.env.ANTHROPIC_CUSTOM_MODEL_OPTION;
    delete settings.model;
  }

  if (subagentModel) {
    settings.env.CLAUDE_CODE_SUBAGENT_MODEL = subagentModel;
  }
  else {
    delete settings.env.CLAUDE_CODE_SUBAGENT_MODEL;
  }

  normalizeClaudeFamilySettings(settings);
  writeJsonConfig(CLAVUE_SETTINGS_FILE, settings);
}

export function syncMyclaudeProviderProfilesFromClaudeConfig(configData: ClaudeCodeConfigData | null): MyclaudeProviderSyncResult {
  if (!configData) {
    clearMyclaudeProviderProfiles();
    return {
      activeProfileId: '',
      activeProfile: null,
      profiles: [],
    };
  }

  const existingConfig = readClavueConfig();
  const existingProfiles = getLegacyMyclaudeProviderProfiles(existingConfig).length > 0
    ? getLegacyMyclaudeProviderProfiles(existingConfig)
    : getClavueProviderProfiles(existingConfig).map(toLegacyProviderProfile);
  const existingById = new Map(existingProfiles.map(profile => [String(profile.id), profile]));
  const profiles = Object.entries(configData.profiles).map(([id, profile]) => toMyclaudeProviderProfile({ ...profile, id }, existingById.get(id)));
  const activeProfileId = configData.currentProfileId ?? '';
  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null;

  const activeClavueProfileId = setMyclaudeProviderProfiles(profiles, activeProfileId);

  return {
    activeProfileId: activeClavueProfileId || '',
    activeProfile,
    profiles,
  };
}

export function syncMyclaudeProviderProfilesFromCurrentClaudeConfig(): MyclaudeProviderSyncResult {
  const configData = ClaudeCodeConfigManager.readConfig();
  return syncMyclaudeProviderProfilesFromClaudeConfig(configData);
}

export function clearMyclaudeProviderProfiles(): void {
  const config = readClavueConfig();
  let preservedActiveProfile: MyclaudeProviderProfile | null = null;
  if (config) {
    const existingProfiles = getClavueProviderProfiles(config);
    const removedIds = new Set([
      ...existingProfiles.filter(isCcjkClavueProfile).map(profile => profile.id),
      ...getLegacyMyclaudeProviderProfiles(config).map(profile => profile.id),
    ]);
    const preservedProfiles = existingProfiles.filter(profile => !removedIds.has(profile.id));
    const currentActiveId = config.clavueActiveProviderProfileId || config.myclaudeActiveProviderProfileId;
    const nextActiveId = preservedProfiles.some(profile => profile.id === currentActiveId)
      ? currentActiveId
      : preservedProfiles[0]?.id;

    if (preservedProfiles.length > 0) {
      config.clavueProviderProfiles = preservedProfiles;
      config.clavueActiveProviderProfileId = nextActiveId;
      preservedActiveProfile = preservedProfiles.find(profile => profile.id === nextActiveId)
        ? toLegacyProviderProfile(preservedProfiles.find(profile => profile.id === nextActiveId)!)
        : null;
    }
    else {
      delete config.clavueProviderProfiles;
      delete config.clavueActiveProviderProfileId;
    }
    delete config.myclaudeProviderProfiles;
    delete config.myclaudeActiveProviderProfileId;
    writeClavueConfig(config);

    if (removedIds.size > 0) {
      const credentials = readClavueCredentialsConfig();
      if (credentials.providerProfiles) {
        const nextProviderProfiles = { ...credentials.providerProfiles };
        for (const profileId of removedIds) {
          delete nextProviderProfiles[profileId];
        }
        writeClavueCredentialsConfig({
          ...credentials,
          providerProfiles: Object.keys(nextProviderProfiles).length > 0 ? nextProviderProfiles : undefined,
        });
      }
    }
  }

  syncMyclaudeActiveProfileToSettings(preservedActiveProfile);
}

function getKnownMcpServiceIds(): Set<string> {
  return new Set(MCP_SERVICE_CONFIGS.map(service => service.id));
}

function getMcpPermission(serviceId: string): string {
  return `mcp__${serviceId.toLowerCase().replace(/-/g, '_')}__*`;
}

export function syncMcpPermissions(codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool);
  const mcpConfig = readMcpConfig(target.codeTool);
  const knownServiceIds = getKnownMcpServiceIds();
  const managedMcpServerIds = Object.keys(mcpConfig?.mcpServers || {})
    .filter(id => knownServiceIds.has(id));

  const settingsPath = target.settingsFile;
  const settings = readJsonConfig<Record<string, any>>(settingsPath) || {};
  const allow = Array.isArray(settings.permissions?.allow)
    ? settings.permissions.allow.filter((permission: unknown): permission is string => typeof permission === 'string')
    : [];

  const managedMcpPermissions = new Set(
    [...knownServiceIds].map(getMcpPermission),
  );
  const nonManagedPerms = allow.filter((permission: string) => !managedMcpPermissions.has(permission));
  const mcpPerms = managedMcpServerIds.map(getMcpPermission);

  settings.permissions = {
    ...(settings.permissions || {}),
    allow: [...nonManagedPerms, ...mcpPerms],
  };

  applyTrustedOperatorPermissions(settings);
  normalizeClaudeFamilySettings(settings);
  writeJsonConfig(settingsPath, settings);
}
