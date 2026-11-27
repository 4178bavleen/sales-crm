export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'UNPAID',
  'MATERNITY',
  'PATERNITY',
  'COMP_OFF',
  'OTHER',
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number] | (string & {});

export const LEAVE_ACCRUAL_PERIODS = [
  'YEARLY',
  'HALF_YEARLY',
  'QUARTERLY',
  'MONTHLY',
] as const;

export type LeaveAccrualPeriod = (typeof LEAVE_ACCRUAL_PERIODS)[number];

export type LeavePolicy = {
  id: number;
  name: string;
  code: string;
  quota: number;
  period: LeaveAccrualPeriod;
  isPaid: boolean;
  requiresDocument: boolean;
  documentDescription?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PolicyStatCard = {
  id: number;
  code: string;
  name: string;
  quota: number;
  period: LeaveAccrualPeriod;
  periodLabel: string;
  isPaid: boolean;
  requiresDocument: boolean;
  documentDescription?: string | null;
  description?: string | null;
  usedDays: number;
  remainingDays: number;
};

export const LEAVE_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export type LeaveUser = {
  id: number;
  name: string;
  email: string;
  role: { name: string };
  employeeProfile?: {
    employeeCode: string | null;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  } | null;
};

export type LeaveApprover = {
  id: number;
  name: string;
  email: string;
};

export type LeaveRecord = {
  id: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentPath?: string | null;
  documentName?: string | null;
  documentType?: string | null;
  rejectionReason?: string | null;
  status: LeaveStatus;
  approvedById: number | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: LeaveUser;
  approvedBy?: LeaveApprover | null;
};

export type LeaveStats = {
  year: number;
  pendingRequests: number;
  totalApprovedDays: number;
  daysByType: Record<string, number>;
  policies?: PolicyStatCard[];
  remainingBalance: Record<string, number>;
  annualQuota: Record<string, number>;
};

export type ApplyLeavePayload = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  document?: File | null;
};

export type CreateLeavePolicyPayload = {
  name: string;
  code?: string;
  quota: number;
  period: LeaveAccrualPeriod;
  isPaid: boolean;
  requiresDocument: boolean;
  documentDescription?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateLeavePolicyPayload = Partial<CreateLeavePolicyPayload>;

export type ReviewLeavePayload = {
  action: 'APPROVE' | 'REJECT';
  remarks?: string;
};

export type LeaveFilters = {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type LeavePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LeaveListResponse = {
  records: LeaveRecord[];
  pendingCount?: number;
  pagination: LeavePagination;
};
