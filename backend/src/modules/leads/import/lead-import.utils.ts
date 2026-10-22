
import * as XLSX from "xlsx";

export const MAX_IMPORT_ROWS = 1000;

export const REQUIRED_IMPORT_HEADERS = ["contactName"];

export const ALLOWED_IMPORT_HEADERS = [
  "contactName",
  "companyName",
  "phone",
  "email",
  "sourceId",
  "productServiceId",
  "priority",
  "notes",
  "nextFollowUpAt",
  "noFollowUpReasonId",
];

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

export class LeadImportError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "LeadImportError";
  }
}

function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[_-]+([a-zA-Z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
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

  if (extension !== "csv" && extension !== "xlsx") {
    throw new LeadImportError(
      "Only CSV and XLSX files are supported.",
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

  const headers = matrix[0].map(normalizeHeader);

  if (headers.every((header) => header === "")) {
    throw new LeadImportError(
      "The first row must contain column headers.",
    );
  }

  const duplicateHeaders = headers.filter(
    (header, index) =>
      header !== "" && headers.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    throw new LeadImportError(
      `Duplicate column headers found: ${[
        ...new Set(duplicateHeaders),
      ].join(", ")}`,
    );
  }

  const unknownHeaders = headers.filter(
    (header) =>
      header !== "" &&
      !ALLOWED_IMPORT_HEADERS.includes(header),
  );

  if (unknownHeaders.length > 0) {
    throw new LeadImportError(
      `Unsupported column headers: ${unknownHeaders.join(", ")}. ` +
        `Allowed headers: ${ALLOWED_IMPORT_HEADERS.join(", ")}.`,
    );
  }

  const missingHeaders = REQUIRED_IMPORT_HEADERS.filter(
    (header) => !headers.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new LeadImportError(
      `Missing required column headers: ${missingHeaders.join(", ")}`,
    );
  }

  const dataRows = matrix.slice(1);

  const rows: ParsedImportRow[] = [];

  dataRows.forEach((values, index) => {
    const record: Record<string, unknown> = {};

    headers.forEach((header, columnIndex) => {
      if (!header) return;

      record[header] = normalizeCellValue(
        values[columnIndex],
        header,
      );
    });

    if (isEmptyRow(record)) {
      return;
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
