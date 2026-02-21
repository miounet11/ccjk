import { logger } from '../utils/logger';
import { i18n } from '../i18n';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import ora from 'ora';

/**
 * Remote control commands
 */

const DAEMON_CONFIG_PATH = join(homedir(), '.ccjk', 'daemon.json');

interface DaemonConfig {
  enabled: boolean;
  serverUrl: string;
  authToken?: string;
  machineId?: string;
}

/**
 * Enable remote control
 */
export async function enableRemote(): Promise<void> {
  console.log(i18n.t('remote:enable.title'));

  // Check if already enabled
  const config = loadDaemonConfig();
  if (config.enabled) {
    console.log(i18n.t('remote:enable.already_enabled'));
    return;
  }

  // Ask for server URL
  const { serverUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'serverUrl',
      message: i18n.t('remote:enable.server_url'),
      default: 'https://ccjk-server.example.com',
    },
  ]);

  // Generate machine ID
  const machineId = `machine-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Save config
  const newConfig: DaemonConfig = {
    enabled: true,
    serverUrl,
    machineId,
  };
  saveDaemonConfig(newConfig);

  console.log(i18n.t('remote:enable.success'));
  console.log(i18n.t('remote:enable.next_steps'));
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
export async function startDaemon(): Promise<void> {
  const spinner = ora(i18n.t('remote:daemon.starting')).start();

  try {
    // Check if already running
    if (await isDaemonRunning()) {
      spinner.warn(i18n.t('remote:daemon.already_running'));
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
      spinner.succeed(i18n.t('remote:daemon.started'));
    } else {
      spinner.fail(i18n.t('remote:daemon.start_failed'));
    }
  } catch (error) {
    spinner.fail(i18n.t('remote:daemon.start_error'));
    logger.error('Failed to start daemon:', error);
  }
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
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to save daemon config:', error);
    throw error;
  }
}
