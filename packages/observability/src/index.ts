export type MetricLabels = Record<string, string | number | boolean>;

type MetricType = 'counter' | 'gauge' | 'histogram';

interface MetricConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

interface SerializedMetric {
  lines: string[];
}

const GLOBAL_REGISTRY_KEY = '__mixmatch_metrics_registries__';

const DEFAULT_HISTOGRAM_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

const escapeLabelValue = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');

const normalizeLabels = (labelNames: string[], labels: MetricLabels = {}): Record<string, string> =>
  Object.fromEntries(
    labelNames.map((labelName) => [labelName, String(labels[labelName] ?? '')]),
  );

const serializeLabelKey = (labelNames: string[], labels: Record<string, string>): string =>
  labelNames.map((labelName) => `${labelName}:${labels[labelName] ?? ''}`).join('|');

const renderLabels = (labels: Record<string, string>): string => {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return '';
  }

  return `{${entries.map(([key, value]) => `${key}="${escapeLabelValue(value)}"`).join(',')}}`;
};

abstract class BaseMetric {
  readonly name: string;
  readonly help: string;
  readonly labelNames: string[];
  readonly type: MetricType;

  protected constructor(type: MetricType, config: MetricConfig) {
    this.type = type;
    this.name = config.name;
    this.help = config.help;
    this.labelNames = config.labelNames ?? [];
  }

  protected resolveLabels(labels?: MetricLabels): Record<string, string> {
    return normalizeLabels(this.labelNames, labels);
  }

  abstract render(): SerializedMetric;
}

class CounterMetric extends BaseMetric {
  private readonly values = new Map<string, { labels: Record<string, string>; value: number }>();

  constructor(config: MetricConfig) {
    super('counter', config);
  }

  inc(labels?: MetricLabels, value = 1): void {
    const normalizedLabels = this.resolveLabels(labels);
    const key = serializeLabelKey(this.labelNames, normalizedLabels);
    const existing = this.values.get(key);

    if (existing) {
      existing.value += value;
      return;
    }

    this.values.set(key, { labels: normalizedLabels, value });
  }

  render(): SerializedMetric {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];

    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${renderLabels(labels)} ${value}`);
    }

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    }

    return { lines };
  }
}

class GaugeMetric extends BaseMetric {
  private readonly values = new Map<string, { labels: Record<string, string>; value: number }>();

  constructor(config: MetricConfig) {
    super('gauge', config);
  }

  set(labels: MetricLabels | undefined, value: number): void {
    const normalizedLabels = this.resolveLabels(labels);
    const key = serializeLabelKey(this.labelNames, normalizedLabels);
    this.values.set(key, { labels: normalizedLabels, value });
  }

  inc(labels?: MetricLabels, value = 1): void {
    const normalizedLabels = this.resolveLabels(labels);
    const key = serializeLabelKey(this.labelNames, normalizedLabels);
    const existing = this.values.get(key);
    this.values.set(key, {
      labels: normalizedLabels,
      value: (existing?.value ?? 0) + value,
    });
  }

  dec(labels?: MetricLabels, value = 1): void {
    this.inc(labels, -value);
  }

  render(): SerializedMetric {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];

    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${renderLabels(labels)} ${value}`);
    }

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    }

    return { lines };
  }
}

class HistogramMetric extends BaseMetric {
  private readonly buckets: number[];
  private readonly values = new Map<
    string,
    {
      labels: Record<string, string>;
      counts: number[];
      sum: number;
      count: number;
    }
  >();

  constructor(config: MetricConfig & { buckets?: number[] }) {
    super('histogram', config);
    this.buckets = config.buckets ?? DEFAULT_HISTOGRAM_BUCKETS;
  }

  observe(labels: MetricLabels | undefined, value: number): void {
    const normalizedLabels = this.resolveLabels(labels);
    const key = serializeLabelKey(this.labelNames, normalizedLabels);
    const existing = this.values.get(key) ?? {
      labels: normalizedLabels,
      counts: this.buckets.map(() => 0),
      sum: 0,
      count: 0,
    };

    existing.count += 1;
    existing.sum += value;

    this.buckets.forEach((bucket, index) => {
      if (value <= bucket) {
        existing.counts[index] += 1;
      }
    });

    this.values.set(key, existing);
  }

  render(): SerializedMetric {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];

    if (this.values.size === 0) {
      this.buckets.forEach((bucket) => {
        lines.push(`${this.name}_bucket{le="${bucket}"} 0`);
      });
      lines.push(`${this.name}_bucket{le="+Inf"} 0`);
      lines.push(`${this.name}_sum 0`);
      lines.push(`${this.name}_count 0`);
      return { lines };
    }

    for (const { labels, counts, sum, count } of this.values.values()) {
      this.buckets.forEach((bucket, index) => {
        lines.push(
          `${this.name}_bucket${renderLabels({ ...labels, le: String(bucket) })} ${counts[index]}`,
        );
      });
      lines.push(`${this.name}_bucket${renderLabels({ ...labels, le: '+Inf' })} ${count}`);
      lines.push(`${this.name}_sum${renderLabels(labels)} ${sum}`);
      lines.push(`${this.name}_count${renderLabels(labels)} ${count}`);
    }

    return { lines };
  }
}

export class MetricsRegistry {
  private readonly metrics = new Map<string, BaseMetric>();

  counter(config: MetricConfig): CounterMetric {
    return this.getOrCreateMetric('counter', config) as CounterMetric;
  }

  gauge(config: MetricConfig): GaugeMetric {
    return this.getOrCreateMetric('gauge', config) as GaugeMetric;
  }

  histogram(config: MetricConfig & { buckets?: number[] }): HistogramMetric {
    return this.getOrCreateMetric('histogram', config) as HistogramMetric;
  }

  listMetricNames(): string[] {
    return Array.from(this.metrics.keys()).sort();
  }

  renderPrometheus(): string {
    return Array.from(this.metrics.values())
      .flatMap((metric) => metric.render().lines)
      .join('\n')
      .concat('\n');
  }

  private getOrCreateMetric(
    type: MetricType,
    config: MetricConfig & { buckets?: number[] },
  ): BaseMetric {
    const existing = this.metrics.get(config.name);

    if (existing) {
      if (existing.type !== type) {
        throw new Error(`Metric "${config.name}" already exists as type "${existing.type}"`);
      }
      return existing;
    }

    const metric =
      type === 'counter'
        ? new CounterMetric(config)
        : type === 'gauge'
          ? new GaugeMetric(config)
          : new HistogramMetric(config);

    this.metrics.set(config.name, metric);
    return metric;
  }
}

const getRegistryStore = (): Map<string, MetricsRegistry> => {
  const globalWithRegistry = globalThis as typeof globalThis & {
    [GLOBAL_REGISTRY_KEY]?: Map<string, MetricsRegistry>;
  };

  if (!globalWithRegistry[GLOBAL_REGISTRY_KEY]) {
    globalWithRegistry[GLOBAL_REGISTRY_KEY] = new Map<string, MetricsRegistry>();
  }

  return globalWithRegistry[GLOBAL_REGISTRY_KEY]!;
};

export const getOrCreateRegistry = (name: string): MetricsRegistry => {
  const store = getRegistryStore();
  const existing = store.get(name);

  if (existing) {
    return existing;
  }

  const registry = new MetricsRegistry();
  store.set(name, registry);
  return registry;
};

export interface MixMatchTelemetry {
  httpRequestsTotal: CounterMetric;
  httpRequestDurationMs: HistogramMetric;
  httpInFlightRequests: GaugeMetric;
  providerCallsTotal: CounterMetric;
  providerCallDurationMs: HistogramMetric;
  websocketConnections: GaugeMetric;
  outboxBacklog: GaugeMetric;
  discoveryIngestionEventsTotal: CounterMetric;
}

export const registerMixMatchTelemetry = (
  registry: MetricsRegistry,
): MixMatchTelemetry => {
  const telemetry = {
    httpRequestsTotal: registry.counter({
      name: 'mixmatch_http_requests_total',
      help: 'HTTP requests served by MixMatch services',
      labelNames: ['service', 'method', 'route', 'status'],
    }),
    httpRequestDurationMs: registry.histogram({
      name: 'mixmatch_http_request_duration_ms',
      help: 'HTTP request latency in milliseconds',
      labelNames: ['service', 'method', 'route', 'status'],
    }),
    httpInFlightRequests: registry.gauge({
      name: 'mixmatch_http_in_flight_requests',
      help: 'HTTP requests currently being processed',
      labelNames: ['service'],
    }),
    providerCallsTotal: registry.counter({
      name: 'mixmatch_provider_calls_total',
      help: 'Outbound provider calls made by MixMatch services',
      labelNames: ['service', 'provider', 'operation', 'outcome'],
    }),
    providerCallDurationMs: registry.histogram({
      name: 'mixmatch_provider_call_duration_ms',
      help: 'Outbound provider call latency in milliseconds',
      labelNames: ['service', 'provider', 'operation', 'outcome'],
    }),
    websocketConnections: registry.gauge({
      name: 'mixmatch_websocket_connections',
      help: 'Active websocket connections tracked by MixMatch services',
      labelNames: ['service'],
    }),
    outboxBacklog: registry.gauge({
      name: 'mixmatch_outbox_backlog',
      help: 'Current queued outbox jobs',
      labelNames: ['service', 'queue'],
    }),
    discoveryIngestionEventsTotal: registry.counter({
      name: 'mixmatch_discovery_ingestion_events_total',
      help: 'Discovery impression events accepted or rejected by the API',
      labelNames: ['service', 'outcome'],
    }),
  };

  return telemetry;
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  totalHits: number;
}

export interface RateLimitStore {
  consume(key: string, windowMs: number, limit: number): RateLimitResult;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  consume(key: string, windowMs: number, limit: number): RateLimitResult {
    const now = Date.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.entries.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - 1, 0),
        resetAt,
        totalHits: 1,
      };
    }

    existing.count += 1;

    return {
      allowed: existing.count <= limit,
      limit,
      remaining: Math.max(limit - existing.count, 0),
      resetAt: existing.resetAt,
      totalHits: existing.count,
    };
  }
}

export interface RateLimitRule {
  name: string;
  windowMs: number;
  max: number;
  match: (req: any) => boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
}

export interface RateLimitMiddlewareOptions {
  rules: RateLimitRule[];
  store: RateLimitStore;
}

const getRouteIdentity = (req: {
  user?: { userId?: string };
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}): string => {
  const actorId = req.user?.userId;

  if (actorId) {
    return `actor:${actorId}`;
  }

  const forwardedForHeader = req.headers?.['x-forwarded-for'];
  const forwardedFor = Array.isArray(forwardedForHeader)
    ? forwardedForHeader[0]
    : forwardedForHeader;
  const ip = forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';
  return `ip:${ip}`;
};

export const createRateLimitMiddleware = ({
  rules,
  store,
}: RateLimitMiddlewareOptions) => {
  return (req: any, res: any, next: () => void): void => {
    const rule = rules.find((candidate) => candidate.match(req));

    if (!rule || rule.skip?.(req)) {
      next();
      return;
    }

    const identity = rule.keyGenerator?.(req) ?? getRouteIdentity(req);
    const key = `${rule.name}:${identity}`;
    const result = store.consume(key, rule.windowMs, rule.max);
    const resetInSeconds = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 0);

    res.setHeader('RateLimit-Policy', `${rule.name};w=${Math.ceil(rule.windowMs / 1000)};limit=${rule.max}`);
    res.setHeader('RateLimit-Limit', String(result.limit));
    res.setHeader('RateLimit-Remaining', String(result.remaining));
    res.setHeader('RateLimit-Reset', String(resetInSeconds));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(resetInSeconds));
      res.status(429).json({
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        policy: rule.name,
      });
      return;
    }

    next();
  };
};
