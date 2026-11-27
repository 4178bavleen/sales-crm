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

export type LeaveType = (typeof LEAVE_TYPES)[number];

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
  leaveType: LeaveType;
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
  daysByType: Record<LeaveType, number>;
  remainingBalance: {
    CASUAL: number;
    SICK: number;
    EARNED: number;
  };
  annualQuota: {
    CASUAL: number;
    SICK: number;
    EARNED: number;
  };
};

export type ApplyLeavePayload = {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  document?: File | null;
};

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
