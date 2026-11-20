# Changesets

JavaScript/TypeScript packages (`apps/web`, `apps/mobile`, `packages/*`) are versioned with
[changesets](https://github.com/changesets/changesets). Every package is private, so changesets
only bumps versions, writes `CHANGELOG.md` files and creates git tags.

Add one with your PR when a change affects a package's behaviour:

```bash
pnpm dlx @changesets/cli add
```

On `main`, `.github/workflows/release.yml` opens a "Version packages" PR that collects the
changesets. Merging it tags the release and creates GitHub releases with the notes.

The Python API (`apps/api-py`) is released by release-please from Conventional Commit messages
instead (see `release-please-config.json`).
