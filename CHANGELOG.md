# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Added

-

### Changed

-

### Fixed

-

## [0.1.0-beta.1] - 2026-02-09

### Added

- Minimal test coverage for auth routes, submission create/update, and review opinion replies.
- Release documentation and changelog template.

### Changed

- Updated linting to parse Vue SFCs and apply test-friendly globals.
- Adjusted list page templates to avoid `v-if` with `v-for`.
- Configured Vitest to use `happy-dom` for the test environment.
- Added Vue SFC shims for build-time type checking.

### Fixed

- Resolved test environment setup cleanup errors.
