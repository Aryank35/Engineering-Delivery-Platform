import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { JwtAccessPayload } from '@eop/shared';
import { AppConfigService } from '../config/app-config.service';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN ?? true, credentials: true },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger('EventsGateway');

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.setServer(server);
    this.logger.log('WebSocket gateway initialised');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const raw =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!raw) throw new Error('Missing token');
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(raw, {
        secret: this.config.jwt.accessSecret,
      });
      if (payload.type !== 'access') throw new Error('Invalid token type');
      client.data.userId = payload.sub;
      // Every connection auto-joins its owner's personal room so domain
      // services can push notifications with `to('user:<id>')`.
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('sprint:join')
  joinSprint(@ConnectedSocket() client: Socket, @MessageBody() body: { sprintId?: string }) {
    if (body?.sprintId) client.join(`sprint:${body.sprintId}`);
    return { ok: true };
  }

  @SubscribeMessage('sprint:leave')
  leaveSprint(@ConnectedSocket() client: Socket, @MessageBody() body: { sprintId?: string }) {
    if (body?.sprintId) client.leave(`sprint:${body.sprintId}`);
    return { ok: true };
  }

  @SubscribeMessage('sprints:join')
  joinSprints(@ConnectedSocket() client: Socket) {
    client.join('sprints');
    return { ok: true };
  }

  @SubscribeMessage('releases:join')
  joinReleases(@ConnectedSocket() client: Socket) {
    client.join('releases');
    return { ok: true };
  }

  @SubscribeMessage('releases:leave')
  leaveReleases(@ConnectedSocket() client: Socket) {
    client.leave('releases');
    return { ok: true };
  }
}
