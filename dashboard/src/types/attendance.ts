export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "LEAVE",
  "WEEKEND",
  "HOLIDAY",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceUser = {
  id: number;
  name: string;
  email: string;
  role: { name: string };
  employeeProfile?: { employeeCode: string | null } | null;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingMinutes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: AttendanceUser;
};

export type AttendanceEmployeeOption = AttendanceUser;

export type AttendanceSummary = Record<AttendanceStatus, number> & {
  total: number;
};

export type AttendanceFilters = {
  page?: number;
  limit?: number;
  search?: string;
  userId?: number;
  status?: AttendanceStatus;
  date?: string;
  from?: string;
  to?: string;
};

export type AttendancePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AttendanceListResponse = {
  records: AttendanceRecord[];
  pagination: AttendancePagination;
  summary: AttendanceSummary;
};

export type AttendanceOptionsResponse = {
  employees: AttendanceEmployeeOption[];
};

export type AttendanceFormValues = {
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes: string;
};

export type CreateAttendanceInput = AttendanceFormValues;

export type UpdateAttendanceInput = Partial<AttendanceFormValues>;

export type RegisterStatus = AttendanceStatus | "";

export type RegisterEntry = {
  userId: number;
  status: RegisterStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  recordId?: number;
};

export type BulkAttendanceEntry = {
  userId: number;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
};

export type BulkAttendanceInput = {
  date: string;
  records: BulkAttendanceEntry[];
  clearUserIds: number[];
};

export type BulkAttendanceResponse = {
  records: AttendanceRecord[];
  count: number;
  cleared: number;
};
