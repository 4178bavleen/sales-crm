import { useMemo } from "react";

export type SparklineColor =
  | "blue"
  | "sky"
  | "indigo"
  | "emerald"
  | "purple"
  | "amber"
  | "rose";

interface DynamicSparklineProps {
  data?: number[];
  color?: SparklineColor;
  gradientId: string;
  className?: string;
}

const COLOR_MAP: Record<
  SparklineColor,
  {
    stroke: string;
    stopColor: string;
    dot: string;
  }
> = {
  blue: {
    stroke: "#3b82f6",
    stopColor: "#3b82f6",
    dot: "#1d61e7",
  },
  sky: {
    stroke: "#0ea5e9",
    stopColor: "#0ea5e9",
    dot: "#0284c7",
  },
  indigo: {
    stroke: "#6366f1",
    stopColor: "#6366f1",
    dot: "#4f46e5",
  },
  emerald: {
    stroke: "#10b981",
    stopColor: "#10b981",
    dot: "#059669",
  },
  purple: {
    stroke: "#a855f7",
    stopColor: "#a855f7",
    dot: "#7e22ce",
  },
  amber: {
    stroke: "#f59e0b",
    stopColor: "#f59e0b",
    dot: "#d97706",
  },
  rose: {
    stroke: "#f43f5e",
    stopColor: "#f43f5e",
    dot: "#e11d48",
  },
};

export default function DynamicSparkline({
  data,
  color = "blue",
  gradientId,
  className = "w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end",
}: DynamicSparklineProps) {
  const values = data && data.length > 0 ? data : [0];
  const allZero = values.every((v) => v === 0);

  const normalizedPoints = useMemo(() => {
    // If all zeroes or empty, generate a soft undulating subtle curve
    if (allZero) {
      return [
        { x: 3, y: 41 },
        { x: 30, y: 39 },
        { x: 60, y: 41 },
        { x: 90, y: 39 },
        { x: 114, y: 40 },
      ];
    }

    // Ensure at least 4 points for smooth curves
    let pts = [...values];
    if (pts.length === 1) {
      pts = [pts[0] * 0.4, pts[0] * 0.7, pts[0]];
    } else if (pts.length === 2) {
      pts = [pts[0], (pts[0] + pts[1]) / 2, pts[1]];
    }

    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || (max === 0 ? 1 : max);

    return pts.map((val, idx) => {
      const x = 3 + (idx / (pts.length - 1)) * 110;
      const ratio = (val - min) / range;
      const y = 40 - ratio * 32;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });
  }, [values, allZero]);

  const { strokePath, fillPath, lastPoint } = useMemo(() => {
    if (normalizedPoints.length === 0) {
      return { strokePath: "", fillPath: "", lastPoint: null };
    }

    let d = `M ${normalizedPoints[0].x} ${normalizedPoints[0].y}`;

    for (let i = 0; i < normalizedPoints.length - 1; i++) {
      const p0 = normalizedPoints[i === 0 ? i : i - 1];
      const p1 = normalizedPoints[i];
      const p2 = normalizedPoints[i + 1];
      const p3 = normalizedPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const last = normalizedPoints[normalizedPoints.length - 1];
    const fill = `${d} L ${last.x} 48 L ${normalizedPoints[0].x} 48 Z`;

    return { strokePath: d, fillPath: fill, lastPoint: last };
  }, [normalizedPoints]);

  const cfg = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className={className}>
      <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cfg.stopColor} stopOpacity="0.28" />
            <stop offset="85%" stopColor={cfg.stopColor} stopOpacity="0.04" />
            <stop offset="100%" stopColor={cfg.stopColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {fillPath && (
          <path
            d={fillPath}
            fill={`url(#${gradientId})`}
            className="transition-all duration-700 ease-out"
          />
        )}
        {strokePath && (
          <path
            d={strokePath}
            stroke={cfg.stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-700 ease-out"
          />
        )}
        {lastPoint && !allZero && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2.8"
            fill={cfg.dot}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
