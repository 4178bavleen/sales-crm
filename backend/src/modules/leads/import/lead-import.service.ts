import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../config/database.js";
import {
  parseLeadImportFile,
  normalizeEmail,
  normalizePhone,
  type ParsedImportFile,
  type FileDuplicate,
} from "./lead-import.utils.js";
import { importedLeadRowSchema } from "./lead-import.validation.js";

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

function resolveOwnerId(
  rawOwner: unknown,
  users: Array<{ id: number; name: string; email: string }>,
  fallbackUserId?: number,
): number | undefined {
  if (rawOwner !== null && rawOwner !== undefined && String(rawOwner).trim() !== "") {
    const str = String(rawOwner).trim().toLowerCase();
    const asNum = Number(str);

    // 1. Check exact ID
    if (Number.isFinite(asNum) && asNum > 0) {
      const byId = users.find((u) => u.id === asNum);
      if (byId) return byId.id;
    }

    // 2. Check exact email
    const byEmail = users.find((u) => u.email.toLowerCase() === str);
    if (byEmail) return byEmail.id;

    // 3. Check exact name
    const byName = users.find((u) => u.name.toLowerCase() === str);
    if (byName) return byName.id;

    // 4. Check email prefix (e.g. "admin" for "admin@gmail.com")
    const byEmailPrefix = users.find((u) => {
      const prefix = u.email.split("@")[0].toLowerCase();
      return prefix === str;
    });
    if (byEmailPrefix) return byEmailPrefix.id;

    // 5. Check first name or words in name (e.g. "gabrial" in "gabrial deora")
    const byNamePart = users.find((u) => {
      const parts = u.name.toLowerCase().split(/\s+/);
      return parts.includes(str) || u.name.toLowerCase().startsWith(str);
    });
    if (byNamePart) return byNamePart.id;

    // 6. Substring search if distinct
    const bySubstring = users.filter((u) =>
      u.name.toLowerCase().includes(str) || u.email.toLowerCase().includes(str),
    );
    if (bySubstring.length === 1) return bySubstring[0].id;
  }

  // Fallback to current user / importing user if provided
  if (fallbackUserId && users.some((u) => u.id === fallbackUserId)) {
    return fallbackUserId;
  }

  // Default to first user if fallbackUserId not found but users exist
  if (users.length > 0) {
    return users[0].id;
  }

  return undefined;
}

/**
 * Parses file and detects duplicates both within the file AND against the database.
 */
export async function getLeadImportPreview(
  buffer: Buffer,
  originalName: string,
  currentUserId?: number,
): Promise<ParsedImportFile> {
  const parsed = parseLeadImportFile(buffer, originalName);

  const emails = Array.from(
    new Set(
      parsed.rows
        .map((r) => normalizeEmail(r.data.email))
        .filter((e): e is string => Boolean(e)),
    ),
  );

  const phones = Array.from(
    new Set(
      parsed.rows
        .map((r) => normalizePhone(r.data.phone))
        .filter((p): p is string => Boolean(p)),
    ),
  );

  const phoneSuffixes = phones
    .filter((p) => p.length >= 10)
    .map((p) => p.slice(-10));

  const orConditions: Prisma.LeadWhereInput[] = [];

  if (emails.length > 0) {
    orConditions.push({ normalizedEmail: { in: emails } });
    orConditions.push({ email: { in: emails, mode: "insensitive" } });
  }

  if (phones.length > 0) {
    orConditions.push({ normalizedPhone: { in: phones } });
    orConditions.push({ phone: { in: phones } });
  }

  if (phoneSuffixes.length > 0) {
    phoneSuffixes.forEach((suffix) => {
      orConditions.push({ normalizedPhone: { endsWith: suffix } });
    });
  }

  const [existingLeads, sources, users] = await Promise.all([
    orConditions.length > 0
      ? prisma.lead.findMany({
          where: {
            deletedAt: null,
            OR: orConditions,
          },
          select: {
            id: true,
            contactName: true,
            email: true,
            phone: true,
            normalizedEmail: true,
            normalizedPhone: true,
          },
        })
      : Promise.resolve([]),
    prisma.leadSource.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  for (const row of parsed.rows) {
    if (row.data.sourceId) {
      const s = sources.find(
        (src) =>
          src.id === Number(row.data.sourceId) ||
          src.name.toLowerCase() === String(row.data.sourceId).toLowerCase(),
      );
      if (s) row.data.source = s.name;
    }
    const rawOwner = row.data.ownerId ?? row.data.owner ?? row.data.leadOwner;
    const resolvedOwnerId = resolveOwnerId(rawOwner, users, currentUserId);
    if (resolvedOwnerId) {
      const u = users.find((usr) => usr.id === resolvedOwnerId);
      if (u) {
        row.data.ownerId = u.id;
        row.data.owner = u.name;
      }
    }
  }

  const dbEmailMap = new Map<string, (typeof existingLeads)[0]>();
  const dbPhoneMap = new Map<string, (typeof existingLeads)[0]>();

  for (const lead of existingLeads) {
    if (lead.normalizedEmail) {
      dbEmailMap.set(lead.normalizedEmail.toLowerCase(), lead);
    }
    if (lead.email) {
      dbEmailMap.set(lead.email.trim().toLowerCase(), lead);
    }
    if (lead.normalizedPhone) {
      dbPhoneMap.set(lead.normalizedPhone, lead);
      if (lead.normalizedPhone.length >= 10) {
        dbPhoneMap.set(lead.normalizedPhone.slice(-10), lead);
      }
    }
    if (lead.phone) {
      const digits = lead.phone.replace(/\D/g, "");
      if (digits) {
        dbPhoneMap.set(digits, lead);
        if (digits.length >= 10) {
          dbPhoneMap.set(digits.slice(-10), lead);
        }
      }
    }
  }

  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();
  const seenNamesAndCompany = new Map<string, number>();

  const duplicates: FileDuplicate[] = [];

  for (const row of parsed.rows) {
    const email = normalizeEmail(row.data.email);
    const phone = normalizePhone(row.data.phone);
    const phone10 = phone && phone.length >= 10 ? phone.slice(-10) : phone;
    const contactName = String(row.data.contactName || "").trim().toLowerCase();
    const companyName = String(row.data.companyName || row.data.company || "").trim().toLowerCase();
    const nameCompanyKey = contactName && companyName ? `${contactName}:::${companyName}` : undefined;

    // 1. Check existing DB lead by email
    if (email && dbEmailMap.has(email)) {
      const existing = dbEmailMap.get(email)!;
      duplicates.push({
        rowNumber: row.rowNumber,
        duplicateOfLeadId: existing.id,
        field: "email",
        value: email,
        reason: `Already in CRM (Lead #${existing.id}: ${existing.contactName})`,
      });
      continue;
    }

    // 2. Check existing DB lead by phone
    if (phone && (dbPhoneMap.has(phone) || (phone10 && dbPhoneMap.has(phone10)))) {
      const existing = (dbPhoneMap.get(phone) || (phone10 ? dbPhoneMap.get(phone10) : undefined))!;
      duplicates.push({
        rowNumber: row.rowNumber,
        duplicateOfLeadId: existing.id,
        field: "phone",
        value: phone,
        reason: `Already in CRM (Lead #${existing.id}: ${existing.contactName})`,
      });
      continue;
    }

    // 3. Check duplicate within file (email)
    if (email) {
      const prevRow = seenEmails.get(email);
      if (prevRow !== undefined) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateOfRow: prevRow,
          field: "email",
          value: email,
          reason: `Duplicates row ${prevRow} in this file`,
        });
        continue;
      }
      seenEmails.set(email, row.rowNumber);
    }

    // 4. Check duplicate within file (phone)
    if (phone) {
      const prevRow = seenPhones.get(phone) || (phone10 ? seenPhones.get(phone10) : undefined);
      if (prevRow !== undefined) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateOfRow: prevRow,
          field: "phone",
          value: phone,
          reason: `Duplicates row ${prevRow} in this file`,
        });
        continue;
      }
      seenPhones.set(phone, row.rowNumber);
      if (phone10) seenPhones.set(phone10, row.rowNumber);
    }

    // 5. Check duplicate within file (contact name + company name when no email or phone)
    if (!email && !phone && nameCompanyKey) {
      const prevRow = seenNamesAndCompany.get(nameCompanyKey);
      if (prevRow !== undefined) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateOfRow: prevRow,
          field: "contactName",
          value: row.data.contactName as string,
          reason: `Duplicates row ${prevRow} in this file`,
        });
        continue;
      }
      seenNamesAndCompany.set(nameCompanyKey, row.rowNumber);
    }
  }

  return {
    rows: parsed.rows,
    duplicates,
  };
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

  // Pre-fetch reference lists for quick lookup
  const [sources, productServices, reasons, users] = await Promise.all([
    prisma.leadSource.findMany({ select: { id: true, name: true } }),
    prisma.productService.findMany({ select: { id: true, name: true } }),
    prisma.reason.findMany({ select: { id: true, name: true, type: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  const defaultNoFollowUpReason = reasons.find((r) => r.type === "NO_FOLLOWUP") || reasons[0];

  const results: ImportResult[] = [];
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
    const email = normalizeEmail(data.email) || null;
    const phone = normalizePhone(data.phone) || null;
    const phone10 = phone && phone.length >= 10 ? phone.slice(-10) : phone;

    // Check in-batch duplicate first
    const dupEmailRow = email ? seenEmails.get(email) : undefined;
    const dupPhoneRow = phone ? (seenPhones.get(phone) || (phone10 ? seenPhones.get(phone10) : undefined)) : undefined;

    if (dupEmailRow !== undefined || dupPhoneRow !== undefined) {
      duplicates++;
      results.push({
        rowNumber: row.rowNumber,
        status: "duplicate",
        contactName,
        reason: `Duplicates row ${dupEmailRow ?? dupPhoneRow} in this upload.`,
      });
      continue;
    }

    try {
      // Check for existing active leads in the database
      const orConditions: Prisma.LeadWhereInput[] = [];
      if (email) {
        orConditions.push({ normalizedEmail: email });
        orConditions.push({ email: { equals: email, mode: "insensitive" } });
      }
      if (phone) {
        orConditions.push({ normalizedPhone: phone });
        orConditions.push({ phone });
        if (phone10) {
          orConditions.push({ normalizedPhone: { endsWith: phone10 } });
        }
      }

      if (orConditions.length > 0) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            deletedAt: null,
            OR: orConditions,
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
            reason: `Already in CRM (Lead #${existingLead.id}: ${existingLead.contactName}).`,
          });
          continue;
        }
      }

      // Resolve sourceId
      let sourceId = data.sourceId;
      if (sourceId) {
        const exists = sources.some((s) => s.id === sourceId);
        if (!exists) sourceId = undefined;
      }
      if (!sourceId && (row.values.source || row.values.leadSource || row.values.sourceId)) {
        const rawSrc = String(row.values.source || row.values.leadSource || row.values.sourceId).trim().toLowerCase();
        const found = sources.find((s) => s.name.toLowerCase() === rawSrc);
        if (found) sourceId = found.id;
      }

      // Resolve productServiceId
      let productServiceId = data.productServiceId;
      if (productServiceId) {
        const exists = productServices.some((ps) => ps.id === productServiceId);
        if (!exists) productServiceId = undefined;
      }
      if (!productServiceId && (row.values.productService || row.values.product || row.values.service || row.values.productServiceId)) {
        const rawProd = String(row.values.productService || row.values.product || row.values.service || row.values.productServiceId).trim().toLowerCase();
        const found = productServices.find((ps) => ps.name.toLowerCase() === rawProd);
        if (found) productServiceId = found.id;
      }

      // Resolve ownerId
      const rawOwner =
        data.ownerId ??
        row.values.ownerId ??
        row.values.owner ??
        row.values.leadOwner ??
        data.owner;
      const finalOwnerId =
        resolveOwnerId(rawOwner, users, createdById) ?? createdById;

      // Resolve noFollowUpNote
      let noFollowUpNote = data.noFollowUpNote ?? (row.values.noFollowUpNote ? String(row.values.noFollowUpNote).trim() : null);
      if (!data.nextFollowUpAt && !noFollowUpNote) {
        noFollowUpNote = "No follow-up needed";
      }

      const companyName = data.companyName ? String(data.companyName).trim() : null;

      const lead = await prisma.lead.create({
        data: {
          contactName,
          companyName,
          phone: data.phone ? String(data.phone).trim() : null,
          email,
          normalizedEmail: email,
          normalizedPhone: phone,
          normalizedCompany: companyName?.toLowerCase() ?? null,
          sourceId: sourceId ?? null,
          productServiceId: productServiceId ?? null,
          ownerId: finalOwnerId ?? null,
          priority: data.priority ?? "MEDIUM",
          status: data.status ?? "NEW",
          notes: data.notes ?? null,
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
          noFollowUpNote: noFollowUpNote ?? null,
          createdById,
        },
        select: {
          id: true,
          contactName: true,
        },
      });

      if (finalOwnerId) {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToId: finalOwnerId,
            assignedById: createdById,
            note: "Assigned via import",
          },
        });
      }

      created++;
      if (email) seenEmails.set(email, row.rowNumber);
      if (phone) seenPhones.set(phone, row.rowNumber);
      if (phone10) seenPhones.set(phone10, row.rowNumber);

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
        reason: error instanceof Error ? error.message : "Unable to create this lead.",
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
