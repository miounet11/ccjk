#!/usr/bin/env node

import { startDaemon, stopDaemon, getDaemonStatus } from '../dist/index.mjs';
import { randomBytes } from 'crypto';

const command = process.argv[2];

switch (command) {
  case 'start':
    // TODO: Load config from ~/.ccjk/daemon.json
    const config = {
      serverUrl: process.env.CCJK_SERVER_URL || 'http://localhost:3005',
      authToken: process.env.CCJK_AUTH_TOKEN || 'dev-token',
      machineId: process.env.CCJK_MACHINE_ID || 'dev-machine',
      encryptionKey: new Uint8Array(randomBytes(32)),
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
