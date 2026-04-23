# ADR-0003: Mobile-First Playback Constraints

**Status:** Accepted

**Date:** 2026-04-23

**Authors:** MixMatch Core Team

**Context:** Mobile app development, audio playback requirements

---

## Context

MixMatch's core value proposition includes DJ mix playback and discovery. Users will primarily access the platform via mobile devices (iOS and Android), which introduces specific constraints around audio playback:

1. **Background playback** - Users expect mixes to continue playing when app is backgrounded
2. **Lock screen controls** - Standard media controls should be available
3. **Audio interruptions** - Phone calls, notifications, and other apps may interrupt playback
4. **Network conditions** - Mobile networks are less reliable than WiFi
5. **Battery consumption** - Streaming audio impacts battery life significantly
6. **Platform restrictions** - iOS and Android have different audio session APIs

## Decision

We will implement a mobile-first audio playback strategy with the following constraints:

### Technical Requirements

1. **Adaptive Bitrate Streaming**
   - Provide multiple quality levels (128kbps, 192kbps, 256kbps)
   - Automatically adjust based on network conditions
   - Default to lower quality on cellular networks

2. **Offline Caching**
   - Cache recently played mixes (up to 500MB)
   - Allow users to mark mixes for offline listening
   - Implement LRU (Least Recently Used) cache eviction

3. **Audio Session Management**
   - Handle interruptions gracefully (pause on call, resume after)
   - Support background playback with proper platform APIs
   - Implement ducking (lower volume) for notifications

4. **Progressive Loading**
   - Start playback within 2 seconds
   - Buffer ahead by 30 seconds
   - Show loading states clearly to users

### Architecture Implications

```
apps/mobile/
├── services/
│   ├── audio-player.service.ts     # Platform-agnostic player interface
│   ├── cache.service.ts            # Mix caching and management
│   └── network.service.ts          # Network quality detection
├── platforms/
│   ├── ios/
│   │   └── audio-session.ios.ts    # iOS-specific audio handling
│   └── android/
│       └── audio-session.android.ts # Android-specific audio handling
└── components/
    └── AudioPlayer.tsx             # Shared player UI component
```

## Consequences

### Positive

- Better user experience on mobile devices
- Reduced data usage on cellular networks
- Works offline for cached content
- Follows platform conventions for media playback
- Battery-efficient streaming

### Negative

- Increased app complexity
- Larger app bundle size (caching logic)
- Additional testing matrix (iOS/Android/network conditions)
- Storage management challenges

### Risks

- **Risk:** Caching uses too much storage
  - **Mitigation:** Enforce strict limits, allow user to configure

- **Risk:** Background playback rejected by app stores
  - **Mitigation:** Follow platform guidelines, request proper permissions

- **Risk:** Audio session conflicts with other apps
  - **Mitigation:** Test with popular music apps, handle errors gracefully

## Alternatives Considered

### Alternative 1: Web-based playback only

- **Pros:** Simpler, no platform-specific code
- **Cons:** Limited background playback, no lock screen controls, worse UX

### Alternative 2: Full download before playback

- **Pros:** Reliable playback, works completely offline
- **Cons:** Long wait times, high storage usage, poor UX for discovery

### Alternative 3: Third-party audio SDK (e.g., Spotify SDK)

- **Pros:** Battle-tested, handles edge cases
- **Cons:** Licensing costs, vendor lock-in, limited customization

## References

- Apple Audio Session Programming Guide
- Android Media Session API
- HTTP Live Streaming (HLS) specification
- MixMatch Product Requirements Document

## Notes

- Implementation planned for Sprint 3-4 (mobile app phase)
- Consider using react-native-track-player or expo-av for React Native
- Monitor analytics for playback errors and quality adjustments
- User feedback will drive quality vs. data usage trade-offs
