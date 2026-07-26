import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to bypass the global AuthGuard for public routes.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);