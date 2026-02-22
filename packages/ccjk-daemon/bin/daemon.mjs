#!/usr/bin/env node

import { randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getDaemonStatus, startDaemon, stopDaemon } from '../dist/index.mjs';

const command = process.argv[2];
const DAEMON_CONFIG_PATH = join(homedir(), '.ccjk', 'daemon.json');

function loadDaemonConfig() {
  if (!existsSync(DAEMON_CONFIG_PATH)) {
    return null;
  }

  try {
    const data = readFileSync(DAEMON_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to read daemon config:', error?.message || error);
    return null;
  }
}

function parseEncryptionKey(config) {
  if (config?.encryptionKeyBase64) {
    try {
      const key = Buffer.from(config.encryptionKeyBase64, 'base64');
      if (key.length === 32) {
        return new Uint8Array(key);
      }
    } catch {
      // fallback below
    }
  }

  return new Uint8Array(randomBytes(32));
}

switch (command) {
  case 'start':
    const stored = loadDaemonConfig();
    const serverUrl = stored?.serverUrl || process.env.CCJK_SERVER_URL;
    const authToken = stored?.authToken || process.env.CCJK_AUTH_TOKEN;
    const machineId = stored?.machineId || process.env.CCJK_MACHINE_ID;

    if (!serverUrl || !authToken || !machineId) {
      console.error('❌ Missing daemon configuration.');
      console.error('Run: ccjk remote setup');
      process.exit(1);
    }

    const config = {
      serverUrl,
      authToken,
      machineId,
      encryptionKey: parseEncryptionKey(stored),
      logLevel: 'info',
    };
    await startDaemon(config);
    break;

  case 'stop':
    await stopDaemon();
    break;

  case 'status':
    await getDaemonStatus();
    break;

  default:
    console.log('Usage: ccjk-daemon <start|stop|status>');
    process.exit(1);
}
