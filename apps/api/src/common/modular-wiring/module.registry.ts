import { IAppLogger } from '../logger/logger.interface';

/**
 * Signature wrapper representing the baseline application context 
 * exposed to modules during the bootstrap wiring phase.
 */
export interface AppContext {
  logger: IAppLogger;
  config: Record<string, unknown>;
  routerRegistry: unknown;
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
   * Validates module integrity before wiring to prevent silent failures.
   */
  async register(module: ISubModule): Promise<void> {
    if (!module) {
      throw new Error('Wiring failure: Module cannot be null or undefined.');
    }

    if (!module.name || typeof module.name !== 'string' || module.name.trim().length === 0) {
      throw new Error('Wiring failure: Module name must be a non-empty string.');
    }

    if (typeof module.initialize !== 'function') {
      throw new Error(`Wiring failure: Module '${module.name}' must implement an initialize function.`);
    }

    if (this.registeredModules.has(module.name)) {
      throw new Error(`Wiring conflict: Module '${module.name}' is already registered.`);
    }

    this.context.logger.info(`Wiring domain module boundary: [${module.name}]`, { module: 'core' });

    try {
      await module.initialize(this.context);
    } catch (error) {
      this.context.logger.error(
        `Wiring failure: Module '${module.name}' initialize threw an error`,
        error instanceof Error ? error : new Error(String(error)),
        { module: 'core' },
      );
      throw error;
    }

    this.registeredModules.set(module.name, module);
  }

  /**
   * Retrieves a defensive copy of all currently active feature names.
   */
  getLoadedModules(): string[] {
    return Array.from(this.registeredModules.keys());
  }

  /**
   * Removes a previously registered module from the registry.
   */
  unregister(name: string): void {
    if (!this.registeredModules.has(name)) {
      this.context.logger.warn(`Unregister skipped: Module '${name}' is not registered.`, { module: 'core' });
      return;
    }
    this.registeredModules.delete(name);
    this.context.logger.info(`Module '${name}' unregistered.`, { module: 'core' });
  }

  /**
   * Removes all registered modules from the registry.
   */
  clear(): void {
    const count = this.registeredModules.size;
    this.registeredModules.clear();
    this.context.logger.info(`Registry cleared: ${count} module(s) removed.`, { module: 'core' });
  }

  /**
   * Checks if a module is registered.
   */
  hasModule(name: string): boolean {
    return this.registeredModules.has(name);
  }
}