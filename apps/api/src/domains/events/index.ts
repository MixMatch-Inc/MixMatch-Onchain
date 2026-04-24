// Events domain - Event management, event bus, and outbox pattern

export { DomainEvent, DomainEventType, JourneyPublishedPayload, ResonanceCreatedPayload, DiscoveryLikedPayload, TasteSignalChangedPayload, UserPresenceChangedPayload } from './domain-events';
export { EventBus, getEventBus, resetEventBus } from './event-bus';
export { OutboxEntryModel, domainEventToOutboxEntry, outboxEntryToDomainEvent, IOutboxEntry, IOutboxEntryDocument } from './outbox.model';
export { OutboxDispatcher, getOutboxDispatcher, resetOutboxDispatcher, OutboxDispatcherConfig } from './outbox-dispatcher';
export { WebSocketGateway, WSAuthPayload, ConnectionInfo, EventEnvelope } from './websocket-gateway';
export { PresenceManager, PresenceStatus, UserPresence } from './presence-manager';
