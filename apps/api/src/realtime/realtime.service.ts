import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

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
}
