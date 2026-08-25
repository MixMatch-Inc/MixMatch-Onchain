import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@mixmatch/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to callers whose JWT carries one of the given roles. Must be paired with `JwtAuthGuard` (runs first) and `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
