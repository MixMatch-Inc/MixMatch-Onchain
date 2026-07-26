# Mobile Auth Shell

The mobile auth shell provides authentication flows for the React Native / Expo mobile app.

## Architecture

```
App.tsx
 └── AuthShell (src/components/AuthShell.tsx)
      ├── useAuth hook (src/hooks/useAuth.ts)    — auth state management
      ├── api-client (src/services/api-client.ts) — REST client for auth endpoints
      └── children (screen content)
```

- `AuthShell` renders the login/register form when unauthenticated.
- Once authenticated, it renders its `children` (screen content).
- `useAuth` persists the session to `localStorage` and exposes `setAuth` / `logout`.

## Configuration

Set `EXPO_PUBLIC_API_URL` in `.env` to point at the API server:

```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

## Endpoints Consumed

| Method | Path              | Description         |
|--------|-------------------|---------------------|
| POST   | /api/auth/register | Create an account   |
| POST   | /api/auth/login    | Authenticate user   |

## Adding Auth-Gated Screens

Place screens as children of `AuthShell` in `App.tsx`:

```tsx
<AuthShell>
  <YourScreen />
</AuthShell>
```

## Testing

```bash
cd apps/mobile && npm test
```
