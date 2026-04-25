/**
 * @deprecated This module is part of the legacy discovery system and will be replaced in Sprint 2.
 * Use the new recommendation engine in domains/recommendations/ instead.
 * @see https://github.com/MixMatch-Inc/MixMatch-Onchain/issues/267
 * @migrationGuide See docs/migration/discovery-migration.md
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { listDjs, getDjProfile } from './discovery.controller';
import { getDiscoveryFeed } from './feed.controller';
import { ingestImpressions } from './impressions.controller';

/**
 * @deprecated Legacy discovery router - will be replaced by new recommendation system in Sprint 2.
 * New endpoints will be available under /api/v2/recommendations/
 * @see domains/recommendations/
 */
const discoveryRouter = Router();

discoveryRouter.get('/feed', requireAuth, getDiscoveryFeed);
discoveryRouter.get('/djs', requireAuth, listDjs);
discoveryRouter.get('/djs/:id', requireAuth, getDjProfile);
discoveryRouter.post('/impressions', requireAuth, ingestImpressions);

/**
 * @deprecated Use the new recommendation service instead
 * @see packages/recommendations/src/recommendation.service.ts
 */
export default discoveryRouter;

/**
 * Legacy compatibility wrapper for the new recommendation system
 * @deprecated This wrapper will be removed in Sprint 3
 */
export const legacyDiscoveryWrapper = {
  /**
   * @deprecated Use RecommendationService.getRecommendations() instead
   */
  getFeed: async (userId: string, options?: any) => {
    console.warn('[DEPRECATED] Using legacy discovery feed. Use RecommendationService.getRecommendations() instead.');
    // This would internally call the new service
    return null; // Placeholder - would implement compatibility layer
  },
  
  /**
   * @deprecated Use ProfileService.getProfile() instead
   */
  getDjProfile: async (djId: string, viewerId: string) => {
    console.warn('[DEPRECATED] Using legacy DJ profile fetch. Use ProfileService.getProfile() instead.');
    // This would internally call the new service
    return null; // Placeholder - would implement compatibility layer
  }
};
