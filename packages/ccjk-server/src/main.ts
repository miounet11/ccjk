import cors from '@fastify/cors';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { CONFIG } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { mapStatusToUnifiedCode } from './http-errors';
import { authRoutes } from './routes/auth';
import { machineRoutes } from './routes/machines';
import { sessionRoutes } from './routes/sessions';
import { setupSocketHandlers } from './socket';

/**
 * CCJK Server - Cloud backend for remote control
 */

async function main() {
  console.log('🚀 Starting CCJK Server...');

  // Connect to database
  await connectDatabase();

  // Create Fastify instance
  const fastify = Fastify({
    logger: CONFIG.nodeEnv === 'development',
  });

  // Register CORS
  await fastify.register(cors, {
    origin: CONFIG.corsOrigin,
    credentials: true,
  });

  fastify.setErrorHandler((error, _request, reply) => {
    const typedError = error as { statusCode?: number; message?: string };
    const statusCode = typedError.statusCode && typedError.statusCode >= 400 ? typedError.statusCode : 500;
    const code = mapStatusToUnifiedCode(statusCode);
    const message = statusCode >= 500 ? 'Internal server error' : (typedError.message || 'Request failed');

    reply.status(statusCode).send({
      code,
      message,
    });
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0',
    };
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(sessionRoutes);
  await fastify.register(machineRoutes);

  // Create Socket.IO server
  const io = new Server(fastify.server, {
    cors: {
      origin: CONFIG.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    await disconnectDatabase();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  try {
    await fastify.listen({
      port: CONFIG.port,
      host: '0.0.0.0',
    });

    console.log('✅ CCJK Server is running');
    console.log(`   HTTP: http://0.0.0.0:${CONFIG.port}`);
    console.log(`   Socket.IO: Ready for connections`);
    console.log(`   Environment: ${CONFIG.nodeEnv}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

main();
