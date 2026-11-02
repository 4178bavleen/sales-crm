import type { DocumentCategory } from '../../generated/prisma/client.js'

export interface CreateDocumentInput {
  name: string
  category: DocumentCategory
  uploadedById: number
  leadId?: number | null
  dealId?: number | null
  customerId?: number | null
  companyId?: number | null
}

export interface UpdateDocumentInput {
  name?: string
  category?: DocumentCategory
  leadId?: number | null
  dealId?: number | null
  customerId?: number | null
}

export interface AddVersionInput {
  documentId: number
  uploadedById: number
  replaceNote?: string | null
}

export interface DocumentFilterQuery {
  page?: number
  limit?: number
  search?: string
  category?: DocumentCategory | 'ALL'
  leadId?: number
  dealId?: number
  customerId?: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'category'
  sortOrder?: 'asc' | 'desc'
}
