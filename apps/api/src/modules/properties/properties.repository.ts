import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import type { Property } from './properties.types.js';
import {
  wrapPrismaError,
  withRetry,
  validateRequired,
  validateId,
} from '../../shared/database/repository-errors.js';

export interface CreatePropertyInput {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
}

export interface UpdatePropertyInput {
  name?: string;
  description?: string | null;
  type?: string;
  required?: boolean;
}

export interface PropertyRepository {
  findById(id: string): Promise<Property | null>;
  findByName(name: string): Promise<Property | null>;
  create(input: CreatePropertyInput): Promise<Property>;
  update(id: string, data: UpdatePropertyInput): Promise<Property>;
  delete(id: string): Promise<void>;
}

export class PrismaPropertyRepository implements PropertyRepository {
  async findById(id: string): Promise<Property | null> {
    validateId(id);
    return withRetry(async () => {
      try {
        return await prisma.property.findUnique({ where: { id } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async findByName(name: string): Promise<Property | null> {
    validateRequired({ name });
    return withRetry(async () => {
      try {
        return await prisma.property.findUnique({ where: { name } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async create(input: CreatePropertyInput): Promise<Property> {
    validateRequired({ name: input.name });
    return withRetry(async () => {
      try {
        return await prisma.property.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            type: input.type ?? 'STRING',
            required: input.required ?? false,
          },
        });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async update(id: string, data: UpdatePropertyInput): Promise<Property> {
    validateId(id);
    return withRetry(async () => {
      try {
        return await prisma.property.update({ where: { id }, data });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async delete(id: string): Promise<void> {
    validateId(id);
    return withRetry(async () => {
      try {
        await prisma.property.delete({ where: { id } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }
}

export class InMemoryPropertyRepository implements PropertyRepository {
  private readonly properties = new Map<string, Property>();

  async findById(id: string): Promise<Property | null> {
    return this.properties.get(id) ?? null;
  }

  async findByName(name: string): Promise<Property | null> {
    return [...this.properties.values()].find((p) => p.name === name) ?? null;
  }

  async create(input: CreatePropertyInput): Promise<Property> {
    const now = new Date();
    const property: Property = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      type: input.type ?? 'STRING',
      required: input.required ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.properties.set(property.id, property);
    return property;
  }

  async update(id: string, data: UpdatePropertyInput): Promise<Property> {
    const existing = this.properties.get(id);
    if (!existing) {
      throw new Error('Property not found');
    }
    const updated: Property = { ...existing, ...data, updatedAt: new Date() };
    this.properties.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.properties.has(id)) {
      throw new Error('Property not found');
    }
    this.properties.delete(id);
  }
}
