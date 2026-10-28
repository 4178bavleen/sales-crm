import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  IndianRupee,
  GripVertical,
  ListChecks,
  Building2,
  Calendar,
  Users,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import type { PipelineBoardProps } from "../../types/dealUi";
import type { StageKind, Deal } from "../../types/deal";
import { formatCurrency, formatDealDate } from "../../columns/dealColumns";

/** Column accent color per StageKind */
const stageBadgeColor: Record<StageKind, { dot: string; bg: string; text: string; border: string }> = {
  OPEN: {
    dot: "bg-blue-600",
    bg: "bg-blue-100",
    text: "text-blue-950 font-bold",
    border: "border-blue-300",
  },
  WON: {
    dot: "bg-emerald-600",
    bg: "bg-emerald-100",
    text: "text-emerald-950 font-bold",
    border: "border-emerald-300",
  },
  LOST: {
    dot: "bg-rose-600",
    bg: "bg-rose-100",
    text: "text-rose-950 font-bold",
    border: "border-rose-300",
  },
};

function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PipelineBoard({
  stages,
  deals,
  onCardClick,
  onDropDeal,
  onEditDeal,
  onDeleteDeal,
  onCreateInStage,
}: PipelineBoardProps) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  // 3-dots card menu state
  const [cardMenu, setCardMenu] = useState<{
    deal: Deal;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCardMenu(null);
      }
    }
    if (cardMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cardMenu]);

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4 pb-6 scrollbar-thin">
      {ordered.map(stage => {
        const stageDeals = deals.filter(deal => deal.stage === stage.name);
        const stageValue = stageDeals.reduce(
          (sum, deal) => sum + (deal.status === "WON" && deal.wonRevenue ? deal.wonRevenue : deal.estimatedValue),
          0,
        );
        const isOver = overStage === stage.name;
        const badge = stageBadgeColor[stage.kind] || stageBadgeColor.OPEN;

        return (
          <div
            key={stage.id}
            data-stage={stage.name}
            onDragOver={event => {
              event.preventDefault();
              if (overStage !== stage.name) setOverStage(stage.name);
            }}
            onDragLeave={event => {
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
            className={`flex w-76 shrink-0 flex-col rounded-2xl border bg-slate-50/70 transition-all duration-150 ${
              isOver
                ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md"
                : "border-slate-200/80"
            }`}
          >
            {/* Column Header */}
            <div className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-3.5 rounded-t-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${badge.dot}`} />
                  <h3 className="truncate text-xs font-semibold text-slate-800">
                    {stage.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.border} ${badge.bg} ${badge.text}`}
                  >
                    {stageDeals.length}
                  </span>
                </div>
                {onCreateInStage && (
                  <button
                    type="button"
                    onClick={() => onCreateInStage(stage.name)}
                    title={`Add deal to ${stage.name}`}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-semibold">Value</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(stageValue)}
                </span>
              </div>
            </div>

            {/* Deals list in column */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
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
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCardClick(deal);
                    }
                  }}
                  className={`group relative cursor-grab rounded-xl border border-slate-300 bg-white p-3.5 text-left shadow-xs transition hover:border-[#154fc1] hover:shadow-md active:cursor-grabbing ${
                    draggingId === deal.id ? "opacity-40 scale-[0.98]" : ""
                  }`}
                >
                  {/* Top row: Handle, Title & 3-dots */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <GripVertical
                        size={14}
                        className="mt-0.5 shrink-0 text-slate-400 group-hover:text-slate-600 transition"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-950 group-hover:text-[#154fc1] transition">
                          {deal.name}
                        </p>
                        {deal.customer ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-700">
                            <Building2 size={11} className="shrink-0 text-slate-500" />
                            <span className="truncate">{deal.customer}</span>
                          </p>
                        ) : deal.lead ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-700">
                            <Users size={11} className="shrink-0 text-slate-500" />
                            <span className="truncate">{deal.lead}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCardMenu({
                          deal,
                          x: Math.min(rect.left, window.innerWidth - 180),
                          y: rect.bottom + 4,
                        });
                      }}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                      title="Deal options"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  {/* Value & Product tag */}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-950">
                      <IndianRupee size={13} className="text-emerald-700" />
                      <span>{formatCurrency(deal.estimatedValue)}</span>
                    </div>
                    {deal.product && (
                      <span className="max-w-[120px] truncate rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                        {deal.product}
                      </span>
                    )}
                  </div>

                  {/* Next Action */}
                  {deal.nextAction && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-slate-50 p-2 text-[10px] font-medium text-slate-800 border border-slate-200">
                      <ListChecks size={12} className="mt-0.5 shrink-0 text-blue-700" />
                      <span className="line-clamp-2 leading-tight">
                        {deal.nextAction}
                      </span>
                    </div>
                  )}

                  {/* Footer: Owner & Close Date */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                        {getInitials(deal.owner)}
                      </div>
                      <span className="truncate max-w-[85px] font-medium text-slate-700">
                        {deal.owner}
                      </span>
                    </div>

                    {deal.expectedCloseDate && (
                      <span className="flex items-center gap-1 text-slate-400 shrink-0">
                        <Calendar size={11} />
                        {formatDealDate(deal.expectedCloseDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {stageDeals.length === 0 && (
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border border-dashed py-10 px-3 text-center transition ${
                    isOver
                      ? "border-blue-400 bg-blue-50/50 text-blue-600"
                      : "border-slate-200 text-slate-400"
                  }`}
                >
                  <p className="text-xs font-medium">
                    {isOver ? "Drop to move deal here" : "No deals in this stage"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {isOver ? "Release to confirm" : "Drag deals here"}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Card Action Menu Portal */}
      {cardMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: cardMenu.y, left: cardMenu.x }}
            className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                onCardClick(cardMenu.deal);
                setCardMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Eye size={13} className="text-slate-400" />
              View details
            </button>
            {onEditDeal && (
              <button
                type="button"
                onClick={() => {
                  onEditDeal(cardMenu.deal);
                  setCardMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                <Edit size={13} className="text-slate-400" />
                Edit deal
              </button>
            )}
            <div className="my-1 border-t border-slate-100" />
            {onDeleteDeal && (
              <button
                type="button"
                onClick={() => {
                  onDeleteDeal(cardMenu.deal.id);
                  setCardMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 size={13} />
                Delete deal
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
