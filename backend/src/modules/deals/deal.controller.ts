import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { DealStatus } from "../../generated/prisma/client.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import {
  createDeal,
  listDeals,
  getDealById,
  updateDeal,
  softDeleteDeal,
  moveDealStage,
  closeDeal,
  getDealOptions,
} from "./deal.service.js";
import {
  DealValidationError,
  parseDealInput,
  parseDealCloseInput,
} from "./deal.validation.js";

function parsePositiveId(
  value: string | string[] | undefined,
): number | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleDealControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof DealValidationError) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  next(error);
}

export async function getDealOptionsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const options = await getDealOptions();

    res.status(200).json({
      success: true,
      message: "Deal options retrieved successfully",
      data: options,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function createDealController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const input = parseDealInput(req.body, true);
    const deal = await createDeal(input, req.user.id);

    res.status(201).json({
      success: true,
      message: "Deal created successfully",
      data: deal,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function listDealsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const parseQueryId = (value: unknown): number | undefined => {
      if (typeof value !== "string" || value.trim() === "") {
        return undefined;
      }

      const id = Number(value);

      if (!Number.isInteger(id) || id <= 0) {
        throw new DealValidationError("Invalid numeric filter");
      }

      return id;
    };

    const parseDateFilter = (value: unknown): Date | undefined => {
      if (typeof value !== "string" || value.trim() === "") {
        return undefined;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        throw new DealValidationError("Invalid date filter");
      }

      return date;
    };

    const statusValue =
      typeof req.query.status === "string" ? req.query.status : undefined;

    if (
      statusValue !== undefined &&
      !Object.values(DealStatus).includes(statusValue as DealStatus)
    ) {
      throw new DealValidationError("Invalid deal status");
    }

    const page = parseQueryId(req.query.page) ?? 1;
    const limit = parseQueryId(req.query.limit) ?? 20;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new DealValidationError(
        "Page must be positive and limit must be between 1 and 100",
      );
    }

    const deals = await listDeals({
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      stageId: parseQueryId(req.query.stageId),
      ownerId: parseQueryId(req.query.ownerId),
      status: statusValue as DealStatus | undefined,
      expectedCloseFrom: parseDateFilter(req.query.expectedCloseFrom),
      expectedCloseTo: parseDateFilter(req.query.expectedCloseTo),
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: "Deals retrieved successfully",
      data: deals,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function getDealController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const id = parsePositiveId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
      return;
    }

    const deal = await getDealById(id);

    if (!deal) {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Deal retrieved successfully",
      data: deal,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function updateDealController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const id = parsePositiveId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
      return;
    }

    const input = parseDealInput(req.body, false);
    const deal = await updateDeal(id, input, req.user.id);

    if (!deal) {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Deal updated successfully",
      data: deal,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function deleteDealController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const id = parsePositiveId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
      return;
    }

    const deal = await softDeleteDeal(id, req.user.id);

    if (!deal) {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Deal deleted successfully",
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function moveDealStageController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const dealId = parsePositiveId(req.params.id);
    const stageId = Number(req.body?.stageId);
    const note = req.body?.note;

    if (!dealId || !Number.isInteger(stageId) || stageId <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid deal ID and stageId are required",
      });
      return;
    }

    if (note !== undefined && typeof note !== "string") {
      res.status(400).json({
        success: false,
        message: "Note must be a string",
      });
      return;
    }

    const deal = await moveDealStage(
      dealId,
      stageId,
      req.user.id,
      note as string | undefined,
    );

    res.status(200).json({
      success: true,
      message: "Deal stage updated successfully",
      data: deal,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}

export async function closeDealController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const dealId = parsePositiveId(req.params.id);

    if (!dealId) {
      res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
      return;
    }

    const input = parseDealCloseInput(req.body);
    const deal = await closeDeal(dealId, req.user.id, input);

    res.status(200).json({
      success: true,
      message: `Deal closed as ${input.status}`,
      data: deal,
    });
  } catch (error) {
    handleDealControllerError(error, res, next);
  }
}