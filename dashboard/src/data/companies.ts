import type { Company } from "../types/company";
import type { CompanySeedRow } from "../types/companyUi";
import { initialContacts } from "./contacts";

// Seed rows, kept compact as
// [name, website, industry, phone, address, city, state, country, notes, createdAt].
// Companies mirror the backend `companies` table.
const seedRows: CompanySeedRow[] = [
  ["Rangoni Of Florence", "https://rangoni.example.com", "Retail", "555-100-2201", "12 Via dei Lanzi", "Florence", "Tuscany", "Italy", "Long-standing apparel partner.", "2026-10-19"],
  ["Oh My Goodknits Inc", "https://goodknits.example.com", "Manufacturing", "555-100-2202", "48 Mill Road", "Portland", "Oregon", "United States", "Knitwear manufacturer; Q1 capacity review due.", "2026-10-18"],
  ["Kwik Kopy Printing", "https://kwikkopy.example.com", "Retail", "555-100-2203", "900 Commerce Way", "Austin", "Texas", "United States", "Print and campaign vendor.", "2026-10-17"],
  ["Morlong Associates", "https://morlong.example.com", "Finance", "555-100-2204", "5 Fenchurch Avenue", "London", "England", "United Kingdom", "Advisory partner from the seminar programme.", "2026-10-16"],
  ["Chapman", "https://chapman.example.com", "Manufacturing", "555-100-2205", "21 Harbour Street", "Bristol", "England", "United Kingdom", "Procurement-led buying process.", "2026-10-15"],
  ["Printing Dimensions", "https://printdim.example.com", "Manufacturing", "555-100-2206", "77 Industrial Park", "Chicago", "Illinois", "United States", "Requested a product demo.", "2026-10-14"],
  ["Grayson", "https://grayson.example.com", "Technology", "555-100-2207", "300 Market Street", "San Francisco", "California", "United States", "Evaluating us against two competitors.", "2026-10-13"],
  ["Buckley Miller & Wright", "https://bmw.example.com", "Technology", "555-100-2208", "14 Kingsway", "Manchester", "England", "United Kingdom", "Technical integration review in progress.", "2026-10-12"],
  ["Dal Tile Corporation", "https://daltile.example.com", "Manufacturing", "555-100-2209", "6400 Stone Way", "Dallas", "Texas", "United States", "Met at the trade show; bulk pricing interest.", "2026-10-11"],
  ["Creative Business Systems", "https://cbs.example.com", "Technology", "555-100-2210", "88 Innovation Drive", "Toronto", "Ontario", "Canada", "Referred by Rangoni Of Florence.", "2026-10-10"],
];

// Related-contact count, derived from the contacts seed so the two stay in sync.
const contactCounts = initialContacts.reduce<Record<string, number>>(
  (counts, contact) => {
    if (contact.company) {
      counts[contact.company] = (counts[contact.company] ?? 0) + 1;
    }
    return counts;
  },
  {},
);

export const initialCompanies: Company[] = seedRows.map(
  (
    [name, website, industry, phone, address, city, state, country, notes, createdAt],
    index,
  ) => ({
    id: index + 1,
    name,
    website,
    industry,
    phone,
    address,
    city,
    state,
    country,
    notes,
    contactCount: contactCounts[name] ?? 0,
    createdAt,
    updatedAt: createdAt,
  }),
);
