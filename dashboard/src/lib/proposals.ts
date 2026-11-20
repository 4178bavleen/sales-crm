import { request } from './api'
import { ENDPOINTS } from './endpoints'
import { getSession } from './auth'
import type {
  Proposal,
  ProposalListResponse,
  ProposalStats,
  ProposalOptions,
  CreateProposalPayload,
  UpdateProposalPayload,
  FetchProposalsParams,
  ProposalStatus,
} from '../types/proposal'

function authToken(): string | undefined {
  return getSession()?.token
}

export async function fetchProposals(params?: FetchProposalsParams): Promise<ProposalListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.search?.trim()) query.set('search', params.search.trim())
  if (params?.status && params.status !== 'ALL') query.set('status', params.status)
  if (params?.customerId) query.set('customerId', String(params.customerId))
  if (params?.dealId) query.set('dealId', String(params.dealId))
  if (params?.ownerId) query.set('ownerId', String(params.ownerId))
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params?.dateTo) query.set('dateTo', params.dateTo)
  if (params?.sortBy) query.set('sortBy', params.sortBy)
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder)

  const qs = query.toString()
  const path = qs ? `${ENDPOINTS.proposals.list}?${qs}` : ENDPOINTS.proposals.list
  return request<ProposalListResponse>(path, { method: 'GET', token: authToken() })
}

export async function fetchProposalById(id: number): Promise<Proposal> {
  const res = await request<{ success: boolean; data: Proposal }>(ENDPOINTS.proposals.byId(id), {
    method: 'GET',
    token: authToken(),
  })
  return res.data
}

export async function fetchProposalStats(): Promise<ProposalStats> {
  const res = await request<{ success: boolean; data: ProposalStats }>(ENDPOINTS.proposals.stats, {
    method: 'GET',
    token: authToken(),
  })
  return res.data
}

export async function fetchProposalOptions(): Promise<ProposalOptions> {
  const res = await request<{ success: boolean; data: ProposalOptions }>(ENDPOINTS.proposals.options, {
    method: 'GET',
    token: authToken(),
  })
  return res.data
}

export async function createProposal(payload: CreateProposalPayload): Promise<Proposal> {
  const res = await request<{ success: boolean; data: Proposal }>(ENDPOINTS.proposals.create, {
    method: 'POST',
    body: payload,
    token: authToken(),
  })
  return res.data
}

export async function updateProposal(id: number, payload: UpdateProposalPayload): Promise<Proposal> {
  const res = await request<{ success: boolean; data: Proposal }>(ENDPOINTS.proposals.update(id), {
    method: 'PATCH',
    body: payload,
    token: authToken(),
  })
  return res.data
}

export async function updateProposalStatus(
  id: number,
  status: ProposalStatus,
  rejectionReason?: string,
): Promise<Proposal> {
  const res = await request<{ success: boolean; data: Proposal }>(ENDPOINTS.proposals.status(id), {
    method: 'PATCH',
    body: { status, rejectionReason },
    token: authToken(),
  })
  return res.data
}

export async function sendProposal(id: number): Promise<Proposal> {
  const res = await request<{ success: boolean; data: Proposal }>(ENDPOINTS.proposals.send(id), {
    method: 'POST',
    token: authToken(),
  })
  return res.data
}

export async function deleteProposal(id: number): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(ENDPOINTS.proposals.delete(id), {
    method: 'DELETE',
    token: authToken(),
  })
}
