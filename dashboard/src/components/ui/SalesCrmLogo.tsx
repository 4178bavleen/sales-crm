import type { CSSProperties } from "react";

interface SalesCrmLogoProps {
  className?: string;
  size?: "default" | "lg";
  /**
   * Visible artwork height. A number is treated as pixels; a string is used
   * verbatim as a CSS length, so responsive values such as
   * `clamp(28px, 5vh, 38px)` work. Overrides `size` when given.
   */
  height?: number | string;
}

/** Default visible artwork height, per size. */
const SIZES: Record<NonNullable<SalesCrmLogoProps["size"]>, string> = {
  default: "24px",
  lg: "28px",
};

/** The brand logo — the Vibrantick circular emblem paired with its wordmark. */
export default function SalesCrmLogo({
  className = "",
  size = "default",
  height,
}: SalesCrmLogoProps) {
  const logoHeight =
    height === undefined
      ? SIZES[size]
      : typeof height === "number"
        ? `${height}px`
        : height;

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ "--logo-h": logoHeight } as CSSProperties}
    >
      <img
        src="/logo/vib_logo.jpeg"
        alt="Vibrantick Infotech Solutions"
        draggable={false}
        className="shrink-0 rounded-full object-cover"
        style={{
          width: "calc(var(--logo-h) * 1.25)",
          height: "calc(var(--logo-h) * 1.25)",
        }}
      />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight text-slate-900"
          style={{ fontSize: "calc(var(--logo-h) * 0.65)" }}
        >
          Vibrantick
        </span>
        <span
          className="font-semibold tracking-[0.18em] text-sky-700 uppercase mt-0.5"
          style={{ fontSize: "max(8px, calc(var(--logo-h) * 0.24))" }}
        >
          INFOTECH SOLUTIONS
        </span>
      </div>
    </div>
  );
}
