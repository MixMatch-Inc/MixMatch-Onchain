import { PrismaClient } from '@prisma/client';

/**
 * Single shared Prisma client instance for the application.
 * The modular monolith uses one database, so one client is sufficient.
 */
export const prisma = new PrismaClient();
