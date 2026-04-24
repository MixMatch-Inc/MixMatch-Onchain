# ADR-001: Use Expo (Managed Workflow) for the Mobile App

**Date:** 2026-04-24  
**Status:** Accepted

## Context

The MixMatch monorepo already uses pnpm workspaces and TurboRepo. We need a mobile
workspace that contributors can run locally without native toolchain setup, and that
can share `@mixmatch/types` without path hacks.

## Decision

Use **Expo SDK 51 (managed workflow)** with `expo-router` for file-based navigation.

Reasons:
- Zero native toolchain required for JS contributors (`expo start` / Expo Go).
- `expo-secure-store` provides encrypted on-device token storage (replaces
  `localStorage` pattern used on web).
- `expo-constants` gives a clean env-var bridge (`EXPO_PUBLIC_*`) consistent with
  Next.js `NEXT_PUBLIC_*` convention.
- Managed workflow keeps the monorepo free of `ios/` and `android/` directories
  until native modules require ejecting.

## Consequences

- Native modules beyond the Expo SDK require `expo prebuild` (eject to bare).
- Expo SDK version pins React Native; upgrading Expo upgrades RN transitively.
