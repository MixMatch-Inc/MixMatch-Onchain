import DjProfile, { IDjProfileDocument } from './dj.model';
import RevealState from './reveal-state.model';
import { RevealPhase } from '@mixmatch/types';
import mongoose from 'mongoose';

export interface CandidateQueryOptions {
  viewerId: string;
  /** 'standard' shows all visible profiles; 'blind' enforces blind-listening eligibility */
  surface: 'standard' | 'blind';
  /** IDs to exclude (e.g. previously hidden, self) */
  excludeIds?: string[];
  limit?: number;
  afterId?: string;
}

export interface DiscoveryCandidate {
  profileId: string;
  djProfile: Pick<
    IDjProfileDocument,
    '_id' | 'stageName' | 'bio' | 'genres' | 'vibeTags' | 'pricing' | 'location' | 'availabilityStatus' | 'socialLinks' | 'createdAt'
  >;
  /** Placeholder for future ranking signals */
  scoringContext: Record<string, unknown>;
  revealPhase: RevealPhase;
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  onboardingCompleted: boolean;
  privacySettings?: { blindListeningEligible?: boolean };
}

type LeanDjProfile = Omit<IDjProfileDocument, 'user'> & { user: PopulatedUser };

export class DiscoveryCandidateService {
  /**
   * Fetch eligible discovery candidates for a viewer.
   * Excludes: self, blocked states, explicitly excluded IDs.
   */
  static async getCandidates(opts: CandidateQueryOptions): Promise<DiscoveryCandidate[]> {
    const { viewerId, surface, excludeIds = [], limit = 20, afterId } = opts;

    // Collect profile IDs that are blocked (viewer blocked them or they blocked viewer)
    const blockedStates = await RevealState.find({
      $or: [
        { viewerId, currentPhase: RevealPhase.BLOCKED },
        { targetProfileId: viewerId, currentPhase: RevealPhase.BLOCKED },
      ],
    })
      .select('viewerId targetProfileId')
      .lean();

    const blockedProfileIds = new Set<string>(
      blockedStates.flatMap((s: { viewerId: unknown; targetProfileId: unknown }) => [
        String(s.viewerId),
        String(s.targetProfileId),
      ]),
    );
    blockedProfileIds.delete(viewerId);

    const excludeSet = new Set([...excludeIds, viewerId, ...blockedProfileIds]);

    const query: Record<string, unknown> = {
      user: { $nin: Array.from(excludeSet) },
    };

    if (afterId) {
      query._id = { $gt: afterId };
    }

    const profiles = await DjProfile.find(query)
      .populate<{ user: PopulatedUser }>('user', 'onboardingCompleted privacySettings')
      .sort({ _id: 1 })
      .limit(limit)
      .lean() as unknown as LeanDjProfile[];

    // Filter: must have completed onboarding; blind surface requires blindListeningEligible
    const eligible = profiles.filter((p: LeanDjProfile) => {
      if (!p.user?.onboardingCompleted) return false;
      if (surface === 'blind' && p.user?.privacySettings?.blindListeningEligible === false) return false;
      return true;
    });

    // Fetch existing reveal states in bulk
    const profileIds = eligible.map((p: LeanDjProfile) => String(p._id));
    const revealStates = await RevealState.find({
      viewerId,
      targetProfileId: { $in: profileIds },
    })
      .select('targetProfileId currentPhase')
      .lean();

    const revealMap = new Map(
      revealStates.map((rs: { targetProfileId: unknown; currentPhase: unknown }) => [
        String(rs.targetProfileId),
        rs.currentPhase as RevealPhase,
      ]),
    );

    return eligible.map((p: LeanDjProfile) => ({
      profileId: String(p._id),
      djProfile: p as unknown as DiscoveryCandidate['djProfile'],
      scoringContext: {},
      revealPhase: revealMap.get(String(p._id)) ?? RevealPhase.BLIND,
    }));
  }
}
