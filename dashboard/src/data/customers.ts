import type { Customer } from "../types/customer";
import type { CustomerSeedRow } from "../types/customerUi";
import { initialCompanies } from "./companies";

// Seed rows, kept compact as
// [company, primaryContact, owner, notes, dealCount, pipelineValue, convertedAt].
// Industry is NOT listed here — it is resolved from `initialCompanies` so the
// Companies and Customers pages can never drift apart.
//
// Customers mirror the backend `customers` table: a conversion record with no
// descriptive fields of its own. Every value shown in the UI is resolved from
// the related Company / Contact / User / Deal rows, exactly as the API would
// return it nested.
const seedRows: CustomerSeedRow[] = [
  [
    "Rangoni Of Florence",
    "Amelia Hartley",
    "Gabriel Deora",
    "Converted from a qualified lead after the Florence rollout review.",
    2,
    84000,
    "2026-10-15",
  ],
  [
    "Oh My Goodknits Inc",
    "Daniel Okafor",
    "Amelia Hartley",
    "Knitwear capacity agreed; first purchase order expected in Q1.",
    1,
    32000,
    "2026-10-12",
  ],
  [
    "Kwik Kopy Printing",
    "Priya Raman",
    "Gabriel Deora",
    "Signed for the Q4 print campaign package.",
    1,
    18500,
    "2026-10-09",
  ],
  [
    "Morlong Associates",
    "Tomas Lindqvist",
    "Daniel Okafor",
    "Advisory retainer converted from the seminar partner programme.",
    1,
    47500,
    "2026-10-06",
  ],
  [
    "Grayson",
    "Ethan Whitfield",
    "Gabriel Deora",
    "Chose us over two competitors after the technical review.",
    3,
    156000,
    "2026-09-28",
  ],
  [
    "Dal Tile Corporation",
    "Grace Abara",
    "Priya Raman",
    "Bulk pricing agreed at the trade show follow-up.",
    1,
    61000,
    "2026-09-22",
  ],
  [
    "Creative Business Systems",
    "Hana Sato",
    "Gabriel Deora",
    "Referred by Rangoni Of Florence; onboarding underway.",
    1,
    27000,
    "2026-09-18",
  ],
];

/** Resolve a company's industry from the companies seed (single source of truth). */
function industryFor(companyName: string): string {
  return initialCompanies.find(company => company.name === companyName)?.industry ?? "";
}

export const initialCustomers: Customer[] = seedRows.map(
  ([company, primaryContact, owner, notes, dealCount, pipelineValue, convertedAt], index) => ({
    id: index + 1,
    company,
    industry: industryFor(company),
    primaryContact,
    owner,
    notes,
    dealCount,
    pipelineValue,
    convertedAt,
    createdAt: convertedAt,
    updatedAt: convertedAt,
  }),
);
