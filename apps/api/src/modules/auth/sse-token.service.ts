import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { UserRole } from '@mixmatch/shared';

/**
 * Marks a token as mintable for — and usable *only* on — the SSE
 * query-param path. Standard access tokens carry no `typ`, so they are
 * rejected in a `?token=` query param, and an SSE token is rejected in an
 * `Authorization` header. See `JwtAuthGuard`.
 */
export const SSE_TOKEN_TYPE = 'sse';

/**
 * Mints and redeems the short-lived, single-use tokens used to authenticate
 * the SSE transaction stream.
 *
 * `EventSource` can't set an `Authorization` header, so the stream has to
 * authenticate through the URL — and URLs are routinely written to proxy
 * and load-balancer access logs, browser history, and `Referer` headers.
 * Putting the standard hour-long access token there hands out a fully
 * privileged credential to everything in that path. These tokens instead
 * live for `SSE_TOKEN_EXPIRES_IN_SECONDS` (60s by default), are accepted
 * exactly once, and are only ever honoured on the query-param path — so a
 * leaked stream URL is worthless by the time it reaches a log reader.
 *
 * The consumed-token set is in-process, matching the existing idempotency
 * cache in `AdminController`. Across multiple instances a token could be
 * replayed once per instance inside its 60-second window; a shared store
 * (Redis) is needed to make single-use strict in that topology.
 */
@Injectable()
export class SseTokenService {
  /** jti → epoch ms at which the entry can be forgotten (the token's own expiry). */
  private readonly consumedJtis = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Issues a single-use stream token for an already-authenticated caller. */
  mint(
    userId: string,
    role?: UserRole,
  ): { token: string; expiresInSeconds: number } {
    const expiresInSeconds = this.ttlSeconds();
    const token = this.jwtService.sign(
      { sub: userId, role, typ: SSE_TOKEN_TYPE, jti: randomUUID() },
      { expiresIn: expiresInSeconds },
    );
    return { token, expiresInSeconds };
  }

  /**
   * Redeems a token id, returning false if it has already been used. The
   * caller has verified the signature by this point; this only enforces
   * single use.
   */
  consume(jti: string, expiresAtEpochSeconds?: number): boolean {
    this.pruneExpired();
    if (this.consumedJtis.has(jti)) {
      return false;
    }
    // Remember the jti until the token would have expired anyway — past
    // that point the signature check rejects it and the entry is dead weight.
    const retainUntil = expiresAtEpochSeconds
      ? expiresAtEpochSeconds * 1000
      : Date.now() + this.ttlSeconds() * 1000;
    this.consumedJtis.set(jti, retainUntil);
    return true;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [jti, retainUntil] of this.consumedJtis) {
      if (retainUntil <= now) {
        this.consumedJtis.delete(jti);
      }
    }
  }

  private ttlSeconds(): number {
    return this.configService.getOrThrow<number>('sseTokenExpiresInSeconds');
  }
}
