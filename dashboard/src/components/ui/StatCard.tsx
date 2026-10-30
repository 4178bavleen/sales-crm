import { isValidElement, type ReactNode, type ElementType } from "react";
import DynamicSparkline, { type SparklineColor } from "./DynamicSparkline";

export type StatCardColor =
  | "blue"
  | "sky"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "purple";

export interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: ReactNode;
  icon: ElementType | ReactNode;
  color?: StatCardColor;
  sparklineData?: number[];
  sparklineId?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  iconBgShape?: "circle" | "rounded";
}

const COLOR_CONFIG: Record<
  StatCardColor,
  {
    border: string;
    activeBorder: string;
    activeRing: string;
    activeBg: string;
    iconBg: string;
    iconText: string;
    subtextColor: string;
    sparklineColor: SparklineColor;
  }
> = {
  blue: {
    border: "border-blue-500",
    activeBorder: "border-blue-600",
    activeRing: "ring-2 ring-blue-500/20",
    activeBg: "bg-blue-50/20",
    iconBg: "bg-blue-50",
    iconText: "text-[#1d61e7]",
    subtextColor: "text-[#1d61e7]",
    sparklineColor: "blue",
  },
  sky: {
    border: "border-sky-500",
    activeBorder: "border-sky-600",
    activeRing: "ring-2 ring-sky-500/20",
    activeBg: "bg-sky-50/20",
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    subtextColor: "text-sky-600",
    sparklineColor: "sky",
  },
  amber: {
    border: "border-amber-500",
    activeBorder: "border-amber-600",
    activeRing: "ring-2 ring-amber-500/20",
    activeBg: "bg-amber-50/20",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    subtextColor: "text-amber-600",
    sparklineColor: "amber",
  },
  rose: {
    border: "border-rose-500",
    activeBorder: "border-rose-600",
    activeRing: "ring-2 ring-rose-500/20",
    activeBg: "bg-rose-50/20",
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    subtextColor: "text-rose-600",
    sparklineColor: "rose",
  },
  emerald: {
    border: "border-emerald-500",
    activeBorder: "border-emerald-600",
    activeRing: "ring-2 ring-emerald-500/20",
    activeBg: "bg-emerald-50/20",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    subtextColor: "text-emerald-600",
    sparklineColor: "emerald",
  },
  indigo: {
    border: "border-indigo-500",
    activeBorder: "border-indigo-600",
    activeRing: "ring-2 ring-indigo-500/20",
    activeBg: "bg-indigo-50/20",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    subtextColor: "text-indigo-600",
    sparklineColor: "indigo",
  },
  purple: {
    border: "border-purple-500",
    activeBorder: "border-purple-600",
    activeRing: "ring-2 ring-purple-500/20",
    activeBg: "bg-purple-50/20",
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    subtextColor: "text-purple-600",
    sparklineColor: "purple",
  },
};

export default function StatCard({
  label,
  value,
  subtext,
  icon: IconOrElement,
  color = "blue",
  sparklineData,
  sparklineId,
  isActive,
  onClick,
  className = "",
  iconBgShape = "circle",
}: StatCardProps) {
  const cfg = COLOR_CONFIG[color] || COLOR_CONFIG.blue;
  const isInteractive = Boolean(onClick);

  const renderIcon = () => {
    if (isValidElement(IconOrElement)) {
      return IconOrElement;
    }
    if (IconOrElement) {
      const Component = IconOrElement as ElementType;
      return <Component size={20} />;
    }
    return null;
  };

  const shapeClass = iconBgShape === "rounded" ? "rounded-xl" : "rounded-full";

  const borderClass = isInteractive
    ? isActive
      ? `${cfg.activeBorder} ${cfg.activeRing} ${cfg.activeBg}`
      : `${cfg.border} hover:border-slate-400 hover:shadow-xs`
    : `${cfg.border} hover:shadow-xs`;

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs min-w-0 transition ${
        isInteractive ? "cursor-pointer" : ""
      } ${borderClass} ${className}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center ${shapeClass} ${cfg.iconBg} ${cfg.iconText}`}
        >
          {renderIcon()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 leading-tight">
            {value}
          </p>
          {subtext && (
            <p className={`mt-0.5 text-[11px] font-semibold ${cfg.subtextColor} flex items-center gap-0.5 truncate`}>
              {subtext}
            </p>
          )}
        </div>
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <DynamicSparkline
          data={sparklineData}
          color={cfg.sparklineColor}
          gradientId={sparklineId || `stat-spark-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
      )}
    </div>
  );
}
