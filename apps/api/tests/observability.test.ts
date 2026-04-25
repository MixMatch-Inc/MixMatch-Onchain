import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateRegistry, registerMixMatchTelemetry } from '@mixmatch/observability';

test('metric registration is idempotent across hot reload style registry reuse', () => {
  const registryA = getOrCreateRegistry('mixmatch-api-hot-reload-test');
  const registryB = getOrCreateRegistry('mixmatch-api-hot-reload-test');

  assert.strictEqual(registryA, registryB);

  registerMixMatchTelemetry(registryA);
  registerMixMatchTelemetry(registryB);

  const metricNames = registryA.listMetricNames();

  assert.deepEqual(metricNames, [
    'mixmatch_discovery_ingestion_events_total',
    'mixmatch_http_in_flight_requests',
    'mixmatch_http_request_duration_ms',
    'mixmatch_http_requests_total',
    'mixmatch_outbox_backlog',
    'mixmatch_provider_call_duration_ms',
    'mixmatch_provider_calls_total',
    'mixmatch_websocket_connections',
  ]);
});
