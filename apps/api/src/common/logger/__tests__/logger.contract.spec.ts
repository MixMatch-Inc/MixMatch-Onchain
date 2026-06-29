import { IAppLogger, LogContext, LogLevel } from '../logger.interface';

describe('Issue #538: Logger Contract Verification Suite', () => {
  // A minimal mock implementation to prove the contract boundary works as intended
  class MockLogger implements IAppLogger {
    public logs: { level: LogLevel; msg: string; ctx: LogContext }[] = [];

    info(message: string, context: LogContext): void {
      this.logs.push({ level: LogLevel.INFO, msg: message, ctx: context });
    }
    warn(message: string, context: LogContext): void {
      this.logs.push({ level: LogLevel.WARN, msg: message, ctx: context });
    }
    error(message: string, error: Error | string, context: LogContext): void {
      this.logs.push({ level: LogLevel.ERROR, msg: `${message} - ${typeof error === 'string' ? error : error.message}`, ctx: context });
    }
  }

  it('should successfully compile and capture payloads passing through the contract parameters', () => {
    const logger: IAppLogger = new MockLogger();
    const targetCtx: LogContext = { module: 'auth', correlationId: 'tx-99182' };

    logger.info('User session tokens instantiated successfully', targetCtx);
    
    const mockInstance = logger as MockLogger;
    expect(mockInstance.logs.length).toBe(1);
    expect(mockInstance.logs[0].level).toBe(LogLevel.INFO);
    expect(mockInstance.logs[0].ctx.module).toBe('auth');
  });
});