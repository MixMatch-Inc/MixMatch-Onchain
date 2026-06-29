import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ModuleRegistry, type ISubModule, type AppContext } from '../module.registry';
import type { IAppLogger } from '../../logger/logger.interface';

describe('ModuleRegistry', () => {
  let mockContext: AppContext;
  let registry: ModuleRegistry;

  beforeEach(() => {
    const mockLogger: IAppLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    mockContext = {
      logger: mockLogger,
      config: {},
      routerRegistry: {},
    };
    registry = new ModuleRegistry(mockContext);
  });

  it('registers and tracks a valid submodule', async () => {
    const testModule: ISubModule = {
      name: 'billing',
      initialize: async () => {},
    };

    await registry.register(testModule);

    expect(registry.getLoadedModules()).toContain('billing');
  });

  it('rejects duplicate module registrations', async () => {
    const moduleA: ISubModule = { name: 'auth-extension', initialize: async () => {} };
    const moduleB: ISubModule = { name: 'auth-extension', initialize: async () => {} };

    await registry.register(moduleA);
    await expect(registry.register(moduleB)).rejects.toThrow('Wiring conflict');
  });

  it('rejects null module', async () => {
    await expect(registry.register(null as unknown as ISubModule)).rejects.toThrow('cannot be null');
  });

  it('rejects undefined module', async () => {
    await expect(registry.register(undefined as unknown as ISubModule)).rejects.toThrow('cannot be null');
  });

  it('rejects module with empty name', async () => {
    const module: ISubModule = { name: '', initialize: async () => {} };

    await expect(registry.register(module)).rejects.toThrow('non-empty string');
  });

  it('rejects module with whitespace-only name', async () => {
    const module: ISubModule = { name: '   ', initialize: async () => {} };

    await expect(registry.register(module)).rejects.toThrow('non-empty string');
  });

  it('rejects module without initialize function', async () => {
    const module = { name: 'broken' } as ISubModule;

    await expect(registry.register(module)).rejects.toThrow('implement an initialize function');
  });

  it('handles initialize throwing an error gracefully', async () => {
    const module: ISubModule = {
      name: 'failing',
      initialize: async () => {
        throw new Error('Init failed');
      },
    };

    await expect(registry.register(module)).rejects.toThrow('Init failed');
    expect(registry.getLoadedModules()).not.toContain('failing');
  });

  it('unregisters a module by name', async () => {
    const module: ISubModule = { name: 'temp', initialize: async () => {} };

    await registry.register(module);
    registry.unregister('temp');

    expect(registry.getLoadedModules()).not.toContain('temp');
  });

  it('logs a warning when unregistering a non-existent module', () => {
    registry.unregister('non-existent');

    expect(mockContext.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not registered'),
      expect.any(Object),
    );
  });

  it('clears all registered modules', async () => {
    await registry.register({ name: 'a', initialize: async () => {} });
    await registry.register({ name: 'b', initialize: async () => {} });

    registry.clear();

    expect(registry.getLoadedModules()).toHaveLength(0);
  });

  it('checks if a module is registered', async () => {
    await registry.register({ name: 'check-me', initialize: async () => {} });

    expect(registry.hasModule('check-me')).toBe(true);
    expect(registry.hasModule('not-here')).toBe(false);
  });

  it('returns an empty list when no modules are loaded', () => {
    expect(registry.getLoadedModules()).toEqual([]);
  });
});
