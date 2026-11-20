import type { ProposalStatus, DiscountType } from '../../generated/prisma/client.js'

export interface ProposalItemInput {
  id?: number
  productServiceId?: number | null
  title: string
  description?: string | null
  quantity: number
  unitPrice: number
  discountPercent?: number
  taxRate?: number
  total?: number
  position?: number
}

export interface CreateProposalInput {
  title: string
  proposalNumber?: string
  customerId: number
  leadId?: number | null
  dealId?: number | null
  ownerId?: number
  currency?: string
  issueDate?: string | Date
  validUntil: string | Date
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  summary?: string | null
  terms?: string | null
  clientNotes?: string | null
  items: ProposalItemInput[]
}

export interface UpdateProposalInput {
  title?: string
  proposalNumber?: string
  customerId?: number
  leadId?: number | null
  dealId?: number | null
  ownerId?: number
  status?: ProposalStatus
  currency?: string
  issueDate?: string | Date
  validUntil?: string | Date
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  summary?: string | null
  terms?: string | null
  clientNotes?: string | null
  rejectionReason?: string | null
  items?: ProposalItemInput[]
}

export interface UpdateProposalStatusInput {
  status: ProposalStatus
  rejectionReason?: string | null
}

export interface ProposalFilterQuery {
  page?: number
  limit?: number
  search?: string
  status?: ProposalStatus | 'ALL'
  customerId?: number
  dealId?: number
  ownerId?: number
  dateFrom?: string
  dateTo?: string
  sortBy?: 'issueDate' | 'validUntil' | 'grandTotal' | 'createdAt' | 'proposalNumber'
  sortOrder?: 'asc' | 'desc'
}

export interface ProposalStats {
  totalCount: number
  totalValue: number
  draftCount: number
  draftValue: number
  sentCount: number
  sentValue: number
  underReviewCount: number
  underReviewValue: number
  acceptedCount: number
  acceptedValue: number
  rejectedCount: number
  rejectedValue: number
  expiredCount: number
  expiredValue: number
  acceptanceRate: number
}
