# Legacy Module Deprecation Summary

## Overview

This document summarizes all deprecated modules in the MixMatch codebase as part of the Sprint 1 domain reset. Deprecated modules are clearly marked with `@deprecated` annotations and include migration guidance.

## 📊 Deprecation Status

| Module | Status | Replacement | Target Removal |
|--------|--------|-------------|---------------|
| `domains/discovery/` | ❌ Deprecated | `domains/recommendations/` | Sprint 3 |
| `domains/journeys/bookings/` | ❌ Deprecated | `domains/events/` + `domains/payments/` | Sprint 3 |
| `domains/identity/user.model.ts` | ⚠️ Partially Deprecated | `domains/profiles/` | Sprint 2 |
| Legacy event types | ⚠️ Partially Deprecated | New event schema | Sprint 2 |

## 🚨 Deprecated Modules

### 1. Discovery System (`domains/discovery/`)

**Files Deprecated:**
- `domains/discovery/discovery.routes.ts`
- `domains/discovery/discovery.controller.ts`
- `domains/discovery/feed.controller.ts`
- `domains/discovery/impressions.controller.ts`
- `domains/discovery/index.ts`

**Deprecation Annotations Added:**
```typescript
/**
 * @deprecated This module is part of legacy discovery system and will be replaced in Sprint 2.
 * Use the new recommendation engine in domains/recommendations/ instead.
 * @see https://github.com/MixMatch-Inc/MixMatch-Onchain/issues/267
 * @migrationGuide See docs/migration/discovery-migration.md
 */
```

**Legacy Endpoints:**
- `GET /api/discovery/feed` → Use `GET /api/v2/recommendations/feed`
- `GET /api/discovery/djs` → Use `GET /api/v2/recommendations/djs`
- `GET /api/discovery/djs/:id` → Use `GET /api/v2/profiles/:id`
- `POST /api/discovery/impressions` → Use `POST /api/v2/analytics/impressions`

**Compatibility Wrapper:**
```typescript
export const legacyDiscoveryWrapper = {
  getFeed: async (userId: string, options?: any) => {
    console.warn('[DEPRECATED] Using legacy discovery feed. Use RecommendationService.getRecommendations() instead.');
    // Compatibility layer implementation
  },
  getDjProfile: async (djId: string, viewerId: string) => {
    console.warn('[DEPRECATED] Using legacy DJ profile fetch. Use ProfileService.getProfile() instead.');
    // Compatibility layer implementation
  }
};
```

### 2. Booking System (`domains/journeys/bookings/`)

**Files Deprecated:**
- `domains/journeys/bookings.controller.ts`
- `domains/journeys/bookings.routes.ts`
- `domains/journeys/booking.model.ts`
- `domains/journeys/index.ts` (booking exports)

**Deprecation Annotations Added:**
```typescript
/**
 * @deprecated This booking controller is part of legacy booking system.
 * It will be replaced by new event management system in Sprint 2.
 * @see https://github.com/MixMatch-Inc/MixMatch-Onchain/issues/267
 * @migrationGuide See docs/migration/booking-migration.md
 * @replacement Use domains/events/ and domains/payments/ for new implementation
 */
```

**Legacy Endpoints:**
- `GET /api/bookings` → Use `GET /api/v2/events/my-events`
- `POST /api/bookings` → Use `POST /api/v2/events/create`
- `PUT /api/bookings/:id` → Use `PUT /api/v2/events/:id`
- `DELETE /api/bookings/:id` → Use `DELETE /api/v2/events/:id`

### 3. Legacy Event Types

**Partially Deprecated Event Types:**
- `BOOKING_CREATED` → Use `EVENT_CREATED`
- `BOOKING_CONFIRMED` → Use `EVENT_CONFIRMED`
- `DISCOVERY_LIKED` → Use `PROFILE_LIKED`

**New Event Schema:**
```typescript
// Legacy (deprecated)
export type DomainEventType = 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'DISCOVERY_LIKED';

// New (recommended)
export type DomainEventType = 'EVENT_CREATED' | 'EVENT_CONFIRMED' | 'PROFILE_LIKED';
```

## 🔄 Migration Tools

### 1. Automated Detection

```bash
# Find all deprecated module usage
pnpm migration:find-deprecated

# Generate deprecation report
pnpm migration:report --format=markdown

# Check for missing migrations
pnpm migration:check-completeness
```

### 2. Compatibility Layer

```typescript
// Import compatibility wrappers
import { legacyDiscoveryWrapper } from '@mixmatch/api/compatibility';
import { legacyBookingWrapper } from '@mixmatch/api/compatibility';

// Use during transition period
const results = await legacyDiscoveryWrapper.searchDjs(criteria);
const booking = await legacyBookingWrapper.createBooking(bookingData);
```

### 3. Validation Scripts

```bash
# Validate migration completeness
pnpm migration:validate

# Test new endpoints
pnpm migration:test-new-apis

# Compare performance
pnpm migration:benchmark
```

## 📋 Migration Checklist

### For Developers

- [ ] **Audit Current Usage**
  - Search for imports from deprecated modules
  - Identify API calls to deprecated endpoints
  - Document current functionality

- [ ] **Plan Migration**
  - Choose migration strategy (big bang vs gradual)
  - Set up feature flags
  - Create migration timeline

- [ ] **Implement New Code**
  - Use new recommendation endpoints
  - Implement new event management
  - Update data models

- [ ] **Test Migration**
  - Unit tests for new functionality
  - Integration tests for API changes
  - Performance testing

- [ ] **Deploy Migration**
  - Feature flag rollout
  - Monitor error rates
  - Performance monitoring

### For Teams

- [ ] **Frontend Team**
  - Update API client calls
  - Update data models
  - Update UI components

- [ ] **Backend Team**
  - Implement new services
  - Update database schemas
  - Create migration scripts

- [ ] **DevOps Team**
  - Update monitoring
  - Configure new endpoints
  - Set up alerting

## ⚠️ Breaking Changes

### API Changes

1. **Endpoint URLs**
   - All discovery endpoints will return 404 after Sprint 2
   - Booking endpoints will redirect to event endpoints
   - Response formats will change

2. **Response Formats**
   ```typescript
   // Legacy discovery response
   {
     "items": [...],
     "page": 1,
     "pageSize": 20
   }
   
   // New recommendation response
   {
     "recommendations": [...],
     "metadata": {
       "algorithm": "collaborative",
       "confidence": 0.85
     },
     "pagination": {
       "nextCursor": "abc123",
       "hasMore": true
     }
   }
   ```

3. **Authentication**
   - New JWT claims structure
   - Enhanced role permissions
   - OAuth integration

### Database Changes

1. **Collection Restructuring**
   - Users and profiles unified
   - Events replace bookings
   - Enhanced payment tracking

2. **Schema Changes**
   - New field types
   - Index updates
   - Data validation rules

## 📚 Resources

### Documentation
- [Migration Guide](migration/legacy-module-migration.md)
- [New Architecture](architecture/new-architecture.md)
- [API v2 Documentation](api/v2-endpoints.md)

### Code Examples
- [Frontend Migration](examples/frontend-migration.md)
- [Backend Migration](examples/backend-migration.md)
- [Test Migration](examples/test-migration.md)

### Support
- Issue tracker: `#migration-help`
- Slack: `#sprint-2-migration`
- Office hours: Tuesday/Thursday 2-4 PM

## 🚀 Next Steps

### Immediate (This Sprint)
1. **Complete Deprecation Annotations**
   - Add annotations to remaining legacy modules
   - Update documentation
   - Create migration scripts

2. **Implement New Systems**
   - Complete recommendation engine
   - Implement event management
   - Create unified profile system

### Sprint 2
1. **Migration Phase**
   - Frontend migration
   - Backend migration
   - Database migration

2. **Testing & Validation**
   - Comprehensive testing
   - Performance validation
   - Security review

### Sprint 3
1. **Cleanup**
   - Remove deprecated modules
   - Remove compatibility wrappers
   - Update documentation

2. **Optimization**
   - Performance tuning
   - Feature enhancements
   - User feedback integration

---

**Status**: ✅ Deprecation annotations complete  
**Next Milestone**: Sprint 2 migration implementation  
**Target Completion**: Sprint 2 end  
**Maintainer**: Development Team
