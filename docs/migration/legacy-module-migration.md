# Legacy Module Migration Guide

## Overview

This guide helps contributors migrate from deprecated legacy modules to the new architecture being implemented in Sprint 2. All legacy modules are marked with `@deprecated` annotations and include migration guidance.

## 🚨 Deprecated Modules

### Discovery System (`domains/discovery/`)

**Status**: ❌ Deprecated - Will be removed in Sprint 3  
**Replacement**: `domains/recommendations/`  
**Migration Deadline**: End of Sprint 2

#### Current Legacy Endpoints
- `GET /api/discovery/feed` → `GET /api/v2/recommendations/feed`
- `GET /api/discovery/djs` → `GET /api/v2/recommendations/djs`
- `GET /api/discovery/djs/:id` → `GET /api/v2/profiles/:id`
- `POST /api/discovery/impressions` → `POST /api/v2/analytics/impressions`

#### Migration Steps

1. **Update API Calls**
   ```typescript
   // Legacy (deprecated)
   const response = await fetch('/api/discovery/djs?limit=20');
   
   // New (recommended)
   const response = await fetch('/api/v2/recommendations/djs?limit=20&algorithm=collaborative');
   ```

2. **Update Data Models**
   ```typescript
   // Legacy DJ Profile
   interface LegacyDjProfile {
     id: string;
     stageName: string;
     bio: string;
     // ... other fields
   }
   
   // New Profile Model
   interface UserProfile {
     id: string;
     profileType: 'dj' | 'planner' | 'fan';
     displayName: string;
     bio: string;
     // ... enhanced fields
   }
   ```

3. **Use Compatibility Wrapper (Temporary)**
   ```typescript
   import { legacyDiscoveryWrapper } from '../domains/discovery/discovery.routes';
   
   // This will show deprecation warnings but still work
   const feed = await legacyDiscoveryWrapper.getFeed(userId, options);
   ```

### Booking System (`domains/journeys/bookings/`)

**Status**: ❌ Deprecated - Will be removed in Sprint 3  
**Replacement**: `domains/events/` + `domains/payments/`  
**Migration Deadline**: End of Sprint 2

#### Current Legacy Endpoints
- `GET /api/bookings` → `GET /api/v2/events/my-events`
- `POST /api/bookings` → `POST /api/v2/events/create`
- `PUT /api/bookings/:id` → `PUT /api/v2/events/:id`
- `DELETE /api/bookings/:id` → `DELETE /api/v2/events/:id`

#### Migration Steps

1. **Event Management Migration**
   ```typescript
   // Legacy booking creation
   const booking = await Booking.create({
     planner: userId,
     dj: djId,
     eventType: 'private_party',
     eventDate: new Date('2024-06-15'),
     budget: 5000
   });
   
   // New event creation
   const event = await EventService.createEvent({
     organizerId: userId,
     participantIds: [djId],
     eventType: 'private_party',
     scheduledFor: new Date('2024-06-15'),
     budget: {
       amount: 5000,
       currency: 'USD'
     },
     paymentTerms: 'full_upfront'
   });
   ```

2. **Payment Integration**
   ```typescript
   // Legacy payment status
   interface Booking {
     paymentStatus: 'pending' | 'paid' | 'refunded';
   }
   
   // New payment system
   interface Event {
     payments: PaymentTransaction[];
     paymentStatus: PaymentStatus;
     escrow?: EscrowAccount;
   }
   ```

### Profile System (`domains/identity/user.model.ts`)

**Status**: ⚠️ Partially Deprecated  
**Replacement**: `domains/profiles/`  
**Migration Deadline**: End of Sprint 2

#### Migration Steps

1. **Profile Unification**
   ```typescript
   // Legacy separate models
   const user = await User.findById(userId);
   const djProfile = await DjProfile.findOne({ user: userId });
   
   // New unified profile
   const profile = await ProfileService.getProfile(userId, {
     include: ['dj_details', 'planner_details', 'preferences']
   });
   ```

## 🔄 Compatibility Wrappers

### Temporary Compatibility Layer

For smooth transition, compatibility wrappers are provided:

```typescript
// Discovery compatibility wrapper
import { legacyDiscoveryWrapper } from '@mixmatch/api/compatibility';

// Shows deprecation warnings but maintains functionality
const results = await legacyDiscoveryWrapper.searchDjs(criteria);

// Booking compatibility wrapper  
import { legacyBookingWrapper } from '@mixmatch/api/compatibility';

// Converts old booking calls to new event system
const booking = await legacyBookingWrapper.createBooking(bookingData);
```

### Deprecation Warnings

All deprecated modules will log warnings:

```
[DEPRECATED] Using legacy discovery feed. Use RecommendationService.getRecommendations() instead.
[DEPRECATED] Using legacy booking system. Use EventService.createEvent() instead.
```

## 📋 Migration Checklist

### Phase 1: Assessment (Week 1-2)
- [ ] Identify all usages of deprecated modules
- [ ] Document current functionality
- [ ] Plan migration strategy for each component
- [ ] Set up monitoring for deprecated endpoint usage

### Phase 2: Implementation (Week 3-4)
- [ ] Implement new recommendation engine
- [ ] Implement new event management system
- [ ] Implement unified profile system
- [ ] Create comprehensive test coverage

### Phase 3: Migration (Week 5-6)
- [ ] Update frontend to use new endpoints
- [ ] Migrate database schemas
- [ ] Update documentation
- [ ] Train team on new architecture

### Phase 4: Cleanup (Week 7-8)
- [ ] Remove deprecated modules
- [ ] Remove compatibility wrappers
- [ ] Update API documentation
- [ ] Archive old code

## 🛠️ Development Tools

### Migration Scripts

```bash
# Find all deprecated module usage
pnpm migration:find-deprecated

# Auto-migrate simple cases
pnpm migration:auto-migrate

# Validate migration completeness
pnpm migration:validate
```

### Code Analysis

```bash
# Generate deprecation report
pnpm migration:report --format=markdown

# Check for missing migrations
pnpm migration:check-completeness
```

## 📚 Resources

### Documentation
- [New Architecture Overview](../architecture/new-architecture.md)
- [API v2 Documentation](../api/v2-endpoints.md)
- [Database Schema Migration](../database/migration-guide.md)

### Examples
- [Frontend Migration Example](../examples/frontend-migration.md)
- [Backend Migration Example](../examples/backend-migration.md)
- [Test Migration Example](../examples/test-migration.md)

### Support
- Create issue: `#migration-help`
- Slack channel: `#sprint-2-migration`
- Office hours: Tuesday/Thursday 2-4 PM

## ⚠️ Breaking Changes

### API Changes
- All discovery endpoints will return 404 after Sprint 2
- Booking endpoints will redirect to event endpoints
- Profile endpoints will have new response format

### Data Model Changes
- User profiles will be unified into single collection
- Event data structure will be enhanced
- Payment information will be separated

### Authentication Changes
- New JWT claims structure
- Enhanced role-based permissions
- OAuth integration for external providers

## 🔄 Rollback Plan

If migration issues arise:

1. **Immediate Rollback**
   ```bash
   # Switch to legacy endpoints
   export USE_LEGACY_APIS=true
   
   # Restore database backup
   pnpm migration:rollback --backup=pre-migration
   ```

2. **Partial Rollback**
   ```bash
   # Rollback specific modules
   pnpm migration:rollback --module=discovery
   pnpm migration:rollback --module=bookings
   ```

3. **Emergency Procedures**
   - Hotfix releases for critical issues
   - Feature flags for gradual rollout
   - Monitoring and alerting setup

---

**Last Updated**: Sprint 1  
**Next Review**: Sprint 2 Mid-point  
**Migration Complete**: Sprint 2 End
