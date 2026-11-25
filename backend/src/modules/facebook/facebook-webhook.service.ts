import { prisma } from '../../config/database.js'
import { logAudit } from '../audit/audit.service.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import { normalizeEmail, normalizePhone } from '../leads/import/lead-import.utils.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  FacebookServiceError,
  getFacebookSettingsRecord,
  type FacebookSettingsRecord,
} from './facebook.service.js'
import { facebookWebhookSchema } from './facebook.validation.js'

type FieldData = { name?: string; values?: string[] }
type GraphLead = {
  id?: string
  form_id?: string
  created_time?: string
  field_data?: FieldData[]
}

const LEAD_SOURCE_NAME = 'Facebook Lead Ads'

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function readAnswer(fieldData: FieldData[], names: string[]): string | null {
  const wanted = names.map(normalizeFieldName)
  for (const field of fieldData) {
    if (!wanted.includes(normalizeFieldName(String(field.name ?? '')))) continue
    const values = Array.isArray(field.values) ? field.values : []
    const answer = values.find((value) => String(value ?? '').trim())
    if (answer) return String(answer).trim()
  }
  return null
}

function prettyLabel(name: string): string {
  const cleaned = name.trim().replace(/[_-]+/g, ' ')
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Additional answer'
}

function mapGraphLead(graphLead: GraphLead, leadgenId: string) {
  const fieldData = Array.isArray(graphLead.field_data) ? graphLead.field_data : []
  const fullName = readAnswer(fieldData, ['full_name', 'fullname', 'name'])
  const firstName = readAnswer(fieldData, ['first_name', 'firstname'])
  const lastName = readAnswer(fieldData, ['last_name', 'lastname'])
  const email = normalizeEmail(readAnswer(fieldData, ['email', 'email_address'])) ?? null
  const phone = readAnswer(fieldData, [
    'phone_number',
    'phonenumber',
    'phone',
    'mobile_number',
    'mobilenumber',
    'mobile',
  ])
  const companyName = readAnswer(fieldData, [
    'company_name',
    'companyname',
    'company',
    'business_name',
    'businessname',
  ])
  const contactName =
    fullName ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    companyName ||
    (email ? email.split('@')[0] : null) ||
    `Facebook Lead ${leadgenId}`

  const mappedFields = new Set(
    [
      'full_name',
      'fullname',
      'name',
      'first_name',
      'firstname',
      'last_name',
      'lastname',
      'email',
      'email_address',
      'phone_number',
      'phonenumber',
      'phone',
      'mobile_number',
      'mobilenumber',
      'mobile',
      'company_name',
      'companyname',
      'company',
      'business_name',
      'businessname',
    ].map(normalizeFieldName),
  )

  const notesLines: string[] = []
  const formId = graphLead.form_id ? String(graphLead.form_id) : null
  if (formId) notesLines.push(`Facebook form ID: ${formId}`)

  for (const field of fieldData) {
    const fieldName = String(field.name ?? '').trim()
    if (mappedFields.has(normalizeFieldName(fieldName))) continue
    const values = Array.isArray(field.values) ? field.values : []
    const answer = values.map((value) => String(value ?? '').trim()).filter(Boolean).join(', ')
    if (answer) notesLines.push(`${prettyLabel(fieldName)}: ${answer}`)
  }

  return {
    contactName,
    email,
    phone,
    companyName,
    formId,
    notes: notesLines.join('\n') || null,
  }
}

async function fetchLeadgenLead(leadgenId: string, accessToken: string): Promise<GraphLead> {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?fields=id,created_time,form_id,field_data&access_token=${encodeURIComponent(accessToken)}`
  const response = await fetch(url, { method: 'GET' })
  const result: any = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result?.error?.message ||
      result?.error?.error_user_msg ||
      `Meta Lead Ads API responded with HTTP status ${response.status}`
    throw new FacebookServiceError(message, response.status >= 500 ? 502 : 400)
  }
  return (result ?? {}) as GraphLead
}

async function findDuplicateLead(email: string | null, phone: string | null) {
  const conditions: Prisma.LeadWhereInput[] = []
  if (email) {
    conditions.push({ normalizedEmail: email }, { email: { equals: email, mode: 'insensitive' } })
  }
  const digits = phone ? normalizePhone(phone) ?? null : null
  if (digits) {
    conditions.push({ normalizedPhone: digits })
    const suffix = digits.length > 10 ? digits.slice(-10) : digits
    if (suffix.length >= 8) {
      conditions.push({ phone: { endsWith: suffix } }, { normalizedPhone: { endsWith: suffix } })
    }
  }
  if (!conditions.length) return null
  return prisma.lead.findFirst({
    where: { deletedAt: null, OR: conditions },
    select: { id: true },
  })
}

async function resolveActorId(settings: FacebookSettingsRecord): Promise<number | null> {
  if (settings.defaultOwnerId) {
    const owner = await prisma.user.findFirst({
      where: { id: settings.defaultOwnerId, isActive: true, deletedAt: null },
      select: { id: true },
    })
    if (owner) return owner.id
  }
  const admin = await prisma.user.findFirst({
    where: { isActive: true, deletedAt: null, role: { name: 'ADMIN' } },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  return admin?.id ?? null
}

async function ingestLeadgenLead(
  leadgenId: string,
  settings: FacebookSettingsRecord,
): Promise<'created' | 'duplicate'> {
  const alreadyImported = await prisma.lead.findFirst({
    where: { facebookLeadId: leadgenId },
    select: { id: true },
  })
  if (alreadyImported) return 'duplicate'

  const graphLead = await fetchLeadgenLead(leadgenId, settings.pageAccessToken)
  const mapped = mapGraphLead(graphLead, leadgenId)

  const duplicate = await findDuplicateLead(mapped.email, mapped.phone)
  if (duplicate) return 'duplicate'

  const source = await prisma.leadSource.upsert({
    where: { name: LEAD_SOURCE_NAME },
    update: { isActive: true },
    create: { name: LEAD_SOURCE_NAME, isActive: true },
    select: { id: true },
  })

  const ownerId = await resolveActorId(settings)
  if (!ownerId) {
    throw new FacebookServiceError('No active default owner or administrator available for lead assignment', 503)
  }

  let leadId: number
  let contactName = mapped.contactName
  try {
    const lead = await prisma.lead.create({
      data: {
        contactName: mapped.contactName,
        companyName: mapped.companyName,
        email: mapped.email,
        normalizedEmail: mapped.email,
        phone: mapped.phone,
        normalizedPhone: mapped.phone ? normalizePhone(mapped.phone) ?? null : null,
        normalizedCompany: mapped.companyName ? mapped.companyName.trim().toLowerCase() : null,
        facebookLeadId: leadgenId,
        sourceId: source.id,
        ownerId,
        createdById: ownerId,
        priority: 'MEDIUM',
        status: 'NEW',
        notes: mapped.notes,
        noFollowUpNote: 'No follow-up needed',
      },
      select: { id: true, contactName: true },
    })
    leadId = lead.id
    contactName = lead.contactName
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null
    if (code === 'P2002') return 'duplicate'
    throw error
  }

  await prisma.leadAssignment.create({
    data: {
      leadId,
      assignedToId: ownerId,
      assignedById: ownerId,
      note: 'Imported from Facebook Lead Ads',
    },
  })

  await logAudit({
    actorId: null,
    action: 'CREATE',
    entityType: 'LEAD',
    entityId: leadId,
    after: {
      contactName,
      source: LEAD_SOURCE_NAME,
      facebookLeadId: leadgenId,
      ownerId,
    },
  })

  if (settings.notifyOwner) {
    try {
      await createInAppNotification({
        userId: ownerId,
        type: 'LEAD_ASSIGNED',
        title: 'New Facebook lead assigned',
        body: `New Facebook Lead Ads lead ${contactName} was assigned to you`,
        entityType: 'lead',
        entityId: leadId,
      })
    } catch (error) {
      console.warn('[FacebookWebhook] Could not notify lead owner:', error)
    }
  }

  return 'created'
}

export async function processFacebookWebhook(payload: unknown) {
  const parsed = facebookWebhookSchema.parse(payload)
  const result = { processed: 0, duplicates: 0, failed: 0, ignored: 0 }

  if (parsed.object !== 'page') {
    result.ignored += 1
    return result
  }

  const settings = await getFacebookSettingsRecord()
  if (!settings.isEnabled) {
    result.ignored += 1
    return result
  }
  if (!settings.pageAccessToken.trim()) {
    throw new FacebookServiceError('Facebook Page access token is not configured', 503)
  }

  const configuredPageId = settings.pageId.trim()

  for (const entry of parsed.entry ?? []) {
    const pageId = entry.id ? String(entry.id) : null
    if (configuredPageId && pageId && pageId !== configuredPageId) {
      result.ignored += 1
      continue
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') {
        result.ignored += 1
        continue
      }
      const leadgenId = change.value?.leadgen_id ? String(change.value.leadgen_id) : null
      if (!leadgenId) {
        result.failed += 1
        continue
      }
      try {
        const outcome = await ingestLeadgenLead(leadgenId, settings)
        if (outcome === 'created') result.processed += 1
        else result.duplicates += 1
      } catch (error) {
        result.failed += 1
        console.error(`[FacebookWebhook] Could not ingest lead ${leadgenId}:`, error)
      }
    }
  }

  return result
}
