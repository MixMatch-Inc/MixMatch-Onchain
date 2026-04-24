import { ProviderType } from '@mixmatch/types';

// ── Preview strategy enum ──────────────────────────────────────────────────────

export enum PreviewStrategy {
  /** Track has a direct preview URL – auto-play is safe */
  AUTO_PLAY = 'AUTO_PLAY',
  /** No direct URL; client must hand off to the provider's player */
  PROVIDER_HANDOFF = 'PROVIDER_HANDOFF',
  /** Preview is unavailable in this context; show a silent placeholder */
  SILENT_PLACEHOLDER = 'SILENT_PLACEHOLDER',
}

// ── Capability model ───────────────────────────────────────────────────────────

export interface AudioPreviewCapability {
  provider: ProviderType;
  providerTrackId: string;
  hasPreviewUrl: boolean;
  /** Whether the provider restricts streaming in the given market */
  streamingRestricted: boolean;
  /** ISO 3166-1 alpha-2 market code, e.g. "US" */
  market?: string;
  strategy: PreviewStrategy;
}

// ── Platform context ───────────────────────────────────────────────────────────

export interface PlatformContext {
  /** "web" or "mobile" */
  platform: 'web' | 'mobile';
  /** ISO 3166-1 alpha-2 market code */
  market?: string;
}

// ── Fallback decision service ──────────────────────────────────────────────────

export interface IPreviewCapabilityService {
  resolve(
    provider: ProviderType,
    providerTrackId: string,
    previewUrl: string | undefined,
    context: PlatformContext,
  ): AudioPreviewCapability;
}

export class PreviewCapabilityService implements IPreviewCapabilityService {
  /**
   * Deterministically decide the preview strategy from track metadata and
   * platform context.  No I/O – pure function wrapped in a class for DI.
   */
  resolve(
    provider: ProviderType,
    providerTrackId: string,
    previewUrl: string | undefined,
    context: PlatformContext,
  ): AudioPreviewCapability {
    const hasPreviewUrl = Boolean(previewUrl);
    const streamingRestricted = this.isStreamingRestricted(provider, context);

    let strategy: PreviewStrategy;

    if (hasPreviewUrl && !streamingRestricted) {
      strategy = PreviewStrategy.AUTO_PLAY;
    } else if (!hasPreviewUrl && !streamingRestricted) {
      // Provider may still support in-app playback via handoff
      strategy = PreviewStrategy.PROVIDER_HANDOFF;
    } else {
      strategy = PreviewStrategy.SILENT_PLACEHOLDER;
    }

    return {
      provider,
      providerTrackId,
      hasPreviewUrl,
      streamingRestricted,
      market: context.market,
      strategy,
    };
  }

  /**
   * Streaming restriction rules.
   * Extend this as provider/geo policies become known.
   */
  private isStreamingRestricted(provider: ProviderType, context: PlatformContext): boolean {
    // Apple Music previews are only available on mobile via their SDK
    if (provider === ProviderType.APPLE_MUSIC && context.platform === 'web') {
      return true;
    }
    return false;
  }
}
