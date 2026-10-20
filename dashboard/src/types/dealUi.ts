import type { ComponentType, SVGProps } from "react";
import type { Deal, PipelineStage } from "./deal";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the deals UI (lucide icons). */
export type DealIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only deal field rendered in the detail dialog. */
export type DealField = {
  label: string;
  Icon: DealIcon;
  get: (deal: Deal) => string;
  /** When set, the field is only rendered for these statuses. */
  onlyFor?: string[];
};

/** Flat string fields used for the CSV export. */
export type DealCsvField = {
  label: string;
  get: (deal: Deal) => string;
};

/**
 * Compact seed row:
 * [name, customer, lead, owner, product, stage, status, estimatedValue,
 *  expectedCloseDate, nextAction, wonRevenue, closedAt, lostReason, lostNote, createdAt].
 */
export type DealSeedRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  number,
  string,
  string,
  string,
  string,
];

export type DealColumn = DataTableColumn<Deal>;

export type DealDetailDialogProps = {
  deal: Deal;
  onClose: () => void;
};

/** Props for the Kanban pipeline board. */
export type PipelineBoardProps = {
  stages: PipelineStage[];
  deals: Deal[];
  onCardClick: (deal: Deal) => void;
  /** Called when a card is dropped on a column. */
  onDropDeal: (dealId: number, stageName: string) => void;
};

/** A drag-and-drop move the board is asking the page to confirm or apply. */
export type DealStageMove = {
  deal: Deal;
  toStage: PipelineStage;
};

/**
 * Confirmation prompt shown when a drag lands on a terminal column (Won/Lost).
 * Those transitions expect extra Deal columns (closedRevenue/closedAt, or
 * lostReasonId/lostNote), so the user is asked before the move is committed.
 */
export type DealMoveDialogProps = {
  move: DealStageMove;
  onCancel: () => void;
  onConfirm: (details: {
    wonRevenue: string;
    closedAt: string;
    lostReason: string;
    lostNote: string;
  }) => void;
};
