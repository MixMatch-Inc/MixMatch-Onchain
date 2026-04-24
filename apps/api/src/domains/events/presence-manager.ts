// WebSocket presence channel for authenticated sessions
// Tracks active user presence with connect/disconnect bookkeeping,
// heartbeat/idle handling, and privacy-safe presence events

import { getEventBus } from './event-bus';
import { DomainEventType, UserPresenceChangedPayload } from './domain-events';

export type PresenceStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  sessionIds: string[];
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

export class PresenceManager {
  private presenceMap: Map<string, UserPresence> = new Map();
  private idleTimeoutMs: number;
  private cleanupIntervalMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options?: { idleTimeoutMs?: number; cleanupIntervalMs?: number }) {
    this.idleTimeoutMs = options?.idleTimeoutMs || 5 * 60 * 1000; // 5 minutes
    this.cleanupIntervalMs = options?.cleanupIntervalMs || 60 * 1000; // 1 minute
    this.startCleanupInterval();
  }

  /**
   * Set user as online
   */
  setUserOnline(userId: string, sessionId: string): void {
    const existing = this.presenceMap.get(userId);

    if (existing) {
      // Add session if not already present
      if (!existing.sessionIds.includes(sessionId)) {
        existing.sessionIds.push(sessionId);
      }
      existing.status = 'online';
      existing.lastSeen = new Date();
    } else {
      this.presenceMap.set(userId, {
        userId,
        status: 'online',
        sessionIds: [sessionId],
        lastSeen: new Date(),
      });
    }

    // Publish presence change event
    this.publishPresenceEvent(userId, 'online', sessionId);
  }

  /**
   * Set user as offline
   */
  setUserOffline(userId: string, sessionId: string): void {
    const existing = this.presenceMap.get(userId);

    if (!existing) return;

    // Remove session
    existing.sessionIds = existing.sessionIds.filter((id) => id !== sessionId);

    // If no more sessions, mark as offline
    if (existing.sessionIds.length === 0) {
      existing.status = 'offline';
      existing.lastSeen = new Date();
      this.publishPresenceEvent(userId, 'offline', sessionId);
    } else {
      // Still has active sessions
      this.publishPresenceEvent(userId, 'online', sessionId);
    }
  }

  /**
   * Update user presence status
   */
  updatePresence(userId: string, status: PresenceStatus, sessionId: string): void {
    const existing = this.presenceMap.get(userId);

    if (!existing) return;

    existing.status = status;
    existing.lastSeen = new Date();

    this.publishPresenceEvent(userId, status, sessionId);
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.presenceMap.get(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presenceMap.values()).filter(
      (p) => p.status === 'online'
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const presence = this.presenceMap.get(userId);
    return presence !== undefined && presence.status === 'online' && presence.sessionIds.length > 0;
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.presenceMap.size;
  }

  /**
   * Handle heartbeat/ping from client
   */
  handleHeartbeat(userId: string, sessionId: string): void {
    const existing = this.presenceMap.get(userId);

    if (existing && existing.sessionIds.includes(sessionId)) {
      existing.lastSeen = new Date();
      // Reset from 'away' to 'online' on heartbeat
      if (existing.status === 'away') {
        existing.status = 'online';
        this.publishPresenceEvent(userId, 'online', sessionId);
      }
    }
  }

  /**
   * Mark idle users as 'away'
   */
  private markIdleUsersAsAway(): void {
    const now = Date.now();

    for (const presence of this.presenceMap.values()) {
      if (presence.status === 'online') {
        const timeSinceLastSeen = now - presence.lastSeen.getTime();
        if (timeSinceLastSeen > this.idleTimeoutMs) {
          presence.status = 'away';
          console.log(`[Presence] User ${presence.userId} marked as away due to idle`);
        }
      }
    }
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = this.idleTimeoutMs * 2;

    for (const [userId, presence] of this.presenceMap.entries()) {
      const timeSinceLastSeen = now - presence.lastSeen.getTime();

      if (timeSinceLastSeen > staleThreshold && presence.status !== 'offline') {
        console.log(
          `[Presence] Cleaning up stale connection for user ${userId}`
        );
        presence.status = 'offline';
        presence.sessionIds = [];
      }

      // Remove completely offline users after longer period
      if (presence.status === 'offline' && timeSinceLastSeen > staleThreshold * 2) {
        this.presenceMap.delete(userId);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(() => {
      this.markIdleUsersAsAway();
      this.cleanupStaleConnections();
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Publish presence change event
   */
  private publishPresenceEvent(
    userId: string,
    status: PresenceStatus,
    sessionId: string
  ): void {
    try {
      const eventBus = getEventBus();
      const payload: UserPresenceChangedPayload = {
        userId,
        status,
        sessionId,
      };

      const event = eventBus.createEvent(
        DomainEventType.USER_PRESENCE_CHANGED,
        payload,
        { userId }
      );

      // Don't await - fire and forget for presence events
      eventBus.publish(event).catch((err) => {
        console.error('[Presence] Error publishing presence event:', err);
      });
    } catch (error) {
      console.error('[Presence] Error creating presence event:', error);
    }
  }

  /**
   * Clear all presence data (for testing)
   */
  clear(): void {
    this.presenceMap.clear();
  }
}
