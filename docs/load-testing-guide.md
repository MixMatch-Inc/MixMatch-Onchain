# FastAPI Backend Load Testing Guide

## Running Locust Load Tests
To execute the load test suite against local or staging environment:
```bash
pip install locust
locust -f loadtests/locustfile.py --host=http://localhost:8000
```
Or in headless mode:
```bash
locust -f loadtests/locustfile.py --headless -u 100 -r 10 -t 1m --host=http://localhost:8000
```

## Performance Criteria
- **P95 Latency**: < 50ms for \`/health\` and \`/api/taste/health\`
- **P95 Latency**: < 150ms for \`/api/payments/history\`
- **Error Rate**: 0.00% under 100 concurrent simulated users
