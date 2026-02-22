import type { Socket, Server as SocketIOServer } from 'socket.io';
import { verifyToken } from './auth';
import { prisma } from './db';
import { sendPushNotification } from './push';

/**
 * Socket.IO event handlers
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  machineId?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;
    const machineId = socket.handshake.auth.machineId as string;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.machineId = machineId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join user room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join machine room
    if (socket.machineId) {
      socket.join(`machine:${socket.machineId}`);
    }

    // Handle session join
    const handleSessionJoin = async (data: { sessionId: string }) => {
      const { sessionId } = data;

      // Verify session belongs to user
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: socket.userId,
        },
      });

      if (session) {
        socket.join(`session:${sessionId}`);
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
      }
    };

    socket.on('session:join', handleSessionJoin);
    socket.on('session:subscribe', handleSessionJoin);

    // Handle session leave
    const handleSessionLeave = (data: { sessionId: string }) => {
      const { sessionId } = data;
      socket.leave(`session:${sessionId}`);
      console.log(`Socket ${socket.id} left session ${sessionId}`);
    };

    socket.on('session:leave', handleSessionLeave);
    socket.on('session:unsubscribe', handleSessionLeave);

    // Handle session event from daemon
    socket.on('session:event', async (data: { sessionId: string; event: string }) => {
      const { sessionId, event } = data;

      try {
        // Verify session
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            userId: socket.userId,
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Store message
        const message = await prisma.message.create({
          data: {
            sessionId,
            content: event, // Already encrypted
            seq: session.seq + 1,
          },
        });

        // Update session seq
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            seq: { increment: 1 },
            lastActivityAt: new Date(),
          },
        });

        // Broadcast to all clients in session room (except sender)
        socket.to(`session:${sessionId}`).emit('session:event', {
          sessionId,
          event,
          message,
        });

        // Check if it's a permission request
        const eventData = JSON.parse(event);
        if (eventData.ev?.t === 'permission-request') {
          // Send push notification to mobile devices
          const notificationPayload = {
            type: 'permission-request',
            sessionId,
            requestId: eventData.ev.requestId,
            title: 'Permission Request',
            message: `${eventData.ev.tool} needs approval`,
          };

          await sendPushNotificationToUser(socket.userId!, {
            title: notificationPayload.title,
            body: notificationPayload.message,
            data: notificationPayload,
          });

          io.to(`user:${socket.userId}`).emit('notification', notificationPayload);
        }
      } catch (error) {
        console.error('Error handling session event:', error);
        socket.emit('error', { message: 'Failed to process event' });
      }
    });

    // Handle remote command from mobile
    socket.on('remote:command', async (data: { sessionId: string; command: string }) => {
      const { sessionId, command } = data;

      try {
        // Verify session
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            userId: socket.userId,
          },
          include: {
            machine: true,
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Forward command to daemon (machine room)
        io.to(`machine:${session.machine.machineId}`).emit('remote:command', {
          sessionId,
          command, // Already encrypted
        });

        console.log(`Forwarded command to machine ${session.machine.machineId}`);
      } catch (error) {
        console.error('Error handling remote command:', error);
        socket.emit('error', { message: 'Failed to process command' });
      }
    });

    // Handle approval response
    socket.on('approval:response', async (data: {
      requestId: string;
      approved: boolean;
    }) => {
      const { requestId, approved } = data;

      try {
        // Store approval
        await prisma.approvalRequest.updateMany({
          where: {
            requestId,
            userId: socket.userId,
          },
          data: {
            approved,
            respondedAt: new Date(),
          },
        });

        // Notify daemon
        const request = await prisma.approvalRequest.findUnique({
          where: { requestId },
        });

        if (request) {
          const session = await prisma.session.findUnique({
            where: { id: request.sessionId },
            include: { machine: true },
          });

          if (session) {
            io.to(`machine:${session.machine.machineId}`).emit('approval:response', {
              requestId,
              approved,
            });
          }
        }
      } catch (error) {
        console.error('Error handling approval response:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Send push notification to all user's devices
 */
async function sendPushNotificationToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) {
  try {
    // Get user's devices with push tokens
    const devices = await prisma.device.findMany({
      where: {
        userId,
        active: true,
        pushToken: { not: null },
      },
    });

    // Send to all devices
    const promises = devices.map(device =>
      sendPushNotification(device.pushToken!, notification)
    );

    await Promise.allSettled(promises);

    // Store notification
    await prisma.notification.create({
      data: {
        userId,
        type: notification.data?.type || 'info',
        title: notification.title,
        message: notification.body,
        metadata: notification.data ? JSON.stringify(notification.data) : null,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
