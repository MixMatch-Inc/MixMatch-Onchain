# @repo/ui

Shared React components. Consumers import from the package root (`import { Button } from "@repo/ui"`) or a subpath
(`@repo/ui/button`). The package ships TypeScript **source**: Next compiles it through `transpilePackages: ['@repo/ui']`
in `apps/web/next.config.js`; `sideEffects: false` allows tree-shaking.

- Add a component: `src/<name>.tsx`, export it from `src/index.ts`, add `src/<name>.stories.tsx` and `src/<name>.test.tsx`
  (`src/stories.test.ts` fails if a component lacks a story or a barrel export).
- `pnpm test` runs Vitest with Testing Library and `jest-axe` (`checkA11y` in `src/test/a11y.ts`).
- `pnpm storybook` runs Storybook with the a11y addon; `pnpm build-storybook` builds it.
- `pnpm test:visual` screenshot-tests every story against `visual/__screenshots__` (CI job `UI visual regression`).
  Create or update baselines with `pnpm test:visual --update-snapshots` and review the images in the PR.
- React Native has its own primitives in `apps/mobile`; the mobile playground is `apps/mobile/src/playground`.
