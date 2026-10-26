export type ReportPeriod =
  | 'all'
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface ReportFilterParams {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  userId?: number;
  teamId?: number;
}

export interface OverviewSummary {
  totalLeads: number;
  convertedLeads: number;
  qualifiedLeads: number;
  disqualifiedLeads: number;
  leadConversionRate: number;
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalPipelineValue: number;
  wonRevenue: number;
  lostValue: number;
  winRate: number;
  averageDealSize: number;
  totalTasksCompleted: number;
  totalMeetingsConducted: number;
}

export interface StageDistributionItem {
  stageId: number;
  stageName: string;
  position: number;
  kind: string;
  count: number;
  totalValue: number;
  averageValue?: number;
}

export interface MonthlyTrendItem {
  month: string;
  leads: number;
  conversions: number;
  wonRevenue: number;
  wonDealsCount: number;
}

export interface ReportOverviewData {
  summary: OverviewSummary;
  stageDistribution: StageDistributionItem[];
  trends: MonthlyTrendItem[];
}

export interface LeadByStatusItem {
  status: string;
  count: number;
  percentage: number;
}

export interface LeadByPriorityItem {
  priority: string;
  count: number;
  percentage: number;
}

export interface LeadBySourceItem {
  sourceId: number;
  sourceName: string;
  count: number;
  convertedCount: number;
  conversionRate: number;
}

export interface DisqualificationReasonItem {
  reason: string;
  count: number;
}

export interface LeadsReportData {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  byStatus: LeadByStatusItem[];
  byPriority: LeadByPriorityItem[];
  bySource: LeadBySourceItem[];
  disqualificationAnalysis: DisqualificationReasonItem[];
}

export interface LossReasonItem {
  reason: string;
  count: number;
  lostValue: number;
}

export interface SizeDistributionItem {
  label: string;
  count: number;
  value: number;
}

export interface DealsReportData {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalPipelineValue: number;
  wonRevenue: number;
  lostValue: number;
  winRate: number;
  averageSalesCycleDays: number;
  stageDistribution: StageDistributionItem[];
  lossReasonsAnalysis: LossReasonItem[];
  sizeDistribution: SizeDistributionItem[];
}

export interface RepPerformanceItem {
  userId: number;
  name: string;
  email: string;
  role: string;
  teamName: string | null;
  leadsAssigned: number;
  leadsConverted: number;
  leadConversionRate: number;
  dealsCreated: number;
  dealsWon: number;
  dealsLost: number;
  openDeals: number;
  pipelineValue: number;
  revenueAchieved: number;
  targetQuota: number;
  targetAttainment: number;
  winRate: number;
  tasksCompleted: number;
  meetingsHeld: number;
}

export interface ReportFilterOptions {
  users: Array<{ id: number; name: string; email: string; role?: { name: string } | null }>;
  teams: Array<{ id: number; name: string }>;
  sources: Array<{ id: number; name: string }>;
  stages: Array<{ id: number; name: string; position: number; kind: string }>;
}
