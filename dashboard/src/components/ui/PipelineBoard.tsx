import { useState } from "react";
import { CircleDollarSign, GripVertical, ListChecks } from "lucide-react";
import type { PipelineBoardProps } from "../../types/dealUi";
import type { StageKind } from "../../types/deal";
import { formatCurrency, formatDealDate } from "../../data/dealColumns";

/** Column header accent per StageKind, so Won/Lost read differently from Open. */
const kindAccent: Record<StageKind, string> = {
  OPEN: "border-slate-300",
  WON: "border-emerald-400",
  LOST: "border-rose-400",
};

/** Highlight applied to the column currently being dragged over. */
const dropActiveClass = "border-blue-400 bg-blue-50/60 ring-1 ring-blue-200";

/**
 * Kanban board of deals grouped by PipelineStage, with drag-and-drop.
 *
 * Columns come from the `pipeline_stages` table and render in `position` order;
 * a stage with no deals still renders, because an empty stage is real pipeline
 * information. Totals are pipeline value (sum of Deal.estimatedValue), not
 * revenue — same distinction the schema makes.
 *
 * Dragging a card onto a column calls `onDropDeal` with the target stage name;
 * the page owns the actual state change (and any confirmation for terminal
 * Won/Lost transitions), so this component stays presentational.
 */
export default function PipelineBoard({
  stages,
  deals,
  onCardClick,
  onDropDeal,
}: PipelineBoardProps) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  // The card being dragged (id) and the column currently hovered.
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden p-4">
      {ordered.map(stage => {
        const stageDeals = deals.filter(deal => deal.stage === stage.name);
        const stageValue = stageDeals.reduce(
          (sum, deal) => sum + deal.estimatedValue,
          0,
        );
        const isOver = overStage === stage.name;

        return (
          <div
            key={stage.id}
            data-stage={stage.name}
            onDragOver={event => {
              // preventDefault is what makes a drop target valid.
              event.preventDefault();
              if (overStage !== stage.name) setOverStage(stage.name);
            }}
            onDragLeave={event => {
              // Ignore bubbling from children still inside this column.
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setOverStage(current => (current === stage.name ? null : current));
              }
            }}
            onDrop={event => {
              event.preventDefault();
              const raw = event.dataTransfer.getData("text/deal-id");
              const dealId = Number(raw);
              setOverStage(null);
              setDraggingId(null);
              if (Number.isFinite(dealId) && dealId > 0) {
                onDropDeal(dealId, stage.name);
              }
            }}
            className={`flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-slate-50 transition ${
              isOver ? dropActiveClass : "border-slate-200"
            }`}
          >
            {/* Column header: name, count, pipeline total */}
            <div
              className={`shrink-0 border-t-2 bg-white px-3 py-2.5 ${kindAccent[stage.kind]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-xs font-semibold text-slate-700">
                  {stage.name}
                </h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                  {stageDeals.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {formatCurrency(stageValue)}
              </p>
            </div>

            {/* Cards */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {stageDeals.map(deal => (
                <div
                  key={deal.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.setData("text/deal-id", String(deal.id));
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(deal.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStage(null);
                  }}
                  onClick={() => onCardClick(deal)}
                  onKeyDown={event => {
                    // Keyboard/accessibility equivalent of the click.
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCardClick(deal);
                    }
                  }}
                  className={`cursor-grab rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:shadow-sm active:cursor-grabbing ${
                    draggingId === deal.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical
                      size={13}
                      className="mt-0.5 shrink-0 text-slate-300"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {deal.name}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {deal.customer || "No customer"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <CircleDollarSign size={12} className="text-slate-400" />
                      {formatCurrency(deal.estimatedValue)}
                    </span>
                    <span className="truncate text-[10px] text-slate-400">
                      {deal.owner}
                    </span>
                  </div>

                  {deal.nextAction && (
                    <p className="mt-2 flex items-start gap-1.5 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <ListChecks size={11} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{deal.nextAction}</span>
                    </p>
                  )}

                  {deal.expectedCloseDate && (
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Expected {formatDealDate(deal.expectedCloseDate)}
                    </p>
                  )}
                </div>
              ))}

              {stageDeals.length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-slate-400">
                  {isOver ? "Drop here" : "No deals in this stage"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
