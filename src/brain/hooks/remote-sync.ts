import type { HookContext, HookResult } from './types';
import { getDaemonClient } from './daemon-client';
import { createEnvelope } from '@ccjk/wire';
import { logger } from '../../utils/logger';

/**
 * Remote sync hook for Brain System
 * Intercepts Claude Code events and forwards to daemon
 */

export async function remoteSyncHook(context: HookContext): Promise<HookResult> {
  try {
    // Check if remote sync is enabled
    const remoteEnabled = await isRemoteSyncEnabled();
    if (!remoteEnabled) {
      return { continue: true };
    }

    const daemon = await getDaemonClient();
    if (!daemon) {
      // Daemon not running, skip
      return { continue: true };
    }

    const sessionId = context.sessionId || 'default';

    // Handle different event types
    switch (context.event) {
      case 'tool-call-start': {
        const envelope = createEnvelope('agent', sessionId, {
          t: 'tool-call-start',
          callId: context.data.callId || generateCallId(),
          name: context.data.tool || 'unknown',
          description: context.data.description,
          args: context.data.args || {},
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'tool-call-end': {
        const envelope = createEnvelope('agent', sessionId, {
          t: 'tool-call-end',
          callId: context.data.callId || generateCallId(),
          result: context.data.result,
          error: context.data.error,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'permission-request': {
        const requestId = generateRequestId();
        const envelope = createEnvelope('agent', sessionId, {
          t: 'permission-request',
          requestId,
          tool: context.data.tool || 'unknown',
          pattern: context.data.pattern || '',
          description: context.data.description,
        });
        await daemon.sendEvent(sessionId, envelope);

        // Wait for remote approval
        const approved = await daemon.waitForApproval(requestId, 60000); // 60s timeout
        return {
          continue: approved,
          data: { approved },
        };
      }

      case 'text-output': {
        const envelope = createEnvelope('agent', sessionId, {
          t: 'text',
          text: context.data.text || '',
          thinking: context.data.thinking,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'status-change': {
        const envelope = createEnvelope('agent', sessionId, {
          t: 'status',
          state: mapStatusToState(context.data.status),
          message: context.data.message,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'health-score': {
        const envelope = createEnvelope('system', sessionId, {
          t: 'health-score',
          score: context.data.score || 0,
          issues: context.data.issues,
          recommendations: context.data.recommendations,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'brain-agent': {
        const envelope = createEnvelope('system', sessionId, {
          t: 'brain-agent',
          agentId: context.data.agentId || 'unknown',
          agentType: context.data.agentType || 'unknown',
          action: context.data.action || 'start',
          message: context.data.message,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      case 'mcp-service': {
        const envelope = createEnvelope('system', sessionId, {
          t: 'mcp-service',
          serviceId: context.data.serviceId || 'unknown',
          serviceName: context.data.serviceName || 'unknown',
          action: context.data.action || 'install',
          message: context.data.message,
        });
        await daemon.sendEvent(sessionId, envelope);
        break;
      }

      default:
        // Unknown event, skip
        break;
    }

    return { continue: true };
  } catch (error) {
    logger.error('Remote sync hook error:', error);
    // Don't block execution on remote sync errors
    return { continue: true };
  }
}

/**
 * Check if remote sync is enabled
 */
async function isRemoteSyncEnabled(): Promise<boolean> {
  try {
    // Check settings.json for remote.enabled flag
    const { readSettings } = await import('../../utils/config');
    const settings = await readSettings();
    return settings.remote?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Map status string to SessionEvent state
 */
function mapStatusToState(status: string): 'idle' | 'thinking' | 'executing' | 'waiting-permission' | 'error' {
  switch (status) {
    case 'idle':
      return 'idle';
    case 'thinking':
    case 'processing':
      return 'thinking';
    case 'executing':
    case 'running':
      return 'executing';
    case 'waiting':
    case 'pending':
      return 'waiting-permission';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Generate unique call ID
 */
function generateCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
