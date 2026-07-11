import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from './configuration';

/**
 * Thin, strongly-typed accessor over Nest's `ConfigService` so the rest of the
 * app never touches raw env strings or stringly-typed keys.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private get<T>(key: keyof AppConfiguration): T {
    return this.config.getOrThrow<T>(key as string);
  }

  get env(): string {
    return this.get('env');
  }
  get isProd(): boolean {
    return this.get('isProd');
  }
  get isDev(): boolean {
    return this.get('isDev');
  }
  get isTest(): boolean {
    return this.get('isTest');
  }
  get port(): number {
    return this.get('port');
  }
  get globalPrefix(): string {
    return this.get('globalPrefix');
  }
  get webOrigin(): string {
    return this.get('webOrigin');
  }
  get redisUrl(): string | undefined {
    return this.config.get<string>('redisUrl');
  }
  get jwt(): AppConfiguration['jwt'] {
    return this.get('jwt');
  }
  get cookie(): AppConfiguration['cookie'] {
    return this.get('cookie');
  }
  get throttle(): AppConfiguration['throttle'] {
    return this.get('throttle');
  }
  get realtime(): AppConfiguration['realtime'] {
    return this.get('realtime');
  }
}
