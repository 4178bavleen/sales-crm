import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  UserRound,
  LogOut,
  Check,
  CheckCheck,
  X,
  Command,
  UserCog,
  CheckSquare,
  Users,
  GitFork,
  CalendarDays,
  Trash2,
  RotateCw,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { signOut } from "../../lib/auth";
import { useSession } from "../../lib/useSession";
import { useNotifications } from "../../context/NotificationContext";
import {
  formatNotificationTime,
  getNotificationMetadata,
} from "../../lib/notifications";
import { executeGlobalSearch, matchSystemPages } from "../../lib/search";
import type {
  SearchCategory,
  SearchLeadResult,
  SearchContactResult,
  SearchDealResult,
  SearchTaskResult,
  SearchMeetingResult,
} from "../../types/search";
import type { NotificationItem } from "../../types/notification";
import SalesCrmLogo from "../ui/SalesCrmLogo";

export default function Topbar() {
  const navigate = useNavigate();
  const session = useSession();
  const userName = session?.user.name ?? "admin";
  const userRole = (session?.user.role ?? "ADMIN").toUpperCase();
  const avatarLetter = userName.charAt(0).toUpperCase() || "A";

  const {
    unreadCount,
    notifications,
    loading,
    refreshNotifications,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  // Search state
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("ALL");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Search results
  const [leadResults, setLeadResults] = useState<SearchLeadResult[]>([]);
  const [contactResults, setContactResults] = useState<SearchContactResult[]>([]);
  const [dealResults, setDealResults] = useState<SearchDealResult[]>([]);
  const [taskResults, setTaskResults] = useState<SearchTaskResult[]>([]);
  const [meetingResults, setMeetingResults] = useState<SearchMeetingResult[]>([]);

  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState<"all" | "unread">("all");
  const [showProfile, setShowProfile] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Matched system pages
  const matchedPages = useMemo(() => {
    return matchSystemPages(search, 4);
  }, [search]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setShowSearchResults(true);
        } else if (mobileSearchInputRef.current) {
          setShowMobileSearch(true);
          mobileSearchInputRef.current.focus();
        }
      }
      if (event.key === "Escape") {
        setShowSearchResults(false);
        setShowMobileSearch(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search query execution
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLeadResults([]);
      setContactResults([]);
      setDealResults([]);
      setTaskResults([]);
      setMeetingResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await executeGlobalSearch(trimmed, 4);
      setLeadResults(results.leads);
      setContactResults(results.contacts);
      setDealResults(results.deals);
      setTaskResults(results.tasks);
      setMeetingResults(results.meetings);
    } catch {
      setLeadResults([]);
      setContactResults([]);
      setDealResults([]);
      setTaskResults([]);
      setMeetingResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (!search.trim()) {
      setLeadResults([]);
      setContactResults([]);
      setDealResults([]);
      setTaskResults([]);
      setMeetingResults([]);
      setShowSearchResults(false);
      setHighlightedIndex(-1);
      return;
    }

    setShowSearchResults(true);
    setHighlightedIndex(-1);
    const timer = setTimeout(() => {
      void performSearch(search);
    }, 220);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  const totalResultsCount =
    leadResults.length +
    dealResults.length +
    contactResults.length +
    taskResults.length +
    meetingResults.length +
    matchedPages.length;

  // Flatten active items for keyboard arrow navigation
  const visibleItems = useMemo(() => {
    const list: Array<{ url: string; label: string; kind: string }> = [];

    if (activeCategory === "ALL" || activeCategory === "PAGES") {
      matchedPages.forEach((p) =>
        list.push({ url: p.path, label: p.name, kind: "Page" })
      );
    }
    if (activeCategory === "ALL" || activeCategory === "LEADS") {
      leadResults.forEach((l) =>
        list.push({
          url: `/leads?leadId=${l.id}`,
          label: `${l.contactName} (${l.companyName || "Lead"})`,
          kind: "Lead",
        })
      );
    }
    if (activeCategory === "ALL" || activeCategory === "DEALS") {
      dealResults.forEach((d) =>
        list.push({
          url: `/deals?search=${encodeURIComponent(d.name)}`,
          label: `${d.name} (Deal)`,
          kind: "Deal",
        })
      );
    }
    if (activeCategory === "ALL" || activeCategory === "CONTACTS") {
      contactResults.forEach((c) =>
        list.push({
          url: `/contacts?search=${encodeURIComponent(c.fullName)}`,
          label: `${c.fullName} (Contact)`,
          kind: "Contact",
        })
      );
    }
    if (activeCategory === "ALL" || activeCategory === "TASKS") {
      taskResults.forEach((t) =>
        list.push({
          url: `/tasks?taskId=${t.id}`,
          label: `${t.title} (Task)`,
          kind: "Task",
        })
      );
    }
    if (activeCategory === "ALL" || activeCategory === "MEETINGS") {
      meetingResults.forEach((m) =>
        list.push({
          url: `/meetings?search=${encodeURIComponent(m.title)}`,
          label: `${m.title} (Meeting)`,
          kind: "Meeting",
        })
      );
    }

    return list;
  }, [
    activeCategory,
    matchedPages,
    leadResults,
    dealResults,
    contactResults,
    taskResults,
    meetingResults,
  ]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = search.trim();
    if (!query) return;

    setShowSearchResults(false);
    setShowMobileSearch(false);

    // If an item was selected with keyboard arrows
    if (highlightedIndex >= 0 && highlightedIndex < visibleItems.length) {
      navigate(visibleItems[highlightedIndex].url);
      setSearch("");
      return;
    }

    // Intelligent default route based on matched categories
    if (matchedPages.length > 0) {
      navigate(matchedPages[0].path);
    } else if (dealResults.length > 0 && leadResults.length === 0) {
      navigate(`/deals?search=${encodeURIComponent(query)}`);
    } else if (contactResults.length > 0 && leadResults.length === 0) {
      navigate(`/contacts?search=${encodeURIComponent(query)}`);
    } else if (taskResults.length > 0 && leadResults.length === 0) {
      navigate(`/tasks?search=${encodeURIComponent(query)}`);
    } else if (meetingResults.length > 0 && leadResults.length === 0) {
      navigate(`/meetings?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/leads?search=${encodeURIComponent(query)}`);
    }
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < visibleItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : visibleItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleSelectResult = (url: string) => {
    setShowSearchResults(false);
    setShowMobileSearch(false);
    setSearch("");
    navigate(url);
  };

  const clearSearch = () => {
    setSearch("");
    setShowSearchResults(false);
    setLeadResults([]);
    setContactResults([]);
    setDealResults([]);
    setTaskResults([]);
    setMeetingResults([]);
    setHighlightedIndex(-1);
  };

  // Filter items in notifications dropdown
  const displayedNotifications =
    dropdownFilter === "unread"
      ? notifications.filter((item) => !item.isRead)
      : notifications;

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markRead(item.id);
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifications(false);

    const meta = getNotificationMetadata(item);
    if (meta.targetUrl) {
      navigate(meta.targetUrl);
    }
  };

  const getIconForNotification = (item: NotificationItem) => {
    const meta = getNotificationMetadata(item);
    switch (meta.category) {
      case "task":
        return <CheckSquare size={16} className="text-blue-600" />;
      case "lead":
        return <Users size={16} className="text-emerald-600" />;
      case "deal":
        return <GitFork size={16} className="text-amber-600" />;
      case "meeting":
        return <CalendarDays size={16} className="text-purple-600" />;
      default:
        return <Bell size={16} className="text-slate-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        {/* Left: Brand mark & Global Search input */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Brand mark — visible on small screens when sidebar is hidden */}
          <NavLink
            to="/"
            aria-label="Vibrantick Sales CRM — home"
            className="md:hidden shrink-0"
          >
            <SalesCrmLogo height="clamp(22px, 6.5vw, 30px)" />
          </NavLink>

          {/* Desktop Global Search Bar */}
          <div
            ref={searchContainerRef}
            className="relative hidden w-full max-w-xl sm:block"
          >
            <form onSubmit={handleSearchSubmit}>
              <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs">
                <Search size={17} className="shrink-0 text-slate-400" />

                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => {
                    if (search.trim()) setShowSearchResults(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Global search (leads, deals, contacts, tasks, meetings)..."
                  aria-label="Global search across CRM"
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />

                {isSearching ? (
                  <RotateCw size={14} className="animate-spin text-blue-600 shrink-0" />
                ) : search ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
                    <Command size={11} /> K
                  </span>
                )}
              </div>
            </form>

            {/* Desktop Global Search Dropdown Results */}
            {showSearchResults && search.trim() && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                {/* Search Category Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-2 text-xs">
                  {(
                    [
                      { id: "ALL", label: `All (${totalResultsCount})` },
                      { id: "LEADS", label: `Leads (${leadResults.length})` },
                      { id: "DEALS", label: `Deals (${dealResults.length})` },
                      { id: "CONTACTS", label: `Contacts (${contactResults.length})` },
                      { id: "TASKS", label: `Tasks (${taskResults.length})` },
                      { id: "MEETINGS", label: `Meetings (${meetingResults.length})` },
                      { id: "PAGES", label: `Pages (${matchedPages.length})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                        activeCategory === tab.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-200/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
                  {isSearching && totalResultsCount === 0 ? (
                    <div className="py-8 text-center">
                      <RotateCw size={20} className="mx-auto animate-spin text-blue-600" />
                      <p className="mt-2 text-xs text-slate-500">
                        Searching all CRM records...
                      </p>
                    </div>
                  ) : totalResultsCount === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Search size={16} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        No matches found for "{search}"
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Try searching across leads, deals, contacts, tasks, or meetings.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* SYSTEM PAGES & SHORTCUTS */}
                      {(activeCategory === "ALL" || activeCategory === "PAGES") &&
                        matchedPages.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Navigation Pages</span>
                              <span className="text-purple-600">Quick Jump</span>
                            </div>
                            {matchedPages.map((page) => {
                              const PageIcon = page.icon;
                              return (
                                <button
                                  key={`page-${page.path}`}
                                  type="button"
                                  onClick={() => handleSelectResult(page.path)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                                      <PageIcon size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {page.name}
                                    </span>
                                  </div>
                                  <span className="shrink-0 text-[11px] font-semibold text-purple-600">
                                    Open &rarr;
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      {/* LEADS SECTION */}
                      {(activeCategory === "ALL" || activeCategory === "LEADS") &&
                        leadResults.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Leads ({leadResults.length})</span>
                              <span className="text-blue-600">Lead Management</span>
                            </div>
                            {leadResults.map((lead) => (
                              <button
                                key={`lead-${lead.id}`}
                                type="button"
                                onClick={() => handleSelectResult(`/leads?leadId=${lead.id}`)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                    <Users size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {lead.contactName}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {lead.companyName || "No Company"} &bull; {lead.email || lead.phone || ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  {lead.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                      {/* DEALS SECTION */}
                      {(activeCategory === "ALL" || activeCategory === "DEALS") &&
                        dealResults.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Deals ({dealResults.length})</span>
                              <span className="text-amber-600">Sales Pipeline</span>
                            </div>
                            {dealResults.map((deal) => {
                              const company =
                                deal.customer?.company?.name ||
                                deal.lead?.companyName ||
                                "";
                              return (
                                <button
                                  key={`deal-${deal.id}`}
                                  type="button"
                                  onClick={() => handleSelectResult(`/deals?search=${encodeURIComponent(deal.name)}`)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                      <GitFork size={14} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 truncate">
                                        {deal.name}
                                      </p>
                                      <p className="text-[11px] text-slate-400 truncate">
                                        {company ? `${company} &bull; ` : ""}₹{deal.estimatedValue || 0}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    {deal.stage?.name || deal.status}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      {/* CONTACTS SECTION */}
                      {(activeCategory === "ALL" || activeCategory === "CONTACTS") &&
                        contactResults.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Contacts ({contactResults.length})</span>
                              <span className="text-blue-600">Directory</span>
                            </div>
                            {contactResults.map((contact) => (
                              <button
                                key={`contact-${contact.id}`}
                                type="button"
                                onClick={() => handleSelectResult(`/contacts?search=${encodeURIComponent(contact.fullName)}`)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <UserRound size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {contact.fullName}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {contact.company?.name || "Independent"} &bull; {contact.email || contact.phone || ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 text-[11px] text-slate-400">
                                  View &rarr;
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                      {/* TASKS SECTION */}
                      {(activeCategory === "ALL" || activeCategory === "TASKS") &&
                        taskResults.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Tasks ({taskResults.length})</span>
                              <span className="text-blue-600">Action Items</span>
                            </div>
                            {taskResults.map((task) => (
                              <button
                                key={`task-${task.id}`}
                                type="button"
                                onClick={() => handleSelectResult(`/tasks?taskId=${task.id}`)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <CheckSquare size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {task.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {task.assignedTo ? `Assigned: ${task.assignedTo.name} &bull; ` : ""}
                                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {task.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                      {/* MEETINGS SECTION */}
                      {(activeCategory === "ALL" || activeCategory === "MEETINGS") &&
                        meetingResults.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              <span>Meetings ({meetingResults.length})</span>
                              <span className="text-purple-600">Events</span>
                            </div>
                            {meetingResults.map((meeting) => (
                              <button
                                key={`meeting-${meeting.id}`}
                                type="button"
                                onClick={() => handleSelectResult(`/meetings?search=${encodeURIComponent(meeting.title)}`)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                                    <CalendarDays size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {meeting.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {meeting.lead?.contactName ? `With ${meeting.lead.contactName} &bull; ` : ""}
                                      {meeting.startsAt ? new Date(meeting.startsAt).toLocaleDateString() : ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                  {meeting.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </>
                  )}
                </div>

                {/* Dropdown Quick Module Search Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Search in:</span>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(`/leads?search=${encodeURIComponent(search)}`)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer"
                    >
                      Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(`/deals?search=${encodeURIComponent(search)}`)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer"
                    >
                      Deals
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(`/contacts?search=${encodeURIComponent(search)}`)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer"
                    >
                      Contacts
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(`/tasks?search=${encodeURIComponent(search)}`)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer"
                    >
                      Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(`/meetings?search=${encodeURIComponent(search)}`)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer"
                    >
                      Meetings
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    &uarr;&darr; to navigate &bull; Enter to select &bull; Esc to close
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile search toggle button */}
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden cursor-pointer"
          >
            {showMobileSearch ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfile(false);
                if (!showNotifications) {
                  void refreshNotifications();
                }
              }}
              className={`relative rounded-xl p-2 transition cursor-pointer ${
                showNotifications
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white shadow-xs animate-in zoom-in-50">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                        All caught up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void refreshNotifications()}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Refresh"
                    >
                      <RotateCw
                        size={14}
                        className={loading ? "animate-spin text-blue-600" : ""}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50/50">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDropdownFilter("all")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        dropdownFilter === "all"
                          ? "bg-white text-blue-600 font-semibold shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropdownFilter("unread")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        dropdownFilter === "unread"
                          ? "bg-white text-blue-600 font-semibold shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {loading && notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <RotateCw
                        size={20}
                        className="mx-auto animate-spin text-blue-600"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Checking notifications...
                      </p>
                    </div>
                  ) : displayedNotifications.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={20} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        {dropdownFilter === "unread"
                          ? "No unread notifications"
                          : "No notifications yet"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        When tasks are assigned to you, they'll appear here.
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((item) => {
                      const meta = getNotificationMetadata(item);
                      return (
                        <div
                          key={item.id}
                          onClick={() => void handleNotificationClick(item)}
                          className={`group flex items-start gap-3 px-4 py-3 transition cursor-pointer hover:bg-slate-50 ${
                            !item.isRead ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {/* Type icon */}
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs ${meta.iconBgClass}`}
                          >
                            {getIconForNotification(item)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p
                                className={`text-xs ${
                                  !item.isRead
                                    ? "font-bold text-slate-900"
                                    : "font-medium text-slate-800"
                                } line-clamp-1`}
                              >
                                {item.title}
                              </p>
                              {!item.isRead && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                                  title="Unread"
                                />
                              )}
                            </div>

                            {item.body && (
                              <p className="mt-0.5 text-[11px] leading-4 text-slate-500 line-clamp-2">
                                {item.body}
                              </p>
                            )}

                            <div className="mt-1.5 flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${meta.badgeClass}`}
                              >
                                {meta.categoryLabel}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Quick row actions on hover */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            {!item.isRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markRead(item.id);
                                }}
                                title="Mark read"
                                className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 transition"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeNotification(item.id);
                              }}
                              title="Delete"
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/notifications");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                  >
                    <span>View all notifications</span>
                    <ExternalLink size={12} />
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Auto-updates live
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={showProfile}
              onClick={() => {
                setShowProfile((prev) => !prev);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 rounded-xl p-1 transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                {avatarLetter}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-tight">
                  {userRole}
                </p>
              </div>

              <ChevronDown
                size={14}
                className="hidden text-slate-400 sm:block"
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-bold text-slate-900">
                    {userName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {userRole}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/profile");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <UserRound size={15} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/notifications");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Bell size={15} />
                  Notifications
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/users");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <UserCog size={15} />
                  User Management
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setShowProfile(false);
                    navigate("/login", { replace: true });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable mobile search */}
      {showMobileSearch && (
        <div className="border-t border-slate-100 p-3 sm:hidden bg-slate-50/50">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Global CRM search..."
                aria-label="Global search across CRM"
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded p-0.5 text-slate-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>

          {/* Mobile search results preview */}
          {search.trim() && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {isSearching && totalResultsCount === 0 ? (
                <div className="py-4 text-center">
                  <RotateCw size={16} className="mx-auto animate-spin text-blue-600" />
                  <p className="mt-1 text-[11px] text-slate-500">Searching CRM...</p>
                </div>
              ) : totalResultsCount === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No matches found for "{search}"
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
                  {matchedPages.map((page) => (
                    <button
                      key={`m-page-${page.path}`}
                      type="button"
                      onClick={() => handleSelectResult(page.path)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <span className="font-bold text-slate-900 truncate">{page.name}</span>
                      <span className="text-[10px] font-bold text-purple-600">Page</span>
                    </button>
                  ))}
                  {leadResults.map((lead) => (
                    <button
                      key={`m-lead-${lead.id}`}
                      type="button"
                      onClick={() => handleSelectResult(`/leads?leadId=${lead.id}`)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{lead.contactName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{lead.companyName}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">Lead</span>
                    </button>
                  ))}
                  {dealResults.map((deal) => (
                    <button
                      key={`m-deal-${deal.id}`}
                      type="button"
                      onClick={() => handleSelectResult(`/deals?search=${encodeURIComponent(deal.name)}`)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{deal.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">₹{deal.estimatedValue || 0}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600">Deal</span>
                    </button>
                  ))}
                  {contactResults.map((c) => (
                    <button
                      key={`m-contact-${c.id}`}
                      type="button"
                      onClick={() => handleSelectResult(`/contacts?search=${encodeURIComponent(c.fullName)}`)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{c.fullName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.company?.name || ""}</p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600">Contact</span>
                    </button>
                  ))}
                  {taskResults.map((t) => (
                    <button
                      key={`m-task-${t.id}`}
                      type="button"
                      onClick={() => handleSelectResult(`/tasks?taskId=${t.id}`)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.status}</p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600">Task</span>
                    </button>
                  ))}
                  {meetingResults.map((m) => (
                    <button
                      key={`m-meeting-${m.id}`}
                      type="button"
                      onClick={() => handleSelectResult(`/meetings?search=${encodeURIComponent(m.title)}`)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{m.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.status}</p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600">Meeting</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-around border-t border-slate-100 bg-slate-50 p-2 text-center text-xs gap-1 font-semibold text-blue-600">
                <button
                  type="button"
                  onClick={() => handleSelectResult(`/leads?search=${encodeURIComponent(search)}`)}
                >
                  Leads
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => handleSelectResult(`/deals?search=${encodeURIComponent(search)}`)}
                >
                  Deals
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => handleSelectResult(`/contacts?search=${encodeURIComponent(search)}`)}
                >
                  Contacts
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => handleSelectResult(`/tasks?search=${encodeURIComponent(search)}`)}
                >
                  Tasks
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
