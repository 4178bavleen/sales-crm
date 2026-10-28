import type { ActivityType } from '../../generated/prisma/client.js'

const activityTypes: ActivityType[] = ['CALL', 'MESSAGE', 'EMAIL', 'REMINDER', 'OTHER']

export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActivityValidationError'
  }
}

export function parseActivityId(value: unknown, field = 'id'): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ActivityValidationError(`${field} must be a positive integer`)
  }
  return id
}

export function parseActivityType(value: unknown): ActivityType {
  if (!activityTypes.includes(value as ActivityType)) {
    throw new ActivityValidationError('type must be CALL, MESSAGE, EMAIL, REMINDER, or OTHER')
  }
  return value as ActivityType
}

function optionalText(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new ActivityValidationError(`${field} must be a string or null`)
  }
  return value.trim() || null
}

export function parseCreateActivityInput(body: Record<string, unknown>) {
  const type = parseActivityType(body.type)
  const outcome = optionalText(body.outcome, 'outcome')
  const notes = optionalText(body.notes, 'notes')

  let occurredAt: Date | undefined
  if (body.occurredAt !== undefined) {
    if (typeof body.occurredAt !== 'string' && !(body.occurredAt instanceof Date)) {
      throw new ActivityValidationError('occurredAt must be a valid date')
    }
    occurredAt = new Date(body.occurredAt as string | Date)
    if (Number.isNaN(occurredAt.getTime())) {
      throw new ActivityValidationError('occurredAt must be a valid date')
    }
  }

  const links = ['leadId', 'dealId', 'customerId', 'companyId']
  const activeLinks = links.filter((key) => body[key] !== undefined && body[key] !== null && body[key] !== '')
  if (activeLinks.length > 1) {
    throw new ActivityValidationError('Provide at most one of leadId, dealId, customerId, or companyId')
  }
  if (activeLinks.length === 0 && !body.taskId) {
    throw new ActivityValidationError('Provide a linked lead, deal, customer, company, or task')
  }

  const data: Record<string, unknown> = { type, outcome, notes, occurredAt }
  for (const field of links) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      data[field] = parseActivityId(body[field], field)
    }
  }
  if (body.taskId !== undefined && body.taskId !== null && body.taskId !== '') {
    data.taskId = parseActivityId(body.taskId, 'taskId')
  }
  return data
}

export function parseActivityListQuery(query: Record<string, unknown>) {
  const page = query.page === undefined ? 1 : parseActivityId(query.page, 'page')
  const limit = query.limit === undefined ? 20 : parseActivityId(query.limit, 'limit')
  if (limit > 100) throw new ActivityValidationError('limit cannot exceed 100')

  const type = query.type === undefined ? undefined : parseActivityType(query.type)
  const leadId = query.leadId === undefined ? undefined : parseActivityId(query.leadId, 'leadId')
  const taskId = query.taskId === undefined ? undefined : parseActivityId(query.taskId, 'taskId')

  return { page, limit, type, leadId, taskId }
}
