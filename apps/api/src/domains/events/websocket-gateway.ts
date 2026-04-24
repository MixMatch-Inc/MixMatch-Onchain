// WebSocket gateway scaffold for realtime product events
// Provides socket server bootstrap, auth handshake, correlation ID propagation,
// connection registry, and typed event envelope definitions

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, DomainEventType } from '../events/domain-events';
import { PresenceManager } from './presence-manager';

export interface WSAuthPayload {
  userId: string;
  email: string;
}

export interface ConnectionInfo {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  correlationId: string;
}

export interface EventEnvelope<TPayload = unknown> {
  event: DomainEventType;
  data: TPayload;
  timestamp: Date;
  correlationId: string;
  userId?: string;
}

export class WebSocketGateway {
  private io: Server | null = null;
  private connections: Map<string, ConnectionInfo> = new Map();
  private presenceManager: PresenceManager;
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
    this.presenceManager = new PresenceManager();
  }

  /**
   * Initialize WebSocket server and attach to HTTP server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupConnectionHandler();

    console.log('✅ WebSocket Gateway initialized');
    return this.io;
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(
          token as string,
          this.jwtSecret
        ) as WSAuthPayload;

        // Attach user info to socket
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;
        socket.data.correlationId = uuidv4();

        console.log(
          `[WS Auth] User ${decoded.userId} authenticated with correlation ID ${socket.data.correlationId}`
        );

        next();
      } catch (error) {
        console.error('[WS Auth] Authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandler(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const correlationId = socket.data.correlationId;

      console.log(
        `[WS Connect] User ${userId} connected (${socket.id}) [${correlationId}]`
      );

      // Register connection
      const connectionInfo: ConnectionInfo = {
        socketId: socket.id,
        userId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        correlationId,
      };
      this.connections.set(socket.id, connectionInfo);

      // Update presence
      this.presenceManager.setUserOnline(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle client events
      this.setupSocketEvents(socket, userId, correlationId);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(
          `[WS Disconnect] User ${userId} disconnected (${socket.id}) - Reason: ${reason}`
        );
        this.connections.delete(socket.id);
        this.presenceManager.setUserOffline(userId, socket.id);
      });
    });
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEvents(
    socket: Socket,
    userId: string,
    correlationId: string
  ): void {
    // Subscribe to events
    socket.on('subscribe', (eventType: DomainEventType | DomainEventType[]) => {
      const events = Array.isArray(eventType) ? eventType : [eventType];
      events.forEach((event) => {
        socket.join(`event:${event}`);
        console.log(
          `[WS Subscribe] User ${userId} subscribed to ${event} [${correlationId}]`
        );
      });
    });

    // Unsubscribe from events
    socket.on('unsubscribe', (eventType: DomainEventType | DomainEventType[]) => {
      const events = Array.isArray(eventType) ? eventType : [eventType];
      events.forEach((event) => {
        socket.leave(`event:${event}`);
        console.log(
          `[WS Unsubscribe] User ${userId} unsubscribed from ${event} [${correlationId}]`
        );
      });
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
      const conn = this.connections.get(socket.id);
      if (conn) {
        conn.lastActivity = new Date();
      }
    });
  }

  /**
   * Publish event to WebSocket clients
   */
  publishEvent<TPayload = unknown>(
    event: DomainEvent<TPayload>
  ): void {
    if (!this.io) return;

    const envelope: EventEnvelope<TPayload> = {
      event: event.type,
      data: event.payload,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      userId: event.userId,
    };

    // Publish to event-specific room
    this.io.to(`event:${event.type}`).emit('domain-event', envelope);

    // If event has userId, also publish to user's personal room
    if (event.userId) {
      this.io.to(`user:${event.userId}`).emit('domain-event', envelope);
    }

    console.log(
      `[WS Publish] Event ${event.type} published with correlation ID ${event.correlationId}`
    );
  }

  /**
   * Get active connections
   */
  getConnections(): Map<string, ConnectionInfo> {
    return new Map(this.connections);
  }

  /**
   * Get presence manager
   */
  getPresenceManager(): PresenceManager {
    return this.presenceManager;
  }

  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close(() => {
          this.io = null;
          console.log('🛑 WebSocket Gateway closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
