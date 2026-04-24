import { Request, Response } from 'express';
import { ProviderType } from '@mixmatch/types';
import { container } from '../../config/di';
import { TrackReferenceUpsertService } from './track-reference-upsert.service';
import { PreviewCapabilityService } from './preview-capability.service';
import { MongoProviderPayloadCache, buildCacheKey } from './provider-payload-cache';
import { sendSuccess, sendError } from '../../utils/api-response';

const upsertService = new TrackReferenceUpsertService(
  container.trackReferenceRepository,
  new MongoProviderPayloadCache(),
);
const previewService = new PreviewCapabilityService();

/**
 * POST /tracks/resolve
 *
 * Accepts { provider, providerTrackId } and returns a canonical track
 * reference summary with a preview strategy hint.  Idempotent – repeated
 * calls for the same provider key return the same canonical record.
 */
export const resolveTrackReference = async (req: Request, res: Response): Promise<void> => {
  const { provider, providerTrackId } = req.body as {
    provider: ProviderType;
    providerTrackId: string;
  };

  // 1. Check cache first
  const cache = new MongoProviderPayloadCache();
  const cacheKey = buildCacheKey(provider, providerTrackId);
  const cached = await cache.get(cacheKey);

  // 2. Try to find existing canonical record
  let track = await upsertService.resolveByProviderKey(provider, providerTrackId);

  if (!track) {
    if (!cached) {
      // No record and no cache – caller must supply rawPayload to create one
      sendError(res, 404, 'Track reference not found. Supply rawPayload to create it.');
      return;
    }

    // Re-hydrate from cached raw payload (best-effort)
    track = await upsertService.upsert({
      provider,
      providerTrackId,
      rawPayload: cached as Record<string, unknown>,
      normalized: cached as any,
    });
  }

  // 3. Resolve preview strategy
  const platform = (req.query.platform as 'web' | 'mobile') ?? 'web';
  const market = req.query.market as string | undefined;
  const capability = previewService.resolve(provider, providerTrackId, track.previewUrl, {
    platform,
    market,
  });

  sendSuccess(res, 200, {
    track: {
      id: track.id,
      provider: track.provider,
      providerTrackId: track.providerTrackId,
      title: track.title,
      artists: track.artists,
      album: track.album,
      durationMs: track.durationMs,
      previewUrl: track.previewUrl,
      artwork: track.artwork,
      explicit: track.explicit,
      ingestedAt: track.ingestedAt,
    },
    preview: capability,
  });
};
