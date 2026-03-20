import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionAttempts = 0;
    this.maxAttempts = 5;
  }

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connectionAttempts = 0;
      this.emit('connected', true);
      this.emit('connectionStatus', { status: 'connected', attempts: this.connectionAttempts });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.emit('connected', false);
      this.emit('connectionStatus', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxAttempts) {
        this.emit('connectionStatus', { 
          status: 'failed', 
          attempts: this.connectionAttempts,
          message: 'Unable to connect to server. Please check if the backend is running.'
        });
      } else {
        this.emit('connectionStatus', { 
          status: 'reconnecting', 
          attempts: this.connectionAttempts 
        });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.emit('connectionStatus', { status: 'reconnected', attempts: attemptNumber });
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  subscribeToAll() {
    this.socket?.emit('subscribe:all');
  }

  joinDevice(deviceId) {
    this.socket?.emit('join:device', deviceId);
  }

  leaveDevice(deviceId) {
    this.socket?.emit('leave:device', deviceId);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
    this.socket?.off(event, callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in socket listener for ${event}:`, error);
      }
    });
  }
}

export const socketService = new SocketService();
export default socketService;
