import { hookRegistry } from './registry';
import { remoteSyncHook } from './remote-sync';
import { logger } from '../../utils/logger';

/**
 * Setup Brain hooks
 * Called during CCJK initialization
 */
export function setupBrainHooks(): void {
  logger.debug('Setting up Brain hooks...');

  // Register remote sync hook for various events
  const events = [
    'tool-call-start',
    'tool-call-end',
    'permission-request',
    'text-output',
    'status-change',
    'health-score',
    'brain-agent',
    'mcp-service',
  ];

  for (const event of events) {
    hookRegistry.register(event, {
      name: 'remote-sync',
      fn: remoteSyncHook,
      priority: 100, // High priority
      enabled: true,
    });
  }

  logger.debug('Brain hooks setup complete');
}

/**
 * Teardown Brain hooks
 * Called during CCJK shutdown
 */
export function teardownBrainHooks(): void {
  logger.debug('Tearing down Brain hooks...');
  hookRegistry.clear();
  logger.debug('Brain hooks teardown complete');
}
