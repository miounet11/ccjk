import { logger } from './logger';
import type { DaemonManager } from './manager';

/**
 * Device switcher for seamless control handoff
 * Implements Happy Coder's "press any key to switch back" feature
 */

export class DeviceSwitcher {
  private manager: DaemonManager;
  private currentDevice: 'local' | 'remote' = 'local';
  private sessionId: string;
  private keyPressListener: ((key: string) => void) | null = null;

  constructor(sessionId: string, manager: DaemonManager) {
    this.sessionId = sessionId;
    this.manager = manager;
  }

  /**
   * Start listening for device switch
   */
  start(): void {
    this.setupKeyPressListener();
    logger.info('Device switcher started');
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.removeKeyPressListener();
    logger.info('Device switcher stopped');
  }

  /**
   * Switch to remote control
   */
  async switchToRemote(): Promise<void> {
    if (this.currentDevice === 'remote') return;

    logger.info('Switching to remote control');
    this.currentDevice = 'remote';

    // Notify user
    console.log('\n🔄 Control switched to mobile device');
    console.log('💡 Press any key to take back control\n');

    // Send event to server
    await this.manager.sendEvent(this.sessionId, {
      t: 'device-switch',
      device: 'remote',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Switch to local control
   */
  async switchToLocal(): Promise<void> {
    if (this.currentDevice === 'local') return;

    logger.info('Switching to local control');
    this.currentDevice = 'local';

    // Notify user
    console.log('\n🔄 Control switched back to computer');
    console.log('✅ You now have control\n');

    // Send event to server
    await this.manager.sendEvent(this.sessionId, {
      t: 'device-switch',
      device: 'local',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current device
   */
  getCurrentDevice(): 'local' | 'remote' {
    return this.currentDevice;
  }

  /**
   * Setup key press listener
   */
  private setupKeyPressListener(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      this.keyPressListener = (key: string) => {
        // Ctrl+C to exit
        if (key === '\u0003') {
          process.exit();
        }

        // Any other key switches back to local
        if (this.currentDevice === 'remote') {
          this.switchToLocal();
        }
      };

      process.stdin.on('data', this.keyPressListener);
    }
  }

  /**
   * Remove key press listener
   */
  private removeKeyPressListener(): void {
    if (this.keyPressListener && process.stdin.isTTY) {
      process.stdin.off('data', this.keyPressListener);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      this.keyPressListener = null;
    }
  }
}
