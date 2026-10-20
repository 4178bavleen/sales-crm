import type { Contact } from "../types/contact";
import type { ContactSeedRow } from "../types/contactUi";

// Seed rows, kept compact as
// [fullName, company, jobTitle, email, phone, notes, createdAt].
// Contacts mirror the backend `contacts` table (one fullName field, no first/last).
const seedRows: ContactSeedRow[] = [
  ["Amelia Hartley", "Rangoni Of Florence", "CEO", "amelia.hartley@rangoni.example.com", "555-201-4401", "Decision maker for the Florence rollout. Prefers email over calls.", "2026-10-19"],
  ["Daniel Okafor", "Oh My Goodknits Inc", "Sales Manager", "daniel.okafor@goodknits.example.com", "555-201-4402", "Owns the knitwear vendor shortlist.", "2026-10-18"],
  ["Priya Raman", "Kwik Kopy Printing", "Marketing Manager", "priya.raman@kwikkopy.example.com", "555-201-4403", "Asked for the Q4 print campaign pricing sheet.", "2026-10-17"],
  ["Tomas Lindqvist", "Morlong Associates", "Consultant", "tomas.lindqvist@morlong.example.com", "555-201-4404", "Introduced via the seminar partner programme.", "2026-10-16"],
  ["Grace Abara", "Chapman", "Operations Manager", "grace.abara@chapman.example.com", "555-201-4405", "Handles procurement; needs finance sign-off above 10k.", "2026-10-15"],
  ["Victor Moreau", "Printing Dimensions", "Account Executive", "victor.moreau@printdim.example.com", "555-201-4406", "Warm lead — requested a demo twice.", "2026-10-14"],
  ["Nadia Petrov", "Grayson", "Product Manager", "nadia.petrov@grayson.example.com", "555-201-4407", "Evaluating us against two competitors.", "2026-10-13"],
  ["Marcus Bell", "Buckley Miller & Wright", "Engineer", "marcus.bell@bmw.example.com", "555-201-4408", "Technical contact for the integration review.", "2026-10-12"],
  ["Sofia Marchetti", "Dal Tile Corporation", "CEO", "sofia.marchetti@daltile.example.com", "555-201-4409", "Met at the trade show; interested in bulk pricing.", "2026-10-11"],
  ["Ethan Whitfield", "Creative Business Systems", "Sales Manager", "ethan.whitfield@cbs.example.com", "555-201-4410", "Referred by Amelia Hartley.", "2026-10-10"],
  ["Hana Sato", "Rangoni Of Florence", "Account Executive", "hana.sato@rangoni.example.com", "555-201-4411", "Secondary contact at Rangoni; handles day-to-day.", "2026-10-09"],
  ["Liam O'Connor", "Grayson", "Marketing Manager", "liam.oconnor@grayson.example.com", "555-201-4412", "Runs the newsletter partnership.", "2026-10-08"],
];

export const initialContacts: Contact[] = seedRows.map(
  ([fullName, company, jobTitle, email, phone, notes, createdAt], index) => ({
    id: index + 1,
    fullName,
    company,
    jobTitle,
    email,
    phone,
    notes,
    createdAt,
    updatedAt: createdAt,
  }),
);
