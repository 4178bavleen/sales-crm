
import { DealStatus } from "../../generated/prisma/client.js";

export class DealValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DealValidationError";
    }
}

export function parseId(value: unknown, field = "id"): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new DealValidationError(`${field} must be a positive integer`);
    }

    return id;
}

function optionalId(value: unknown, field: string): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    return parseId(value, field);
}

function optionalDate(value: unknown, field: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        throw new DealValidationError(`${field} must be a valid date`);
    }

    return date;
}

function optionalText(
    value: unknown,
    field: string,
    maxLength = 2000,
): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value !== "string") {
        throw new DealValidationError(`${field} must be a string`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
        throw new DealValidationError(
            `${field} cannot exceed ${maxLength} characters`,
        );
    }

    return text || null;
}

export interface DealInput {
    name?: string;
    leadId?: number | null;
    customerId?: number | null;
    ownerId?: number;
    productServiceId?: number | null;
    stageId?: number;
    estimatedValue?: number;
    expectedCloseDate?: Date | null;
    nextAction?: string | null;
    nextActionDueAt?: Date | null;
}

export function parseDealInput(
    body: unknown,
    isCreate = false,
): DealInput {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new DealValidationError("Request body must be an object");
    }

    const input = body as Record<string, unknown>;
    const result: DealInput = {};

    if (isCreate || input.name !== undefined) {
        if (typeof input.name !== "string" || !input.name.trim()) {
            throw new DealValidationError("Deal name is required");
        }

        if (input.name.trim().length > 200) {
            throw new DealValidationError(
                "Deal name cannot exceed 200 characters",
            );
        }

        result.name = input.name.trim();
    }

    for (const field of ["leadId", "customerId", "productServiceId"] as const) {
        const value = optionalId(input[field], field);

        if (value !== undefined) {
            result[field] = value;
        }
    }

    if (isCreate || input.ownerId !== undefined) {
        result.ownerId = parseId(input.ownerId, "ownerId");
    }

    if (isCreate || input.stageId !== undefined) {
        result.stageId = parseId(input.stageId, "stageId");
    }

    if (isCreate || input.estimatedValue !== undefined) {
        const amount = Number(input.estimatedValue);

        if (
            input.estimatedValue === "" ||
            input.estimatedValue === null ||
            input.estimatedValue === undefined ||
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            throw new DealValidationError(
                "estimatedValue must be a non-negative number",
            );
        }

        result.estimatedValue = amount;
    }

    const closeDate = optionalDate(
        input.expectedCloseDate,
        "expectedCloseDate",
    );

    if (closeDate !== undefined) result.expectedCloseDate = closeDate;

    const nextAction = optionalText(input.nextAction, "nextAction", 500);
    if (nextAction !== undefined) result.nextAction = nextAction;

    const nextActionDueAt = optionalDate(
        input.nextActionDueAt,
        "nextActionDueAt",
    );

    if (nextActionDueAt !== undefined) {
        result.nextActionDueAt = nextActionDueAt;
    }

    // Status is controlled by the dedicated close workflow.
    if (input.status !== undefined) {
        throw new DealValidationError(
            "Use the deal close endpoint to change deal status",
        );
    }

    return result;
}

export function parseDealCloseInput(body: unknown): {
    status: "WON" | "LOST";
    lostReasonId?: number | null;
    lostNote?: string | null;
    closedRevenue?: number;
} {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new DealValidationError("Request body must be an object");
    }

    const input = body as Record<string, unknown>;

    if (input.status !== DealStatus.WON && input.status !== DealStatus.LOST) {
        throw new DealValidationError("status must be WON or LOST");
    }

    const result: ReturnType<typeof parseDealCloseInput> = {
        status: input.status,
    };

    if (input.lostReasonId !== undefined) {
        result.lostReasonId = optionalId(input.lostReasonId, "lostReasonId");
    }

    if (input.lostNote !== undefined) {
        result.lostNote = optionalText(input.lostNote, "lostNote", 2000);
    }

    if (input.closedRevenue !== undefined) {
        const revenue = Number(input.closedRevenue);

        if (!Number.isFinite(revenue) || revenue < 0) {
            throw new DealValidationError(
                "closedRevenue must be a non-negative number",
            );
        }

        result.closedRevenue = revenue;
    }

    if (result.status === DealStatus.LOST && !result.lostReasonId) {
        throw new DealValidationError(
            "A loss reason is required when closing a deal as LOST",
        );
    }

    return result;
}
