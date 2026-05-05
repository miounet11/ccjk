/**
 * Config Switch Subcommand
 *
 * Handles switching between configuration profiles for Claude Code and Codex.
 * Supports listing available profiles and switching to a specific profile.
 *
 * Usage:
 *   ccjk config switch <target>              Switch to profile
 *   ccjk config switch --list                List available profiles
 *   ccjk config switch --code-type <type>    Specify code tool type
 *
 * Special targets for Claude Code:
 *   - official: Switch to official OAuth login
 *   - ccr: Switch to CCR proxy
 */

import type { CodeToolType } from '../../constants';
import type { SwitchConfigOptions } from './types';

import ansis from 'ansis';
import { config } from '../../config/unified';
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType } from '../../constants';
import { ensureI18nInitialized, i18n } from '../../i18n';
import { ClaudeCodeConfigManager } from '../../utils/claude-code-config-manager';
import { readClavueConfig, setMyclaudeActiveProviderProfile } from '../../utils/claude-config';
import { listCodexProviders as listCodexProvidersUtil, readCodexConfig, switchToOfficialLogin, switchToProvider as switchToProviderUtil } from '../../utils/code-tools/codex';

/**
 * Resolve code type with fallback to CCJK config
 *
 * @param codeType - Code type from options
 * @returns Resolved code type
 */
function resolveCodeType(codeType?: unknown): CodeToolType {
  if (codeType !== undefined) {
    if (isCodeToolType(codeType as CodeToolType)) {
      return codeType as CodeToolType;
    }
    return resolveCodeToolType(codeType as string);
  }

  // Fall back to CCJK config
  const ccjkConfig = config.ccjk.read();
  if (ccjkConfig?.general?.currentTool && isCodeToolType(ccjkConfig.general.currentTool)) {
    return ccjkConfig.general.currentTool;
  }

  return DEFAULT_CODE_TOOL_TYPE;
}

interface ClavueSwitchProfile {
  id: string;
  name: string;
  providerId?: string;
  externalId?: string;
  baseUrl?: string;
  authType?: string;
  modelSummary?: string;
}

function getUniqueDisplayModels(models: Array<unknown>): string {
  return [...new Set(models
    .filter((model): model is string => typeof model === 'string' && model.trim().length > 0)
    .map(model => model.trim()))].join(', ');
}

function getClavueSwitchProfiles(): { activeId: string; profiles: ClavueSwitchProfile[] } {
  const clavueConfig = readClavueConfig();
  const activeId = clavueConfig?.clavueActiveProviderProfileId || clavueConfig?.myclaudeActiveProviderProfileId || '';
  const profiles: ClavueSwitchProfile[] = [];
  const seen = new Set<string>();

  const nativeProfiles = Array.isArray(clavueConfig?.clavueProviderProfiles)
    ? clavueConfig.clavueProviderProfiles
    : [];
  for (const profile of nativeProfiles) {
    const routing = profile.modelRouting || {};
    const externalId = typeof profile.provenance?.externalProfileId === 'string'
      ? profile.provenance.externalProfileId.trim()
      : undefined;

    profiles.push({
      id: profile.id,
      name: profile.name || profile.id,
      providerId: profile.providerId,
      externalId,
      baseUrl: profile.baseUrl,
      authType: profile.authType,
      modelSummary: getUniqueDisplayModels([
        routing.primaryModel,
        routing.smallFastModel,
        routing.generalModel,
        routing.planModel,
      ]),
    });
    seen.add(profile.id);
  }

  const legacyProfiles = Array.isArray(clavueConfig?.myclaudeProviderProfiles)
    ? clavueConfig.myclaudeProviderProfiles
    : [];
  for (const profile of legacyProfiles) {
    if (seen.has(profile.id)) {
      continue;
    }
    profiles.push({
      id: profile.id,
      name: profile.name || profile.id,
      providerId: profile.provider,
      baseUrl: profile.baseUrl,
      authType: profile.authType,
      modelSummary: getUniqueDisplayModels([
        profile.primaryModel,
        profile.model,
        profile.defaultHaikuModel,
        profile.fastModel,
        profile.defaultSonnetModel,
        profile.defaultOpusModel,
      ]),
    });
  }

  return { activeId, profiles };
}

function findClavueSwitchProfile(profiles: ClavueSwitchProfile[], target: string): ClavueSwitchProfile | undefined {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) {
    return undefined;
  }

  const exact = profiles.find(profile =>
    profile.id === normalizedTarget
    || profile.externalId === normalizedTarget
    || profile.providerId === normalizedTarget,
  );
  if (exact) {
    return exact;
  }

  const loweredTarget = normalizedTarget.toLowerCase();
  return profiles.find(profile =>
    profile.name.toLowerCase() === loweredTarget
    || profile.id.toLowerCase() === loweredTarget
    || profile.externalId?.toLowerCase() === loweredTarget
    || profile.providerId?.toLowerCase() === loweredTarget,
  );
}

/**
 * List available Claude Code profiles
 *
 * @param options - Command options
 */
async function listClaudeCodeProfiles(_options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    const ccjkConfig = config.ccjk.read();
    const claudeConfig = config.claude.read();

    if (!ccjkConfig || !ccjkConfig.tools?.claudeCode) {
      console.log(ansis.yellow(isZh
        ? 'No CCJK configuration found'
        : '未找到 CCJK 配置'));
      console.log(ansis.dim(isZh
        ? 'Run "ccjk init" to initialize configuration'
        : '运行 "ccjk init" 初始化配置'));
      console.log('');
      return;
    }

    const profiles = ccjkConfig.tools.claudeCode.profiles || {};
    const currentProfileId = ccjkConfig.tools.claudeCode.currentProfile || '';
    const hasApiConfig = claudeConfig?.env?.ANTHROPIC_BASE_URL || claudeConfig?.env?.ANTHROPIC_API_KEY || claudeConfig?.env?.ANTHROPIC_AUTH_TOKEN;

    console.log('');
    console.log(ansis.bold.cyan(isZh ? 'Claude Code Configuration Profiles' : 'Claude Code 配置文件'));
    console.log(ansis.dim('─'.repeat(60)));
    console.log('');

    // Display special profiles
    const isOfficialMode = !currentProfileId || !hasApiConfig;
    console.log(`${isOfficialMode ? ansis.green('● ') : '  '}${ansis.bold('Official Login')}${isOfficialMode ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
    console.log(`  ${ansis.green('ID:')} official`);
    console.log(`  ${ansis.dim(isZh ? 'Use Anthropic official OAuth login' : '使用 Anthropic 官方 OAuth 登录')}`);
    console.log('');

    const ccrProfile = profiles['ccr-proxy'];
    if (ccrProfile) {
      const isCcr = currentProfileId === 'ccr-proxy';
      console.log(`${isCcr ? ansis.green('● ') : '  '}${ansis.bold(ccrProfile.name || 'CCR Proxy')}${isCcr ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
      console.log(`  ${ansis.green('ID:')} ccr`);
      console.log(`  ${ansis.dim(isZh ? 'Claude Code Router proxy configuration' : 'Claude Code Router 代理配置')}`);
      console.log('');
    }

    // Display custom profiles
    for (const [id, profile] of Object.entries(profiles)) {
      if (id === 'ccr-proxy')
        continue; // Already displayed above

      const isCurrent = id === currentProfileId;
      console.log(`${isCurrent ? ansis.green('● ') : '  '}${ansis.bold(profile.name || id)}${isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
      console.log(`  ${ansis.green('ID:')} ${id}`);

      if (profile.baseUrl) {
        console.log(`  ${ansis.green('URL:')} ${ansis.dim(profile.baseUrl)}`);
      }

      if (profile.authType) {
        console.log(`  ${ansis.green('Auth:')} ${profile.authType}`);
      }

      console.log('');
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to list Claude Code profiles'
      : '列出 Claude Code 配置文件失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * List available Clavue provider profiles
 *
 * @param options - Command options
 */
async function listClavueProviderProfiles(_options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';
  const { activeId, profiles } = getClavueSwitchProfiles();

  if (profiles.length === 0) {
    console.log(ansis.yellow(isZh
      ? '没有可用的 Clavue 供应商配置'
      : 'No Clavue provider profiles available'));
    console.log(ansis.dim(isZh
      ? '使用 "ccjk config api <provider> <key> --code-type clavue" 添加配置'
      : 'Use "ccjk config api <provider> <key> --code-type clavue" to add one'));
    console.log('');
    return;
  }

  console.log('');
  console.log(ansis.bold.cyan(isZh ? 'Clavue 供应商配置' : 'Clavue Provider Profiles'));
  console.log(ansis.dim('─'.repeat(60)));
  console.log('');

  console.log(`${!activeId ? ansis.green('● ') : '  '}${ansis.bold('Official Login')}${!activeId ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
  console.log(`  ${ansis.green('ID:')} official`);
  console.log(`  ${ansis.dim(isZh ? '使用 Clavue 原生/默认登录' : 'Use Clavue native/default login')}`);
  console.log('');

  for (const profile of profiles) {
    const isCurrent = profile.id === activeId;
    console.log(`${isCurrent ? ansis.green('● ') : '  '}${ansis.bold(profile.name)}${isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
    console.log(`  ${ansis.green('ID:')} ${profile.id}`);

    if (profile.externalId && profile.externalId !== profile.id) {
      console.log(`  ${ansis.green('Alias:')} ${profile.externalId}`);
    }

    if (profile.providerId) {
      console.log(`  ${ansis.green('Provider:')} ${profile.providerId}`);
    }

    if (profile.baseUrl) {
      console.log(`  ${ansis.green('URL:')} ${ansis.dim(profile.baseUrl)}`);
    }

    if (profile.authType) {
      console.log(`  ${ansis.green('Auth:')} ${profile.authType}`);
    }

    if (profile.modelSummary) {
      console.log(`  ${ansis.green('Models:')} ${profile.modelSummary}`);
    }

    console.log('');
  }
}

/**
 * List available Codex providers
 *
 * @param options - Command options
 */
async function listCodexProviders(_options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    const providers = await listCodexProvidersUtil();
    const existingConfig = readCodexConfig();
    const currentProvider = existingConfig?.modelProvider;
    const isCommented = existingConfig?.modelProviderCommented;

    if (!providers || providers.length === 0) {
      console.log(ansis.yellow(isZh
        ? 'No Codex providers available'
        : '没有可用的 Codex 供应商'));
      console.log('');
      return;
    }

    console.log('');
    console.log(ansis.bold.cyan(isZh ? 'Codex API Providers' : 'Codex API 供应商'));
    console.log(ansis.dim('─'.repeat(60)));
    console.log('');

    // Display official login option
    const isOfficialMode = !currentProvider || isCommented;
    console.log(`${isOfficialMode ? ansis.green('● ') : '  '}${ansis.bold('Official Login')}${isOfficialMode ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
    console.log(`  ${ansis.green('ID:')} official`);
    console.log(`  ${ansis.dim(isZh ? 'Use Codex official login' : '使用 Codex 官方登录')}`);
    console.log('');

    // Display providers
    for (const provider of providers) {
      const isCurrent = currentProvider === provider.id && !isCommented;
      console.log(`${isCurrent ? ansis.green('● ') : '  '}${ansis.bold(provider.name)}${isCurrent ? ansis.yellow(` (${isZh ? 'current' : '当前'})`) : ''}`);
      console.log(`  ${ansis.green('ID:')} ${provider.id}`);
      console.log(`  ${ansis.green('URL:')} ${ansis.dim(provider.baseUrl)}`);

      if (provider.tempEnvKey) {
        console.log(`  ${ansis.green('Env:')} ${ansis.dim(provider.tempEnvKey)}`);
      }

      console.log('');
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to list Codex providers'
      : '列出 Codex 供应商失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Switch Claude Code profile
 *
 * @param target - Target profile ID or special value
 * @param options - Command options
 */
async function switchClaudeCodeProfile(target: string, _options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    let success = false;
    let profileName = '';

    if (target === 'official') {
      // Switch to official login
      const result = await ClaudeCodeConfigManager.switchToOfficial();
      if (result.success) {
        success = true;
        profileName = isZh ? 'Official Login' : '官方登录';
        // Clear API config
        const { clearApiConfig } = await import('../../config/unified/claude-config');
        clearApiConfig();
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to official: ${result.error}`
          : `切换到官方登录失败: ${result.error}`));
      }
    }
    else if (target === 'ccr') {
      // Switch to CCR proxy
      const result = await ClaudeCodeConfigManager.switchToCcr();
      if (result.success) {
        success = true;
        profileName = isZh ? 'CCR Proxy' : 'CCR 代理';
        // Apply CCR profile settings
        const profile = ClaudeCodeConfigManager.getProfileById('ccr-proxy');
        if (profile) {
          const { setApiConfig } = await import('../../config/unified/claude-config');
          setApiConfig({
            url: profile.baseUrl,
            authType: 'api_key',
          });
        }
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to CCR: ${result.error}`
          : `切换到 CCR 失败: ${result.error}`));
      }
    }
    else {
      // Switch to custom profile
      const ccjkConfig = config.ccjk.read();
      if (!ccjkConfig?.tools?.claudeCode?.profiles) {
        console.log(ansis.yellow(isZh
          ? 'No custom profiles found'
          : '未找到自定义配置文件'));
        console.log(ansis.dim(isZh
          ? 'Use "ccjk config switch --list" to see available profiles'
          : '使用 "ccjk config switch --list" 查看可用配置文件'));
        console.log('');
        return;
      }

      const profiles = ccjkConfig.tools.claudeCode.profiles;
      let profile = profiles[target];

      // Try to find by name
      if (!profile) {
        for (const [id, p] of Object.entries(profiles)) {
          if (p.name === target) {
            profile = p;
            target = id;
            break;
          }
        }
      }

      if (!profile) {
        console.log(ansis.red(isZh
          ? `Profile "${target}" not found`
          : `未找到配置文件 "${target}"`));
        console.log('');
        console.log(ansis.dim(isZh ? 'Available profiles:' : '可用配置文件:'));
        for (const [id, p] of Object.entries(profiles)) {
          console.log(`  - ${id} (${p.name || id})`);
        }
        console.log('');
        return;
      }

      const result = await ClaudeCodeConfigManager.switchProfile(target);
      if (result.success) {
        success = true;
        profileName = profile.name || target;

        // Apply profile settings
        const { setApiConfig } = await import('../../config/unified/claude-config');
        setApiConfig({
          url: profile.baseUrl,
          authType: profile.authType as 'api_key' | 'auth_token',
        });
      }
      else {
        console.log(ansis.red(isZh
          ? `Failed to switch to profile: ${result.error}`
          : `切换到配置文件失败: ${result.error}`));
      }
    }

    if (success) {
      console.log('');
      console.log(ansis.green(isZh
        ? `Successfully switched to: ${profileName}`
        : `成功切换到: ${profileName}`));
      console.log('');
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? 'Failed to switch profile'
      : '切换配置文件失败'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Switch Clavue active provider profile
 *
 * @param target - Target Clavue profile ID, imported alias, provider ID, profile name, or 'official'
 * @param options - Command options
 */
async function switchClavueProviderProfile(target: string, _options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    if (target === 'official') {
      setMyclaudeActiveProviderProfile(undefined);
      console.log('');
      console.log(ansis.green(isZh
        ? '成功切换到: 官方登录'
        : 'Successfully switched to: Official Login'));
      console.log('');
      return;
    }

    const { profiles } = getClavueSwitchProfiles();
    const profile = findClavueSwitchProfile(profiles, target);

    if (!profile) {
      console.log(ansis.red(isZh
        ? `未找到 Clavue 配置 "${target}"`
        : `Clavue profile "${target}" not found`));
      console.log('');
      console.log(ansis.dim(isZh ? '可用 Clavue 配置:' : 'Available Clavue profiles:'));
      for (const availableProfile of profiles) {
        const aliases = [availableProfile.externalId, availableProfile.providerId]
          .filter((alias): alias is string => Boolean(alias && alias !== availableProfile.id));
        const suffix = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
        console.log(`  - ${availableProfile.id}${suffix}`);
      }
      console.log('');
      return;
    }

    setMyclaudeActiveProviderProfile(profile.id);

    console.log('');
    console.log(ansis.green(isZh
      ? `成功切换到: ${profile.name}`
      : `Successfully switched to: ${profile.name}`));
    console.log('');
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? '切换 Clavue 配置失败'
      : 'Failed to switch Clavue profile'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Switch Codex provider
 *
 * @param target - Target provider ID or 'official'
 * @param options - Command options
 */
async function switchCodexProvider(target: string, _options: SwitchConfigOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  try {
    let success = false;
    let providerName = '';

    if (target === 'official') {
      success = await switchToOfficialLogin();
      providerName = isZh ? '官方登录' : 'Official Login';
    }
    else {
      success = await switchToProviderUtil(target);
      if (success) {
        const providers = await listCodexProvidersUtil();
        const provider = providers.find(p => p.id === target);
        providerName = provider?.name || target;
      }
    }

    if (success) {
      console.log('');
      console.log(ansis.green(isZh
        ? `成功切换到: ${providerName}`
        : `Successfully switched to: ${providerName}`));
      console.log('');
    }
    else {
      console.log(ansis.red(isZh
        ? '切换供应商失败'
        : 'Failed to switch provider'));
    }
  }
  catch (error) {
    console.error(ansis.red(isZh
      ? '切换供应商失败'
      : 'Failed to switch provider'));
    if (error instanceof Error) {
      console.error(ansis.dim(error.message));
    }
  }
}

/**
 * Switch subcommand main handler
 *
 * @param target - Target profile or provider ID
 * @param options - Command options
 */
export async function switchCommand(target?: string, options: SwitchConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized();

  const isZh = i18n.language === 'zh-CN';

  // Resolve code type
  const codeType = resolveCodeType(options.codeType);

  // Handle --list flag
  if (options.list) {
    if (codeType === 'claude-code') {
      await listClaudeCodeProfiles(options);
    }
    else if (codeType === 'clavue') {
      await listClavueProviderProfiles(options);
    }
    else if (codeType === 'codex') {
      await listCodexProviders(options);
    }
    return;
  }

  // Require target for switching
  if (!target) {
    console.log(ansis.yellow(isZh
      ? 'Please specify a target profile or use --list to see available options'
      : '请指定目标配置文件或使用 --list 查看可用选项'));
    console.log('');
    console.log(ansis.dim(isZh
      ? 'Usage: ccjk config switch <target>'
      : '用法: ccjk config switch <目标>'));
    console.log(ansis.dim(isZh
      ? '       ccjk config switch --list'
      : '       ccjk config switch --list'));
    console.log('');
    return;
  }

  // Switch based on code type
  if (codeType === 'claude-code') {
    await switchClaudeCodeProfile(target, options);
  }
  else if (codeType === 'clavue') {
    await switchClavueProviderProfile(target, options);
  }
  else if (codeType === 'codex') {
    await switchCodexProvider(target, options);
  }
}
