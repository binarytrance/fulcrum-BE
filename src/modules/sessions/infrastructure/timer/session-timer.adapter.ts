import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type {
  ActiveTimerState,
  ISessionTimerPort,
} from '@sessions/domain/ports/session-timer.port';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import { SESSION_ABANDONMENT_MS } from '@sessions/domain/types/session.types';

/** A bit of headroom beyond the abandonment threshold before Redis auto-evicts. */
const REDIS_TTL_SECONDS = Math.ceil(SESSION_ABANDONMENT_MS / 1000) + 30 * 60; // 4.5 hours

const timerKey = (sessionId: string) => `session:timer:${sessionId}`;
const activeKey = (userId: string) => `session:active:${userId}`;

@Injectable()
export class SessionTimerAdapter implements ISessionTimerPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async startTimer(state: ActiveTimerState): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(
      timerKey(state.sessionId),
      JSON.stringify(state),
      'EX',
      REDIS_TTL_SECONDS,
    );
    pipeline.set(
      activeKey(state.userId),
      state.sessionId,
      'EX',
      REDIS_TTL_SECONDS,
    );
    await pipeline.exec();
  }

  async getTimer(sessionId: string): Promise<ActiveTimerState | null> {
    const raw = await this.redis.get(timerKey(sessionId));
    return raw ? (JSON.parse(raw) as ActiveTimerState) : null;
  }

  async heartbeat(sessionId: string): Promise<number | null> {
    const raw = await this.redis.get(timerKey(sessionId));
    if (!raw) return null;

    const state = JSON.parse(raw) as ActiveTimerState;
    const now = Date.now();
    const updated: ActiveTimerState = { ...state, lastHeartbeatAt: now };

    await this.redis.set(
      timerKey(sessionId),
      JSON.stringify(updated),
      'EX',
      REDIS_TTL_SECONDS,
    );

    return now - state.startedAt;
  }

  async getActiveSessionId(userId: string): Promise<string | null> {
    return this.redis.get(activeKey(userId));
  }

  async clearTimer(userId: string, sessionId: string): Promise<void> {
    await this.redis.del(timerKey(sessionId), activeKey(userId));
  }

  async getElapsedMs(sessionId: string): Promise<number | null> {
    const raw = await this.redis.get(timerKey(sessionId));
    if (!raw) return null;
    const state = JSON.parse(raw) as ActiveTimerState;
    return Date.now() - state.startedAt;
  }
}
