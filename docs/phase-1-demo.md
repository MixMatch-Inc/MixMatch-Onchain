# Phase 1 Demo Script

## Local setup

1. Install dependencies with `pnpm install`
2. Configure environment files from the checked-in examples
3. Start MongoDB with `docker compose up -d mongo`
4. Seed demo data with `pnpm --filter api seed:demo`
5. Run the apps with `pnpm dev`

## Demo walkthrough

1. Open the web app on `http://localhost:3000`
2. Register a new account or sign in with a seeded demo user
3. Show the onboarding route and explain role-specific profile completion
4. Navigate to the dashboard and discovery views
5. Open a DJ detail page and walk through the booking request flow
6. Show the bookings inbox and explain the pending accept/decline lifecycle

## Seeded credentials

- `dj.demo@mixmatch.io` / `mixmatch123`
- `planner.demo@mixmatch.io` / `mixmatch123`
- `fan.demo@mixmatch.io` / `mixmatch123`

## Known limitations

- Payments and escrow are not yet wired into booking actions
- Dashboard navigation is still minimal
- Mobile and admin interfaces are not included in Phase 1
