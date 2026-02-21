import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { getUserFromToken } from '../auth';

/**
 * Session routes
 */

export async function sessionRoutes(fastify: FastifyInstance) {
  // Authentication hook
  fastify.addHook('preHandler', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Attach user to request
    (request as any).user = user;
  });

  // List sessions
  fastify.get('/v1/sessions', async (request) => {
    const user = (request as any).user;

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      include: {
        machine: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return { sessions };
  });

  // Get session
  fastify.get<{
    Params: { id: string };
  }>('/v1/sessions/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        machine: true,
        messages: {
          orderBy: { seq: 'asc' },
          take: 100, // Last 100 messages
        },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return { session };
  });

  // Create session
  fastify.post<{
    Body: {
      tag: string;
      machineId: string;
      metadata: string;
      agentState?: string;
      dataEncryptionKey?: string;
    };
  }>('/v1/sessions', async (request, reply) => {
    const user = (request as any).user;
    const { tag, machineId, metadata, agentState, dataEncryptionKey } = request.body;

    // Check if machine exists and belongs to user
    const machine = await prisma.machine.findFirst({
      where: {
        machineId,
        userId: user.id,
      },
    });

    if (!machine) {
      return reply.status(404).send({ error: 'Machine not found' });
    }

    // Check if session with tag already exists
    let session = await prisma.session.findUnique({
      where: {
        userId_tag: {
          userId: user.id,
          tag,
        },
      },
    });

    if (session) {
      // Update existing session
      session = await prisma.session.update({
        where: { id: session.id },
        data: {
          metadata,
          metadataVersion: { increment: 1 },
          agentState,
          agentStateVersion: agentState ? { increment: 1 } : undefined,
          dataEncryptionKey,
          lastActivityAt: new Date(),
          active: true,
        },
      });
    } else {
      // Create new session
      session = await prisma.session.create({
        data: {
          userId: user.id,
          machineId: machine.id,
          tag,
          metadata,
          agentState,
          dataEncryptionKey,
        },
      });
    }

    return { session };
  });

  // Update session
  fastify.patch<{
    Params: { id: string };
    Body: {
      metadata?: string;
      agentState?: string;
    };
  }>('/v1/sessions/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;
    const { metadata, agentState } = request.body;

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        metadata: metadata || session.metadata,
        metadataVersion: metadata ? { increment: 1 } : undefined,
        agentState: agentState !== undefined ? agentState : session.agentState,
        agentStateVersion: agentState !== undefined ? { increment: 1 } : undefined,
        lastActivityAt: new Date(),
      },
    });

    return { session: updated };
  });

  // Delete session
  fastify.delete<{
    Params: { id: string };
  }>('/v1/sessions/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    await prisma.session.delete({
      where: { id },
    });

    return { success: true };
  });

  // Get session messages
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>('/v1/sessions/:id/messages', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;
    const limit = parseInt(request.query.limit || '100');
    const offset = parseInt(request.query.offset || '0');

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { seq: 'asc' },
      skip: offset,
      take: limit,
    });

    return { messages };
  });
}
