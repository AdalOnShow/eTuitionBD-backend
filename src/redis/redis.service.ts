import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    if (this.isDev) {
      this.logger.log('🔗 Redis client initialized (Upstash)');
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { ex: ttlSeconds });
    if (this.isDev) {
      this.logger.debug(`📝 Redis SET: ${key} (TTL: ${ttlSeconds}s)`);
    }
  }

  async get(key: string): Promise<string | null> {
    const value = (await this.client.get<string>(key)) ?? null;
    if (this.isDev) {
      this.logger.debug(`📖 Redis GET: ${key} → ${value ? 'found' : 'null'}`);
    }
    return value;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
    if (this.isDev) {
      this.logger.debug(`🗑️ Redis DEL: ${key}`);
    }
  }
}
