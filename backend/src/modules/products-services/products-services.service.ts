
import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/database.js'
import { logAudit } from '../audit/audit.service.js'
import type {
  CreateProductServiceInput,
  UpdateProductServiceInput,
  ListProductServicesInput,
} from './products-services.validation.js'

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'ProductServiceError'
  }
}

async function ensureUniqueName(name: string, excludeId?: number) {
  const existing = await prisma.productService.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: 'insensitive',
      },
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw new ProductServiceError(
      'A product or service with this name already exists.',
      409,
    )
  }
}

export async function createProductService(
  input: CreateProductServiceInput,
  actorId?: number,
) {
  const name = input.name.trim()

  await ensureUniqueName(name)

  try {
    const item = await prisma.productService.create({
      data: {
        name,
        description: input.description ?? null,
        type: input.type,
        isActive: input.isActive,
      },
    })

    void logAudit({
      actorId: actorId ?? null,
      action: 'CREATE',
      entityType: 'PRODUCT_SERVICE',
      entityId: item.id,
      after: {
        name: item.name,
        type: item.type,
        isActive: item.isActive,
        description: item.description,
      },
    })

    return item
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ProductServiceError(
        'A product or service with this name already exists.',
        409,
      )
    }

    throw error
  }
}

export async function getProductServices(
  input: ListProductServicesInput,
) {
  const { page, limit, search, isActive, type } = input

  const where: Prisma.ProductServiceWhereInput = {
    ...(search
      ? {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : {}),
    ...(isActive !== undefined
      ? { isActive: isActive === 'true' }
      : {}),
    ...(type !== undefined ? { type } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.productService.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'desc' },
    }),
    prisma.productService.count({ where }),
  ])

  return {
    productServices: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getProductServiceById(id: number) {
  const item = await prisma.productService.findUnique({
    where: { id },
  })

  if (!item) {
    throw new ProductServiceError('Product or service not found', 404)
  }

  return item
}

export async function updateProductService(
  id: number,
  input: UpdateProductServiceInput,
  actorId?: number,
) {
  const existing = await prisma.productService.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      description: true,
    },
  })

  if (!existing) {
    throw new ProductServiceError('Product or service not found', 404)
  }

  if (input.name !== undefined) {
    await ensureUniqueName(input.name, id)
  }

  try {
    const item = await prisma.productService.update({
      where: { id },
      data: {
        ...(input.name !== undefined
          ? { name: input.name.trim() }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.type !== undefined
          ? { type: input.type }
          : {}),
        ...(input.isActive !== undefined
          ? { isActive: input.isActive }
          : {}),
      },
    })

    void logAudit({
      actorId: actorId ?? null,
      action: 'UPDATE',
      entityType: 'PRODUCT_SERVICE',
      entityId: id,
      before: {
        name: existing.name,
        type: existing.type,
        isActive: existing.isActive,
        description: existing.description,
      },
      after: {
        name: item.name,
        type: item.type,
        isActive: item.isActive,
        description: item.description,
      },
    })

    return item
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ProductServiceError(
        'A product or service with this name already exists.',
        409,
      )
    }

    throw error
  }
}

export async function deleteProductService(id: number, actorId?: number) {
  const existing = await prisma.productService.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      _count: {
        select: {
          leads: true,
          deals: true,
        },
      },
    },
  })

  if (!existing) {
    throw new ProductServiceError('Product or service not found', 404)
  }

  if (existing._count.leads > 0 || existing._count.deals > 0) {
    throw new ProductServiceError(
      'This product or service is linked to leads or deals. Deactivate it instead.',
      409,
    )
  }

  await prisma.productService.delete({ where: { id } })

  void logAudit({
    actorId: actorId ?? null,
    action: 'DELETE',
    entityType: 'PRODUCT_SERVICE',
    entityId: id,
    before: {
      name: existing.name,
      type: existing.type,
    },
  })

  return { id, deleted: true }
}
