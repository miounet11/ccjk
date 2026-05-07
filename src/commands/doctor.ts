/**
 * CCJK Doctor Command
 * Health check and diagnostic tool for Claude Code environment
 */

import type { CodeToolType } from '../constants';
import { existsSync, readdirSync } from 'node:fs';
import process from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { join, resolve } from 'pathe';
import { getApiProviderPresets } from '../config/api-providers';
import { CODEX_CONFIG_FILE, CODEX_DIR, getCodeToolRuntimeCommand } from '../constants';
import { i18n } from '../i18n';
import { getPermissionManager } from '../permissions/permission-manager';
import { isCcrInstalled } from '../utils/ccr/installer';
import { inspectClaudeFamilyCoreFeatures } from '../utils/claude-family-core-features';
import { readCodexConfig, readCodexGoalsFeatureEnabled } from '../utils/code-tools/codex';
import { backupExistingConfig, copyConfigFiles } from '../utils/config';
import { commandExists } from '../utils/platform';
import { ProviderHealthMonitor } from '../utils/provider-health';
import { resolveClaudeFamilySettingsTarget } from '../utils/runtime-settings';
import { displayWorkspaceReport, runWorkspaceCheck, runWorkspaceWizard } from '../utils/workspace-guide';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
  details?: string[];
}

export interface DoctorOptions {
  checkProviders?: boolean;
  codeType?: CodeToolType;
  fixSettings?: boolean;
  json?: boolean;
}

/**
 * Check if Claude Code CLI is installed
 */
async function checkClaudeCode(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  const runtimeCommand = getCodeToolRuntimeCommand(target.codeTool);
  const hasCommand = await commandExists(runtimeCommand);
  if (hasCommand) {
    return { name: target.displayName, status: 'ok', message: 'Installed' };
  }
  return {
    name: target.displayName,
    status: 'error',
    message: 'Not installed',
    fix: target.codeTool === 'clavue'
      ? 'Run: npm install -g clavue'
      : 'Run: npm install -g @anthropic-ai/claude-code',
  };
}

/**
 * Check if Claude configuration directory exists
 */
async function checkClaudeDir(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  if (existsSync(target.configDir)) {
    return { name: 'Config Directory', status: 'ok', message: target.configDir };
  }
  return {
    name: 'Config Directory',
    status: 'error',
    message: 'Does not exist',
    fix: 'Run: npx ccjk init',
  };
}

/**
 * Check if settings.json exists and is valid
 */
async function checkSettings(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  if (!existsSync(target.settingsFile)) {
    return {
      name: 'settings.json',
      status: 'warning',
      message: 'Not found',
      fix: 'Run: npx ccjk init',
    };
  }

  try {
    const { readFileSync } = await import('node:fs');
    const content = readFileSync(target.settingsFile, 'utf-8');
    const settings = JSON.parse(content);

    // Check for schema validation issues
    const issues: string[] = [];

    // Check $schema
    if (settings.$schema && settings.$schema !== 'https://json.schemastore.org/claude-code-settings.json') {
      issues.push('Invalid $schema URL');
    }

    // Check attribution
    if (typeof settings.attribution === 'string') {
      issues.push('attribution should be an object, not a string');
    }

    // Check fileSuggestion.type
    if (settings.fileSuggestion && settings.fileSuggestion.type !== 'command') {
      issues.push('fileSuggestion.type must be "command"');
    }

    // Check permissions.allow for lowercase tool names
    if (settings.permissions?.allow) {
      const lowerCaseTools = settings.permissions.allow.filter((t: string) =>
        /^[a-z]/.test(t) && !t.startsWith('Allow') && !t.startsWith('mcp__'),
      );
      if (lowerCaseTools.length > 0) {
        issues.push(`${lowerCaseTools.length} permission(s) with lowercase names`);
      }
    }

    // Check for invalid plansDirectory
    if (settings.plansDirectory === null) {
      issues.push('plansDirectory should not be null');
    }

    // CCJK lint: settings.model overrides ANTHROPIC_* env vars in Claude Code.
    // Custom model env vars are configured via ccjk; if both are set, env vars are dead.
    // Reference: src/utils/claude-code-config-manager.ts (v12.3.1 fix).
    const env = settings.env || {};
    const hasAnthropicModelVars = Boolean(
      env.ANTHROPIC_MODEL
      || env.ANTHROPIC_DEFAULT_OPUS_MODEL
      || env.ANTHROPIC_DEFAULT_SONNET_MODEL
      || env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    );
    if (settings.model && hasAnthropicModelVars) {
      issues.push(`settings.model="${settings.model}" overrides ANTHROPIC_* env vars (custom model selection broken)`);
    }

    // CCJK lint: SONNET slot should not be an opus-named model (silent misroute).
    const sonnet = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    if (typeof sonnet === 'string' && /opus/i.test(sonnet)) {
      issues.push(`ANTHROPIC_DEFAULT_SONNET_MODEL="${sonnet}" looks like an Opus model (slot misrouted)`);
    }

    // CCJK lint: mcp-gatekeeper hook is disabled by default (forks bash+node per MCP call).
    const preToolUse = settings.hooks?.PreToolUse;
    if (Array.isArray(preToolUse)) {
      const hasGatekeeper = preToolUse.some((h: { matcher?: string; hooks?: Array<{ command?: string }> }) =>
        h?.matcher === 'mcp__.*'
        && Array.isArray(h?.hooks)
        && h.hooks.some(c => typeof c?.command === 'string' && c.command.includes('mcp-gatekeeper')),
      );
      if (hasGatekeeper) {
        issues.push('mcp-gatekeeper PreToolUse hook is enabled (forks bash+node per MCP call; disabled by default)');
      }
    }

    if (issues.length > 0) {
      return {
        name: 'settings.json',
        status: 'error',
        message: `Validation issues: ${issues.length} problem(s)`,
        fix: 'Run: npx ccjk doctor --fix-settings',
        details: issues,
      };
    }

    return { name: 'settings.json', status: 'ok', message: 'Valid configuration' };
  }
  catch (_error) {
    return {
      name: 'settings.json',
      status: 'error',
      message: 'Invalid JSON',
      fix: 'Run: npx ccjk init',
    };
  }
}

/**
 * Check installed workflows
 */
async function checkWorkflows(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  const commandsDir = join(target.configDir, 'commands', 'ccjk');
  if (existsSync(commandsDir)) {
    try {
      const files = readdirSync(commandsDir, { recursive: true });
      const mdFiles = files.filter(f => String(f).endsWith('.md'));
      if (mdFiles.length === 0) {
        return {
          name: 'Workflows',
          status: 'warning',
          message: 'No CCJK commands installed',
          fix: `Run: npx ccjk zero-config dev${target.codeTool === 'clavue' ? ' --code-type clavue' : ''}`,
        };
      }
      return {
        name: 'Workflows',
        status: 'ok',
        message: `${mdFiles.length} commands installed`,
      };
    }
    catch {
      return { name: 'Workflows', status: 'warning', message: 'Cannot read directory' };
    }
  }
  return {
    name: 'Workflows',
    status: 'warning',
    message: 'Not installed',
    fix: 'Run: npx ccjk update',
  };
}

/**
 * Check MCP services configuration
 */
async function checkMcp(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  try {
    const state = await inspectClaudeFamilyCoreFeatures(target.codeTool);
    if (state.mcp.installed.length > 0) {
      const result: CheckResult = {
        name: 'MCP Services',
        status: state.mcp.missing.length === 0 ? 'ok' : 'warning',
        message: `${state.mcp.installed.length} service(s) configured`,
      };
      if (state.mcp.missing.length > 0) {
        result.fix = `Run: npx ccjk zero-config dev${target.codeTool === 'clavue' ? ' --code-type clavue' : ''}`;
        result.details = [`Missing core service(s): ${state.mcp.missing.join(', ')}`];
      }
      return result;
    }
  }
  catch {
    // Fall through to not configured result.
  }

  return {
    name: 'MCP Services',
    status: 'warning',
    message: 'Not configured',
    fix: `Run: npx ccjk zero-config dev${target.codeTool === 'clavue' ? ' --code-type clavue' : ''}`,
  };
}

/**
 * Check CCR proxy installation
 */
async function checkCcr(): Promise<CheckResult> {
  const status = await isCcrInstalled();
  if (status.hasCorrectPackage) {
    return { name: 'CCR Proxy', status: 'ok', message: 'Installed' };
  }
  if (status.isInstalled) {
    return {
      name: 'CCR Proxy',
      status: 'warning',
      message: 'Command exists, managed package not detected',
      fix: 'Run: npx ccjk zero-config dev',
    };
  }
  return {
    name: 'CCR Proxy',
    status: 'warning',
    message: 'Not installed',
    fix: 'Run: npx ccjk zero-config dev',
  };
}

/**
 * Check output styles installation
 */
/**
 * CCJK lint: discipline baseline integrity in CLAUDE.md.
 * The Karpathy-inspired 4 principles are written by `applyAiLanguageDirective`
 * and should remain present in ~/.claude/CLAUDE.md (and clavue equivalent).
 * If missing, the user is operating without the default behavioral floor.
 */
async function checkDisciplineBaseline(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  const memoryFile = target.instructionsFile;

  if (!existsSync(memoryFile)) {
    return {
      name: 'Discipline Baseline',
      status: 'warning',
      message: 'No memory file found',
      fix: 'Run: npx ccjk init',
    };
  }

  const { readFileSync } = await import('node:fs');
  const text = readFileSync(memoryFile, 'utf-8');

  // Markers from templates/common/karpathy-baseline.md — all four must be present
  const required = [
    '# Coding Discipline Baseline',
    'Think before coding',
    'Simplicity first',
    'Surgical changes',
    'Goal-driven execution',
  ];
  const missing = required.filter(m => !text.includes(m));

  if (missing.length === 0) {
    return {
      name: 'Discipline Baseline',
      status: 'ok',
      message: 'All 4 principles present',
    };
  }

  if (missing.length === required.length) {
    return {
      name: 'Discipline Baseline',
      status: 'warning',
      message: 'Baseline not installed (memory file exists but has no discipline section)',
      fix: 'Run: npx ccjk init',
    };
  }

  return {
    name: 'Discipline Baseline',
    status: 'error',
    message: `Baseline partially missing: ${missing.length}/${required.length} markers absent`,
    fix: 'Run: npx ccjk init  (will rewrite CLAUDE.md with full baseline)',
    details: missing,
  };
}

async function checkOutputStyles(codeType?: CodeToolType): Promise<CheckResult> {
  const target = resolveClaudeFamilySettingsTarget(codeType);
  const stylesDir = join(target.configDir, 'output-styles');
  if (existsSync(stylesDir)) {
    try {
      const files = readdirSync(stylesDir).filter(f => f.endsWith('.md'));
      if (files.length === 0) {
        return {
          name: 'Output Styles',
          status: 'warning',
          message: 'No styles installed',
          fix: `Run: npx ccjk zero-config dev${target.codeTool === 'clavue' ? ' --code-type clavue' : ''}`,
        };
      }
      return {
        name: 'Output Styles',
        status: 'ok',
        message: `${files.length} styles available`,
      };
    }
    catch {
      return { name: 'Output Styles', status: 'warning', message: 'Cannot read directory' };
    }
  }
  return {
    name: 'Output Styles',
    status: 'warning',
    message: 'Not installed',
    fix: `Run: npx ccjk zero-config dev${target.codeTool === 'clavue' ? ' --code-type clavue' : ''}`,
  };
}

async function checkCodexCli(): Promise<CheckResult> {
  const hasCommand = await commandExists('codex');
  if (hasCommand) {
    return { name: 'Codex', status: 'ok', message: 'Installed' };
  }

  return {
    name: 'Codex',
    status: 'error',
    message: 'Not installed',
    fix: 'Run: npm install -g @openai/codex',
  };
}

async function checkCodexDir(): Promise<CheckResult> {
  if (existsSync(CODEX_DIR)) {
    return { name: 'Config Directory', status: 'ok', message: CODEX_DIR };
  }

  return {
    name: 'Config Directory',
    status: 'error',
    message: 'Does not exist',
    fix: 'Run: npx ccjk init --code-type codex',
  };
}

async function checkCodexToml(): Promise<CheckResult> {
  if (!existsSync(CODEX_CONFIG_FILE)) {
    return {
      name: 'config.toml',
      status: 'warning',
      message: 'Not found',
      fix: 'Run: ccjk zero-config dev --code-type codex',
    };
  }

  const config = readCodexConfig();
  if (!config) {
    return {
      name: 'config.toml',
      status: 'error',
      message: 'Invalid TOML',
      fix: 'Check ~/.codex/config.toml or run: ccjk zero-config dev --code-type codex',
    };
  }

  return {
    name: 'config.toml',
    status: 'ok',
    message: 'Valid configuration',
  };
}

/**
 * CCJK lint: Codex non-standard field values.
 * `model_reasoning_effort` accepts only minimal/low/medium/high; `service_tier` only default/flex/priority.
 * Codex silently falls back to defaults for unknown values, so users think it's working when it isn't.
 */
async function checkCodexFieldValues(): Promise<CheckResult> {
  if (!existsSync(CODEX_CONFIG_FILE)) {
    return { name: 'Codex Field Values', status: 'ok', message: 'Skipped (no config)' };
  }

  const { readFileSync } = await import('node:fs');
  const text = readFileSync(CODEX_CONFIG_FILE, 'utf-8');
  const issues: string[] = [];
  const validEffort = new Set(['minimal', 'low', 'medium', 'high']);
  const validTier = new Set(['default', 'flex', 'priority']);

  const effortMatch = text.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m);
  if (effortMatch && !validEffort.has(effortMatch[1])) {
    issues.push(`model_reasoning_effort="${effortMatch[1]}" (valid: ${[...validEffort].join('/')})`);
  }

  const tierMatch = text.match(/^service_tier\s*=\s*"([^"]+)"/m);
  if (tierMatch && !validTier.has(tierMatch[1])) {
    issues.push(`service_tier="${tierMatch[1]}" (valid: ${[...validTier].join('/')})`);
  }

  if (issues.length === 0) {
    return { name: 'Codex Field Values', status: 'ok', message: 'All fields valid' };
  }

  return {
    name: 'Codex Field Values',
    status: 'warning',
    message: `${issues.length} non-standard value(s) — Codex silently uses defaults`,
    fix: 'Edit ~/.codex/config.toml',
    details: issues,
  };
}

/**
 * CCJK lint: stale `[projects."..."] trust_level = "trusted"` entries.
 * `trust_level = "trusted"` disables sandbox for that path; stale entries are dead weight (and noise).
 */
async function checkCodexTrustedProjects(): Promise<CheckResult> {
  if (!existsSync(CODEX_CONFIG_FILE)) {
    return { name: 'Codex Trusted Projects', status: 'ok', message: 'Skipped (no config)' };
  }

  const { readFileSync } = await import('node:fs');
  const text = readFileSync(CODEX_CONFIG_FILE, 'utf-8');
  const trusted: string[] = [];
  const re = /\[projects\."([^"]+)"\]/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(text)) !== null) {
    trusted.push(m[1]);
  }

  const stale = trusted.filter(p => !existsSync(p));
  if (stale.length === 0) {
    return {
      name: 'Codex Trusted Projects',
      status: 'ok',
      message: `${trusted.length} entries, all paths exist`,
    };
  }

  return {
    name: 'Codex Trusted Projects',
    status: 'warning',
    message: `${stale.length} of ${trusted.length} trusted paths no longer exist on disk`,
    fix: 'Edit ~/.codex/config.toml to remove dead entries',
    details: stale.slice(0, 10),
  };
}

async function checkCodexMcp(): Promise<CheckResult> {
  const config = readCodexConfig();
  const count = config?.mcpServices.length || 0;
  if (count > 0) {
    return {
      name: 'MCP Services',
      status: 'ok',
      message: `${count} service(s) configured`,
    };
  }

  return {
    name: 'MCP Services',
    status: 'warning',
    message: 'Not configured',
    fix: 'Run: npx ccjk mcp profile use recommended --tool codex',
  };
}

async function checkCodexNativeGoals(): Promise<CheckResult> {
  const enabled = readCodexGoalsFeatureEnabled();
  if (enabled) {
    return {
      name: 'Native Goals',
      status: 'ok',
      message: 'Codex /goal enabled',
    };
  }

  return {
    name: 'Native Goals',
    status: 'warning',
    message: 'Codex /goal not enabled',
    fix: 'Run: ccjk zero-config dev --code-type codex',
  };
}

async function checkClavueNativeGoals(): Promise<CheckResult> {
  const hasCommand = await commandExists('clavue');
  if (hasCommand) {
    return {
      name: 'Native Goals',
      status: 'ok',
      message: 'Clavue /goal available',
    };
  }

  return {
    name: 'Native Goals',
    status: 'error',
    message: 'Clavue /goal unavailable',
    fix: 'Run: npm install -g clavue',
  };
}

/**
 * CCJK lint: profile junk in ~/.ccjk/config.toml.
 * Test/placeholder profiles (numeric-only names, obviously fake apiKey/baseUrl) accumulate
 * during dev and clutter the profile picker. Flags suspicious entries; user decides.
 */
async function checkCcjkProfiles(): Promise<CheckResult> {
  const { homedir } = await import('node:os');
  const ccjkConfigPath = join(homedir(), '.ccjk', 'config.toml');
  if (!existsSync(ccjkConfigPath)) {
    return { name: 'CCJK Profiles', status: 'ok', message: 'Skipped (no config)' };
  }

  const { readFileSync } = await import('node:fs');
  const text = readFileSync(ccjkConfigPath, 'utf-8');
  const suspicious: string[] = [];

  // Iterate each profile section
  const sectionRe = /^\[claudeCode\.profiles\.([^\]]+)\]$([\s\S]*?)(?=^\[|\z)/gm;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = sectionRe.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const apiKey = body.match(/apiKey\s*=\s*"([^"]*)"/)?.[1] ?? '';
    const baseUrl = body.match(/baseUrl\s*=\s*"([^"]*)"/)?.[1] ?? '';

    const reasons: string[] = [];
    if (/^\d+$/.test(name)) {
      reasons.push('numeric-only name');
    }
    if (apiKey && apiKey.length < 10) {
      reasons.push(`apiKey too short (${apiKey.length} chars)`);
    }
    if (baseUrl && !/^https?:\/\/[^\s/]+\.[^\s/]/.test(baseUrl)) {
      reasons.push(`baseUrl looks invalid: ${baseUrl}`);
    }
    if (apiKey.startsWith('sk-ant-test-') || /test-?\d+/i.test(apiKey)) {
      reasons.push('apiKey looks like a test placeholder');
    }

    if (reasons.length > 0) {
      suspicious.push(`${name}: ${reasons.join('; ')}`);
    }
  }

  if (suspicious.length === 0) {
    return { name: 'CCJK Profiles', status: 'ok', message: 'No junk profiles detected' };
  }

  return {
    name: 'CCJK Profiles',
    status: 'warning',
    message: `${suspicious.length} suspicious profile(s) in ~/.ccjk/config.toml`,
    fix: 'Use ccjk menu to remove or rename them',
    details: suspicious,
  };
}

async function checkCodexProviders(): Promise<CheckResult> {
  const config = readCodexConfig();
  if (!config) {
    return {
      name: 'API Providers',
      status: 'warning',
      message: 'Unable to read Codex config',
    };
  }

  if (config.modelProvider) {
    return {
      name: 'API Providers',
      status: 'ok',
      message: `Using ${config.modelProvider}`,
    };
  }

  return {
    name: 'API Providers',
    status: 'ok',
    message: 'Using official Codex login',
  };
}

/**
 * Check API provider health
 */
async function checkProviders(codeType: CodeToolType = 'claude-code'): Promise<CheckResult> {
  try {
    const providers = await getApiProviderPresets(codeType);

    if (providers.length === 0) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: 'No providers available',
      };
    }

    // Initialize health monitor
    const monitor = new ProviderHealthMonitor({
      timeout: 3000,
      degradedLatencyThreshold: 1000,
      unhealthyLatencyThreshold: 3000,
    });

    monitor.setProviders(providers);

    // Check all providers (with timeout)
    const results = await Promise.race([
      Promise.all(
        providers.map(async (provider) => {
          const result = await monitor.checkHealth(provider);
          return { provider, result };
        }),
      ),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000);
      }),
    ]);

    if (!results) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: 'Health check timeout',
      };
    }

    const healthyCount = results.filter(r => r.result.success).length;

    if (healthyCount === 0) {
      return {
        name: 'API Providers',
        status: 'error',
        message: 'All providers unavailable',
        fix: 'Check your network connection',
      };
    }

    if (healthyCount < providers.length) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: `${healthyCount}/${providers.length} providers healthy`,
      };
    }

    return {
      name: 'API Providers',
      status: 'ok',
      message: `${healthyCount} providers healthy`,
    };
  }
  catch {
    return {
      name: 'API Providers',
      status: 'warning',
      message: 'Health check failed',
    };
  }
}

/**
 * Check permission rules for unreachable or problematic rules
 */
async function checkPermissionRules(codeType?: CodeToolType): Promise<CheckResult> {
  const isZh = i18n.language === 'zh-CN';

  try {
    const target = resolveClaudeFamilySettingsTarget(codeType);
    const permissionManager = getPermissionManager(undefined, target.settingsFile);
    const unreachableRules = permissionManager.getUnreachableRules();
    const allDiagnostics = permissionManager.getAllDiagnostics();

    // Count problematic rules
    const conflictedRules = allDiagnostics.filter(d => d.conflicts.length > 0);

    const problemCount = unreachableRules.length + conflictedRules.length;

    if (problemCount === 0) {
      const stats = permissionManager.getStats();
      return {
        name: 'Permission Rules',
        status: 'ok',
        message: `${stats.total} rules configured`,
      };
    }

    const details: string[] = [];

    if (unreachableRules.length > 0) {
      details.push(isZh ? `${unreachableRules.length} unreachable rule(s)` : `${unreachableRules.length} unreachable rule(s)`);
      for (const rule of unreachableRules.slice(0, 3)) {
        details.push(`  - ${ansis.dim(rule.pattern)}`);
      }
      if (unreachableRules.length > 3) {
        details.push(`  ... ${isZh ? 'and' : 'and'} ${unreachableRules.length - 3} ${isZh ? 'more' : 'more'}`);
      }
    }

    if (conflictedRules.length > 0) {
      details.push(isZh ? `${conflictedRules.length} conflicted rule(s)` : `${conflictedRules.length} conflicted rule(s)`);
    }

    return {
      name: 'Permission Rules',
      status: 'warning',
      message: `${problemCount} ${isZh ? 'problematic' : 'problematic'} ${isZh ? 'rule(s)' : 'rule(s)'}`,
      fix: isZh ? 'Run: ccjk zero-config dev' : 'Run: ccjk zero-config dev',
      details,
    };
  }
  catch {
    // Permission manager may not be initialized
    return {
      name: 'Permission Rules',
      status: 'warning',
      message: 'Unable to check',
    };
  }
}

/**
 * Fix settings.json validation issues by merging with template
 */
async function fixSettingsFile(codeType?: CodeToolType): Promise<void> {
  const isZh = i18n.language === 'zh-CN';
  const target = resolveClaudeFamilySettingsTarget(codeType);

  console.log('');
  console.log(ansis.bold.cyan('🔧 Fixing settings.json'));
  console.log(ansis.dim('─'.repeat(50)));
  console.log('');

  // First, backup the existing settings
  const backupPath = backupExistingConfig(target.codeTool);
  try {
    if (existsSync(target.settingsFile) && backupPath) {
      console.log(ansis.green(`✔ ${isZh ? '已备份旧设置' : 'Backed up settings'}: ${backupPath}`));
    }
  }
  catch (_error) {
    console.log(ansis.yellow(`⚠️ ${isZh ? '备份失败，继续...' : 'Backup failed, continuing...'}`));
  }

  // Run copyConfigFiles which will merge with template
  console.log('');
  console.log(ansis.dim(isZh ? '正在合并模板设置...' : 'Merging template settings...'));
  copyConfigFiles(false, target.codeTool);

  // Verify the fix
  const checkResult = await checkSettings(target.codeTool);
  console.log('');

  if (checkResult.status === 'ok') {
    console.log(ansis.green(`✅ ${isZh ? '设置已修复！' : 'Settings fixed successfully!'}`));
  }
  else {
    console.log(ansis.yellow(`⚠️ ${isZh ? '仍有一些问题' : 'Some issues remain'}:`));
    if (checkResult.details) {
      for (const detail of checkResult.details) {
        console.log(ansis.dim(`   • ${detail}`));
      }
    }
  }

  console.log('');
  console.log(ansis.dim(isZh ? '提示: 请重启 Claude Code 以应用更改' : 'Tip: Restart Claude Code to apply changes'));
  console.log('');
}

/**
 * Main doctor command - runs health checks and displays results
 */
export async function doctor(options: DoctorOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  // Handle --fix-settings flag
  if (options.fixSettings) {
    await fixSettingsFile(options.codeType);
    return;
  }

  const checks = options.codeType === 'codex'
    ? [
        checkCodexCli,
        checkCodexDir,
        checkCodexToml,
        checkCodexFieldValues,
        checkCodexTrustedProjects,
        checkCodexMcp,
        checkCodexNativeGoals,
        checkCcjkProfiles,
      ]
    : [
        () => checkClaudeCode(options.codeType),
        () => checkClaudeDir(options.codeType),
        () => checkSettings(options.codeType),
        () => checkDisciplineBaseline(options.codeType),
        () => checkWorkflows(options.codeType),
        () => checkMcp(options.codeType),
        () => checkPermissionRules(options.codeType),
        checkCcr,
        () => checkOutputStyles(options.codeType),
        ...(options.codeType === 'clavue' ? [checkClavueNativeGoals] : []),
        checkCcjkProfiles,
      ];

  // Add provider check if requested
  if (options.checkProviders) {
    checks.push(options.codeType === 'codex'
      ? checkCodexProviders
      : () => checkProviders(options.codeType));
  }

  // Run all checks
  const results: CheckResult[] = [];
  for (const check of checks) {
    const result = await check();
    results.push(result);
  }

  // JSON output mode
  if (options.json) {
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        ok: results.filter(r => r.status === 'ok').length,
        warning: results.filter(r => r.status === 'warning').length,
        error: results.filter(r => r.status === 'error').length,
      },
      checks: results.map(r => ({
        name: r.name,
        status: r.status,
        message: r.message,
        fix: r.fix,
        details: r.details,
      })),
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Text output mode
  console.log('');
  console.log(ansis.bold.cyan('🔍 CCJK Health Check'));
  console.log(ansis.dim('─'.repeat(50)));
  console.log('');

  let hasErrors = false;
  let hasWarnings = false;

  for (const result of results) {
    const statusIcon = result.status === 'ok'
      ? ansis.green('✅')
      : result.status === 'warning'
        ? ansis.yellow('⚠️')
        : ansis.red('❌');

    const statusColor = result.status === 'ok'
      ? ansis.green
      : result.status === 'warning'
        ? ansis.yellow
        : ansis.red;

    console.log(`${statusIcon} ${ansis.bold(result.name)}: ${statusColor(result.message)}`);

    if (result.fix) {
      console.log(ansis.dim(`   💡 Fix: ${result.fix}`));
    }

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(ansis.dim(`   ${detail}`));
      }
    }

    if (result.status === 'error')
      hasErrors = true;
    if (result.status === 'warning')
      hasWarnings = true;
  }

  console.log('');
  console.log(ansis.dim('─'.repeat(50)));

  if (hasErrors) {
    console.log(ansis.red('❌ Issues found - please follow the suggestions above'));
  }
  else if (hasWarnings) {
    console.log(ansis.yellow('⚠️ Configuration is functional, but some features may be limited'));
  }
  else {
    console.log(ansis.green('✅ All checks passed - CCJK is properly configured!'));
  }
  console.log('');

  // Ask if user wants to check providers (if not already checked)
  if (!options.checkProviders) {
    const { checkProvidersNow } = await inquirer.prompt<{ checkProvidersNow: boolean }>({
      type: 'confirm',
      name: 'checkProvidersNow',
      message: isZh ? '是否检查 API 供应商健康状态？' : 'Check API provider health status?',
      default: false,
    });

    if (checkProvidersNow) {
      console.log('');
      console.log(ansis.dim(isZh ? '正在检查供应商...' : 'Checking providers...'));
      const providerResult = await checkProviders(options.codeType);

      const statusIcon = providerResult.status === 'ok'
        ? ansis.green('✅')
        : providerResult.status === 'warning'
          ? ansis.yellow('⚠️')
          : ansis.red('❌');

      const statusColor = providerResult.status === 'ok'
        ? ansis.green
        : providerResult.status === 'warning'
          ? ansis.yellow
          : ansis.red;

      console.log(`${statusIcon} ${ansis.bold(providerResult.name)}: ${statusColor(providerResult.message)}`);

      if (providerResult.fix) {
        console.log(ansis.dim(`   💡 Fix: ${providerResult.fix}`));
      }
      console.log('');
    }
  }

  // Ask if user wants to run workspace diagnostics
  const { runWorkspace } = await inquirer.prompt<{ runWorkspace: boolean }>({
    type: 'confirm',
    name: 'runWorkspace',
    message: isZh ? '是否检查当前工作目录的文件写入权限？' : 'Check file write permissions for current directory?',
    default: false,
  });

  if (runWorkspace) {
    console.log('');
    const report = await runWorkspaceCheck(process.cwd());
    displayWorkspaceReport(report);
  }
}

/**
 * Workspace diagnostics command - check and fix workspace issues
 */
export async function workspaceDiagnostics(targetDir?: string): Promise<void> {
  const dir = targetDir ? resolve(targetDir) : process.cwd();
  await runWorkspaceWizard(dir);
}
