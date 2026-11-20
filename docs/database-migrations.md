# Database migrations (api-py)

`apps/api-py` owns its schema with Alembic. Migrations live in `apps/api-py/src/db/migrations`.

```bash
cd apps/api-py
alembic upgrade head                          # CLI (reads DATABASE_URL)
python -m src.db.migrate upgrade head         # same, without alembic.ini (works inside the image)
alembic revision --autogenerate -m "describe the change"
```

`tests/test_alembic_parity.py` runs every migration against a fresh SQLite database and fails when
`src/db/models.py` and the migrations disagree on tables, columns, nullability, indexes or
constraints, so a model change without a revision fails CI. Column types are not compared.

## The baseline is not the live production schema

`0001_baseline` recreates what `src/db/models.py` describes. The database the NestJS API has been
running against was created by the Drizzle migrations (`apps/api/src/db/migrations`, 0000-0007), and
the two differ. Differences found by reading both (not exhaustive):

- Ids and foreign keys are `uuid` columns in Drizzle and `VARCHAR(36)` in the models.
- Drizzle uses PostgreSQL enums (`user_role`, `stellar_network`, `transaction_status`, `escrow_status`,
  anchor enums, `provider`); the models use plain strings.
- `taste_profiles.embedding vector(1536)` (pgvector) exists in Drizzle but not in the models.
- `users.display_name`, `avatar_url`, `bio` and `is_active` exist in the models but not in Drizzle.
- Timestamps are `timestamp` in Drizzle and `timestamptz` in the models.

So `alembic upgrade head` produces the schema the Python code expects on a **new** database, but it is
**not** safe to run against the existing production database, and `alembic stamp` there would be
wrong. Before cutting production over, introspect a production snapshot, write a revision that
brings it to the models' shape (or change the models to match it), and only then stamp or upgrade.
Until that is done the Drizzle migrations must stay available.
