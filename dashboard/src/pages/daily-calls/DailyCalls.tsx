import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Copy,
  Disc,
  Download,
  MinusCircle,
  MoreVertical,
  Phone,
  PhoneCall,
  PhoneMissed,
  RotateCw,
  Search,
  SlidersHorizontal,
  Star,
  Voicemail,
  X,
} from "lucide-react";
import LogActivityModal from "../follow-ups/LogActivityModal";
import type { LogActivityValues } from "../follow-ups/types";
import WebPhone from "./WebPhone";
import { ApiError, request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";
type ActiveTab = "overview" | "call_activity" | "agent_activity" | "dispositions";

interface CallRecord {
  id: number;
  callId: string;
  phoneNumber: string;
  contactName: string;
  entityKind: "Lead" | "Deal" | "Customer" | "Company" | "Task" | "Activity";
  leadId: number | null;
  dealId: number | null;
  extension: string;
  performedBy: string;
  performedById: number;
  type: "Answered" | "No Answer" | "Busy" | "Voicemail" | "Follow-up" | "Other";
  campaign: string;
  disposition: string;
  dispositionCategory: "completed" | "answered" | "interested" | "followup" | "unanswered" | "busy" | "voicemail" | "other";
  occurredAt: string;
  notes: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function mapCallRecord(item: any): CallRecord {
  let entityName = "Direct Contact";
  let entityKind: CallRecord["entityKind"] = "Activity";
  let leadId: number | null = null;
  let dealId: number | null = null;
  let phoneNumber = "—";
  let campaign = "—";

  if (item.lead) {
    entityName = item.lead.contactName || item.lead.companyName || `Lead #${item.lead.id}`;
    entityKind = "Lead";
    leadId = item.lead.id;
    if (item.lead.phone) phoneNumber = item.lead.phone;
    if (item.lead.companyName) campaign = item.lead.companyName;
  } else if (item.deal) {
    entityName = item.deal.name || `Deal #${item.deal.id}`;
    entityKind = "Deal";
    dealId = item.deal.id;
    campaign = item.deal.name;
    if (item.deal.lead?.phone) phoneNumber = item.deal.lead.phone;
    else if (item.deal.customer?.primaryContact?.phone) phoneNumber = item.deal.customer.primaryContact.phone;
    else if (item.deal.customer?.company?.phone) phoneNumber = item.deal.customer.company.phone;
  } else if (item.customer) {
    entityName = item.customer.primaryContact?.fullName || item.customer.company?.name || `Customer #${item.customer.id}`;
    entityKind = "Customer";
    if (item.customer.primaryContact?.phone) phoneNumber = item.customer.primaryContact.phone;
    else if (item.customer.company?.phone) phoneNumber = item.customer.company.phone;
    if (item.customer.company?.name) campaign = item.customer.company.name;
  } else if (item.company) {
    entityName = item.company.name;
    entityKind = "Company";
    if (item.company.phone) phoneNumber = item.company.phone;
    campaign = item.company.name;
  } else if (item.task) {
    entityName = item.task.title;
    entityKind = "Task";
    campaign = item.task.title;
  }

  const occurredDate = new Date(item.occurredAt);
  const yyyy = occurredDate.getFullYear();
  const mm = pad(occurredDate.getMonth() + 1);
  const dd = pad(occurredDate.getDate());
  const callId = `CA-${yyyy}-${mm}${dd}-${String(item.id).padStart(4, "0")}`;

  const outcomeText = (item.outcome ?? "").toLowerCase();
  const notesText = (item.notes ?? "").toLowerCase();

  // Performer & Extension
  const performerId = item.performedById || item.performedBy?.id || 1;
  const extension = String(1000 + (performerId * 3) % 25);
  const performedBy = item.performedBy?.name || "Agent";

  // Type & Disposition
  let type: CallRecord["type"] = "Other";
  let dispositionCategory: CallRecord["dispositionCategory"] = "other";
  let disposition = item.outcome || "Completed";

  if (/follow[- ]?up|callback|call back/.test(outcomeText) || /follow[- ]?up/.test(notesText)) {
    type = "Follow-up";
    dispositionCategory = "followup";
    disposition = "Follow-up Needed";
  } else if (/no answer|unreachable|not reachable|missed|unanswered/.test(outcomeText)) {
    type = "No Answer";
    dispositionCategory = "unanswered";
    disposition = "No Answer";
  } else if (/busy|line busy/.test(outcomeText)) {
    type = "Busy";
    dispositionCategory = "busy";
    disposition = "Busy";
  } else if (/voicemail|voice mail|left message/.test(outcomeText)) {
    type = "Voicemail";
    dispositionCategory = "voicemail";
    disposition = "Voicemail";
  } else if (/interested|meeting|demo|proposal/.test(outcomeText)) {
    type = "Answered";
    dispositionCategory = "interested";
    disposition = "Interested";
  } else if (/connected|answered|positive|confirmed/.test(outcomeText)) {
    type = "Answered";
    dispositionCategory = "answered";
    disposition = "Answered";
  } else if (item.outcome) {
    disposition = item.outcome;
    type = "Answered";
    dispositionCategory = "completed";
  }

  return {
    id: item.id,
    callId,
    phoneNumber,
    contactName: entityName,
    entityKind,
    leadId,
    dealId,
    extension,
    performedBy,
    performedById: performerId,
    type,
    campaign,
    disposition,
    dispositionCategory,
    occurredAt: item.occurredAt,
    notes: item.notes ?? "",
  };
}

export default function DailyCalls() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("call_activity");

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [dispositionFilter, setDispositionFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Columns Visibility
  const [showColumnsPopover, setShowColumnsPopover] = useState(false);
  const [columnsVisibility, setColumnsVisibility] = useState({
    callId: true,
    number: true,
    extension: true,
    type: true,
    campaign: true,
    disposition: true,
    dateTime: true,
    actions: true,
  });

  // Sorting State
  const [sortField, setSortField] = useState<keyof CallRecord>("occurredAt");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Panels State
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [showLogCall, setShowLogCall] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Options for Log Call
  const [leads, setLeads] = useState<{ id: number; contactName: string; companyName?: string | null }[]>([]);
  const [deals, setDeals] = useState<{ id: number; name: string }[]>([]);

  // WebPhone State
  const [isWebPhoneOpen, setIsWebPhoneOpen] = useState(false);
  const [webPhoneDialNumber, setWebPhoneDialNumber] = useState("");
  const [webPhoneContactName, setWebPhoneContactName] = useState("");
  const [webPhoneLeadId, setWebPhoneLeadId] = useState<number | null>(null);
  const [webPhoneDealId, setWebPhoneDealId] = useState<number | null>(null);

  const columnsRef = useRef<HTMLDivElement>(null);
  const session = getSession();

  // Close columns popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsRef.current && !columnsRef.current.contains(event.target as Node)) {
        setShowColumnsPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute active date range based on preset
  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    if (datePreset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "7d") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "30d") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "90d") {
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "custom") {
      const [sy, sm, sd] = customStartDate.split("-").map(Number);
      const [ey, em, ed] = customEndDate.split("-").map(Number);
      const customStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      const customEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      return { start: customStart, end: customEnd };
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch calls from real backend
  const fetchCalls = useCallback(async () => {
    const token = getSession()?.token;
    if (!token) return;

    try {
      setLoading(true);
      setApiError(null);

      const params = new URLSearchParams({
        type: "CALL",
        limit: "250",
        dateFrom: dateRange.start.toISOString(),
        dateTo: dateRange.end.toISOString(),
      });

      const result = await request<{ items?: any[] }>(
        `${ENDPOINTS.activities.list}?${params.toString()}`,
        { token }
      );

      const mapped = (result.items ?? []).map(mapCallRecord);
      setCalls(mapped);
    } catch (err) {
      setCalls([]);
      setApiError(err instanceof ApiError ? err.message : "Failed to load calls");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchCalls();
  }, [fetchCalls]);

  // Load leads and deals options for logging calls
  useEffect(() => {
    const token = getSession()?.token;
    if (!token) return;

    request<{
      leads?: { id: number; contactName: string; companyName?: string | null }[];
      deals?: { id: number; name: string }[];
    }>(ENDPOINTS.tasks.options, { token })
      .then((res) => {
        setLeads(res.leads ?? []);
        setDeals(res.deals ?? []);
      })
      .catch(() => undefined);
  }, []);

  // Extract unique campaigns, agents, dispositions from data
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => {
      if (c.campaign && c.campaign !== "—") set.add(c.campaign);
    });
    return Array.from(set).sort();
  }, [calls]);

  const uniqueAgents = useMemo(() => {
    const map = new Map<number, string>();
    calls.forEach((c) => {
      map.set(c.performedById, c.performedBy);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [calls]);

  const uniqueDispositions = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => {
      if (c.disposition) set.add(c.disposition);
    });
    return Array.from(set).sort();
  }, [calls]);

  // Filtered Calls
  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();

    return calls.filter((call) => {
      // Type
      if (typeFilter !== "all" && call.type.toLowerCase().replace(/[\s-]/g, "_") !== typeFilter.toLowerCase()) {
        return false;
      }
      // Campaign
      if (campaignFilter !== "all" && call.campaign !== campaignFilter) {
        return false;
      }
      // Disposition
      if (dispositionFilter !== "all" && call.disposition !== dispositionFilter) {
        return false;
      }
      // Agent
      if (agentFilter !== "all" && String(call.performedById) !== agentFilter) {
        return false;
      }
      // Search
      if (query) {
        const matches = [
          call.callId,
          call.phoneNumber,
          call.contactName,
          call.extension,
          call.performedBy,
          call.campaign,
          call.disposition,
          call.notes,
        ].some((val) => val && val.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    });
  }, [calls, search, typeFilter, campaignFilter, dispositionFilter, agentFilter]);

  // Sorted Calls
  const sortedCalls = useMemo(() => {
    const copy = [...filteredCalls];
    copy.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return copy;
  }, [filteredCalls, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedCalls.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCalls = sortedCalls.slice(startIndex, startIndex + pageSize);

  // Top stat badges calculations from real data
  const stats = useMemo(() => {
    let answered = 0;
    let unanswered = 0;
    let followups = 0;

    for (const c of filteredCalls) {
      if (c.type === "Answered" || c.dispositionCategory === "answered" || c.dispositionCategory === "completed") {
        answered++;
      } else if (c.type === "No Answer" || c.dispositionCategory === "unanswered" || c.type === "Busy") {
        unanswered++;
      }
      if (c.dispositionCategory === "followup" || c.type === "Follow-up") {
        followups++;
      }
    }

    const connectRate = filteredCalls.length > 0 ? Math.round((answered / filteredCalls.length) * 100) : 0;

    return {
      total: filteredCalls.length,
      answered,
      unanswered,
      followups,
      connectRate,
    };
  }, [filteredCalls]);

  // Agent Performance Grouping for "Agent Activity" tab
  const agentActivityStats = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        extension: string;
        total: number;
        answered: number;
        unanswered: number;
        followups: number;
      }
    >();

    for (const c of filteredCalls) {
      if (!map.has(c.performedById)) {
        map.set(c.performedById, {
          id: c.performedById,
          name: c.performedBy,
          extension: c.extension,
          total: 0,
          answered: 0,
          unanswered: 0,
          followups: 0,
        });
      }
      const item = map.get(c.performedById)!;
      item.total++;
      if (c.type === "Answered") item.answered++;
      else item.unanswered++;
      if (c.dispositionCategory === "followup" || c.type === "Follow-up") {
        item.followups++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredCalls]);

  // Dispositions Grouping for "Dispositions" tab
  const dispositionStats = useMemo(() => {
    const map = new Map<string, { disposition: string; category: string; count: number }>();
    for (const c of filteredCalls) {
      const key = c.disposition || "Unknown";
      if (!map.has(key)) {
        map.set(key, { disposition: key, category: c.dispositionCategory, count: 0 });
      }
      map.get(key)!.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredCalls]);

  // Log Call Handler
  async function handleLogCall(values: LogActivityValues) {
    const token = getSession()?.token;
    if (!token) return;

    await request(ENDPOINTS.activities.create, {
      method: "POST",
      token,
      body: {
        type: "CALL",
        outcome: values.outcome || null,
        notes: values.notes || null,
        occurredAt: values.occurredAt,
        leadId: values.leadId ?? null,
        dealId: values.dealId ?? null,
      },
    });

    await fetchCalls();
  }

  // Quick Dial in WebPhone
  function handleDialCall(call: CallRecord) {
    setWebPhoneDialNumber(call.phoneNumber !== "—" ? call.phoneNumber : "");
    setWebPhoneContactName(call.contactName);
    setWebPhoneLeadId(call.leadId);
    setWebPhoneDealId(call.dealId);
    setIsWebPhoneOpen(true);
  }

  // Copy helper
  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  }

  // Toggle sort
  function handleSort(field: keyof CallRecord) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  // Excel Export
  function exportCalls() {
    if (filteredCalls.length === 0) return;

    const rows = filteredCalls.map((c) => ({
      "Call ID": c.callId,
      Number: c.phoneNumber,
      Contact: c.contactName,
      Extension: c.extension,
      "Logged By": c.performedBy,
      Type: c.type,
      Campaign: c.campaign,
      Disposition: c.disposition,
      "Date / Time": new Date(c.occurredAt).toLocaleString(),
      Notes: c.notes,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Call Activity Report");
    XLSX.writeFile(workbook, `call-activity-report-${datePreset}.xlsx`);
  }

  // Render Disposition Badge
  function renderDisposition(call: CallRecord) {
    switch (call.dispositionCategory) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "answered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <CheckCircle size={13} className="shrink-0 text-blue-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "interested":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Star size={13} className="shrink-0 text-indigo-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "followup":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <Clock size={13} className="shrink-0 text-amber-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "busy":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <AlertCircle size={13} className="shrink-0 text-amber-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "voicemail":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600">
            <Disc size={13} className="shrink-0 text-purple-500" />
            <span>{call.disposition}</span>
          </span>
        );
      case "unanswered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <MinusCircle size={13} className="shrink-0 text-rose-500" />
            <span>{call.disposition}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <CheckCircle2 size={13} className="shrink-0 text-slate-400" />
            <span>{call.disposition}</span>
          </span>
        );
    }
  }

  // Render Type Badge
  function renderType(type: CallRecord["type"]) {
    switch (type) {
      case "Answered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Phone size={13} className="text-emerald-500" />
            <span>Answered</span>
          </span>
        );
      case "No Answer":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <PhoneMissed size={13} className="text-rose-500" />
            <span>No Answer</span>
          </span>
        );
      case "Busy":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <PhoneCall size={13} className="text-amber-500" />
            <span>Busy</span>
          </span>
        );
      case "Voicemail":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600">
            <Voicemail size={13} className="text-purple-500" />
            <span>Voicemail</span>
          </span>
        );
      case "Follow-up":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
            <Clock size={13} className="text-blue-500" />
            <span>Follow-up</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Phone size={13} className="text-slate-400" />
            <span>{type}</span>
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Call Activity Report
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Detailed call records and activity across your phone system.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={exportCalls}
            disabled={filteredCalls.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>

          {/* Columns Toggle Button */}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumnsPopover(!showColumnsPopover)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Columns3 size={14} className="text-slate-500" />
              <span>Columns</span>
            </button>

            {showColumnsPopover && (
              <div className="absolute right-0 top-11 z-40 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Visible Columns
                </p>
                <div className="space-y-1.5">
                  {Object.entries({
                    callId: "Call ID",
                    number: "Number & Contact",
                    extension: "Extension",
                    type: "Type",
                    campaign: "Campaign",
                    disposition: "Disposition",
                    dateTime: "Date / Time",
                    actions: "Actions",
                  }).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={columnsVisibility[key as keyof typeof columnsVisibility]}
                        onChange={(e) =>
                          setColumnsVisibility((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Log Call Action */}
          <button
            type="button"
            onClick={() => setShowLogCall(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <Phone size={14} />
            <span>Log Call</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={16} className="shrink-0 text-rose-500" />
          <span>{apiError}</span>
        </div>
      )}

      {/* 2. Tabs Row + Right-side Stats Badges */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-1">
        {/* Left Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "call_activity", label: "Call Activity" },
            { id: "agent_activity", label: "Agent Activity" },
            { id: "dispositions", label: "Dispositions" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`relative pb-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Badges & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void fetchCalls()}
            disabled={loading}
            title="Refresh call data"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700">
            {stats.total.toLocaleString()} Calls
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {stats.answered.toLocaleString()} Answered
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700">
            {stats.unanswered.toLocaleString()} No Answer
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-700">
            {stats.followups.toLocaleString()} Follow-ups
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setDatePreset("today");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "today"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setDatePreset("7d");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "7d"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setDatePreset("30d");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "30d"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setDatePreset("90d");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "90d"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              90 Days
            </button>
            <button
              type="button"
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "custom"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>Custom</span>
              <CalendarDays size={13} />
            </button>
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            <div className="flex items-center">
              <span className="mr-1.5 text-[11px] font-semibold text-slate-400 hidden xl:inline">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="answered">Answered</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="voicemail">Voicemail</option>
                <option value="followup">Follow-up</option>
              </select>
            </div>

            {/* Campaigns */}
            <div className="flex items-center">
              <span className="mr-1.5 text-[11px] font-semibold text-slate-400 hidden xl:inline">Campaigns:</span>
              <select
                value={campaignFilter}
                onChange={(e) => {
                  setCampaignFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 max-w-[130px] truncate cursor-pointer"
              >
                <option value="all">All Campaigns</option>
                {uniqueCampaigns.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            {/* Disposition */}
            <div className="flex items-center">
              <span className="mr-1.5 text-[11px] font-semibold text-slate-400 hidden xl:inline">Disposition:</span>
              <select
                value={dispositionFilter}
                onChange={(e) => {
                  setDispositionFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 max-w-[130px] truncate cursor-pointer"
              >
                <option value="all">All Dispositions</option>
                {uniqueDispositions.map((disp) => (
                  <option key={disp} value={disp}>
                    {disp}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search calls..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-600 placeholder:text-slate-400"
              />
            </div>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showAdvancedFilters || agentFilter !== "all"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomPicker && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDatePreset("custom");
                setShowCustomPicker(false);
                setPage(1);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        )}

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Filter by Agent:</span>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map((ag) => (
                  <option key={ag.id} value={String(ag.id)}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setCampaignFilter("all");
                setDispositionFilter("all");
                setAgentFilter("all");
                setSearch("");
                setPage(1);
              }}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Tab Views Content */}
      {activeTab === "call_activity" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {columnsVisibility.callId && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("callId")}
                    >
                      <div className="flex items-center gap-1">
                        <span>CALL ID</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}
                  {columnsVisibility.number && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("phoneNumber")}
                    >
                      <div className="flex items-center gap-1">
                        <span>NUMBER</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}
                  {columnsVisibility.extension && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("extension")}
                    >
                      <div className="flex items-center gap-1">
                        <span>EXTENSION</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}
                  {columnsVisibility.type && (
                    <th className="px-4 py-3">
                      <span>TYPE</span>
                    </th>
                  )}
                  {columnsVisibility.campaign && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("campaign")}
                    >
                      <div className="flex items-center gap-1">
                        <span>CAMPAIGN</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}

                  {columnsVisibility.disposition && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("disposition")}
                    >
                      <div className="flex items-center gap-1">
                        <span>DISPOSITION</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}
                  {columnsVisibility.dateTime && (
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                      onClick={() => handleSort("occurredAt")}
                    >
                      <div className="flex items-center gap-1">
                        <span>DATE / TIME</span>
                        <span className="text-slate-400">⇅</span>
                      </div>
                    </th>
                  )}
                  {columnsVisibility.actions && (
                    <th className="px-4 py-3 text-right">
                      <span>ACTIONS</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RotateCw size={20} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-semibold">Loading calls...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Phone size={24} className="text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No calls found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting your date range or filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCalls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      {/* Call ID */}
                      {columnsVisibility.callId && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-medium text-slate-800">
                          {call.callId}
                        </td>
                      )}



                      {/* Number & Contact */}
                      {columnsVisibility.number && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDialCall(call);
                              }}
                              className="text-left font-bold text-slate-900 hover:text-indigo-600 transition"
                            >
                              {call.phoneNumber}
                            </button>
                            <span className="text-[11px] text-slate-500">{call.contactName}</span>
                          </div>
                        </td>
                      )}

                      {/* Extension */}
                      {columnsVisibility.extension && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                          <span title={`Agent: ${call.performedBy}`}>{call.extension}</span>
                        </td>
                      )}

                      {/* Type */}
                      {columnsVisibility.type && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderType(call.type)}
                        </td>
                      )}

                      {/* Campaign */}
                      {columnsVisibility.campaign && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                          {call.campaign}
                        </td>
                      )}



                      {/* Disposition */}
                      {columnsVisibility.disposition && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderDisposition(call)}
                        </td>
                      )}

                      {/* Date / Time */}
                      {columnsVisibility.dateTime && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900">
                              {new Date(call.occurredAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(call.occurredAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Actions */}
                      {columnsVisibility.actions && (
                        <td
                          className="px-4 py-3 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleDialCall(call)}
                              title="Dial in WebPhone"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition cursor-pointer"
                            >
                              <Phone size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCall(call)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                              title="View details"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600 bg-white">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-900">
                {sortedCalls.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(startIndex + pageSize, sortedCalls.length)}
              </span>{" "}
              of <span className="font-bold text-slate-900">{sortedCalls.length}</span> results
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition cursor-pointer ${
                      p === currentPage
                        ? "border border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Overview Tab View */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Total Calls</span>
                <PhoneCall size={18} className="text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Across active date range</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Connect Rate</span>
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {stats.total > 0 ? `${Math.round((stats.answered / stats.total) * 100)}%` : "0%"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {stats.answered} answered out of {stats.total}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">No Answer</span>
                <PhoneMissed size={18} className="text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.unanswered}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Unanswered calls</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Follow-ups Needed</span>
                <Clock size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.followups}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Calls requiring next step</p>
            </div>
          </div>

          {/* Disposition Breakdown Cards */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Call Outcomes Distribution</h3>
            <div className="space-y-3">
              {dispositionStats.map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={item.disposition} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.disposition}</span>
                      <span className="text-slate-500">
                        {item.count} calls ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Agent Activity Tab View */}
      {activeTab === "agent_activity" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-900">Agent Performance Breakdown</h3>
            <p className="text-[11px] text-slate-500">
              Calls logged by sales reps and agents within the active filter
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Extension</th>
                <th className="px-5 py-3">Total Calls</th>
                <th className="px-5 py-3">Answered</th>
                <th className="px-5 py-3">Unanswered</th>
                <th className="px-5 py-3">Connect Rate</th>
                <th className="px-5 py-3">Follow-ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {agentActivityStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No agent activity found
                  </td>
                </tr>
              ) : (
                agentActivityStats.map((ag) => {
                  const rate = ag.total > 0 ? Math.round((ag.answered / ag.total) * 100) : 0;
                  return (
                    <tr key={ag.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700 text-xs">
                            {ag.name[0]}
                          </div>
                          <span className="font-semibold text-slate-900">{ag.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-600">{ag.extension}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">{ag.total}</td>
                      <td className="px-5 py-3 text-emerald-600 font-semibold">{ag.answered}</td>
                      <td className="px-5 py-3 text-rose-600 font-semibold">{ag.unanswered}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{rate}%</td>
                      <td className="px-5 py-3 font-semibold text-amber-600">
                        {ag.followups}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. Dispositions Tab View */}
      {activeTab === "dispositions" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-900">Call Dispositions</h3>
            <p className="text-[11px] text-slate-500">
              Breakdown of call disposition outcomes across your sales team
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Disposition</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Call Count</th>
                <th className="px-5 py-3">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {dispositionStats.map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <tr key={item.disposition} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3 font-semibold text-slate-900">{item.disposition}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">{item.count}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating WebPhone Launcher Button (Bottom Right) */}
      {!isWebPhoneOpen && (
        <button
          type="button"
          onClick={() => {
            setIsWebPhoneOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Open WebPhone Dialer"
        >
          <Phone size={24} />
        </button>
      )}

      {/* WebPhone Floating Widget */}
      <WebPhone
        isOpen={isWebPhoneOpen}
        onClose={() => setIsWebPhoneOpen(false)}
        onMinimize={() => setIsWebPhoneOpen(false)}
        initialNumber={webPhoneDialNumber}
        contactName={webPhoneContactName}
        leadId={webPhoneLeadId}
        dealId={webPhoneDealId}
        extension={`10${session?.user ? (session.user.id % 90) + 10 : 12}`}
        onCallLogged={fetchCalls}
      />

      {/* Call Details Modal */}
      {selectedCall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setSelectedCall(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Call Details</h2>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {selectedCall.callId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {new Date(selectedCall.occurredAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {selectedCall.entityKind}
                  </span>
                  <p className="text-sm font-bold text-slate-900">{selectedCall.contactName}</p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">{selectedCall.phoneNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDialCall(selectedCall)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 transition cursor-pointer"
                >
                  <Phone size={13} />
                  <span>Call Back</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-100 bg-white p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Campaign / Record</span>
                  <p className="mt-1 font-semibold text-slate-800">{selectedCall.campaign}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Disposition</span>
                  <div className="mt-1">{renderDisposition(selectedCall)}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Type</span>
                  <div className="mt-1">{renderType(selectedCall.type)}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Logged By</span>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedCall.performedBy} (Ext. {selectedCall.extension})
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Call Notes
                </span>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedCall.notes || "No notes recorded for this call."}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3">
              <button
                type="button"
                onClick={() => copyToClipboard(selectedCall.phoneNumber)}
                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                {copiedText === selectedCall.phoneNumber ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedText === selectedCall.phoneNumber ? "Copied" : "Copy Number"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      <LogActivityModal
        isOpen={showLogCall}
        followUp={null}
        onClose={() => setShowLogCall(false)}
        onSave={handleLogCall}
        leads={leads}
        deals={deals}
        defaultType="CALL"
        lockType
        title="Log Call"
        subtitle="Record the outcome and details of this call"
      />
    </div>
  );
}
