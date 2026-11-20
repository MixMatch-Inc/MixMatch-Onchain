# Taste Module: `is_mock` Surface and Documentation Alignment

> Addresses issue #1486: aligning taste docs with product reality.

## Current Status

`GET /taste/profile/{user_id}` currently returns a mock profile for all users.
The `is_mock: bool` field in the response signals this state to clients.

## Client Responsibility

Consumers of the taste API **must** check `is_mock` before displaying the
profile. When `is_mock=true`, show a "Preview data – personalisation coming
soon" banner instead of presenting the data as real.

### Example response

```json
{
  "user_id": "abc-123",
  "genres": ["electronic", "hip-hop"],
  "energy": 0.72,
  "is_mock": true
}
```

### React / Next.js snippet

```tsx
if (profile.is_mock) {
  return <PreviewBanner message="Personalisation is being computed. This is preview data." />;
}
```

### Expo / React Native snippet

```tsx
if (profile.is_mock) {
  return <Text style={styles.preview}>Preview data – personalisation coming soon</Text>;
}
```

## Documentation Alignment

`docs/taste-module.md` previously described the module as using "AI embeddings"
while the implementation is a stub returning identical mock data to all users.
The doc has been corrected to say:

> **Current implementation:** Stub returning mock taste data with `is_mock: true`.
> Real embedding computation is planned post-MVP.

## `is_mock` Field Contract

- `is_mock: true` – the response is generated from default/mock data.
- `is_mock: false` – the response reflects real user listening history.

Clients must never display `is_mock: true` data as personalised.
