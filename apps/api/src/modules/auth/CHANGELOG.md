# Changelog - Auth Module

## [Unreleased]

### Added
- Implemented core `AuthGuard` for route execution context authorization (#689).
- Added `@Public()` decorator to allow route-level authorization bypass (#689).
- Unit test suite covering authorization headers and token verification (#689).

# Changelog - Auth Module

## [Unreleased]

### Added
- Comprehensive regression test suite for `AuthGuard` covering happy paths, missing headers, malformed Bearer schemes, and expired tokens (#690).

# Changelog - Auth Module

## [Unreleased]

### Changed
- Hardened `AuthGuard` against null byte injections, whitespace edge cases, and malformed header inputs (#691).

### Fixed
- Added operational fault isolation to throw `503 Service Unavailable` on transient database/service verification failures without leaking internal stack traces (#691).