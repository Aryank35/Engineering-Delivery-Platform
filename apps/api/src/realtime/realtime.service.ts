import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { NotificationPushPayload } from '@eop/shared';

/**
 * Thin broadcast facade. The gateway registers the Socket.IO server here on
 * init; domain services emit lightweight "something changed" signals that
 * clients react to by refetching (no state reconciliation over the wire).
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  /** Notify everyone viewing a sprint board that it changed. */
  emitBoardChanged(sprintId: string | null | undefined, reason?: string): void {
    if (!sprintId) return;
    this.server?.to(`sprint:${sprintId}`).emit('board:changed', { sprintId, reason });
  }

  /** Notify sprint-list subscribers that the set of sprints changed. */
  emitSprintsChanged(): void {
    this.server?.to('sprints').emit('sprints:changed', {});
  }

  /** Notify release/deployment subscribers that something changed. */
  emitReleasesChanged(): void {
    this.server?.to('releases').emit('releases:changed', {});
  }

  /**
   * Push a freshly created notification to its recipient's personal room. The
   * payload is just enough to raise a toast; the client refetches the list and
   * unread count for the source of truth.
   */
  emitNotification(userId: string, payload: NotificationPushPayload): void {
    this.server?.to(`user:${userId}`).emit('notification:new', payload);
  }

  /** Signal a user's other sessions that read-state changed (cross-tab sync). */
  emitNotificationsRead(userId: string): void {
    this.server?.to(`user:${userId}`).emit('notifications:read', {});
  }
}
