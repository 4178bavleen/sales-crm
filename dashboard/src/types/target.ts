export type TargetPeriod = 'MONTHLY' | 'QUARTERLY';

export type TargetStatus = 'ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

export interface TargetEmployee {
  id: number;
  name: string;
  email: string;
  role?: { name: string } | null;
}

export interface TargetTeam {
  id: number;
  name: string;
  membersCount: number;
}

export interface TargetCreator {
  id: number;
  name: string;
  email: string;
}

export interface TargetItem {
  id: number;
  userId: number | null;
  teamId: number | null;
  periodType: TargetPeriod;
  periodStart: string;
  periodEnd: string;
  amount: number;
  achievedRevenue: number;
  progressPercentage: number;
  wonDealsCount: number;
  pipelineRevenue: number;
  openDealsCount: number;
  status: TargetStatus;
  employee: TargetEmployee | null;
  team: TargetTeam | null;
  createdBy: TargetCreator;
  changesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TargetMetricsSummary {
  totalQuota: number;
  totalAchieved: number;
  overallAttainment: number;
  totalTargets: number;
  achievedCount: number;
  onTrackCount: number;
  atRiskCount: number;
  behindCount: number;
  topPerformer: {
    id: number;
    name: string;
    attainment: number;
    achieved: number;
    quota: number;
  } | null;
  trends?: {
    quota: number[];
    revenue: number[];
    attainment: number[];
    performance: number[];
  };
}

export interface TargetListResponse {
  targets: TargetItem[];
  summary: TargetMetricsSummary;
}

export interface TargetChange {
  id: number;
  oldAmount: number;
  newAmount: number;
  changedAt: string;
  reason: string | null;
  changedBy: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TargetDetail extends TargetItem {
  wonDeals: Array<{
    id: number;
    name: string;
    amount: number;
    closedAt: string | null;
    owner: { id: number; name: string };
  }>;
  changes: TargetChange[];
}

export interface TargetOptions {
  users: Array<{
    id: number;
    name: string;
    email: string;
    role?: { name: string } | null;
    team?: { id: number; name: string } | null;
  }>;
  teams: Array<{
    id: number;
    name: string;
    _count: { members: number };
  }>;
  years: number[];
}

export interface CreateTargetPayload {
  userId?: number | null;
  teamId?: number | null;
  periodType: TargetPeriod;
  periodStart: string;
  periodEnd: string;
  amount: number;
  reason?: string;
}

export interface UpdateTargetPayload {
  userId?: number | null;
  teamId?: number | null;
  periodType?: TargetPeriod;
  periodStart?: string;
  periodEnd?: string;
  amount?: number;
  reason?: string;
}

export interface ListTargetsParams {
  periodType?: TargetPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  userId?: number;
  teamId?: number;
  search?: string;
}
