
import * as XLSX from "xlsx";
import { AppError } from "../../../common/errors/AppErrors.js";

export const MAX_IMPORT_ROWS = 1000;

export const REQUIRED_IMPORT_HEADERS = ["contactName"];

export const ALLOWED_IMPORT_HEADERS = [
  "contactName",
  "firstName",
  "lastName",
  "companyName",
  "company",
  "phone",
  "email",
  "sourceId",
  "productServiceId",
  "priority",
  "status",
  "notes",
  "nextFollowUpAt",
  "noFollowUpReasonId",
];

const HEADER_MAP: Record<string, string> = {
  contactname: "contactName",
  contact: "contactName",
  name: "contactName",
  fullname: "contactName",
  firstname: "firstName",
  first: "firstName",
  lastname: "lastName",
  last: "lastName",
  companyname: "companyName",
  company: "companyName",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  email: "email",
  emailaddress: "email",
  sourceid: "sourceId",
  source: "sourceId",
  leadsource: "sourceId",
  productserviceid: "productServiceId",
  productservice: "productServiceId",
  product: "productServiceId",
  service: "productServiceId",
  priority: "priority",
  notes: "notes",
  note: "notes",
  status: "status",
  leadstatus: "status",
  nextfollowupat: "nextFollowUpAt",
  nextfollowup: "nextFollowUpAt",
  followupdate: "nextFollowUpAt",
  nofollowupreasonid: "noFollowUpReasonId",
  nofollowupreason: "noFollowUpReasonId",
};

export interface ParsedImportRow {
  rowNumber: number;
  data: Record<string, unknown>;
}

export interface FileDuplicate {
  rowNumber: number;
  duplicateOfRow: number;
  field: "email" | "phone";
  value: string;
}

export interface ParsedImportFile {
  rows: ParsedImportRow[];
  duplicates: FileDuplicate[];
}

export class LeadImportError extends AppError {
  constructor(
    message: string,
    statusCode: number = 400,
  ) {
    super(statusCode, message);
    this.name = "LeadImportError";
  }
}

function normalizeHeader(header: unknown): string {
  const raw = String(header ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
  const clean = raw.replace(/[^a-z0-9]/g, "");
  return HEADER_MAP[clean] || clean;
}

function normalizeEmail(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return String(value).trim().toLowerCase();
}

function normalizePhone(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const digits = String(value).replace(/\D/g, "");
  return digits || undefined;
}

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every(
    (value) =>
      value === null ||
      value === undefined ||
      String(value).trim() === "",
  );
}

function normalizeCellValue(
  value: unknown,
  header: string,
): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  // Excel may represent dates as JavaScript Date objects.
  if (value instanceof Date) {
    if (header === "nextFollowUpAt") {
      return value.toISOString();
    }

    return value.toISOString();
  }

  return value;
}

export function parseLeadImportFile(
  buffer: Buffer,
  originalName: string,
): ParsedImportFile {
  const extension = originalName
    .toLowerCase()
    .split(".")
    .pop();

  if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
    throw new LeadImportError(
      "Only CSV, XLSX, and XLS files are supported.",
    );
  }

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: false,
    });
  } catch {
    throw new LeadImportError(
      "Unable to read the uploaded file. Please check its format.",
    );
  }

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new LeadImportError(
      "The uploaded file does not contain a worksheet.",
    );
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: undefined,
    raw: false,
    blankrows: false,
  });

  if (matrix.length === 0) {
    throw new LeadImportError("The uploaded file is empty.");
  }

  const rawHeaders = (matrix[0] as unknown[]).map(normalizeHeader);

  if (rawHeaders.every((header) => header === "")) {
    throw new LeadImportError(
      "The first row must contain column headers.",
    );
  }

  // De-duplicate headers, ignoring duplicate columns
  const seenHeaderSet = new Set<string>();
  const headers = rawHeaders.map((header) => {
    if (!header) return "";
    if (seenHeaderSet.has(header)) return "";
    seenHeaderSet.add(header);
    return header;
  });

  const hasContactIdentifier =
    headers.includes("contactName") ||
    headers.includes("firstName") ||
    headers.includes("companyName") ||
    headers.includes("company") ||
    headers.includes("email") ||
    headers.includes("phone");

  if (!hasContactIdentifier) {
    throw new LeadImportError(
      "Missing required contact identifier. Please include Contact Name, First Name, Company, Email, or Phone.",
    );
  }

  const dataRows = matrix.slice(1);

  const rows: ParsedImportRow[] = [];

  dataRows.forEach((values, index) => {
    const record: Record<string, unknown> = {};

    headers.forEach((header, columnIndex) => {
      if (!header || !ALLOWED_IMPORT_HEADERS.includes(header)) return;

      record[header] = normalizeCellValue(
        values[columnIndex],
        header,
      );
    });

    if (isEmptyRow(record)) {
      return;
    }

    if (!record.contactName) {
      const parts = [record.firstName, record.lastName].filter(Boolean);
      if (parts.length > 0) {
        record.contactName = parts.join(" ");
      } else if (record.companyName || record.company) {
        record.contactName = String(record.companyName || record.company);
      } else if (record.email) {
        record.contactName = String(record.email).split("@")[0] || "Unknown Lead";
      } else if (record.phone) {
        record.contactName = String(record.phone);
      } else {
        record.contactName = `Imported Lead #${index + 1}`;
      }
    }

    if (!record.companyName && record.company) {
      record.companyName = record.company;
    }

    if (typeof record.sourceId === "string") {
      const s = String(record.sourceId).trim().toLowerCase();
      if (/^\d+$/.test(s)) {
        record.sourceId = Number(s);
      } else if (s.includes("web") && !s.includes("webinar")) {
        record.sourceId = 1;
      } else if (s.includes("referral")) {
        record.sourceId = 2;
      } else if (s.includes("cold")) {
        record.sourceId = 3;
      } else if (s.includes("linkedin")) {
        record.sourceId = 4;
      } else if (s.includes("google") || s.includes("ad")) {
        record.sourceId = 5;
      } else {
        record.sourceId = 1;
      }
    }

    if (!record.nextFollowUpAt && !record.noFollowUpReasonId) {
      record.noFollowUpReasonId = 1;
    }

    rows.push({
      // Spreadsheet row numbers are 1-based.
      rowNumber: index + 2,
      data: record,
    });
  });

  if (rows.length === 0) {
    throw new LeadImportError(
      "No lead data rows were found in the uploaded file.",
    );
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new LeadImportError(
      `You can import a maximum of ${MAX_IMPORT_ROWS} leads per file. ` +
        `Your file contains ${rows.length} non-empty data rows.`,
    );
  }

  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();
  const duplicates: FileDuplicate[] = [];

  for (const row of rows) {
    const email = normalizeEmail(row.data.email);
    const phone = normalizePhone(row.data.phone);

    if (email) {
      const previousRow = seenEmails.get(email);

      if (previousRow !== undefined) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateOfRow: previousRow,
          field: "email",
          value: email,
        });
      } else {
        seenEmails.set(email, row.rowNumber);
      }
    }

    if (phone) {
      const previousRow = seenPhones.get(phone);

      if (previousRow !== undefined) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateOfRow: previousRow,
          field: "phone",
          value: phone,
        });
      } else {
        seenPhones.set(phone, row.rowNumber);
      }
    }
  }

  return { rows, duplicates };
}
