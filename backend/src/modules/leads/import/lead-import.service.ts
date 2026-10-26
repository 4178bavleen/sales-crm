
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../../config/database";
import { importedLeadRowSchema } from "./lead-import.validation";

type ImportRowInput = {
  rowNumber: number;
  values: Record<string, unknown>;
};

type ImportResult = {
  rowNumber: number;
  status: "created" | "duplicate" | "failed";
  contactName?: string;
  reason?: string;
  leadId?: number;
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLowerCase();
}

function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");
  return digits || null;
}

function normalizeCompany(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLowerCase();
}

export async function confirmLeadImport(
  rows: ImportRowInput[],
  createdById: number,
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No lead rows were provided.");
  }

  if (rows.length > 1000) {
    throw new Error("A maximum of 1,000 rows can be imported.");
  }

  const results: ImportResult[] = [];

  // Track duplicates within this confirmation request as well.
  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  let created = 0;
  let duplicates = 0;
  let failed = 0;

  for (const row of rows) {
    const parsed = importedLeadRowSchema.safeParse(row.values);

    if (!parsed.success) {
      failed++;

      results.push({
        rowNumber: row.rowNumber,
        status: "failed",
        reason: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });

      continue;
    }

    const data = parsed.data;
    const contactName = data.contactName.trim();
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);

    const duplicateEmailRow = email
      ? seenEmails.get(email)
      : undefined;

    const duplicatePhoneRow = phone
      ? seenPhones.get(phone)
      : undefined;

    if (
      duplicateEmailRow !== undefined ||
      duplicatePhoneRow !== undefined
    ) {
      duplicates++;

      results.push({
        rowNumber: row.rowNumber,
        status: "duplicate",
        contactName,
        reason: `Duplicates row ${
          duplicateEmailRow ?? duplicatePhoneRow
        } in this upload.`,
      });

      continue;
    }

    if (email) seenEmails.set(email, row.rowNumber);
    if (phone) seenPhones.set(phone, row.rowNumber);

    try {
      // Check for existing active leads in the database.
      const duplicateConditions: Prisma.LeadWhereInput[] = [];

      if (email) duplicateConditions.push({ normalizedEmail: email });
      if (phone) duplicateConditions.push({ normalizedPhone: phone });

      if (duplicateConditions.length > 0) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            deletedAt: null,
            OR: duplicateConditions,
          },
          select: {
            id: true,
            contactName: true,
          },
        });

        if (existingLead) {
          duplicates++;

          results.push({
            rowNumber: row.rowNumber,
            status: "duplicate",
            contactName,
            reason: `An existing lead matches this email or phone (lead ID ${existingLead.id}).`,
          });

          continue;
        }
      }

      // Validate referenced records before inserting.
      if (data.sourceId !== undefined && data.sourceId !== null) {
        const source = await prisma.leadSource.findUnique({
          where: { id: data.sourceId },
          select: { id: true },
        });

        if (!source) {
          data.sourceId = undefined;
        }
      }

      if (
        data.productServiceId !== undefined &&
        data.productServiceId !== null
      ) {
        const productService = await prisma.productService.findUnique({
          where: { id: data.productServiceId },
          select: { id: true },
        });

        if (!productService) {
          data.productServiceId = undefined;
        }
      }

      if (
        data.noFollowUpReasonId !== undefined &&
        data.noFollowUpReasonId !== null
      ) {
        const reason = await prisma.reason.findUnique({
          where: { id: data.noFollowUpReasonId },
          select: { id: true },
        });

        if (!reason) {
          data.noFollowUpReasonId = undefined;
        }
      }

      const companyName = data.companyName?.trim() || null;

      const lead = await prisma.lead.create({
        data: {
          contactName,
          companyName,
          phone: data.phone ? String(data.phone).trim() : null,
          email,
          normalizedEmail: email,
          normalizedPhone: phone,
          normalizedCompany: companyName?.toLowerCase() ?? null,
          sourceId: data.sourceId ?? null,
          productServiceId: data.productServiceId ?? null,
          priority: data.priority ?? "MEDIUM",
          status: data.status ?? "NEW",
          notes: data.notes ?? null,
          nextFollowUpAt: data.nextFollowUpAt
            ? new Date(data.nextFollowUpAt)
            : null,
          noFollowUpReasonId: data.noFollowUpReasonId ?? null,
          createdById,
        },
        select: {
          id: true,
          contactName: true,
        },
      });

      created++;

      results.push({
        rowNumber: row.rowNumber,
        status: "created",
        contactName: lead.contactName,
        leadId: lead.id,
      });
    } catch (error) {
      failed++;

      results.push({
        rowNumber: row.rowNumber,
        status: "failed",
        contactName,
        reason:
          error instanceof Error
            ? error.message
            : "Unable to create this lead.",
      });
    }
  }

  return {
    totalRows: rows.length,
    created,
    duplicates,
    failed,
    results,
  };
}
