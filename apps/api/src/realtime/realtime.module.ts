import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeService, EventsGateway],
  exports: [RealtimeService],
})
export class RealtimeModule {}
