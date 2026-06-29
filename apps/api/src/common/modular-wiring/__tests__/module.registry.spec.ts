import { ModuleRegistry, ISubModule, AppContext } from '../module.registry';
import { IAppLogger } from '../../logger/logger.interface';

describe('Issue #577: Modular App Wiring Isolation Suite', () => {
  let mockContext: AppContext;
  let registry: ModuleRegistry;

  beforeEach(() => {
    const mockLogger: IAppLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockContext = {
      logger: mockLogger,
      config: {},
      routerRegistry: {},
    };
    registry = new ModuleRegistry(mockContext);
  });

  it('should successfully wire up and track a valid submodule contract definition', async () => {
    const testModule: ISubModule = {
      name: 'billing',
      initialize: async (ctx) => {
        expect(ctx).toBeDefined();
      },
    };

    await registry.register(testModule);
    expect(registry.getLoadedModules()).toContain('billing');
  });

  it('should reject registrations cleanly if domain key conflicts are encountered', async () => {
    const moduleA: ISubModule = { name: 'auth-extension', initialize: async () => {} };
    const moduleB: ISubModule = { name: 'auth-extension', initialize: async () => {} };

    await registry.register(moduleA);
    await expect(registry.register(moduleB)).rejects.toThrow('Wiring conflict');
  });
});