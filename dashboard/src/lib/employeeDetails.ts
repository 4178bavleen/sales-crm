import { request, ApiError } from './api'
import { ENDPOINTS, apiUrl } from './endpoints'
import { getSession } from './auth'
import type { EmployeeDetailUser } from '../types/employeeDetail'

function token() { return getSession()?.token }
const base = (id: number) => `${ENDPOINTS.users.list}/${id}/details`

export async function fetchEmployeeDetail(id: number): Promise<EmployeeDetailUser> {
  const data = await request<{ user: EmployeeDetailUser }>(base(id), { token: token() })
  return data.user
}

export async function saveEmployeePersonal(id: number, body: any): Promise<EmployeeDetailUser> {
  const data = await request<{ user: EmployeeDetailUser }>(`${base(id)}/personal`, { method: 'PUT', body, token: token() })
  return data.user
}

export async function saveEmployeeBank(id: number, body: any): Promise<EmployeeDetailUser> {
  const data = await request<{ user: EmployeeDetailUser }>(`${base(id)}/bank`, { method: 'PUT', body, token: token() })
  return data.user
}

export async function saveEmployeeCompany(id: number, body: any): Promise<EmployeeDetailUser> {
  const data = await request<{ user: EmployeeDetailUser }>(`${base(id)}/company`, { method: 'PUT', body, token: token() })
  return data.user
}

async function upload(id: number, path: string, file: File): Promise<EmployeeDetailUser> {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in', 401)
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(apiUrl(`${base(id)}/${path}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.message || 'Upload failed', res.status)
  return json.data.user
}

export const uploadEmployeeAvatar = (id: number, file: File) => upload(id, 'avatar', file)
export const uploadEmployeeIdCard = (id: number, file: File) => upload(id, 'id-card', file)
