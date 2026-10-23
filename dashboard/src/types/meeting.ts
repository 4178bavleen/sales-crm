export type MeetingStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface MeetingOrganizer {
  id: number;
  name: string;
  email: string;
}

export interface MeetingLead {
  id: number;
  contactName: string;
  companyName: string;
  email?: string | null;
  phone?: string | null;
}

export interface MeetingDeal {
  id: number;
  name: string;
  estimatedValue?: number | null;
}

export interface MeetingParticipant {
  id: number;
  userId?: number | null;
  contactId?: number | null;
  user?: { id: number; name: string; email: string } | null;
  contact?: { id: number; fullName: string; email?: string | null; phone?: string | null } | null;
}

export interface MeetingItem {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingLink?: string | null;
  organizerId: number;
  status: MeetingStatus;
  notes?: string | null;
  outcome?: string | null;
  nextSteps?: string | null;
  leadId?: number | null;
  dealId?: number | null;
  companyId?: number | null;
  customerId?: number | null;
  createdAt: string;
  updatedAt: string;
  organizer: MeetingOrganizer;
  lead?: MeetingLead | null;
  deal?: MeetingDeal | null;
  company?: { id: number; name: string } | null;
  customer?: {
    id: number;
    primaryContact?: { id: number; fullName: string; email?: string | null; phone?: string | null } | null;
    company?: { id: number; name: string } | null;
  } | null;
  participants: MeetingParticipant[];
}

export interface CreateMeetingInput {
  title: string;
  startsAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  outcome?: string | null;
  nextSteps?: string | null;
  status?: MeetingStatus;
  leadId?: number | null;
  dealId?: number | null;
  companyId?: number | null;
  customerId?: number | null;
  participantUserIds?: number[];
  participantContactIds?: number[];
}

export interface UpdateMeetingInput extends Partial<CreateMeetingInput> {}

export interface MeetingOptions {
  users: Array<{ id: number; name: string; email: string }>;
  leads: Array<{ id: number; contactName: string; companyName: string }>;
  deals: Array<{ id: number; name: string }>;
  contacts: Array<{ id: number; fullName: string; email?: string | null }>;
}

export interface MeetingsListResponse {
  meetings: MeetingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    planned: number;
    completed: number;
    cancelled: number;
  };
}
