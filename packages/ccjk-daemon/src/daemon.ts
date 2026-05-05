import type { DaemonConfig, DaemonState } from './types';
import chalk from 'chalk';
import { createControlServer } from './control-server';
import { acquireDaemonLock, releaseDaemonLock } from './lock';
import { DaemonManager } from './manager';

/**
 * Main daemon entry point
 */

export async function startDaemon(config: DaemonConfig): Promise<void> {
  // Acquire lock
  if (!acquireDaemonLock(config.machineId)) {
    console.error(chalk.red('❌ Failed to acquire daemon lock. Another instance may be running.'));
    process.exit(1);
  }

  console.log(chalk.green('✅ Daemon lock acquired'));

  // Create daemon manager
  const manager = new DaemonManager(config);

  // Create control server
  const controlServer = createControlServer(() => manager.getState());

  // Setup signal handlers
  const shutdown = async (signal: string) => {
    console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down...`));

    try {
      await controlServer.stop();
      await manager.stop();
      releaseDaemonLock();
      console.log(chalk.green('✅ Shutdown complete'));
      process.exit(0);
    }
    catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught exception:'), error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('❌ Unhandled rejection:'), reason);
    shutdown('unhandledRejection');
  });

  try {
    // Start control server
    await controlServer.start();

    // Start daemon manager
    await manager.start();

    console.log(chalk.green('\n✅ CCJK Daemon is running'));
    console.log(chalk.gray('   Press Ctrl+C to stop\n'));
  }
  catch (error) {
    console.error(chalk.red('❌ Failed to start daemon:'), error);
    releaseDaemonLock();
    process.exit(1);
  }
}

/**
 * Stop running daemon
 */
export async function stopDaemon(): Promise<void> {
  try {
    const response = await fetch('http://127.0.0.1:37821/stop', {
      method: 'POST',
    });

    if (response.ok) {
      console.log(chalk.green('✅ Daemon stop signal sent'));
    }
    else {
      console.error(chalk.red('❌ Failed to stop daemon'));
      process.exit(1);
    }
  }
  catch (_error) {
    console.error(chalk.red('❌ Daemon is not running or not responding'));
    process.exit(1);
  }
}

/**
 * Get daemon status
 */
export async function getDaemonStatus(): Promise<void> {
  try {
    const response = await fetch('http://127.0.0.1:37821/status');

    if (response.ok) {
      const status = await response.json() as DaemonState;
      console.log(chalk.blue('📊 Daemon Status:'));
      console.log(chalk.gray(`   Running: ${status.running}`));
      console.log(chalk.gray(`   PID: ${status.pid}`));
      console.log(chalk.gray(`   Connected: ${status.connected}`));
      console.log(chalk.gray(`   Sessions: ${status.sessions.length}`));
      if (status.startedAt) {
        const uptime = Math.floor((Date.now() - status.startedAt) / 1000);
        console.log(chalk.gray(`   Uptime: ${uptime}s`));
      }
    }
    else {
      console.error(chalk.red('❌ Failed to get daemon status'));
      process.exit(1);
    }
  }
  catch (_error) {
    console.error(chalk.red('❌ Daemon is not running'));
    process.exit(1);
  }
}
