/**
 * Config API Subcommand
 *
 * Handles API provider configuration for Claude Code and Codex.
 * Supports listing providers, showing current config, and setting API keys.
 *
 * Usage:
 *   ccjk config api [provider] [key]        Set API key for provider
 *   ccjk config api --list                 List available providers
 *   ccjk config api --show                 Show current API config
 *   ccjk config api --code-type <type>     Specify code tool type
 */

import type { ApiProviderPreset } from '../../config/api-providers';
import type { CodeToolType } from '../../constants';
import type { ClaudeConfiguration, ClavueCredentialsConfiguration } from '../../types';
import type { CodexProvider } from '../../utils/code-tools/codex';
import type { ApiConfigOptions } from './types';

import ansis from 'ansis';
import { getApiProvidersAsync } from '../../config/api-providers';
import { getApiConfig as getClaudeApiConfig, setApiConfig as setClaudeApiConfig } from '../../config/unified/claude-config';
import { CLAVUE_CREDENTIALS_FILE, CODEX_AUTH_FILE, DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType } from '../../constants';
import { ensureI18nInitialized, i18n } from '../../i18n';
import { readClavueConfig, setMyclaudeProviderProfiles } from '../../utils/claude-config';
import { resolveClaudeFamilyModelSlots } from '../../utils/claude-model-slots';
import { readCodexConfig, switchToProvider } from '../../utils/code-tools/codex';
import { addProviderToExisting } from '../../utils/code-tools/codex-provider-manager';
import { readJsonConfig } from '../../utils/json-config';

type ProviderRuntimeConfig = NonNullable<ApiProviderPreset['claudeCode']> | NonNullable<ApiProviderPreset['codex']>;

function isClaudeFamilyCodeType(codeType: CodeToolType): boolean {
  return codeType === 'claude-code' || codeType === 'clavue';
}

function getRuntimeDisplayName(codeType: CodeToolType): string {
  if (codeType === 'clavue') {
    return 'Clavue';
  }
  if (codeType === 'codex') {
    return 'Codex';
  }
  return 'Claude Code';
}

function getProviderRuntimeConfig(provider: ApiProviderPreset, codeType: CodeToolType): ProviderRuntimeConfig | undefined {
  return isClaudeFamilyCodeType(codeType) ? provider.claudeCode : provider.codex;
}

function getProviderAuthType(provider: ApiProviderPreset, codeType: CodeToolType): 'api_key' | 'auth_token' {
  if (isClaudeFamilyCodeType(codeType) && provider.claudeCode) {
    return provider.claudeCode.authType;
  }

  return 'api_key';
}

function getProviderModels(provider: ApiProviderPreset, codeType: CodeToolType): string[] | undefined {
  if (isClaudeFamilyCodeType(codeType)) {
    return provider.claudeCode?.defaultModels;
  }

  return provider.codex?.defaultModel ? [provider.codex.defaultModel] : undefined;
}

function sanitizeCodexProviderId(input: string): string {
  return input.trim().toLowerCase().replace(/\./g, '-').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'custom';
}

function buildCodexProvider(provider: ApiProviderPreset, providerConfig: ProviderRuntimeConfig): CodexProvider {
  const providerId = sanitizeCodexProviderId(provider.id || provider.name);
  return {
    id: providerId,
    name: provider.name,
    baseUrl: providerConfig.baseUrl,
    wireApi: 'wireApi' in providerConfig ? providerConfig.wireApi : 'responses',
    tempEnvKey: `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    requiresOpenaiAuth: false,
    model: provider.codex?.defaultModel,
  };
}

function getRuntimeApiConfig(codeType: CodeToolType): { url?: string; key?: string; authType?: 'api_key' | 'auth_token' } | null {
  if (codeType === 'codex') {
    const config = readCodexConfig();
    const activeProvider = config?.providers.find(provider => provider.id === config.modelProvider);
    if (!activeProvider) {
      return null;
    }

    const auth = readJsonConfig<Record<string, string | null>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {};
    return {
      url: activeProvider.baseUrl,
      key: auth[activeProvider.tempEnvKey] || undefined,
      authType: 'api_key',
    };
  }

  if (codeType !== 'clavue') {
    return getClaudeApiConfig();
  }

  const config = readClavueConfig();
  const activeProfileId = config?.clavueActiveProviderProfileId || config?.myclaudeActiveProviderProfileId;
  const activeProfile = Array.isArray(config?.clavueProviderProfiles)
    ? config.clavueProviderProfiles.find(profile => profile.id === activeProfileId)
    : undefined;
  if (!activeProfile) {
    return null;
  }

  const credentials = readJsonConfig<ClavueCredentialsConfiguration>(CLAVUE_CREDENTIALS_FILE);
  const credential = credentials?.providerProfiles?.[activeProfile.id];

  return {
    url: activeProfile.baseUrl,
    key: credential?.credential,
    authType: credential?.authType || activeProfile.authType,
  };
}

function getActiveClavueProviderProfileId(config: ClaudeConfiguration | null): string | undefined {
  return config?.clavueActiveProviderProfileId || config?.myclaudeActiveProviderProfileId;
}

function isClavueProviderCurrent(provider: ApiProviderPreset, providerConfig: ProviderRuntimeConfig, codeType: CodeToolType): boolean {
  if (codeType !== 'clavue') {
    return getRuntimeApiConfig(codeType)?.url === providerConfig.baseUrl;
  }

  const config = readClavueConfig();
  const activeProfileId = getActiveClavueProviderProfileId(config);
  const activeProfile = Array.isArray(config?.clavueProviderProfiles)
    ? config.clavueProviderProfiles.find(profile => profile.id === activeProfileId)
    : undefined;

  return activeProfile?.providerId === provider.id
    || activeProfile?.baseUrl === providerConfig.baseUrl;
}

function syncMyclaudeProviderProfile(
  provider: ApiProviderPreset,
  apiKey: string,
  providerConfig: ProviderRuntimeConfig,
  authType: 'api_key' | 'auth_token',
  defaultModels?: string[],
): void {
  const {
    primaryModel,
    haikuModel,
    sonnetModel,
    opusModel,
  } = resolveClaudeFamilyModelSlots({ defaultModels });

  setMyclaudeProviderProfiles([
    {
      id: provider.id,
      name: provider.name,
      provider: provider.id,
      apiKey,
      baseUrl: providerConfig.baseUrl,
      model: primaryModel,
      fastModel: haikuModel,
      authType,
      primaryModel,
      defaultHaikuModel: haikuModel,
      defaultSonnetModel: sonnetModel,
      defaultOpusModel: opusModel,
    },
  ], provider.id);
}

/**
 * Display a list of available API providers
 *
 * @param codeType - Code tool type (claude-code or codex)
 * @param options - Command options
 */
async function listProviders(codeType: CodeToolType, _options: ApiConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    const providers = await getApiProvidersAsync(codeType);

    if (providers.length === 0) {
      console.log(ansis.yellow(isZh
        ? 'No API providers available'
        : '没有可用的 API 供应商'));
      console.log('');
      return;
    }

    // Display header
    console.log('');
    console.log(ansis.bold.cyan(isZh
      ? `Available API Providers (${codeType})`
      : `可用的 API 供应商 (${codeType})`));
    console.log(ansis.dim('─'.repeat(60)));
    console.log('');

    // Get current API config to highlight active provider
    // Display each provider
    for (const provider of providers) {
      // Get provider-specific config based on code type
      const providerConfig = getProviderRuntimeConfig(provider, codeType);
      if (!providerConfig)
        continue;

      const isCurrent = isClavueProviderCurrent(provider, providerConfig, codeType);
      const statusIndicator = isCurrent ? ansis.green('● ') : '  ';
      const currentLabel = isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : '';

      console.log(`${statusIndicator}${ansis.bold(provider.name)}${currentLabel}`);
      console.log(`  ${ansis.green('ID:')} ${provider.id}`);
      console.log(`  ${ansis.green('URL:')} ${ansis.dim(providerConfig.baseUrl)}`);

      if (provider.description) {
        console.log(`  ${ansis.dim(provider.description)}`);
      }

      if (isClaudeFamilyCodeType(codeType) && provider.claudeCode?.defaultModels && provider.claudeCode.defaultModels.length > 0) {
        console.log(`  ${ansis.green('Models:')} ${provider.claudeCode.defaultModels.join(', ')}`);
      }
      else if (codeType === 'codex' && provider.codex?.defaultModel) {
        console.log(`  ${ansis.green('Model:')} ${provider.codex.defaultModel}`);
      }

      if (provider.isCloud) {
        console.log(`  ${ansis.blue('Cloud provider')}`);
      }

      console.log('');
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to list API providers'
      : '列出 API 供应商失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Show current API configuration
 *
 * @param codeType - Code tool type
 * @param options - Command options
 */
async function showCurrentConfig(codeType: CodeToolType, _options: ApiConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    const apiConfig = getRuntimeApiConfig(codeType);

    console.log('');
    console.log(ansis.bold.cyan(isZh ? 'Current API Configuration' : '当前 API 配置'));
    console.log(ansis.dim('─'.repeat(60)));
    console.log('');

    if (!apiConfig) {
      console.log(ansis.yellow(isZh
        ? 'No API configuration found (using official login)'
        : '未找到 API 配置（使用官方登录）'));
      console.log('');
      console.log(ansis.dim(isZh
        ? 'Use "ccjk config api <provider> <key>" to configure a provider'
        : '使用 "ccjk config api <供应商> <密钥>" 配置供应商'));
      console.log('');
      return;
    }

    // Display auth type
    console.log(`${ansis.green('Auth Type:')} ${apiConfig.authType || 'N/A'}`);

    // Display URL
    if (apiConfig.url) {
      console.log(`${ansis.green('Base URL:')} ${apiConfig.url}`);
    }

    // Display masked key
    if (apiConfig.key) {
      const maskedKey = apiConfig.key.length > 8
        ? `${apiConfig.key.slice(0, 4)}...${apiConfig.key.slice(-4)}`
        : '****';
      console.log(`${ansis.green('Key:')} ${ansis.dim(maskedKey)}`);
    }

    // Try to identify the provider
    const providers = await getApiProvidersAsync(codeType);
    const matchedProvider = providers.find((p) => {
      const config = getProviderRuntimeConfig(p, codeType);
      return config?.baseUrl === apiConfig.url;
    });
    if (matchedProvider) {
      console.log(`${ansis.green('Provider:')} ${matchedProvider.name}`);
    }

    console.log('');
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to read API configuration'
      : '读取 API 配置失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Set API configuration for a provider
 *
 * @param providerId - Provider identifier
 * @param apiKey - API key or auth token
 * @param codeType - Code tool type
 * @param options - Command options
 */
async function setProviderApi(
  providerId: string,
  apiKey: string,
  codeType: CodeToolType,
  _options: ApiConfigOptions,
): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    // Find the provider
    const providers = await getApiProvidersAsync(codeType);
    const provider = providers.find(p => p.id === providerId);

    if (!provider) {
      console.log(ansis.yellow(isZh
        ? `Provider "${providerId}" not found`
        : `未找到供应商 "${providerId}"`));
      console.log('');
      console.log(ansis.dim(isZh ? 'Available providers:' : '可用供应商:'));
      for (const p of providers) {
        console.log(`  - ${p.id} (${p.name})`);
      }
      console.log('');
      return;
    }

    // Get provider-specific config
    const providerConfig = getProviderRuntimeConfig(provider, codeType);

    if (!providerConfig) {
      console.log(ansis.red(isZh
        ? `Provider "${providerId}" does not support ${codeType}`
        : `供应商 "${providerId}" 不支持 ${codeType}`));
      console.log('');
      return;
    }

    // Get auth type and models based on code type
    const authType = getProviderAuthType(provider, codeType);
    const defaultModels = getProviderModels(provider, codeType);

    if (codeType === 'codex') {
      const codexProvider = buildCodexProvider(provider, providerConfig);
      const result = await addProviderToExisting(codexProvider, apiKey, true);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save Codex provider');
      }

      const switched = await switchToProvider(codexProvider.id);
      if (!switched) {
        throw new Error(`Failed to switch Codex provider to ${codexProvider.id}`);
      }
    }
    else if (codeType === 'clavue') {
      syncMyclaudeProviderProfile(provider, apiKey, providerConfig, authType, defaultModels);
    }
    else {
      setClaudeApiConfig({
        url: providerConfig.baseUrl,
        key: apiKey,
        authType,
      });
    }

    // Success message
    console.log('');
    console.log(ansis.green(isZh
      ? `API configuration updated successfully`
      : 'API 配置更新成功'));
    console.log('');
    console.log(ansis.bold(isZh ? 'Configuration:' : '配置信息:'));
    console.log(`  ${ansis.green('Provider:')} ${provider.name}`);
    console.log(`  ${ansis.green('Base URL:')} ${providerConfig.baseUrl}`);
    console.log(`  ${ansis.green('Auth Type:')} ${authType}`);

    if (defaultModels && defaultModels.length > 0) {
      console.log(`  ${ansis.green('Models:')} ${defaultModels.join(', ')}`);
    }

    console.log('');
    console.log(ansis.dim(isZh
      ? `现在可以使用配置的供应商使用 ${getRuntimeDisplayName(codeType)} 了。`
      : `You can now use ${getRuntimeDisplayName(codeType)} with the configured provider.`));
    console.log('');
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to set API configuration'
      : '设置 API 配置失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * API subcommand main handler
 *
 * @param args - Command arguments [provider?, key?]
 * @param options - Command options
 */
export async function apiCommand(args: string[], options: ApiConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized();

  const isZh = i18n.language === 'zh-CN';

  // Resolve code type
  let codeType: CodeToolType;
  if (options.codeType && isCodeToolType(options.codeType)) {
    codeType = options.codeType;
  }
  else if (options.codeType) {
    codeType = resolveCodeToolType(options.codeType);
  }
  else {
    codeType = DEFAULT_CODE_TOOL_TYPE;
  }

  // Handle --list flag
  if (options.list) {
    await listProviders(codeType, options);
    return;
  }

  // Handle --show flag
  if (options.show) {
    await showCurrentConfig(codeType, options);
    return;
  }

  // Handle provider + key arguments
  if (args.length === 0) {
    // No arguments - show both list and current
    await showCurrentConfig(codeType, options);
    console.log('');
    await listProviders(codeType, options);
    return;
  }

  if (args.length === 1) {
    // Only provider specified - show provider details
    const providers = await getApiProvidersAsync(codeType);
    const provider = providers.find(p => p.id === args[0]);

    if (provider) {
      console.log('');
      console.log(ansis.bold.cyan(provider.name));
      console.log(ansis.dim('─'.repeat(60)));
      console.log('');
      console.log(`${ansis.green('ID:')} ${provider.id}`);

      const providerConfig = getProviderRuntimeConfig(provider, codeType);
      if (providerConfig?.baseUrl) {
        console.log(`${ansis.green('URL:')} ${providerConfig.baseUrl}`);
      }

      console.log(`${ansis.green('Auth Type:')} ${isClaudeFamilyCodeType(codeType) ? provider.claudeCode?.authType : provider.codex?.wireApi || 'N/A'}`);

      if (provider.description) {
        console.log(`${ansis.green('Description:')} ${provider.description}`);
      }

      const models = getProviderModels(provider, codeType);
      if (models?.length) {
        console.log(`${ansis.green('Models:')} ${models.filter(Boolean).join(', ')}`);
      }

      console.log('');
      console.log(ansis.dim(isZh
        ? `Usage: ccjk config api ${args[0]} <your-api-key>`
        : `用法: ccjk config api ${args[0]} <你的API密钥>`));
      console.log('');
    }
    else {
      console.log(ansis.red(isZh
        ? `Provider "${args[0]}" not found`
        : `未找到供应商 "${args[0]}"`));
    }
    return;
  }

  // Both provider and key provided
  const [providerId, ...keyParts] = args;
  const apiKey = keyParts.join(' ');

  await setProviderApi(providerId, apiKey, codeType, options);
}
