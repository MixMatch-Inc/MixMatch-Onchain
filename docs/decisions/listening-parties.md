# Listening Parties Design

## Status
Proposed / MVP implemented for #1377.

## Context
MixMatch needs shared listening sessions where users can gather around a common queue and react in real time. The README references listening parties, but no implementation existed.

## Goals
- Allow a host to create a listening party room.
- Allow guests to join/leave a room.
- Track presence in the room (online/offline/last seen).
- Provide a minimal MVP API that can be extended to realtime sync.

## Non-goals (MVP)
- Full synchronized playback clock across providers.
- DRM/provider playback enforcement in client SDKs.
- Advanced moderation and recommendation ranking.

## Architecture

### Data model
- `listening_parties`: room metadata (`id`, `host_user_id`, `name`, `status`, timestamps).
- `listening_party_members`: membership and presence (`party_id`, `user_id`, `role`, `presence`, `joined_at`, `last_seen_at`).

### Shared queue
MVP stores queue as an in-memory structure per active room process; follow-up work should persist `listening_party_queue_items` with:
- `party_id`, `track_uri`, `provider`, `title`, `artist`, `added_by`, `position`, `played_at`.
Host controls:
- host can reorder/remove tracks and skip.
- guests can enqueue (configurable by host policy).

### Presence
- Join endpoint marks member `online` and updates `last_seen_at`.
- Heartbeat endpoint refreshes `last_seen_at` and keeps member `online`.
- Leave endpoint marks member `offline`.
- Room state endpoint returns members and presence.

### Host controls
- Host is party creator (`role=host`).
- Host can pause/resume room, skip track, remove guest, and lock queue.
- MVP exposes create/join/leave/state endpoints; host controls beyond create are modeled for next iteration.

### Provider playback limits
- Spotify/Apple Music playback remains subject to each provider's entitlement and device rules.
- Backend stores provider track references only; clients are responsible for provider auth and playback.
- Party sync should broadcast playback commands/events, not stream copyrighted audio.
- If a member lacks provider entitlement, UI should show "unavailable in your provider/region".

## API (MVP)
- `POST /api/parties` create room
- `POST /api/parties/{party_id}/join` join room + presence online
- `POST /api/parties/{party_id}/leave` leave room + presence offline
- `POST /api/parties/{party_id}/heartbeat` presence heartbeat
- `GET /api/parties/{party_id}` room state with members/presence

## Rollout
1. Merge design doc and MVP endpoints.
2. Add WS broadcast for presence/queue changes.
3. Persist queue and host control permissions.
4. Add provider-specific playback sync adapters.
