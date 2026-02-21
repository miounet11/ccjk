import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { LockFile } from './types';

/**
 * Lock file management to prevent multiple daemon instances
 */

const LOCK_FILE_PATH = join(homedir(), '.ccjk', 'daemon.lock');

/**
 * Check if a process is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Acquire daemon lock
 * Returns true if lock acquired, false if another instance is running
 */
export function acquireDaemonLock(machineId: string): boolean {
  // Check if lock file exists
  if (existsSync(LOCK_FILE_PATH)) {
    try {
      const lockData = JSON.parse(readFileSync(LOCK_FILE_PATH, 'utf-8')) as LockFile;

      // Check if the process is still running
      if (isProcessRunning(lockData.pid)) {
        console.error(`Daemon already running with PID ${lockData.pid}`);
        return false;
      }

      // Stale lock file, remove it
      console.log(`Removing stale lock file (PID ${lockData.pid} not running)`);
      unlinkSync(LOCK_FILE_PATH);
    } catch (error) {
      console.error('Failed to read lock file:', error);
      // Try to remove corrupted lock file
      try {
        unlinkSync(LOCK_FILE_PATH);
      } catch {}
    }
  }

  // Create lock file
  const lockData: LockFile = {
    pid: process.pid,
    startedAt: Date.now(),
    machineId,
  };

  try {
    writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockData, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to create lock file:', error);
    return false;
  }
}

/**
 * Release daemon lock
 */
export function releaseDaemonLock(): void {
  try {
    if (existsSync(LOCK_FILE_PATH)) {
      const lockData = JSON.parse(readFileSync(LOCK_FILE_PATH, 'utf-8')) as LockFile;

      // Only remove if it's our lock
      if (lockData.pid === process.pid) {
        unlinkSync(LOCK_FILE_PATH);
      }
    }
  } catch (error) {
    console.error('Failed to release lock:', error);
  }
}

/**
 * Get current lock info
 */
export function getDaemonLock(): LockFile | null {
  try {
    if (existsSync(LOCK_FILE_PATH)) {
      return JSON.parse(readFileSync(LOCK_FILE_PATH, 'utf-8')) as LockFile;
    }
  } catch (error) {
    console.error('Failed to read lock file:', error);
  }
  return null;
}

/**
 * Check if daemon is running
 */
export function isDaemonRunning(): boolean {
  const lock = getDaemonLock();
  if (!lock) return false;
  return isProcessRunning(lock.pid);
}
