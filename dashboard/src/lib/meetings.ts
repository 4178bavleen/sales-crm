import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  CreateMeetingInput,
  MeetingItem,
  MeetingOptions,
  MeetingsListResponse,
  MeetingStatus,
  UpdateMeetingInput,
} from "../types/meeting";

function authToken(): string | undefined {
  return getSession()?.token;
}

export async function fetchMeetings(params?: {
  search?: string;
  status?: MeetingStatus | "ALL";
  page?: number;
  limit?: number;
}): Promise<MeetingsListResponse> {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const url = qs ? `${ENDPOINTS.meetings.list}?${qs}` : ENDPOINTS.meetings.list;

  const res = await request<MeetingsListResponse>(url, {
    method: "GET",
    token: authToken(),
  });
  return res;
}

export async function fetchMeetingById(id: number): Promise<MeetingItem> {
  const res = await request<{ meeting: MeetingItem }>(ENDPOINTS.meetings.byId(id), {
    method: "GET",
    token: authToken(),
  });
  return res.meeting;
}

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingItem> {
  const res = await request<{ meeting: MeetingItem }>(ENDPOINTS.meetings.create, {
    method: "POST",
    body: input,
    token: authToken(),
  });
  return res.meeting;
}

export async function updateMeeting(
  id: number,
  input: UpdateMeetingInput,
): Promise<MeetingItem> {
  const res = await request<{ meeting: MeetingItem }>(ENDPOINTS.meetings.update(id), {
    method: "PATCH",
    body: input,
    token: authToken(),
  });
  return res.meeting;
}

export async function deleteMeeting(id: number): Promise<{ id: number; deleted: boolean }> {
  const res = await request<{ id: number; deleted: boolean }>(
    ENDPOINTS.meetings.delete(id),
    {
      method: "DELETE",
      token: authToken(),
    },
  );
  return res;
}

export async function fetchMeetingOptions(): Promise<MeetingOptions> {
  const res = await request<MeetingOptions>(ENDPOINTS.meetings.options, {
    method: "GET",
    token: authToken(),
  });
  return res;
}
