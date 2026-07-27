import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logger, createChildLogger, formatContext, setLogLevel, getLogLevel } from '../logger/logger.js';
import { LogLevel, type LogContext } from '../../common/logger/logger.interface.js';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
    setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JSON output format', () => {
    it('outputs valid JSON from info()', () => {
      logger.info('test message', { module: 'test' });
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('level', 'info');
      expect(output).toHaveProperty('message', 'test message');
      expect(output).toHaveProperty('module', 'test');
    });

    it('outputs valid JSON from warn()', () => {
      logger.warn('warning', { module: 'test' });
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('level', 'warn');
      expect(output).toHaveProperty('message', 'warning');
    });

    it('outputs valid JSON from error()', () => {
      logger.error('error msg', 'something failed', { module: 'test' });
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.error.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('level', 'error');
      expect(output).toHaveProperty('message', 'error msg');
      expect(output).toHaveProperty('error');
      expect(output.error).toHaveProperty('message', 'something failed');
    });

    it('outputs valid JSON from debug()', () => {
      logger.debug?.('debug msg', { module: 'test' });
      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.debug.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('level', 'debug');
      expect(output).toHaveProperty('message', 'debug msg');
    });
  });

  describe('context propagation', () => {
    it('includes userId when provided', () => {
      logger.info('op', { module: 'auth', userId: 'u1' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('userId', 'u1');
    });

    it('includes correlationId when provided', () => {
      logger.info('op', { module: 'auth', correlationId: 'c1' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('correlationId', 'c1');
    });

    it('omits userId and correlationId when not provided', () => {
      logger.info('op', { module: 'test' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).not.toHaveProperty('userId');
      expect(output).not.toHaveProperty('correlationId');
    });

    it('passes through extra context fields', () => {
      logger.info('op', { module: 'test', customField: 'value' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('customField', 'value');
    });
  });

  describe('error serialization', () => {
    it('serializes Error objects with message, stack, and name', () => {
      const err = new Error('test error');
      logger.error('failed', err, { module: 'test' });
      const output = JSON.parse(consoleSpy.error.mock.calls[0]![0] as string);
      expect(output.error).toHaveProperty('message', 'test error');
      expect(output.error).toHaveProperty('stack');
      expect(output.error).toHaveProperty('name', 'Error');
    });

    it('serializes string errors', () => {
      logger.error('failed', 'string error', { module: 'test' });
      const output = JSON.parse(consoleSpy.error.mock.calls[0]![0] as string);
      expect(output.error).toHaveProperty('message', 'string error');
    });
  });

  describe('log level filtering', () => {
    it('suppresses debug logs in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      logger.debug?.('should not appear', { module: 'test' });
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('respects log level filtering', () => {
      setLogLevel(LogLevel.WARN);
      logger.info('should not appear', { module: 'test' });
      expect(consoleSpy.log).not.toHaveBeenCalled();
      logger.warn('should appear', { module: 'test' });
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('getLogLevel returns current level', () => {
      setLogLevel(LogLevel.ERROR);
      expect(getLogLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('message truncation', () => {
    it('truncates messages exceeding 10000 characters', () => {
      const longMsg = 'a'.repeat(10001);
      logger.info(longMsg, { module: 'test' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output.message).toContain('...[truncated]');
      expect(output.message).toBe('a'.repeat(9986) + '...[truncated]');
    });

    it('does not truncate short messages', () => {
      logger.info('short', { module: 'test' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output.message).toBe('short');
    });
  });

  describe('formatContext', () => {
    it('returns module unknown for null context', () => {
      const result = formatContext(null as unknown as LogContext);
      expect(result).toEqual({ module: 'unknown' });
    });

    it('defaults module to unknown when undefined', () => {
      const result = formatContext({ module: undefined as unknown as string });
      expect(result).toEqual({ module: 'unknown' });
    });
  });

  describe('createChildLogger', () => {
    it('creates a logger that uses the provided module name', () => {
      const child = createChildLogger('auth');
      child.info('login', { module: 'auth' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('module', 'auth');
    });

    it('merges base context with per-call context', () => {
      const child = createChildLogger('billing', { userId: 'u1' });
      child.info('charge', { correlationId: 'c1', module: 'billing' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('userId', 'u1');
      expect(output).toHaveProperty('correlationId', 'c1');
    });

    it('per-call context overrides base context', () => {
      const child = createChildLogger('svc', { userId: 'base' });
      child.info('op', { module: 'svc', userId: 'override' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('userId', 'override');
    });

    it('child logger error method serializes Error objects', () => {
      const child = createChildLogger('payments');
      child.error('fail', new Error('boom'), { module: 'payments' });
      const output = JSON.parse(consoleSpy.error.mock.calls[0]![0] as string);
      expect(output.error).toHaveProperty('message', 'boom');
      expect(output).toHaveProperty('module', 'payments');
    });

    it('child logger warn method works correctly', () => {
      const child = createChildLogger('jobs');
      child.warn('slow', { module: 'jobs' });
      const output = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string);
      expect(output).toHaveProperty('level', 'warn');
      expect(output).toHaveProperty('module', 'jobs');
    });
  });
});
