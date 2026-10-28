
import { z } from 'zod'

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const str = String(value).trim();
      return str === "" ? undefined : str;
    },
    z.string().max(max).optional(),
  )

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  },
  z.number().int().positive().optional(),
)

const optionalDate = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return undefined;
    const d = new Date(value as string | number | Date);
    return isNaN(d.getTime()) ? undefined : d;
  },
  z.date().optional(),
)

export const importedLeadRowSchema = z.object({
  contactName: z.preprocess(
    (value) => (value === null || value === undefined ? "" : String(value).trim()),
    z.string().min(1, "Contact name is required").max(150),
  ),

  companyName: optionalText(150),
  phone: optionalText(30),

  email: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const str = String(value).trim().toLowerCase();
      return str === "" ? undefined : str;
    },
    z.string().email("Invalid email format").max(254).optional(),
  ),

  sourceId: optionalPositiveInt,
  productServiceId: optionalPositiveInt,

  priority: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return "MEDIUM";
      const str = String(value).trim().toUpperCase();
      if (str.includes("URGENT")) return "URGENT";
      if (str.includes("HIGH")) return "HIGH";
      if (str.includes("LOW")) return "LOW";
      return "MEDIUM";
    },
    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  ),

  status: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return "NEW";
      const str = String(value).trim().toUpperCase();
      if (str.includes("CONTACT")) return "CONTACTED";
      if (str.includes("DISQUAL")) return "DISQUALIFIED";
      if (str.includes("CONVERT") || str.includes("WON")) return "CONVERTED";
      if (str.includes("QUALIF")) return "QUALIFIED";
      return "NEW";
    },
    z.enum(["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"]).default("NEW"),
  ),

  notes: optionalText(5000),
  nextFollowUpAt: optionalDate,
  noFollowUpReasonId: optionalPositiveInt,
}).transform((row) => {
  if (!row.nextFollowUpAt && row.noFollowUpReasonId === undefined) {
    row.noFollowUpReasonId = 1
  }
  return row
})

export const confirmImportSchema = z.object({
  rows: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      values: z.record(z.string(), z.unknown()),
    }),
  ).min(1).max(1000),
})
