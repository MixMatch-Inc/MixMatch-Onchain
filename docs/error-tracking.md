# Error tracking (Sentry)

## API (`apps/api-py`): implemented

Set `SENTRY_DSN` to turn it on; with no DSN nothing is sent and the SDK is not imported.

| Variable | Meaning |
| --- | --- |
| `SENTRY_DSN` | Project DSN. Unset disables Sentry. |
| `SENTRY_RELEASE` | Release name, normally the git SHA of the build (set it in the deploy: `SENTRY_RELEASE=$GITHUB_SHA`). |
| `SENTRY_TRACES_SAMPLE_RATE` | 0.0 to 1.0, performance traces. Default 0. |

`send_default_pii` is off and `before_send` removes authorization headers, cookies, passwords,
tokens, secrets, transaction `memo` values and envelope XDR from requests, extra context, user data,
breadcrumbs and stack-frame variables.

Check the wiring with a real project: `SENTRY_DSN=... python -m src.core.sentry` sends one test
error, which should appear in the project within a few seconds.

## Web and mobile: not implemented yet

Both need packages added to the pnpm workspace, which changes `pnpm-lock.yaml`, so they are left for
a change that can run `pnpm install`:

- **Web** (`apps/web`): `pnpm --filter web add @sentry/nextjs`, add `sentry.client.config.ts` /
  `sentry.server.config.ts` / `instrumentation.ts`, wrap `next.config.js` with `withSentryConfig`
  (this uploads source maps in CI when `SENTRY_AUTH_TOKEN` is set), tag releases with the git SHA and
  keep `sendDefaultPii: false`.
- **Mobile** (`apps/mobile`): `npx expo install @sentry/react-native`, add the `@sentry/react-native/expo`
  config plugin to `app.json`, call `Sentry.init` in `App.tsx` with `release` set to the EAS build's
  version and upload source maps through the plugin.
