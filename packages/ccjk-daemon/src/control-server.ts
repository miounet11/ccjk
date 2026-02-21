import Fastify from 'fastify';
import type { DaemonState } from './types';

/**
 * Local control server for daemon management
 * Listens on localhost only for security
 */

const CONTROL_PORT = 37821; // Random high port

export interface ControlServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  updateState(state: Partial<DaemonState>): void;
}

export function createControlServer(getState: () => DaemonState): ControlServer {
  const fastify = Fastify({
    logger: false,
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Get daemon status
  fastify.get('/status', async () => {
    return getState();
  });

  // Stop daemon
  fastify.post('/stop', async () => {
    process.emit('SIGTERM' as any);
    return { status: 'stopping' };
  });

  // List sessions
  fastify.get('/sessions', async () => {
    const state = getState();
    return { sessions: state.sessions };
  });

  // Stop specific session
  fastify.post<{ Params: { sessionId: string } }>('/sessions/:sessionId/stop', async (request) => {
    const { sessionId } = request.params;
    // TODO: Implement session stop
    return { status: 'stopped', sessionId };
  });

  return {
    async start() {
      try {
        await fastify.listen({ port: CONTROL_PORT, host: '127.0.0.1' });
        console.log(`Control server listening on http://127.0.0.1:${CONTROL_PORT}`);
      } catch (error) {
        console.error('Failed to start control server:', error);
        throw error;
      }
    },

    async stop() {
      await fastify.close();
    },

    updateState(state: Partial<DaemonState>) {
      // State is managed externally via getState callback
    },
  };
}
