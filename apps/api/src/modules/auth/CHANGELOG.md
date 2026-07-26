# Changelog - Auth Module

## [Unreleased]

### Added
- Implemented core `AuthGuard` for route execution context authorization (#689).
- Added `@Public()` decorator to allow route-level authorization bypass (#689).
- Unit test suite covering authorization headers and token verification (#689).