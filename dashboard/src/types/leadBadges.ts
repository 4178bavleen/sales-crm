import type { LeadStatus, Priority } from "./lead";

/** Shared shape for the small status/priority pills. */
export type BadgeProps = {
  className?: string;
};

export type StatusBadgeProps = BadgeProps & {
  status: LeadStatus;
};

export type PriorityTextProps = {
  priority: Priority;
};
