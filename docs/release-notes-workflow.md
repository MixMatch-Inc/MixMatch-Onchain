# Changelog and Release Notes Automation

## Overview

MixMatch uses conventional commits and automated tooling to generate changelogs and release notes for the monorepo. This ensures consistent, meaningful documentation of changes across all workspaces.

## Conventional Commits

All commits should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Scopes

Use workspace names as scopes:

- `api` - API application
- `web` - Web application
- `mobile` - Mobile application
- `stellar-service` - Stellar blockchain service
- `contracts` - Smart contracts package
- `types` - Shared types package
- `analytics` - Analytics package
- `logger` - Logger package
- `observability` - Observability package
- `ui` - UI components package
- `config` - Configuration package
- `docs` - Documentation

### Examples

```bash
# Good commit messages
feat(api): add user authentication endpoints
fix(web): resolve navigation bug on mobile devices
docs: update architecture diagrams
refactor(mobile): simplify state management
chore(deps): update typescript to 5.3.0

# Breaking changes (add ! before :)
feat(api)!: change authentication flow
fix(web)!: remove deprecated endpoint

# With body
feat(api): add real-time notifications

Implement WebSocket support for live updates.
Users now receive instant notifications for:
- New matches
- Message replies
- Event updates

Closes #123
```

## Generating Changelogs

### Generate Full Changelog

```bash
# Generate changelog from all commits
pnpm changelog:generate

# Output to specific file
pnpm changelog:generate --output=CHANGELOG.md
```

### Generate Since Specific Tag

```bash
# Generate changelog since v1.0.0
pnpm changelog:since=v1.0.0

# Example
pnpm changelog:generate --since=v1.0.0 --output=CHANGELOG.md
```

### Generate for Specific Workspace

```bash
# Generate changelog for API only
pnpm changelog:workspace=api

# Example
pnpm changelog:generate --workspace=api --output=api-changelog.md
```

### Generate Release Notes

```bash
# Generate release notes for current release
pnpm release:notes

# This creates RELEASE_NOTES.md in the root directory
```

## Release Workflow

### Creating a Release

1. **Update versions** in package.json files:
   ```bash
   # Use npm version or manually update
   npm version patch  # or minor, major
   ```

2. **Create and push tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **CI automatically**:
   - Generates release notes from commits since last tag
   - Creates a draft GitHub release
   - Attaches release notes to the release

4. **Review and publish**:
   - Go to GitHub Releases
   - Review the auto-generated notes
   - Edit if needed
   - Publish the release

### Manual Release Notes Generation

You can also trigger release notes generation manually:

```bash
# Via GitHub Actions UI
# Go to Actions > Release Notes > Run workflow

# Or via GitHub CLI
gh workflow run release-notes.yml \
  --field since_tag=v1.0.0 \
  --field workspace=api
```

## Changelog Format

The generated changelog follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## 📦 api

### 🚀 Features
- Add user authentication endpoints ([abc1234](https://github.com/...))
- Implement WebSocket support ([def5678](https://github.com/...))

### 🐛 Bug Fixes
- Fix race condition in session management ([ghi9012](https://github.com/...))

## 📦 web

### 🚀 Features
- Add dashboard analytics view ([jkl3456](https://github.com/...))

## 👥 Contributors
- John Doe
- Jane Smith
```

## Package-Scoped Changelog Grouping

The changelog generator automatically groups changes by workspace:

- **apps/api** → `api` section
- **apps/web** → `web` section
- **apps/mobile** → `mobile` section
- **apps/stellar-service** → `stellar-service` section
- **packages/*** → `packages` section
- **docs/** → `docs` section

## Contributor Attribution

Each changelog includes a contributors section that lists all unique authors from the commits. This provides visibility into who contributed to each release.

## CI Integration

The release notes workflow is integrated into CI:

- **Triggered by**: Tag pushes (`v*`) or manual dispatch
- **Output**: Draft GitHub release with auto-generated notes
- **Artifacts**: RELEASE_NOTES.md available for download

## Best Practices

### For Contributors

1. **Always use conventional commits** - This is enforced by linting
2. **Use appropriate scope** - Helps with changelog organization
3. **Write clear descriptions** - These become the changelog entries
4. **Include issue references** - Use `Closes #123` in commit body
5. **Mark breaking changes** - Use `!` before `:` in type

### For Maintainers

1. **Review auto-generated notes** - Before publishing releases
2. **Add manual entries if needed** - For context that commits don't capture
3. **Use semantic versioning** - Align version bumps with change types
4. **Keep releases frequent** - Smaller, more frequent releases are better

## Migration from Manual Changelogs

If you have existing manual changelogs:

1. Keep the existing CHANGELOG.md as historical record
2. Start using conventional commits for all new changes
3. Generate new changelogs going forward
4. Merge manual and auto-generated sections if needed

## Troubleshooting

### No commits found
- Ensure you have git history fetched: `git fetch --tags`
- Check if the since tag exists: `git tag -l`

### Wrong commit grouping
- Verify commit messages follow conventional format
- Check scope names match workspace names

### Missing contributors
- Ensure git author information is set correctly
- Check if commits are being filtered incorrectly

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm changelog:generate` | Generate full changelog |
| `pnpm changelog:since=<tag>` | Generate since specific tag |
| `pnpm changelog:workspace=<name>` | Generate for specific workspace |
| `pnpm release:notes` | Generate RELEASE_NOTES.md |

## Configuration

Changelog configuration is in `.changelog-config.json`:

- Change type mappings
- Workspace scopes
- URL formats
- Release commit message format

## See Also

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [PR Template](../.github/PULL_REQUEST_TEMPLATE.md)
