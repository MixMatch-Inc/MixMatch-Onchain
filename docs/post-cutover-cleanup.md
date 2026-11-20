# Post-cutover cleanup checklist

Do these **only after** the cutover sign-off in
[`post-cutover-monitoring-criteria.md`](post-cutover-monitoring-criteria.md) (7 consecutive days within
all SLOs). Until then the rollback path in `docs/archive/rollback-runbook.md` needs the pieces below.

## Done in the cleanup PR

- [x] Remove `infra/nginx/traffic-split.conf` (temporary traffic split).
- [x] Remove `scripts/decommission_nestjs.sh` (it copied `apps/api` into `archive/` and then deleted it,
      duplicating what git history already keeps).
- [x] Move the cutover runbooks and retrospective to `docs/archive/`.

## Still to do after sign-off

- [ ] Delete the legacy NestJS API: `git rm -r apps/api` (git history preserves it; do not copy it to an
      `archive/` directory).
- [ ] Confirm `apps/api-py` owns the database schema (Alembic migrations in `apps/api-py/src/db/migrations`)
      before deleting the Drizzle migrations that live under `apps/api`.
- [ ] Remove NestJS-only environment templates (`apps/api/.env.example`) and any CI jobs that build `apps/api`.
- [ ] Remove NestJS wording from `README.md` and `docs/architecture.md`.
- [ ] Remove DNS or load-balancer weights that still point at the NestJS target group.
- [ ] Record the sign-off date and approvers below.

Sign-off: _date_ / _Tech Lead_ / _DevOps_
