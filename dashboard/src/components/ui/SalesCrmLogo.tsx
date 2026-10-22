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

/**
 * The brand artwork, `/logo/vis.png`.
 *
 * The source PNG is 2145x733 and its artwork (icon + wordmark) does not reach
 * the canvas edges — there is a transparent margin around it. The image is
 * therefore cropped to the artwork bounds and then scaled, so the rendered
 * logo has exactly the height asked for instead of a size that also includes
 * invisible padding.
 */
const CANVAS_WIDTH = 2145;
const CANVAS_HEIGHT = 733;
const ART_X = 116;
const ART_Y = 146;
const ART_WIDTH = 1941;
const ART_HEIGHT = 478;

/** Default visible artwork height, per size. */
const SIZES: Record<NonNullable<SalesCrmLogoProps["size"]>, string> = {
  default: "24px",
  lg: "28px",
};

/** The brand logo — the mark and wordmark as a single image. */
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
      className={`relative inline-block select-none overflow-hidden ${className}`}
      style={
        {
          "--logo-h": logoHeight,
          width: `calc(var(--logo-h) * ${ART_WIDTH} / ${ART_HEIGHT})`,
          height: "var(--logo-h)",
        } as CSSProperties
      }
    >
      <img
        src="/logo/vis.png"
        alt="Vibrantick Sales CRM"
        draggable={false}
        className="absolute max-w-none"
        style={{
          width: `calc(var(--logo-h) * ${CANVAS_WIDTH} / ${ART_HEIGHT})`,
          height: `calc(var(--logo-h) * ${CANVAS_HEIGHT} / ${ART_HEIGHT})`,
          left: `calc(var(--logo-h) * -${ART_X} / ${ART_HEIGHT})`,
          top: `calc(var(--logo-h) * -${ART_Y} / ${ART_HEIGHT})`,
        }}
      />
    </div>
  );
}
