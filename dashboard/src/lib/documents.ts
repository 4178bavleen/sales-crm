import { request, ApiError } from './api'
import { ENDPOINTS, apiUrl } from './endpoints'
import { getSession } from './auth'
import type {
  DocumentCategory,
  DocumentItem,
  DocumentListResponse,
  DocumentOptions,
  CreateDocumentPayload,
  UpdateDocumentPayload,
  AddVersionPayload,
} from '../types/document'

function authToken(): string | undefined {
  return getSession()?.token
}

export async function fetchDocuments(params: {
  page?: number
  limit?: number
  search?: string
  category?: DocumentCategory | 'ALL'
  leadId?: number
  dealId?: number
  customerId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<DocumentListResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.category && params.category !== 'ALL') query.set('category', params.category)
  if (params.leadId) query.set('leadId', String(params.leadId))
  if (params.dealId) query.set('dealId', String(params.dealId))
  if (params.customerId) query.set('customerId', String(params.customerId))
  if (params.sortBy) query.set('sortBy', params.sortBy)
  if (params.sortOrder) query.set('sortOrder', params.sortOrder)

  const qs = query.toString()
  const path = qs ? `${ENDPOINTS.documents.list}?${qs}` : ENDPOINTS.documents.list
  return request<DocumentListResponse>(path, { method: 'GET', token: authToken() })
}

export async function fetchDocumentById(id: number): Promise<DocumentItem> {
  return request<DocumentItem>(ENDPOINTS.documents.byId(id), { method: 'GET', token: authToken() })
}

export async function fetchDocumentOptions(): Promise<DocumentOptions> {
  return request<DocumentOptions>(ENDPOINTS.documents.options, { method: 'GET', token: authToken() })
}

export async function createDocumentApi(payload: CreateDocumentPayload): Promise<DocumentItem> {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in', 401)

  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('name', payload.name)
  formData.append('category', payload.category)
  if (payload.leadId) formData.append('leadId', String(payload.leadId))
  if (payload.dealId) formData.append('dealId', String(payload.dealId))
  if (payload.customerId) formData.append('customerId', String(payload.customerId))

  const res = await fetch(apiUrl(ENDPOINTS.documents.create), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    throw new ApiError(errData?.message || 'Failed to upload document', res.status)
  }

  const json = await res.json()
  return json.data
}

export async function addDocumentVersionApi(
  documentId: number,
  payload: AddVersionPayload,
): Promise<DocumentItem> {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in', 401)

  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.replaceNote) formData.append('replaceNote', payload.replaceNote)

  const res = await fetch(apiUrl(ENDPOINTS.documents.addVersion(documentId)), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    throw new ApiError(errData?.message || 'Failed to upload new version', res.status)
  }

  const json = await res.json()
  return json.data
}

export async function updateDocumentApi(
  id: number,
  payload: UpdateDocumentPayload,
): Promise<DocumentItem> {
  return request<DocumentItem>(ENDPOINTS.documents.update(id), {
    method: 'PATCH',
    body: payload,
    token: authToken(),
  })
}

export async function deleteDocumentApi(id: number): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(ENDPOINTS.documents.delete(id), {
    method: 'DELETE',
    token: authToken(),
  })
}

export async function downloadDocumentFile(id: number, fileName: string, versionNo?: number) {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in', 401)

  const downloadPath = versionNo
    ? ENDPOINTS.documents.downloadVersion(id, versionNo)
    : ENDPOINTS.documents.download(id)

  const res = await fetch(apiUrl(downloadPath), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    throw new ApiError(errData?.message || 'Failed to download document file', res.status)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getCategoryMeta(category: DocumentCategory) {
  switch (category) {
    case 'CONTRACT':
      return {
        label: 'Contract',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'PROPOSAL':
      return {
        label: 'Proposal',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
      }
    case 'CUSTOMER_FILE':
      return {
        label: 'Customer File',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      }
    case 'MEETING_NOTES':
      return {
        label: 'Meeting Notes',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      }
    case 'OTHER':
    default:
      return {
        label: 'General / Other',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
      }
  }
}
