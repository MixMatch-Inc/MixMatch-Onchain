# Contributing to MixMatch-Onchain

## Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.12, FastAPI, SQLAlchemy 2 (async), Pydantic v2 |
| Legacy API (read-only) | NestJS (apps/api – being decommissioned) |
| Web | Next.js 14, TypeScript, Tailwind CSS |
| Mobile | Expo 51, React Native, TypeScript |
| Packages | TypeScript (shared, stellar, kms, ui, eslint-config, typescript-config) |
| DB | PostgreSQL (production), SQLite in-memory (unit tests) |
| KMS | HashiCorp Vault (Transit engine) |
| On-chain | Stellar / Soroban |

## Branch Model

- `develop` – integration branch; all PRs target this branch.
- `main` – production releases only.
- Feature branches: `feat/<short-description>` or `fix/<short-description>`.

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
feat(auth): add refresh-token rotation
fix(payments): correct stroop precision in normalize_amount
docs(runbooks): add steady-state runbook
```

## PR Checklist

- [ ] Branch targets `develop`.
- [ ] No secrets or real tokens committed.
- [ ] New Python files pass `ruff check` and `mypy --strict`.
- [ ] New TypeScript files pass `tsc --noEmit`.
- [ ] Tests added or updated for changed behaviour.
- [ ] `docs/` updated if behaviour or API changes.
- [ ] No `Co-Authored-By` or `Generated with` trailer lines.

## Running Tests

```bash
# Python (api-py)
pytest apps/api-py/tests/ -v

# TypeScript
pnpm --filter <package> test

# All
pnpm turbo test
```

## Licence Policy

This repository is licensed under the **MIT Licence** (see `LICENSE` at the
root). All contributions are submitted under the same licence. The
`apps/api/package.json` `"UNLICENSED"` field is an artefact of the legacy
scaffold and will be corrected in a follow-up.
