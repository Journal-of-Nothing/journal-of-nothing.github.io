# Release Process

## Preconditions

- All checks pass: `bun run build`, `bun run lint`, `bun run test`.
- Changes are merged via PR (branch protection required on the default branch).

## Versioning

- Use Semantic Versioning with prerelease tags for beta.
- Update `package.json` version before tagging.

## Changelog

- Update CHANGELOG.md under [Unreleased].
- Move entries into the new version section on release.

## Release Steps

1. Ensure a clean working tree.
2. Update version in `package.json`.
3. Update CHANGELOG.md.
4. Create a PR and merge after review.
5. Tag the release (e.g., `v0.1.0-beta.1`).

## Hotfix

- Use `0.1.0-beta.x` bumps for beta hotfixes.
