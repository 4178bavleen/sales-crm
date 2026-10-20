import type { Lead, LeadStatus, Priority } from "../types/lead";

// Seed rows, kept compact as [firstName, lastName, company, source, status, priority, createdAt].
// Every row shares the same phone and owner, so those live in the defaults below.
type SeedRow = [string, string, string, string, LeadStatus, Priority, string];

const seedRows: SeedRow[] = [
  ["Christopher", "Maclead", "Rangoni Of Florence", "Cold Call", "NEW", "MEDIUM", "2026-10-19"],
  ["Carissa", "Kidman", "Oh My Goodknits Inc", "Advertisement", "CONTACTED", "HIGH", "2026-10-19"],
  ["James", "Merced", "Kwik Kopy Printing", "Web Download", "QUALIFIED", "HIGH", "2026-10-18"],
  ["Tresa", "Sweely", "Morlong Associates", "Seminar Partner", "NEW", "LOW", "2026-10-17"],
  ["Felix", "Hirpara", "Chapman", "Online Store", "CONTACTED", "MEDIUM", "2026-10-17"],
  ["Kayleigh", "Lace", "Printing Dimensions", "Partner", "QUALIFIED", "URGENT", "2026-10-16"],
  ["Yvonne", "Tjepkema", "Grayson", "External Referral", "NEW", "MEDIUM", "2026-10-15"],
  ["Michael", "Ruta", "Buckley Miller & Wright", "Online Store", "CONVERTED", "LOW", "2026-10-14"],
  ["Theola", "Frey", "Dal Tile Corporation", "Cold Call", "CONTACTED", "HIGH", "2026-10-13"],
  ["Chau", "Kitzman", "Creative Business Systems", "Advertisement", "DISQUALIFIED", "LOW", "2026-10-12"],
];

const OWNER = "Gabriel Deora";
const PHONE = "555-555-5555";

export const initialLeads: Lead[] = seedRows.map(
  ([firstName, lastName, company, source, status, priority, createdAt], index) => ({
    id: index + 1,
    firstName,
    lastName,
    company,
    email: `${firstName.toLowerCase()}@example.com`,
    phone: PHONE,
    source,
    owner: OWNER,
    status,
    priority,
    createdAt,
  }),
);
