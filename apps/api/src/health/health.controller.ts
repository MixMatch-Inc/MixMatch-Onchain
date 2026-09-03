import { Controller, Get } from '@nestjs/common';

/**
 * #921: Lightweight health-check endpoint.
 *
 * GET /health → 200 { status: "ok", timestamp: "..." }
 *
 * Suitable for use as an ECS/K8s liveness probe or an ALB/load-balancer
 * health check. No authentication required so the probe does not need a
 * token. If the process is alive and the event loop is not blocked, this
 * returns successfully.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
