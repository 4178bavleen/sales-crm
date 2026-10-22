import { Router } from "express";
import { authenticateToken } from "../auth/auth.middleware.js";
import { requirePermission } from "../permission/permission.middleware.js";
import {
  createDealController,
  listDealsController,
  getDealController,
  updateDealController,
  deleteDealController,
  moveDealStageController,
  closeDealController,
  getDealOptionsController,
} from "./deal.controller.js";

const router = Router();

router.use(authenticateToken);

// Options for dropdowns (stages, owners, products, leads, customers, lost reasons)
router.get("/options", requirePermission("deals.view"), getDealOptionsController);

// List all deals, with search, filters and pagination
router.get("/", requirePermission("deals.view"), listDealsController);

// Create a deal
router.post("/", requirePermission("deals.create"), createDealController);

// Get a single deal
router.get("/:id", requirePermission("deals.view"), getDealController);

// Update a deal
router.patch("/:id", requirePermission("deals.edit"), updateDealController);

// Soft-delete a deal
router.delete("/:id", requirePermission("deals.delete"), deleteDealController);

// Move a deal to another pipeline stage
router.patch(
  "/:id/stage",
  requirePermission("deals.edit"),
  moveDealStageController,
);

// Close a deal as WON or LOST
router.patch(
  "/:id/close",
  requirePermission("deals.edit"),
  closeDealController,
);

export default router;
