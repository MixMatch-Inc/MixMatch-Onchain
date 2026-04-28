## Description

<!-- Provide a clear and concise description of the changes. Link to related issues. -->

**Related Issue(s):** #

**Type of Change:**
<!-- Mark with [x] -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Tests (adding missing tests or correcting existing tests)
- [ ] Build or CI/CD changes

## Testing

### Test Evidence
<!-- Provide evidence of testing. Mark with [x] and include details -->

- [ ] **Unit Tests**: All new/modified code has unit tests
  - Test file(s): <!-- list test files -->
  - Coverage: <!-- mention coverage % or key scenarios tested -->
  
- [ ] **Integration Tests**: API/database integration tests pass
  - Test file(s): <!-- list test files -->
  
- [ ] **E2E Tests**: End-to-end tests pass (if applicable)
  - Test file(s): <!-- list test files -->

### Manual Testing
<!-- Describe manual testing performed -->

**Test Steps:**
1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

**Expected Result:** <!-- What should happen -->

**Actual Result:** <!-- What actually happened -->

## Screenshots/Recordings

<!-- For UI changes, provide before/after screenshots or screen recordings -->

### Before (if applicable)
<!-- Insert screenshot/recording -->

### After
<!-- Insert screenshot/recording -->

## Affected Components

<!-- Mark all that apply with [x] -->

### Apps
- [ ] **API** (`apps/api`)
  - Endpoints affected: <!-- list endpoints -->
  - Database migrations: <!-- yes/no, describe -->
  
- [ ] **Web** (`apps/web`)
  - Pages/components affected: <!-- list pages/components -->
  
- [ ] **Mobile** (`apps/mobile`)
  - Screens/components affected: <!-- list screens/components -->
  
- [ ] **Stellar Service** (`apps/stellar-service`)
  - Services affected: <!-- list services -->

### Packages
- [ ] **Contracts** (`packages/contracts`)
  - Contracts affected: <!-- list contracts -->
  
- [ ] **Types** (`packages/types`)
  - Types affected: <!-- list types -->
  
- [ ] **Other Packages**: <!-- specify which packages -->

## Smart Contracts (if applicable)

<!-- For blockchain/Soroban contract changes -->

- [ ] **Contracts Modified**
  - Contract name(s): <!-- list contracts -->
  - Network(s): <!-- testnet/mainnet -->
  - Migration required: <!-- yes/no, describe -->
  
- [ ] **Contract Testing**
  - Unit tests added/updated: <!-- yes/no -->
  - Integration tests: <!-- yes/no -->
  - Test addresses: <!-- if applicable -->

## Database Migrations

<!-- For database schema changes -->

- [ ] **Migration Scripts**
  - Migration file(s): <!-- list migration files -->
  - Reversible: <!-- yes/no -->
  - Tested on: <!-- PostgreSQL version -->
  
- [ ] **Data Migration**
  - Data transformation required: <!-- yes/no, describe -->
  - Backwards compatible: <!-- yes/no -->

## Blind-Mode Identity Safety Verification

<!-- MixMatch supports mixed/blind identity modes. Verify identity-safety -->

- [ ] **Privacy Verification**
  - No real identity leakage in blind mode
  - Anonymous identifiers are properly generated
  - Profile data respects privacy settings
  
- [ ] **Identity Mode Testing**
  - Tested in blind mode: <!-- yes/no, describe -->
  - Tested in mixed mode: <!-- yes/no, describe -->
  - Tested identity reveal flow: <!-- yes/no, describe -->

## API Changes

<!-- For API endpoint modifications -->

### New Endpoints
- `METHOD /path/to/endpoint` - Description

### Modified Endpoints
- `METHOD /path/to/endpoint`
  - Changes: <!-- describe changes -->
  - Breaking: <!-- yes/no -->
  - Migration guide: <!-- if breaking -->

### Deprecated Endpoints
- `METHOD /path/to/endpoint`
  - Deprecation date: <!-- date -->
  - Replacement: <!-- new endpoint -->
  - Removal date: <!-- date -->

## Security Considerations

<!-- Describe any security implications -->

- [ ] **Authentication/Authorization**: Changes verified
- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **Rate Limiting**: Applied where necessary
- [ ] **Sensitive Data**: No secrets/PII in logs or responses
- [ ] **CORS**: Properly configured (if applicable)

## Performance Impact

<!-- Describe performance implications -->

- [ ] **Benchmarks**: Performance tested (if applicable)
- [ ] **Database Queries**: Optimized and indexed
- [ ] **Caching**: Implemented where appropriate
- [ ] **Bundle Size**: Impact assessed (for frontend changes)

## Documentation

- [ ] **API Documentation**: OpenAPI spec updated (`docs/openapi/v1.json`)
- [ ] **README Files**: Updated relevant README files
- [ ] **Architecture Docs**: Updated ADRs if architecture changed
- [ ] **Migration Guide**: Updated migration docs if applicable

## Follow-up Issues

<!-- List any follow-up work needed -->

- [ ] Issue # - Description
- [ ] Issue # - Description

## Checklist

<!-- Final checklist before review -->

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Additional Notes

<!-- Any additional context, concerns, or notes for reviewers -->

