/** Convert a human duration ("15m", "7d", "3600") to seconds. */
export function durationToSeconds(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  const value = Number.parseInt(match[1], 10);
  const unit = (match[2] ?? 's') as 's' | 'm' | 'h' | 'd';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return value * multipliers[unit];
}

/** Builds the structured application config from validated environment vars. */
export const configuration = () => {
  const env = process.env;
  const nodeEnv = env.NODE_ENV ?? 'development';
  const accessTtl = env.JWT_ACCESS_TTL ?? '15m';
  const refreshTtl = env.JWT_REFRESH_TTL ?? '7d';

  return {
    env: nodeEnv,
    isProd: nodeEnv === 'production',
    isDev: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port: Number.parseInt(env.API_PORT ?? '4000', 10),
    globalPrefix: env.API_GLOBAL_PREFIX ?? 'api',
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL as string,
    redisUrl: env.REDIS_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET as string,
      accessTtl,
      accessTtlSec: durationToSeconds(accessTtl),
      refreshSecret: env.JWT_REFRESH_SECRET as string,
      refreshTtl,
      refreshTtlSec: durationToSeconds(refreshTtl),
    },
    cookie: {
      secret: env.COOKIE_SECRET as string,
    },
    throttle: {
      ttl: Number.parseInt(env.THROTTLE_TTL ?? '60', 10),
      limit: Number.parseInt(env.THROTTLE_LIMIT ?? '120', 10),
    },
  };
};

export type AppConfiguration = ReturnType<typeof configuration>;
