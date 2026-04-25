import { IRepository } from './types';
import { IVibeJourney, JourneyStatus } from '@mixmatch/types';

export type { IVibeJourney };
export { JourneyStatus };

export interface IVibeJourneyRepository extends IRepository<IVibeJourney, string> {
  findByAuthor(authorId: string, status?: JourneyStatus): Promise<IVibeJourney[]>;
  findPublishedByAuthor(authorId: string): Promise<IVibeJourney[]>;
  findLatestPublished(limit?: number): Promise<IVibeJourney[]>;
  publish(id: string): Promise<IVibeJourney | null>;
  // Only allow updates to drafts
  updateDraft(id: string, data: Partial<IVibeJourney>): Promise<IVibeJourney | null>;
}
