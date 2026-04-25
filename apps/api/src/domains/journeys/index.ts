/**
 * @deprecated Legacy booking system - will be replaced by event management in Sprint 2
 * @see domains/events/ and domains/payments/
 * @migrationGuide docs/migration/legacy-module-migration.md
 */
export { default as bookingsRouter } from './bookings.routes';
export { default as journeyRouter } from './journey.routes';
export { listCurrentUserBookings } from './bookings.controller';
