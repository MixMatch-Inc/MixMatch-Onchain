// Dummy env vars so `ConfigModule.forRoot({ validate: validateEnv })` doesn't
// throw during e2e bootstrap. `DATABASE_URL` doesn't need to point at a real,
// reachable database for these tests — the `postgres` client connects lazily,
// so app.init() succeeds without a live connection as long as no test query runs.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgres://mixmatch:mixmatch_password@localhost:5432/mixmatch_test';
process.env.JWT_SECRET ??= 'e2e-test-secret-do-not-use-in-production-abcdefgh';
process.env.WALLET_ENCRYPTION_KEY ??= '0'.repeat(64);
