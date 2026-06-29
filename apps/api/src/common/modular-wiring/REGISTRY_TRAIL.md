# Modular App Wiring Convention & Integration Trail

This directory locks down the entry boundaries for wiring isolated sprint items securely into the core monorepo application without breaking the `auth-first` workflow.

## How to Wire a New Feature Module

When building out a new domain stream (e.g., `workspace_booking`), do not write initialization boilerplate directly inside global core root files. Instead, follow this trail:

1. **Implement `ISubModule`** inside your feature sub-folder:
   ```typescript
   import { ISubModule, AppContext } from '../common/modular-wiring/module.registry';

   export class WorkspaceBookingModule implements ISubModule {
     readonly name = 'workspace_booking';

     async initialize(context: AppContext): Promise<void> {
       // Bind local routing paths cleanly using context primitives
       context.routerRegistry.add(`/workspaces`, this.getControllers());
       context.logger.info('Workspace subsystem wired smoothly into routing profiles', { module: this.name });
     }
   }