import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';

/**
 * Socket.IO client
 */

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string, machineId?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;

    this.socket = io(CONFIG.apiUrl, {
      auth: { token, machineId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.emit('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('disconnect');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('error', error);
    });

    // Session events
    this.socket.on('session:event', (data) => {
      this.emit('session:event', data);
    });

    // Remote commands
    this.socket.on('remote:command', (data) => {
      this.emit('remote:command', data);
    });

    // Approval responses
    this.socket.on('approval:response', (data) => {
      this.emit('approval:response', data);
    });

    // Errors
    this.socket.on('error', (data) => {
      this.emit('socket:error', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Subscribe to session
  subscribeToSession(sessionId: string) {
    if (!this.socket) return;
    this.socket.emit('session:join', { sessionId });
    console.log(`Subscribed to session ${sessionId}`);
  }

  // Unsubscribe from session
  unsubscribeFromSession(sessionId: string) {
    if (!this.socket) return;
    this.socket.emit('session:leave', { sessionId });
    console.log(`Unsubscribed from session ${sessionId}`);
  }

  // Join session room (legacy)
  joinSession(sessionId: string) {
    this.subscribeToSession(sessionId);
  }

  // Leave session room (legacy)
  leaveSession(sessionId: string) {
    this.unsubscribeFromSession(sessionId);
  }

  // Send remote command
  sendCommand(sessionId: string, command: string) {
    if (!this.socket) return;
    this.socket.emit('remote:command', { sessionId, command });
  }

  // Send approval response
  sendApproval(requestId: string, approved: boolean) {
    if (!this.socket) return;
    this.socket.emit('approval:response', { requestId, approved }, (response: any) => {
      if (response?.success) {
        console.log(`Approval sent: ${requestId} = ${approved}`);
      } else {
        console.error(`Failed to send approval:`, response?.error);
      }
    });
  }

  // Send input to Claude Code
  sendInput(sessionId: string, text: string) {
    if (!this.socket) return;
    this.socket.emit('remote:command', {
      sessionId,
      command: {
        type: 'input',
        text,
      },
    }, (response: any) => {
      if (response?.success) {
        console.log(`Input sent to session ${sessionId}`);
      } else {
        console.error(`Failed to send input:`, response?.error);
      }
    });
  }

  // Send interrupt (Ctrl+C)
  sendInterrupt(sessionId: string) {
    if (!this.socket) return;
    this.socket.emit('remote:command', {
      sessionId,
      command: {
        type: 'interrupt',
      },
    });
  }

  // Event listeners
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }
}

export const socketClient = new SocketClient();
