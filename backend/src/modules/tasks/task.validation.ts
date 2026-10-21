import type { Priority, TaskStatus } from '../../generated/prisma/client.js'

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const statuses: TaskStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskValidationError'
  }
}

export function parseId(value: unknown, field = 'id'): number {
  const id = Number(value)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TaskValidationError(`${field} must be a positive integer`)
  }

  return id
}

export function parseTaskInput(
  body: Record<string, unknown>,
  partial = false,
) {
  const data: Record<string, unknown> = {}

  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new TaskValidationError('title is required')
    }

    data.title = body.title.trim()
  }

  if ('description' in body) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw new TaskValidationError('description must be a string or null')
    }

    data.description =
      typeof body.description === 'string'
        ? body.description.trim() || null
        : null
  }

  if (!partial || 'dueAt' in body) {
    if (typeof body.dueAt !== 'string' || !body.dueAt.trim()) {
      throw new TaskValidationError('dueAt is required')
    }

    const dueAt = new Date(body.dueAt)

    if (Number.isNaN(dueAt.getTime())) {
      throw new TaskValidationError('dueAt must be a valid date')
    }

    data.dueAt = dueAt
  }

  if ('priority' in body) {
    if (!priorities.includes(body.priority as Priority)) {
      throw new TaskValidationError(
        'priority must be LOW, MEDIUM, HIGH, or URGENT',
      )
    }

    data.priority = body.priority
  }

  if ('assignedToId' in body) {
    data.assignedToId = parseId(body.assignedToId, 'assignedToId')
  } else if (!partial) {
    throw new TaskValidationError('assignedToId is required')
  }

  const linkedRecords = ['leadId', 'dealId', 'customerId', 'companyId']
  const suppliedLinks = linkedRecords.filter((field) => field in body)

  if (!partial && suppliedLinks.length !== 1) {
    throw new TaskValidationError(
      'Provide exactly one of leadId, dealId, customerId, or companyId',
    )
  }

  for (const field of suppliedLinks) {
    const value = body[field]

    data[field] =
      value === null || value === ''
        ? null
        : parseId(value, field)
  }

  if ('meetingId' in body) {
    const value = body.meetingId
    data.meetingId =
      value === null || value === ''
        ? null
        : parseId(value, 'meetingId')
  }

  return data
}

export function parseTaskStatus(value: unknown): TaskStatus {
  if (!statuses.includes(value as TaskStatus)) {
    throw new TaskValidationError(
      'status must be OPEN, IN_PROGRESS, COMPLETED, or CANCELLED',
    )
  }

  return value as TaskStatus
}