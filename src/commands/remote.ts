import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import { homedir } from 'os';
import { join } from 'path';
import { i18n } from '../i18n';
import { bindDevice, getBindingStatus, isDeviceBound } from '../services/cloud-notification';
import { logger } from '../utils/logger';

/**
 * Remote control commands
 */

const DAEMON_CONFIG_PATH = join(homedir(), '.ccjk', 'daemon.json');

interface DaemonConfig {
  enabled: boolean;
  serverUrl: string;
  authToken?: string;
  machineId?: string;
  encryptionKeyBase64?: string;
}

interface EnableRemoteOptions {
  quiet?: boolean;
  nonInteractive?: boolean;
  serverUrl?: string;
}

interface DoctorCheck {
  label: string;
  ok: boolean;
  detail?: string;
  fixHint?: string;
}

interface SetupRemoteOptions {
  nonInteractive?: boolean;
  json?: boolean;
  serverUrl?: string;
  authToken?: string;
  bindingCode?: string;
}

export interface SetupRemoteJsonResult {
  success: boolean;
  daemonRunning?: boolean;
  bound?: boolean;
  serverUrl?: string;
  machineId?: string;
  error?: string;
}

export interface DoctorRemoteJsonCheck {
  label: string;
  ok: boolean;
  detail?: string;
  fixHint?: string;
}

export interface DoctorRemoteJsonResult {
  success: boolean;
  checks: DoctorRemoteJsonCheck[];
  bindingStatus: string;
}

interface DoctorRemoteOptions {
  json?: boolean;
}

interface StartDaemonOptions {
  silent?: boolean;
}

/**
 * One-command setup for remote control
 */
export async function setupRemote(options: SetupRemoteOptions = {}): Promise<void> {
  const { nonInteractive = false, json = false, serverUrl, authToken, bindingCode } = options;
  if (!json) {
    console.log(i18n.t('remote:setup.title'));
  }

  let config = await ensureRemoteEnabled({ quiet: true, nonInteractive, serverUrl });
  if (!config) {
    if (json) {
      const result: SetupRemoteJsonResult = {
        success: false,
        error: i18n.t('remote:setup.failed_enable'),
      };
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 1;
    }
    return;
  }

  config = await ensureAuthTokenConfigured(config, { nonInteractive, authToken });
  if (!config) {
    if (json) {
      const result: SetupRemoteJsonResult = {
        success: false,
        error: i18n.t('remote:setup.failed_auth'),
      };
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 1;
    }
    return;
  }

  if (!isDeviceBound()) {
    const code = await resolveBindingCode(bindingCode, nonInteractive);
    if (!code) {
      if (json) {
        const result: SetupRemoteJsonResult = {
          success: false,
          error: i18n.t('remote:setup.failed_bind_missing_code'),
        };
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = 1;
      }
      return;
    }

    const result = await bindDevice(code);
    if (!result.success) {
      if (json) {
        const setupResult: SetupRemoteJsonResult = {
          success: false,
          error: result.error || i18n.t('remote:setup.binding_failed'),
        };
        console.log(JSON.stringify(setupResult, null, 2));
      }
      else {
        console.log(i18n.t('remote:setup.binding_failed'));
        if (result.error) {
          console.log(`  ${result.error}`);
        }
      }
      process.exitCode = 1;
      return;
    }
    if (!json) {
      console.log(i18n.t('remote:setup.binding_success'));
    }
  }

  await startDaemon({ silent: json });

  const daemonRunning = await isDaemonRunning();
  const bindStatus = await getBindingStatus();
  const setupResult: SetupRemoteJsonResult = {
    success: daemonRunning && bindStatus.bound,
    daemonRunning,
    bound: bindStatus.bound,
    serverUrl: config.serverUrl,
    machineId: config.machineId,
  };

  if (json) {
    console.log(JSON.stringify(setupResult, null, 2));
    if (!setupResult.success) {
      process.exitCode = 1;
    }
    return;
  }

  if (daemonRunning && bindStatus.bound) {
    console.log(i18n.t('remote:setup.ready'));
    await remoteStatus();
    return;
  }

  console.log(i18n.t('remote:setup.partial'));
  await remoteStatus();
}

/**
 * Enable remote control
 */
export async function enableRemote(): Promise<void> {
  console.log(i18n.t('remote:enable.title'));

  const enabledConfig = await ensureRemoteEnabled();
  if (!enabledConfig) {
    return;
  }

  console.log(i18n.t('remote:enable.success'));
  console.log(i18n.t('remote:enable.next_steps'));
}

async function ensureRemoteEnabled(options: EnableRemoteOptions = {}): Promise<DaemonConfig | null> {
  const { quiet = false, nonInteractive = false, serverUrl } = options;

  // Check if already enabled
  const config = loadDaemonConfig();
  if (config.enabled) {
    if (!quiet) {
      console.log(i18n.t('remote:enable.already_enabled'));
    }
    return config;
  }

  // Ask for server URL
  let resolvedServerUrl = serverUrl?.trim();

  if (!resolvedServerUrl && nonInteractive) {
    console.log(i18n.t('remote:setup.non_interactive_missing_server_url'));
    return null;
  }

  if (resolvedServerUrl && !isValidRemoteServerUrl(resolvedServerUrl)) {
    console.log(i18n.t('remote:setup.invalid_server_url'));
    return null;
  }

  if (!resolvedServerUrl) {
    const promptResult = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverUrl',
        message: i18n.t('remote:enable.server_url'),
        validate: (value: string) => {
          const trimmed = value?.trim() || '';
          if (!trimmed) {
            return i18n.t('remote:setup.server_url_required');
          }
          if (!isValidRemoteServerUrl(trimmed)) {
            return i18n.t('remote:setup.invalid_server_url');
          }
          return true;
        },
      },
    ]);
    resolvedServerUrl = (promptResult.serverUrl as string).trim();
  }

  // Generate machine ID
  const machineId = `machine-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Save config
  const newConfig: DaemonConfig = {
    enabled: true,
    serverUrl: resolvedServerUrl,
    machineId,
  };
  saveDaemonConfig(newConfig);
  return newConfig;
}

async function ensureAuthTokenConfigured(
  config: DaemonConfig,
  options: { nonInteractive?: boolean; authToken?: string } = {},
): Promise<DaemonConfig | null> {
  const { nonInteractive = false, authToken } = options;
  if (config.authToken && config.authToken.trim().length > 0 && !authToken) {
    return config;
  }

  let resolvedAuthToken = authToken?.trim();

  if (!resolvedAuthToken && config.authToken) {
    resolvedAuthToken = config.authToken.trim();
  }

  if (!resolvedAuthToken && nonInteractive) {
    console.log(i18n.t('remote:setup.non_interactive_missing_auth_token'));
    return null;
  }

  if (!resolvedAuthToken) {
    console.log(i18n.t('remote:setup.auth_token_prompt'));
    const promptResult = await inquirer.prompt([
      {
        type: 'password',
        name: 'authToken',
        mask: '*',
        message: i18n.t('remote:setup.auth_token'),
        validate: (value: string) => {
          const trimmed = value?.trim() || '';
          if (!trimmed) {
            return i18n.t('remote:setup.auth_token_required');
          }
          return true;
        },
      },
    ]);
    resolvedAuthToken = (promptResult.authToken as string).trim();
  }

  const updated: DaemonConfig = {
    ...config,
    authToken: resolvedAuthToken,
  };

  saveDaemonConfig(updated);
  return updated;
}

/**
 * Disable remote control
 */
export async function disableRemote(): Promise<void> {
  console.log(i18n.t('remote:disable.title'));

  const config = loadDaemonConfig();
  if (!config.enabled) {
    console.log(i18n.t('remote:disable.already_disabled'));
    return;
  }

  // Stop daemon if running
  await stopDaemon();

  // Update config
  config.enabled = false;
  saveDaemonConfig(config);

  console.log(i18n.t('remote:disable.success'));
}

/**
 * Show remote control status
 */
export async function remoteStatus(): Promise<void> {
  const config = loadDaemonConfig();

  console.log(i18n.t('remote:status.title'));
  console.log(`  ${i18n.t('remote:status.enabled')}: ${config.enabled ? '✅' : '❌'}`);

  if (config.enabled) {
    console.log(`  ${i18n.t('remote:status.server')}: ${config.serverUrl}`);
    console.log(`  ${i18n.t('remote:status.machine_id')}: ${config.machineId}`);

    // Check daemon status
    const daemonRunning = await isDaemonRunning();
    console.log(`  ${i18n.t('remote:status.daemon')}: ${daemonRunning ? '🟢 Running' : '🔴 Stopped'}`);
  }
}

/**
 * Diagnose remote setup and connectivity
 */
export async function doctorRemote(options: DoctorRemoteOptions = {}): Promise<void> {
  const { json = false } = options;

  if (!json) {
    console.log(i18n.t('remote:doctor.title'));
  }

  const config = loadDaemonConfig();
  const checks: DoctorCheck[] = [];

  checks.push({
    label: i18n.t('remote:doctor.checks.enabled'),
    ok: config.enabled,
    detail: config.enabled ? i18n.t('remote:doctor.enabled_yes') : i18n.t('remote:doctor.enabled_no'),
    fixHint: config.enabled ? undefined : i18n.t('remote:doctor.fix_enable'),
  });

  const hasServerUrl = !!config.serverUrl;
  checks.push({
    label: i18n.t('remote:doctor.checks.server_url'),
    ok: hasServerUrl,
    detail: hasServerUrl ? config.serverUrl : i18n.t('remote:doctor.missing'),
    fixHint: hasServerUrl ? undefined : i18n.t('remote:doctor.fix_setup'),
  });

  const hasAuthToken = !!config.authToken?.trim();
  checks.push({
    label: i18n.t('remote:doctor.checks.auth_token'),
    ok: hasAuthToken,
    detail: hasAuthToken ? i18n.t('remote:doctor.present') : i18n.t('remote:doctor.missing'),
    fixHint: hasAuthToken ? undefined : i18n.t('remote:doctor.fix_setup'),
  });

  const hasMachineId = !!config.machineId;
  checks.push({
    label: i18n.t('remote:doctor.checks.machine_id'),
    ok: hasMachineId,
    detail: hasMachineId ? config.machineId : i18n.t('remote:doctor.missing'),
    fixHint: hasMachineId ? undefined : i18n.t('remote:doctor.fix_setup'),
  });

  const bound = isDeviceBound();
  checks.push({
    label: i18n.t('remote:doctor.checks.binding'),
    ok: bound,
    detail: bound ? i18n.t('remote:doctor.bound_yes') : i18n.t('remote:doctor.bound_no'),
    fixHint: bound ? undefined : i18n.t('remote:doctor.fix_bind'),
  });

  let cloudReachable = false;
  if (hasServerUrl) {
    cloudReachable = await isServerReachable(config.serverUrl);
  }
  checks.push({
    label: i18n.t('remote:doctor.checks.cloud_health'),
    ok: hasServerUrl && cloudReachable,
    detail: hasServerUrl
      ? (cloudReachable ? i18n.t('remote:doctor.reachable') : i18n.t('remote:doctor.unreachable'))
      : i18n.t('remote:doctor.skipped'),
    fixHint: hasServerUrl && !cloudReachable ? i18n.t('remote:doctor.fix_network') : undefined,
  });

  const daemonRunning = await isDaemonRunning();
  checks.push({
    label: i18n.t('remote:doctor.checks.daemon'),
    ok: daemonRunning,
    detail: daemonRunning ? i18n.t('remote:doctor.daemon_running') : i18n.t('remote:doctor.daemon_stopped'),
    fixHint: daemonRunning ? undefined : i18n.t('remote:doctor.fix_daemon'),
  });

  let remoteStatusDetail = i18n.t('remote:doctor.skipped');
  if (bound) {
    const bindStatus = await getBindingStatus();
    remoteStatusDetail = bindStatus.bound ? i18n.t('remote:doctor.bound_yes') : i18n.t('remote:doctor.bound_no');
  }

  const hasFailures = checks.some(check => !check.ok);
  const doctorResult: DoctorRemoteJsonResult = {
    success: !hasFailures,
    checks: checks.map(check => ({
      label: check.label,
      ok: check.ok,
      detail: check.detail,
      fixHint: check.fixHint,
    })),
    bindingStatus: remoteStatusDetail,
  };

  if (json) {
    console.log(JSON.stringify(doctorResult, null, 2));
    if (hasFailures) {
      process.exitCode = 1;
    }
    return;
  }

  checks.forEach((check) => {
    const icon = check.ok ? '✅' : '❌';
    const detail = check.detail ? ` (${check.detail})` : '';
    console.log(`  ${icon} ${check.label}${detail}`);
    if (!check.ok && check.fixHint) {
      console.log(`     ${i18n.t('remote:doctor.fix_prefix')}${check.fixHint}`);
    }
  });

  console.log(`  ℹ️ ${i18n.t('remote:doctor.binding_status')}: ${remoteStatusDetail}`);

  if (hasFailures) {
    console.log(i18n.t('remote:doctor.summary_failed'));
    process.exitCode = 1;
    return;
  }

  console.log(i18n.t('remote:doctor.summary_ok'));
}

/**
 * Show QR code for mobile pairing
 */
export async function showQRCode(): Promise<void> {
  const config = loadDaemonConfig();

  if (!config.enabled) {
    console.log(i18n.t('remote:qr.not_enabled'));
    return;
  }

  // Generate pairing data
  const pairingData = {
    serverUrl: config.serverUrl,
    machineId: config.machineId,
    timestamp: Date.now(),
  };

  const pairingUrl = `ccjk://pair?data=${encodeURIComponent(JSON.stringify(pairingData))}`;

  console.log(i18n.t('remote:qr.title'));
  console.log(i18n.t('remote:qr.instructions'));
  console.log();
  console.log(`  ${pairingUrl}`);
  console.log();
  console.log(i18n.t('remote:qr.manual_entry'));
  console.log(`  Server: ${config.serverUrl}`);
  console.log(`  Machine ID: ${config.machineId}`);
}

/**
 * Start daemon
 */
export async function startDaemon(options: StartDaemonOptions = {}): Promise<void> {
  const { silent = false } = options;
  const spinner = silent ? null : ora(i18n.t('remote:daemon.starting')).start();

  try {
    // Check if already running
    if (await isDaemonRunning()) {
      if (spinner) {
        spinner.warn(i18n.t('remote:daemon.already_running'));
      }
      return;
    }

    // Start daemon process
    const daemon = spawn('ccjk-daemon', ['start'], {
      detached: true,
      stdio: 'ignore',
    });

    daemon.unref();

    // Wait a bit to check if it started
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (await isDaemonRunning()) {
      if (spinner) {
        spinner.succeed(i18n.t('remote:daemon.started'));
      }
    } else {
      if (spinner) {
        spinner.fail(i18n.t('remote:daemon.start_failed'));
      }
      process.exitCode = 1;
    }
  } catch (error) {
    if (spinner) {
      spinner.fail(i18n.t('remote:daemon.start_error'));
    }
    logger.error('Failed to start daemon:', error);
    process.exitCode = 1;
  }
}

async function resolveBindingCode(inputCode: string | undefined, nonInteractive: boolean): Promise<string | null> {
  const code = inputCode?.trim();
  if (code) {
    return code;
  }

  if (nonInteractive) {
    console.log(i18n.t('remote:setup.non_interactive_missing_binding_code'));
    return null;
  }

  console.log(i18n.t('remote:setup.binding_prompt'));
  const promptResult = await inquirer.prompt([
    {
      type: 'input',
      name: 'bindingCode',
      message: i18n.t('remote:setup.binding_code'),
      validate: (value: string) => {
        const trimmed = value?.trim() || '';
        if (!trimmed) {
          return i18n.t('remote:setup.binding_code_required');
        }
        if (trimmed.length < 4) {
          return i18n.t('remote:setup.binding_code_invalid');
        }
        return true;
      },
    },
  ]);

  return (promptResult.bindingCode as string).trim();
}

/**
 * Stop daemon
 */
export async function stopDaemon(): Promise<void> {
  const spinner = ora(i18n.t('remote:daemon.stopping')).start();

  try {
    if (!(await isDaemonRunning())) {
      spinner.warn(i18n.t('remote:daemon.not_running'));
      return;
    }

    // Send stop signal
    const response = await fetch('http://127.0.0.1:37821/stop', {
      method: 'POST',
    });

    if (response.ok) {
      spinner.succeed(i18n.t('remote:daemon.stopped'));
    } else {
      spinner.fail(i18n.t('remote:daemon.stop_failed'));
    }
  } catch (error) {
    spinner.fail(i18n.t('remote:daemon.stop_error'));
    logger.error('Failed to stop daemon:', error);
  }
}

/**
 * Check if daemon is running
 */
async function isDaemonRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:37821/health', {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isServerReachable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isValidRemoteServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Load daemon config
 */
function loadDaemonConfig(): DaemonConfig {
  try {
    if (existsSync(DAEMON_CONFIG_PATH)) {
      return JSON.parse(readFileSync(DAEMON_CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    logger.error('Failed to load daemon config:', error);
  }

  return {
    enabled: false,
    serverUrl: '',
  };
}

/**
 * Save daemon config
 */
function saveDaemonConfig(config: DaemonConfig): void {
  try {
    const dir = join(homedir(), '.ccjk');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to save daemon config:', error);
    throw error;
  }
}
