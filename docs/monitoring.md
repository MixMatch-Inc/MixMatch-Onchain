# Monitoring

The API exposes everything the SLOs in [`post-cutover-monitoring-criteria.md`](post-cutover-monitoring-criteria.md)
need, and `infra/monitoring` turns it into alerts and a dashboard.

## Metrics

`GET /metrics` (Prometheus text format, unauthenticated: expose it on the internal network only).
`prometheus_client` runs in multiprocess mode, so several uvicorn workers report one consistent
view. Set `PROMETHEUS_MULTIPROC_DIR` to a directory that is empty at container start (a tmpfs is
ideal); it defaults to a temp directory.

| Metric | Type | Use |
| --- | --- | --- |
| `http_requests_total{method,route,status}` | counter | availability, request rate |
| `http_request_duration_seconds{method,route}` | histogram | P50/P95/P99 latency |
| `sse_connections_active` | gauge | open SSE connections |
| `sse_session_duration_seconds` | histogram | mean SSE session length |
| `db_pool_connections{state}` | gauge | pool saturation |
| `db_pool_timeouts_total` | counter | pool exhaustion |
| `reconciliation_processed_total`, `reconciliation_failures_total` | counters | job failure rate |
| `reconciliation_pending_transactions`, `reconciliation_oldest_pending_age_seconds`, `reconciliation_last_run_timestamp_seconds` | gauges | backlog and heartbeat (reported by the reconciliation job via `set_reconciliation_health`) |

## Alerts and dashboards

- `infra/monitoring/alerts.rules.yml`: Prometheus rules (SLO breaches and rollback triggers).
- `infra/monitoring/prometheus.yml`, `alertmanager.yml`: sample wiring; replace the webhook URLs.
- `infra/monitoring/grafana/mixmatch-api-overview.json`: dashboard (import it, or mount it with the provisioning file).

Check the rules with `promtool check rules infra/monitoring/alerts.rules.yml`. A drill: stop the
reconciliation job (or block Horizon) and confirm `MixMatchReconciliationStalled` fires.

## Tracing and request ids

Every response carries `X-Request-ID`; the same id is in access logs, error bodies, outbound
Horizon/anchor request headers and (when tracing is on) the `request_id` span attribute. Set
`OTEL_EXPORTER_OTLP_ENDPOINT` to an OTLP/HTTP collector to enable traces (FastAPI, httpx, Vault via
`requests`, SQLAlchemy).
