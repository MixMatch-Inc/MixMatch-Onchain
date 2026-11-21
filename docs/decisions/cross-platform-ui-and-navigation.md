# Cross-platform UI strategy and mobile navigation

Status: **proposed** (issue #1421)

## Context

`packages/ui` renders DOM elements (`react-dom` only) and is consumed by `apps/web`. `apps/mobile` is
Expo/React Native and builds its own `StyleSheet` components, so every component exists once per
platform with no shared contract. `PaymentsScreen.tsx` also hand-rolled a tab bar with local state,
which gives no back stack, no deep-link routing and no accessibility roles for tabs.

## Options for UI

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Parallel packages sharing tokens and contracts (recommended)** | Each platform uses native primitives and idioms; no `react-native-web` in the Next build; works today | Components are written twice; drift must be controlled by shared contracts and tests |
| B. One primitives layer (`react-native-web` or Tamagui) | One component implementation | Heavy change to the Next.js build and styling; accessibility and SSR edge cases; large migration |

## Decision

Take **option A**. Platform-neutral things live in packages that both apps already import:

- `@mixmatch/tokens`: colours, spacing, radius, type and motion (web CSS variables, native theme object).
- `@mixmatch/shared`: behaviour and meaning, not pixels, for example `status.ts` (status to tone, icon and
  label) and `format.ts` (amount and address formatting).
- `packages/ui` (DOM) and `apps/mobile/src/components` (React Native) implement the same component names
  and props on top of those. A component added to one platform is added to the other, or the PR says why not.

Revisit option B only if the component count makes duplication costly.

## Navigation

Use **React Navigation** (`@react-navigation/native` with `@react-navigation/bottom-tabs`) for mobile.
It is the smallest change from the current screen-state structure, supports tab roles for screen
readers and a back stack, and can be wrapped by Expo Router later if file-based routing is wanted
(Expo Router is built on React Navigation). The hand-rolled tab bar in `PaymentsScreen.tsx` is replaced
by a bottom-tab navigator with `Send`, `History`, `Receive` and `Scan` screens.

## Consequences

- New mobile dependencies: `@react-navigation/native`, `@react-navigation/bottom-tabs`,
  `react-native-screens` and `react-native-safe-area-context`. Install with `npx expo install` so
  the native versions match the Expo SDK, and refresh `pnpm-lock.yaml`.
- Deep links and payment URIs can be added later through the navigation `linking` config.
- Auth and anchor screens are not yet routes; they move into a root stack when they are added.
