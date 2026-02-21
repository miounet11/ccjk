import type { SessionEnvelope } from '@ccjk/wire';
import { logger } from '../../utils/logger';

/**
 * Daemon client for Brain hooks
 * Communicates with local daemon via HTTP
 */

const DAEMON_CONTROL_URL = 'http://127.0.0.1:37821';

interface DaemonClient {
  sendEvent(sessionId: string, event: SessionEnvelope): Promise<void>;
  waitForApproval(requestId: string, timeout: number): Promise<boolean>;
}

let cachedClient: DaemonClient | null = null;
const pendingApprovals = new Map<string, (approved: boolean) => void>();

/**
 * Get daemon client instance
 * Returns null if daemon is not running
 */
export async function getDaemonClient(): Promise<DaemonClient | null> {
  if (cachedClient) {
    return cachedClient;
  }

  // Check if daemon is running
  try {
    const response = await fetch(`${DAEMON_CONTROL_URL}/health`, {
      signal: AbortSignal.timeout(1000),
    });

    if (!response.ok) {
      return null;
    }

    // Create client
    cachedClient = {
      async sendEvent(sessionId: string, event: SessionEnvelope) {
        try {
          await fetch(`${DAEMON_CONTROL_URL}/sessions/${sessionId}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event }),
            signal: AbortSignal.timeout(5000),
          });
        } catch (error) {
          logger.debug('Failed to send event to daemon:', error);
          // Don't throw, just log
        }
      },

      async waitForApproval(requestId: string, timeout: number): Promise<boolean> {
        return new Promise((resolve) => {
          // Store resolver
          pendingApprovals.set(requestId, resolve);

          // Set timeout
          const timer = setTimeout(() => {
            pendingApprovals.delete(requestId);
            resolve(false); // Default to deny on timeout
          }, timeout);

          // Poll for approval (simple implementation)
          const pollInterval = setInterval(async () => {
            try {
              const response = await fetch(
                `${DAEMON_CONTROL_URL}/approvals/${requestId}`,
                { signal: AbortSignal.timeout(1000) }
              );

              if (response.ok) {
                const data = await response.json() as { approved: boolean };
                clearInterval(pollInterval);
                clearTimeout(timer);
                pendingApprovals.delete(requestId);
                resolve(data.approved);
              }
            } catch {
              // Continue polling
            }
          }, 1000);
        });
      },
    };

    return cachedClient;
  } catch {
    return null;
  }
}

/**
 * Clear cached client (for testing)
 */
export function clearDaemonClient(): void {
  cachedClient = null;
}
