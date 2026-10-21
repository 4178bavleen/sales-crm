
import { Prisma, DealStatus, StageKind } from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";
import type { DealInput } from "./deal.validation.js";
import { DealValidationError } from "./deal.validation.js";

const dealInclude = {
    owner: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    lead: {
        select: { id: true, contactName: true, companyName: true },
    },
    customer: {
        select: { id: true, companyId: true, primaryContactId: true },
    },
    productService: { select: { id: true, name: true } },
    stage: { select: { id: true, name: true, position: true, kind: true } },
    lostReason: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

export async function validateDealReferences(
    data: DealInput,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
    if (data.ownerId !== undefined) {
        const owner = await tx.user.findFirst({
            where: {
                id: data.ownerId,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!owner) throw new DealValidationError("Active deal owner not found");
    }

    if (data.leadId) {
        const lead = await tx.lead.findFirst({
            where: { id: data.leadId, deletedAt: null },
            select: { id: true },
        });

        if (!lead) throw new DealValidationError("Lead not found");
    }

    if (data.customerId) {
        const customer = await tx.customer.findFirst({
            where: { id: data.customerId, deletedAt: null },
            select: { id: true },
        });

        if (!customer) throw new DealValidationError("Customer not found");
    }

    if (data.productServiceId) {
        const product = await tx.productService.findFirst({
            where: { id: data.productServiceId, isActive: true },
            select: { id: true },
        });

        if (!product) {
            throw new DealValidationError("Active product/service not found");
        }
    }

    if (data.stageId !== undefined) {
        const stage = await tx.pipelineStage.findFirst({
            where: { id: data.stageId, isActive: true },
            select: { id: true, kind: true },
        });

        if (!stage) {
            throw new DealValidationError("Active pipeline stage not found");
        }

        if (stage.kind !== StageKind.OPEN) {
            throw new DealValidationError(
                "New and updated deals must use an OPEN pipeline stage",
            );
        }
    }
}

export async function createDeal(
    data: DealInput,
    createdById: number,
) {
    if (
        data.name === undefined ||
        data.ownerId === undefined ||
        data.stageId === undefined ||
        data.estimatedValue === undefined
    ) {
        throw new DealValidationError(
            "Name, owner, stage and estimated value are required",
        );
    }

    return prisma.$transaction(async (tx) => {
        await validateDealReferences(data, tx);

        const deal = await tx.deal.create({
            data: {
                name: data.name!,
                ownerId: data.ownerId!,
                createdById,
                stageId: data.stageId!,
                estimatedValue: new Prisma.Decimal(data.estimatedValue!),
                leadId: data.leadId ?? null,
                customerId: data.customerId ?? null,
                productServiceId: data.productServiceId ?? null,
                expectedCloseDate: data.expectedCloseDate ?? null,
                nextAction: data.nextAction ?? null,
                nextActionDueAt: data.nextActionDueAt ?? null,
            },
            include: dealInclude,
        });

        await tx.dealStageHistory.create({
            data: {
                dealId: deal.id,
                fromStageId: null,
                toStageId: deal.stageId,
                changedById: createdById,
                note: "Deal created",
            },
        });

        await tx.auditLog.create({
            data: {
                actorId: createdById,
                action: "CREATE",
                entityType: "DEAL",
                entityId: deal.id,
                after: {
                    name: deal.name,
                    stageId: deal.stageId,
                    estimatedValue: deal.estimatedValue.toString(),
                },
            },
        });

        return deal;
    });
}

export interface ListDealsFilters {
    search?: string;
    stageId?: number;
    ownerId?: number;
    status?: DealStatus;
    expectedCloseFrom?: Date;
    expectedCloseTo?: Date;
    page?: number;
    limit?: number;
}

export async function listDeals(filters: ListDealsFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: Prisma.DealWhereInput = {
        deletedAt: null,
        ...(filters.stageId !== undefined && { stageId: filters.stageId }),
        ...(filters.ownerId !== undefined && { ownerId: filters.ownerId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
            OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                {
                    lead: {
                        is: {
                            contactName: {
                                contains: filters.search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ],
        }),
        ...((filters.expectedCloseFrom || filters.expectedCloseTo) && {
            expectedCloseDate: {
                ...(filters.expectedCloseFrom && {
                    gte: filters.expectedCloseFrom,
                }),
                ...(filters.expectedCloseTo && {
                    lte: filters.expectedCloseTo,
                }),
            },
        }),
    };

    const [items, total] = await prisma.$transaction([
        prisma.deal.findMany({
            where,
            include: dealInclude,
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.deal.count({ where }),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getDealById(id: number) {
    const deal = await prisma.deal.findFirst({
        where: { id, deletedAt: null },
        include: {
            ...dealInclude,
            stageHistory: {
                orderBy: { changedAt: "desc" },
                include: {
                    fromStage: { select: { id: true, name: true } },
                    toStage: { select: { id: true, name: true } },
                    changedBy: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!deal) throw new DealValidationError("Deal not found");

    return deal;
}

export async function updateDeal(
    id: number,
    data: DealInput,
    actorId: number,
) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.deal.findFirst({
            where: { id, deletedAt: null },
        });

        if (!existing) throw new DealValidationError("Deal not found");

        if (existing.status !== DealStatus.OPEN) {
            throw new DealValidationError(
                "Closed deals cannot be edited through this endpoint",
            );
        }

        await validateDealReferences(data, tx);

        const updateData: Prisma.DealUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.ownerId !== undefined) {
            updateData.owner = { connect: { id: data.ownerId } };
        }
        if (data.stageId !== undefined) {
            updateData.stage = { connect: { id: data.stageId } };
        }
        if (data.leadId !== undefined) {
            updateData.lead = data.leadId
                ? { connect: { id: data.leadId } }
                : { disconnect: true };
        }
        if (data.customerId !== undefined) {
            updateData.customer = data.customerId
                ? { connect: { id: data.customerId } }
                : { disconnect: true };
        }
        if (data.productServiceId !== undefined) {
            updateData.productService = data.productServiceId
                ? { connect: { id: data.productServiceId } }
                : { disconnect: true };
        }
        if (data.estimatedValue !== undefined) {
            updateData.estimatedValue = new Prisma.Decimal(data.estimatedValue);
        }
        if (data.expectedCloseDate !== undefined) {
            updateData.expectedCloseDate = data.expectedCloseDate;
        }
        if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;
        if (data.nextActionDueAt !== undefined) {
            updateData.nextActionDueAt = data.nextActionDueAt;
        }

        if (data.stageId !== undefined && data.stageId !== existing.stageId) {
            await tx.dealStageHistory.create({
                data: {
                    dealId: id,
                    fromStageId: existing.stageId,
                    toStageId: data.stageId,
                    changedById: actorId,
                    note: "Stage changed while updating deal",
                },
            });

            updateData.stageEnteredAt = new Date();
        }

        const updated = await tx.deal.update({
            where: { id },
            data: updateData,
            include: dealInclude,
        });

        await tx.auditLog.create({
            data: {
                actorId,
                action: "UPDATE",
                entityType: "DEAL",
                entityId: id,
                before: {
                    name: existing.name,
                    stageId: existing.stageId,
                    status: existing.status,
                },
                after: {
                    name: updated.name,
                    stageId: updated.stageId,
                    status: updated.status,
                },
            },
        });

        return updated;
    });
}

export async function softDeleteDeal(id: number, actorId: number) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.deal.findFirst({
            where: { id, deletedAt: null },
        });

        if (!existing) throw new DealValidationError("Deal not found");

        if (existing.status !== DealStatus.OPEN) {
            throw new DealValidationError("Closed deals cannot be deleted");
        }

        const deletedAt = new Date();

        const deal = await tx.deal.update({
            where: { id },
            data: { deletedAt },
        });

        await tx.auditLog.create({
            data: {
                actorId,
                action: "DELETE",
                entityType: "DEAL",
                entityId: id,
                before: { name: existing.name, status: existing.status },
                after: { deletedAt: deletedAt.toISOString() },
            },
        });

        return deal;
    });
}
