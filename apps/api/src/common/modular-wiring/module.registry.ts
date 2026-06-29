import { IAppLogger } from '../logger/logger.interface';

/**
 * Signature wrapper representing the baseline application context 
 * exposed to modules during the bootstrap wiring phase.
 */
export interface AppContext {
  logger: IAppLogger;
  config: Record<string, any>;
  routerRegistry: any; // Binds to the current central routing gateway
}

/**
 * Clean structural interface that every feature module must implement 
 * to wire itself into adjacent systems.
 */
export interface ISubModule {
  readonly name: string;
  /**
   * Primary entry hook called during application initialization.
   * Handles registering local controllers, interceptors, and services.
   */
  initialize(context: AppContext): Promise<void>;
}

/**
 * Central orchestrator managing the collection and registration lifecycles
 * of isolated features within the auth-first monorepo foundation.
 */
export class ModuleRegistry {
  private registeredModules: Map<string, ISubModule> = new Map();

  constructor(private readonly context: AppContext) {}

  /**
   * Registers and bootstraps a functional submodule sub-context.
   */
  async register(module: ISubModule): Promise<void> {
    if (this.registeredModules.has(module.name)) {
      throw new Error(`Wiring conflict: Module '${module.name}' is already registered.`);
    }

    this.context.logger.info(`Wiring domain module boundary: [${module.name}]`, { module: 'core' });
    await module.initialize(this.context);
    this.registeredModules.set(module.name, module);
  }

  /**
   * Retrieves a verified list of all currently active features.
   */
  getLoadedModules(): string[] {
    return Array.from(this.registeredModules.keys());
  }
}