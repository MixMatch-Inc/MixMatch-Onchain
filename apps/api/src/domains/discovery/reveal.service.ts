import { RevealPhase, RevealTrigger } from '@mixmatch/types';
import mongoose from 'mongoose';
import RevealState, { IRevealStateDocument } from './reveal-state.model';

export class RevealService {
  static async getRevealState(viewerId: string, targetProfileId: string): Promise<IRevealStateDocument | null> {
    return RevealState.findOne({ viewerId, targetProfileId }).exec();
  }

  static async ensureRevealState(
    viewerId: string,
    targetProfileId: string,
    targetProfileType: 'dj' | 'planner' | 'lover'
  ): Promise<IRevealStateDocument> {
    let state = await this.getRevealState(viewerId, targetProfileId);
    if (!state) {
      state = new RevealState({
        viewerId,
        targetProfileId,
        targetProfileType,
        currentPhase: RevealPhase.BLIND,
        revealTriggers: [],
        revealTimestamps: new Map(Object.values(RevealPhase).map(phase => [phase, null])),
      });
      await state.save();
    }
    return state;
  }

  static async triggerReveal(
    viewerId: string,
    targetProfileId: string,
    targetProfileType: 'dj' | 'planner' | 'lover',
    trigger: RevealTrigger,
    newPhase?: RevealPhase
  ): Promise<IRevealStateDocument> {
    const state = await this.ensureRevealState(viewerId, targetProfileId, targetProfileType);

    // Add trigger if not already present
    if (!state.revealTriggers.includes(trigger)) {
      state.revealTriggers.push(trigger);
    }

    // Update phase if specified and higher than current
    if (newPhase && this.isHigherPhase(newPhase, state.currentPhase)) {
      state.currentPhase = newPhase;
      state.revealTimestamps.set(newPhase, new Date());
    }

    await state.save();
    return state;
  }

  static async blockReveal(
    viewerId: string,
    targetProfileId: string,
    reason: string,
    blockedBy: string
  ): Promise<IRevealStateDocument> {
    const state = await this.ensureRevealState(viewerId, targetProfileId, 'dj'); // Default to dj, should be updated

    state.currentPhase = RevealPhase.BLOCKED;
    state.blockedReason = reason;
    state.blockedBy = new mongoose.Types.ObjectId(blockedBy);
    state.blockedAt = new Date();

    await state.save();
    return state;
  }

  static isHigherPhase(phase1: RevealPhase, phase2: RevealPhase): boolean {
    const order = [RevealPhase.BLIND, RevealPhase.ANONYMOUS, RevealPhase.BASIC, RevealPhase.FULL];
    return order.indexOf(phase1) > order.indexOf(phase2);
  }

  static canViewName(phase: RevealPhase): boolean {
    return [RevealPhase.BASIC, RevealPhase.FULL].includes(phase);
  }

  static canViewBio(phase: RevealPhase): boolean {
    return [RevealPhase.BASIC, RevealPhase.FULL].includes(phase);
  }

  static canViewImages(phase: RevealPhase): boolean {
    return [RevealPhase.ANONYMOUS, RevealPhase.BASIC, RevealPhase.FULL].includes(phase);
  }

  static canViewExternalLinks(phase: RevealPhase): boolean {
    return phase === RevealPhase.FULL;
  }

  static canViewLocation(phase: RevealPhase): boolean {
    return [RevealPhase.BASIC, RevealPhase.FULL].includes(phase);
  }

  static canViewPricing(phase: RevealPhase): boolean {
    return [RevealPhase.BASIC, RevealPhase.FULL].includes(phase);
  }

  static redactProfile(profile: any, phase: RevealPhase): any {
    const redacted = { ...profile };

    if (!this.canViewName(phase)) {
      redacted.stageName = 'Anonymous DJ';
      redacted.organizationName = 'Anonymous Organizer';
    }

    if (!this.canViewBio(phase)) {
      redacted.bio = undefined;
    }

    if (!this.canViewImages(phase)) {
      // Assume images are in some field, redact them
      redacted.images = [];
    }

    if (!this.canViewExternalLinks(phase)) {
      redacted.socialLinks = {};
      redacted.website = undefined;
    }

    if (!this.canViewLocation(phase)) {
      redacted.location = undefined;
    }

    if (!this.canViewPricing(phase)) {
      redacted.pricing = undefined;
    }

    return redacted;
  }
}
