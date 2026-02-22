import type { FastifyInstance } from 'fastify';
import { getUserFromToken } from '../auth';
import { prisma } from '../db';
import { sendMappedError } from '../http-errors';

/**
 * Machine routes
 */

export async function machineRoutes(fastify: FastifyInstance) {
  // Authentication hook
  fastify.addHook('preHandler', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return sendMappedError(reply, 401, 'Unauthorized');
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return sendMappedError(reply, 401, 'Invalid token');
    }

    (request as any).user = user;
  });

  // List machines
  fastify.get('/v1/machines', async (request) => {
    const user = (request as any).user;

    const machines = await prisma.machine.findMany({
      where: { userId: user.id },
      orderBy: { activeAt: 'desc' },
    });

    return { machines };
  });

  // Get machine
  fastify.get<{
    Params: { id: string };
  }>('/v1/machines/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;

    const machine = await prisma.machine.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        sessions: {
          where: { active: true },
        },
      },
    });

    if (!machine) {
      return sendMappedError(reply, 404, 'Machine not found');
    }

    return { machine };
  });

  // Register or update machine
  fastify.post<{
    Body: {
      machineId: string;
      hostname: string;
      platform: string;
      metadata: string;
      daemonState?: string;
    };
  }>('/v1/machines', async (request) => {
    const user = (request as any).user;
    const { machineId, hostname, platform, metadata, daemonState } = request.body;

    // Check if machine exists
    let machine = await prisma.machine.findUnique({
      where: { machineId },
    });

    if (machine) {
      // Update existing machine
      machine = await prisma.machine.update({
        where: { id: machine.id },
        data: {
          hostname,
          platform,
          metadata,
          metadataVersion: { increment: 1 },
          daemonState,
          daemonStateVersion: daemonState ? { increment: 1 } : undefined,
          active: true,
          activeAt: new Date(),
        },
      });
    } else {
      // Create new machine
      machine = await prisma.machine.create({
        data: {
          userId: user.id,
          machineId,
          hostname,
          platform,
          metadata,
          daemonState,
          active: true,
          activeAt: new Date(),
        },
      });
    }

    return { machine };
  });

  // Update machine status
  fastify.patch<{
    Params: { id: string };
    Body: {
      active?: boolean;
      metadata?: string;
      daemonState?: string;
    };
  }>('/v1/machines/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;
    const { active, metadata, daemonState } = request.body;

    const machine = await prisma.machine.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!machine) {
      return sendMappedError(reply, 404, 'Machine not found');
    }

    const updated = await prisma.machine.update({
      where: { id },
      data: {
        active: active !== undefined ? active : machine.active,
        activeAt: active ? new Date() : machine.activeAt,
        metadata: metadata || machine.metadata,
        metadataVersion: metadata ? { increment: 1 } : undefined,
        daemonState: daemonState !== undefined ? daemonState : machine.daemonState,
        daemonStateVersion: daemonState !== undefined ? { increment: 1 } : undefined,
      },
    });

    return { machine: updated };
  });

  // Delete machine
  fastify.delete<{
    Params: { id: string };
  }>('/v1/machines/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params;

    const machine = await prisma.machine.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!machine) {
      return sendMappedError(reply, 404, 'Machine not found');
    }

    await prisma.machine.delete({
      where: { id },
    });

    return { success: true };
  });
}
