export type DocumentCategory =
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'MEETING_NOTES'
  | 'CUSTOMER_FILE'
  | 'OTHER'

export interface DocumentVersionItem {
  id: number
  documentId: number
  versionNo: number
  storageKey: string
  originalFileName: string
  fileType: string
  mimeType: string
  sizeBytes: number
  checksum?: string | null
  uploadedById: number
  uploadedAt: string
  replaceNote?: string | null
  uploadedBy?: { id: number; name: string; email?: string } | null
}

export interface DocumentItem {
  id: number
  name: string
  category: DocumentCategory
  uploadedById: number
  currentVersion: number
  leadId?: number | null
  dealId?: number | null
  customerId?: number | null
  createdAt: string
  updatedAt: string
  uploadedBy?: { id: number; name: string; email: string } | null
  lead?: { id: number; contactName: string; companyName?: string | null } | null
  deal?: { id: number; name: string } | null
  customer?: {
    id: number
    company?: { id: number; name: string } | null
    primaryContact?: { id: number; fullName: string } | null
  } | null
  latestVersion?: DocumentVersionItem | null
  versions?: DocumentVersionItem[]
}

export interface DocumentStats {
  total: number
  contracts: number
  proposals: number
  customerFiles: number
  meetingNotes: number
  other: number
}

export interface DocumentPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DocumentListResponse {
  items: DocumentItem[]
  pagination: DocumentPagination
  stats: DocumentStats
}

export interface DocumentOptions {
  leads: { id: number; label: string }[]
  deals: { id: number; label: string }[]
  customers: { id: number; label: string }[]
}

export interface CreateDocumentPayload {
  name: string
  category: DocumentCategory
  file: File
  leadId?: number | null
  dealId?: number | null
  customerId?: number | null
}

export interface UpdateDocumentPayload {
  name?: string
  category?: DocumentCategory
  leadId?: number | null
  dealId?: number | null
  customerId?: number | null
}

export interface AddVersionPayload {
  file: File
  replaceNote?: string | null
}
