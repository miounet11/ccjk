import { setupBrainHooks, teardownBrainHooks } from './setup';
import { logger } from '../../utils/logger';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Auto-initialize Brain hooks if remote control is enabled
 */

interface DaemonConfig {
  enabled: boolean;
  serverUrl: string;
  machineId?: string;
  authToken?: string;
}

let hooksInitialized = false;

/**
 * Check if remote control is enabled
 */
function isRemoteEnabled(): boolean {
  try {
    const configPath = join(homedir(), '.ccjk', 'daemon.json');
    if (!existsSync(configPath)) {
      return false;
    }

    const config: DaemonConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.enabled === true;
  } catch (error) {
    logger.debug('Failed to read daemon config:', error);
    return false;
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
 * Start daemon if not running
 */
async function ensureDaemonRunning(): Promise<boolean> {
  if (await isDaemonRunning()) {
    return true;
  }

  logger.info('Starting daemon...');

  try {
    const { spawn } = await import('child_process');
    const daemon = spawn('ccjk-daemon', ['start'], {
      detached: true,
      stdio: 'ignore',
    });

    daemon.unref();

    // Wait a bit for daemon to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await isDaemonRunning();
  } catch (error) {
    logger.error('Failed to start daemon:', error);
    return false;
  }
}

/**
 * Initialize Brain hooks if remote control is enabled
 */
export async function autoInitBrainHooks(): Promise<void> {
  if (hooksInitialized) {
    return;
  }

  // Check if remote control is enabled
  if (!isRemoteEnabled()) {
    logger.debug('Remote control not enabled, skipping Brain hooks');
    return;
  }

  logger.info('Remote control enabled, initializing Brain hooks...');

  // Setup hooks
  setupBrainHooks();
  hooksInitialized = true;

  // Ensure daemon is running
  const daemonRunning = await ensureDaemonRunning();
  if (!daemonRunning) {
    logger.warn('Daemon is not running. Remote control features will be limited.');
    logger.warn('Start daemon manually with: ccjk daemon start');
  } else {
    logger.info('✅ Remote control ready');
  }

  // Setup cleanup on exit
  process.on('exit', () => {
    if (hooksInitialized) {
      teardownBrainHooks();
    }
  });
}

/**
 * Get hook initialization status
 */
export function areHooksInitialized(): boolean {
  return hooksInitialized;
}
