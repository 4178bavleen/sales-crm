export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'

export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface ProposalItem {
  id?: number
  proposalId?: number
  productServiceId?: number | null
  title: string
  description?: string | null
  quantity: number | string
  unitPrice: number | string
  discountPercent?: number | string
  taxRate?: number | string
  total: number | string
  position?: number
  productService?: {
    id: number
    name: string
    type: string
    description?: string | null
  } | null
}

export interface ProposalCustomer {
  id: number
  company?: {
    id: number
    name: string
    industry?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
  } | null
  primaryContact?: {
    id: number
    fullName: string
    email?: string | null
    phone?: string | null
    jobTitle?: string | null
  } | null
}

export interface ProposalDeal {
  id: number
  name: string
  estimatedValue?: number | string | null
  status?: string
}

export interface ProposalUser {
  id: number
  name: string
  email: string
}

export interface Proposal {
  id: number
  proposalNumber: string
  title: string
  customerId: number
  leadId?: number | null
  dealId?: number | null
  ownerId: number
  createdById: number
  status: ProposalStatus
  currency: string
  issueDate: string
  validUntil: string
  submittedForApprovalAt?: string | null
  approvedAt?: string | null
  approvedById?: number | null
  approvalNote?: string | null
  sentAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  subtotal: number | string
  discountType: DiscountType
  discountValue: number | string
  discountAmount: number | string
  taxRate: number | string
  taxAmount: number | string
  grandTotal: number | string
  summary?: string | null
  terms?: string | null
  clientNotes?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  customer?: ProposalCustomer
  deal?: ProposalDeal | null
  owner?: ProposalUser
  createdBy?: ProposalUser
  approvedBy?: ProposalUser | null
  items: ProposalItem[]
}

export interface ProposalListResponse {
  success: boolean
  proposals: Proposal[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ProposalStats {
  totalCount: number
  totalValue: number
  draftCount: number
  draftValue: number
  pendingApprovalCount: number
  pendingApprovalValue: number
  approvedCount: number
  approvedValue: number
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

export interface ProposalOptions {
  customers: Array<{
    id: number
    company?: { id: number; name: string; industry?: string | null; address?: string | null; city?: string | null } | null
    primaryContact?: { id: number; fullName: string; email?: string | null; phone?: string | null } | null
    owner?: { id: number; name: string } | null
  }>
  deals: Array<{
    id: number
    name: string
    customerId?: number | null
    estimatedValue?: number | string | null
  }>
  productsServices: Array<{
    id: number
    name: string
    type: string
    description?: string | null
  }>
  users: Array<{
    id: number
    name: string
    email: string
  }>
}

export interface CreateProposalPayload {
  title: string
  proposalNumber?: string
  customerId: number
  leadId?: number | null
  dealId?: number | null
  ownerId?: number
  currency?: string
  issueDate?: string
  validUntil: string
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  summary?: string | null
  terms?: string | null
  clientNotes?: string | null
  items: Array<{
    productServiceId?: number | null
    title: string
    description?: string | null
    quantity: number
    unitPrice: number
    discountPercent?: number
    taxRate?: number
    position?: number
  }>
}

export interface UpdateProposalPayload {
  title?: string
  proposalNumber?: string
  customerId?: number
  leadId?: number | null
  dealId?: number | null
  ownerId?: number
  status?: ProposalStatus
  currency?: string
  issueDate?: string
  validUntil?: string
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  summary?: string | null
  terms?: string | null
  clientNotes?: string | null
  rejectionReason?: string | null
  items?: Array<{
    id?: number
    productServiceId?: number | null
    title: string
    description?: string | null
    quantity: number
    unitPrice: number
    discountPercent?: number
    taxRate?: number
    position?: number
  }>
}

export interface FetchProposalsParams {
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
