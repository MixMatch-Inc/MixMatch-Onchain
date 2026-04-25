import {
  AnalyticsEventName,
  AnalyticsEventPayloadMap,
  validateAnalyticsPayload,
} from '@mixmatch/analytics';

export interface AnalyticsProvider {
  send(event: AnalyticsEventName, payload: Record<string, unknown>): void;
}

// Placeholder provider adapter — swap for real provider (Segment, Amplitude, etc.)
const noopProvider: AnalyticsProvider = {
  send: (_event, _payload) => {
    // no-op until a real provider is wired in
  },
};

let _provider: AnalyticsProvider = noopProvider;
let _optedOut = false;
let _debug = false;

export function configureAnalytics(opts: {
  provider?: AnalyticsProvider;
  optedOut?: boolean;
  debug?: boolean;
}): void {
  if (opts.provider !== undefined) _provider = opts.provider;
  if (opts.optedOut !== undefined) _optedOut = opts.optedOut;
  if (opts.debug !== undefined) _debug = opts.debug;
}

export function dispatch<E extends AnalyticsEventName>(
  event: E,
  payload: AnalyticsEventPayloadMap[E],
): void {
  if (_optedOut) return;

  const result = validateAnalyticsPayload(event, payload as Record<string, unknown>);
  if (!result.valid) {
    throw new Error(
      `Analytics payload invalid for "${event}": missing fields [${result.missingFields.join(', ')}]`,
    );
  }

  if (_debug) {
    console.debug('[analytics]', event, payload);
  }

  _provider.send(event, payload as Record<string, unknown>);
}

// Batching hook — collects events and flushes on demand
export function createBatcher(flushFn: (events: Array<{ event: AnalyticsEventName; payload: Record<string, unknown> }>) => void) {
  const queue: Array<{ event: AnalyticsEventName; payload: Record<string, unknown> }> = [];

  return {
    enqueue<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayloadMap[E]) {
      const result = validateAnalyticsPayload(event, payload as Record<string, unknown>);
      if (!result.valid) {
        throw new Error(
          `Analytics payload invalid for "${event}": missing fields [${result.missingFields.join(', ')}]`,
        );
      }
      queue.push({ event, payload: payload as Record<string, unknown> });
    },
    flush() {
      if (queue.length === 0) return;
      flushFn([...queue]);
      queue.splice(0);
    },
    size() {
      return queue.length;
    },
  };
}
