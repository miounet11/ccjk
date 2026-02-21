import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';
import type { SessionEnvelope } from '@ccjk/wire';

/**
 * Socket.IO client
 */

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;

    this.socket = io(CONFIG.apiUrl, {
      auth: { token },
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

  // Join session room
  joinSession(sessionId: string) {
    if (!this.socket) return;
    this.socket.emit('session:join', { sessionId });
  }

  // Leave session room
  leaveSession(sessionId: string) {
    if (!this.socket) return;
    this.socket.emit('session:leave', { sessionId });
  }

  // Send remote command
  sendCommand(sessionId: string, command: string) {
    if (!this.socket) return;
    this.socket.emit('remote:command', { sessionId, command });
  }

  // Send approval response
  sendApproval(requestId: string, approved: boolean) {
    if (!this.socket) return;
    this.socket.emit('approval:response', { requestId, approved });
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
