import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UserRole,
  BookingStatus,
  PaymentStatus,
  DjGenre,
  AvailabilityStatus,
  EventType,
  ErrorDomain,
  ErrorCode,
  type AuthResponseDto,
  type RegisterRequestDto,
  type LoginRequestDto,
  type PaginatedResponseDto,
  type BookingSummaryDto,
  type DjDiscoveryItemDto,
} from '../src/index.js';

// ── Auth DTOs ────────────────────────────────────────────────────────────────

test('RegisterRequestDto shape', () => {
  const dto: RegisterRequestDto = {
    email: 'dj@example.com',
    password: 'secret123',
    role: UserRole.DJ,
  };
  assert.equal(typeof dto.email, 'string');
  assert.equal(typeof dto.password, 'string');
  assert.ok(Object.values(UserRole).includes(dto.role));
});

test('LoginRequestDto shape', () => {
  const dto: LoginRequestDto = { email: 'dj@example.com', password: 'secret123' };
  assert.equal(typeof dto.email, 'string');
  assert.equal(typeof dto.password, 'string');
});

test('AuthResponseDto shape', () => {
  const dto: AuthResponseDto = {
    token: 'jwt.token.here',
    user: {
      id: '1',
      name: 'DJ Test',
      email: 'dj@example.com',
      role: UserRole.DJ,
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
  assert.equal(typeof dto.token, 'string');
  assert.equal(typeof dto.user.id, 'string');
  assert.ok(Object.values(UserRole).includes(dto.user.role));
});

// ── Booking DTO ──────────────────────────────────────────────────────────────

test('BookingSummaryDto shape', () => {
  const dto: BookingSummaryDto = {
    id: 'b1',
    plannerId: 'p1',
    djId: 'd1',
    eventType: EventType.CLUB,
    eventDate: '2025-01-01',
    budget: 500,
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.NOT_STARTED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assert.ok(Object.values(BookingStatus).includes(dto.status));
  assert.ok(Object.values(PaymentStatus).includes(dto.paymentStatus));
  assert.ok(Object.values(EventType).includes(dto.eventType));
});

// ── Discovery DTO ────────────────────────────────────────────────────────────

test('DjDiscoveryItemDto shape', () => {
  const dto: DjDiscoveryItemDto = {
    id: 'd1',
    stageName: 'DJ Kool',
    genres: [DjGenre.HOUSE],
    vibeTags: ['chill'],
    pricing: { min: 100, max: 500 },
    availabilityStatus: AvailabilityStatus.AVAILABLE,
  };
  assert.ok(Array.isArray(dto.genres));
  assert.ok(dto.genres.every((g) => Object.values(DjGenre).includes(g)));
  assert.ok(Object.values(AvailabilityStatus).includes(dto.availabilityStatus));
});

// ── Pagination contract ──────────────────────────────────────────────────────

test('PaginatedResponseDto has required pagination fields', () => {
  const dto: PaginatedResponseDto<string> = {
    items: ['a', 'b'],
    page: 1,
    pageSize: 10,
    total: 2,
  };
  assert.equal(typeof dto.page, 'number');
  assert.equal(typeof dto.pageSize, 'number');
  assert.equal(typeof dto.total, 'number');
  assert.ok(Array.isArray(dto.items));
});

test('PaginatedResponseDto page starts at 1', () => {
  const dto: PaginatedResponseDto<number> = { items: [], page: 1, pageSize: 20, total: 0 };
  assert.ok(dto.page >= 1);
});

// ── Error taxonomy ───────────────────────────────────────────────────────────

test('ErrorDomain covers all expected domains', () => {
  const expected = [
    'AUTH', 'PROVIDER_SYNC', 'AUDIO_PREVIEW', 'ANONYMITY_REVEAL',
    'COMPATIBILITY_SCORING', 'MESSAGING_UNLOCK', 'EVENT_PARTICIPATION',
    'STELLAR_PAYMENT', 'INFRASTRUCTURE', 'VALIDATION',
  ];
  for (const domain of expected) {
    assert.ok(
      Object.values(ErrorDomain).includes(domain as ErrorDomain),
      `Missing domain: ${domain}`,
    );
  }
});

test('Auth ErrorCodes follow AUTH_xxx pattern', () => {
  const authCodes = Object.entries(ErrorCode)
    .filter(([k]) => k.startsWith('AUTH_'))
    .map(([, v]) => v);
  assert.ok(authCodes.length > 0);
  for (const code of authCodes) {
    assert.match(code, /^AUTH_\d{3}$/);
  }
});

test('ErrorCode values are unique', () => {
  const values = Object.values(ErrorCode);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate ErrorCode values detected');
});
