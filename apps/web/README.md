# @mixmatch/web

Authentication web application for TheMixMatch Onchain, built with Next.js
(App Router) and TypeScript.

## Pages

- `/login` — log in with email and password
- `/signup` — create an account

Both pages share the `AuthForm` component (`src/components/AuthForm.tsx`)
and validation schemas from `@mixmatch/shared`. Auth state (current user and
access token) is managed by `AuthProvider` (`src/lib/auth-context.tsx`) and
persisted to `localStorage`.

## Local setup

```bash
cp .env.example .env
pnpm dev
```

Requires the API (`apps/api`) running and reachable at `NEXT_PUBLIC_API_URL`
(defaults to `http://localhost:3001`).

## Testing

```bash
pnpm test
```
