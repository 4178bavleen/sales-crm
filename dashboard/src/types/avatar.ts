export type AvatarProps = {
  /** Person's full name; initials are derived from it. */
  name: string;
  /** Stable number (e.g. row id) used to pick a deterministic tint. */
  seed: number;
  /** Diameter in pixels. Defaults to 32. */
  size?: number;
  className?: string;
};
