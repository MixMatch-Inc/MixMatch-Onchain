import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Impression, { ImpressionEventType } from './impression.model';
import { tryCreateResonance } from '../resonance/resonance.service';

const VALID_EVENT_TYPES: ImpressionEventType[] = [
  'slot_start', 'slot_complete', 'slot_skip', 'reaction', 'like', 'hide', 'journey_exit',
];

interface ImpressionEventInput {
  targetProfileId: string;
  eventType: ImpressionEventType;
  clientEventId: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export const ingestImpressions = async (req: Request, res: Response): Promise<void> => {
  const events: ImpressionEventInput[] = req.body.events;

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ message: 'events must be a non-empty array' });
    return;
  }

  if (events.length > 100) {
    res.status(400).json({ message: 'Batch size cannot exceed 100 events' });
    return;
  }

  const viewerId = new mongoose.Types.ObjectId(req.user!.userId);
  const results: { clientEventId: string; status: 'accepted' | 'rejected'; reason?: string }[] = [];

  for (const event of events) {
    const { targetProfileId, eventType, clientEventId, occurredAt, metadata } = event;

    // Validate required fields
    if (!targetProfileId || !eventType || !clientEventId || !occurredAt) {
      results.push({ clientEventId: clientEventId ?? '?', status: 'rejected', reason: 'missing required fields' });
      continue;
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      results.push({ clientEventId, status: 'rejected', reason: `invalid eventType: ${eventType}` });
      continue;
    }

    if (!mongoose.Types.ObjectId.isValid(targetProfileId)) {
      results.push({ clientEventId, status: 'rejected', reason: 'invalid targetProfileId' });
      continue;
    }

    const occurredAtDate = new Date(occurredAt);
    if (isNaN(occurredAtDate.getTime())) {
      results.push({ clientEventId, status: 'rejected', reason: 'invalid occurredAt timestamp' });
      continue;
    }

    try {
      await Impression.create({
        viewerId,
        targetProfileId: new mongoose.Types.ObjectId(targetProfileId),
        eventType,
        clientEventId,
        occurredAt: occurredAtDate,
        metadata,
      });
      results.push({ clientEventId, status: 'accepted' });

      // Trigger resonance check on like events (fire-and-forget)
      if (eventType === 'like') {
        tryCreateResonance(req.user!.userId, targetProfileId).catch(() => {/* non-critical */});
      }
    } catch (err: unknown) {
      // Duplicate key = already ingested (idempotent retry)
      if ((err as { code?: number }).code === 11000) {
        results.push({ clientEventId, status: 'accepted' }); // treat as success
      } else {
        results.push({ clientEventId, status: 'rejected', reason: 'internal error' });
      }
    }
  }

  const hasAccepted = results.some((r) => r.status === 'accepted');
  const hasRejected = results.some((r) => r.status === 'rejected');

  const statusCode = hasAccepted && !hasRejected ? 201 : hasAccepted ? 207 : 400;
  res.status(statusCode).json({ results });
};
