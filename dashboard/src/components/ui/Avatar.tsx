import type { AvatarProps } from "../../types/avatar";

/** Deterministic avatar tints so list rows are visually distinguishable. */
const avatarTints = [
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
];

/** First letters of up to two words, upper-cased ("Amelia Hartley" -> "AH"). */
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Reusable circular initials avatar (contacts list, grid card, detail dialog). */
export default function Avatar({
  name,
  seed,
  size = 32,
  className = "",
}: AvatarProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
        avatarTints[seed % avatarTints.length]
      } ${className}`}
    >
      {initials(name)}
    </div>
  );
}
