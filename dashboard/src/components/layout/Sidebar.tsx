import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Contact,
  UserRound,
  CheckSquare,
  CalendarClock,
  CalendarDays,
  CalendarCheck2,
  CalendarOff,
  PhoneCall,
  Calendar,
  GitFork,
  Target,
  BarChart3,
  FileText,
  FileCheck,
  UserCog,
  ShieldCheck,
  Package,
  Bell,
  Shield,
  CreditCard,
  Receipt,
  Settings as SettingsIcon,
  SlidersHorizontal,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSession } from "../../lib/useSession";
import { useNotifications } from "../../context/NotificationContext";

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  aliases?: string[];
  /** When true, the item is only shown to users with the ADMIN role. */
  adminOnly?: boolean;
}

interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    key: "overview",
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", path: "/", icon: Home },
      { name: "Calendar", path: "/calendar", icon: Calendar },
      { name: "Tasks", path: "/tasks", icon: CheckSquare },
      { name: "Meetings", path: "/meetings", icon: CalendarDays },
      { name: "Daily Calls", path: "/daily-calls", icon: PhoneCall },
    ],
  },
  {
    key: "sales",
    title: "SALES",
    items: [
      { name: "Leads", path: "/leads", icon: Users },
      { name: "Follow-ups", path: "/follow-ups", icon: CalendarClock },
      { name: "Deals & Pipeline", path: "/deals", icon: GitFork },
      {
        name: "Products & Services",
        path: "/products-services",
        icon: Package,
        aliases: ["/product-services", "/product-service", "/productservices", "/products", "/product", "/services"],
      },
      { name: "Sales Targets", path: "/targets", icon: Target },
      { name: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    key: "crm",
    title: "CRM",
    items: [
      { name: "Contacts", path: "/contacts", icon: Contact },
      { name: "Customers", path: "/customers", icon: UserRound },
  { name: "Proposals", path: "/proposals", icon: FileCheck },
    ],
  },
  {
    key: "finance",
    title: "FINANCE",
    items: [
      {
        name: "Invoices",
        path: "/invoices",
        icon: Receipt,
        aliases: ["/invoice", "/invoices/new"],
      },
      {
        name: "Invoice Settings",
        path: "/invoices/settings",
        icon: SlidersHorizontal,
        adminOnly: true,
      },
      {
        name: "Expense Management",
        path: "/expenses",
        icon: CreditCard,
        aliases: ["/expense", "/expense-management"],
      },
    ],
  },
  {
    key: "hrms",
    title: "HRMS",
    items: [
      {
        name: "Attendance",
        path: "/attendance",
        icon: CalendarCheck2,
        aliases: ["/employee-attendance", "/attendance-management"],
      },
      {
        name: "Leave Requests",
        path: "/leaves",
        icon: CalendarOff,
        aliases: ["/leave-management", "/leaves-management", "/my-leaves"],
      },
    ],
  },
  {
    key: "management",
    title: "MANAGEMENT",
    items: [
      {
        name: "Employee Management",
        path: "/employees",
        icon: UserCog,
        aliases: ["/user-management", "/employee-management", "/users"],
      },
      {
        name: "Roles & Permissions",
        path: "/permissions",
        icon: ShieldCheck,
        aliases: ["/roles-permissions"],
      },
      { name: "Audit Logs", path: "/audit-logs", icon: Shield, adminOnly: true },
      { name: "Documents", path: "/documents", icon: FileText },
      { name: "Notifications", path: "/notifications", icon: Bell },
      { name: "Settings", path: "/settings", icon: SettingsIcon },
    ],
  },
];

export default function Sidebar() {
  const session = useSession();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed_sections");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("sidebar_collapsed_sections", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Automatically expand a collapsed section if the user navigates into one of its routes or aliases
  useEffect(() => {
    const currentPath = location.pathname;
    const activeSection = navSections.find((sec) =>
      sec.items.some((item) => {
        if (item.path === "/") return currentPath === "/";
        if (currentPath === item.path || currentPath.startsWith(item.path + "/")) return true;
        if (item.aliases?.some((a) => currentPath === a || currentPath.startsWith(a + "/"))) return true;
        return false;
      })
    );

    if (activeSection) {
      setCollapsedSections((prev) => {
        // If already open, return the same state reference to avoid re-render cycles
        if (!prev[activeSection.key]) return prev;
        const next = { ...prev, [activeSection.key]: false };
        try {
          localStorage.setItem("sidebar_collapsed_sections", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [location.pathname]);

  const userName = session?.user.name ?? "Gabriel Deora";
  const userRole = session?.user.role ?? "Admin";

  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GD";

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800/80 bg-[#0b1328] md:flex print:hidden"
    >
      {/* Brand Header */}
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <NavLink to="/" className="flex items-center gap-3 min-w-0">
          <img
            src="/logo/vib_logo.jpeg"
            alt="Vibrantick Infotech Solutions"
            className="h-11 w-11 shrink-0 rounded-full object-cover bg-white ring-2 ring-white/15"
          />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-base font-bold text-white tracking-tight leading-tight">
              Vibrantick
            </span>
            <span className="truncate text-[9px] font-semibold text-sky-400 tracking-[0.2em] uppercase">
              INFOTECH SOLUTIONS
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-4 [&::-webkit-scrollbar]:hidden">
        {navSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.key];
          const sectionId = `sidebar-section-${section.key}`;

          return (
            <div key={section.key} className="space-y-1">
              {/* Collapsible Section Header */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                aria-expanded={!isCollapsed}
                aria-controls={sectionId}
                className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[14px] font-bold tracking-[0.1em] text-slate-300 uppercase transition-all duration-150 hover:bg-white/[0.08] hover:text-white cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="truncate">{section.title}</span>
                  {/* Visual indicator / badge for unread notifications if management is collapsed */}
                  {isCollapsed && section.key === "management" && unreadCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>

                <ChevronDown
                  size={18}
                  className={`shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {/* Collapsible Nav Links */}
              {!isCollapsed && (
                <div id={sectionId} className="space-y-1 pt-0.5">
                  {section.items.map(({ name, path, icon: Icon, aliases, adminOnly }) => {
                    // Hide admin-only items for non-admin users
                    if (adminOnly && userRole?.toUpperCase() !== "ADMIN") return null;

                    const currentPath = location.pathname;
                    const isAliasActive =
                      aliases &&
                      aliases.some(
                        (a) => currentPath === a || currentPath.startsWith(a + "/")
                      );

                    return (
                      <NavLink
                        key={path}
                        to={path}
                        end={path === "/"}
                        className={({ isActive }) => {
                          const active = isActive || isAliasActive;
                          return `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                            active
                              ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                              : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          }`;
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || isAliasActive;
                          return (
                            <>
                              <Icon
                                size={18}
                                strokeWidth={active ? 2.2 : 1.8}
                                className={`shrink-0 ${
                                  active
                                    ? "text-white"
                                    : "text-slate-400 group-hover:text-white"
                                }`}
                              />

                              <span className="truncate">{name}</span>

                              {name === "Notifications" && unreadCount > 0 && (
                                <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Profile Card */}
      <div className="shrink-0 border-t border-slate-800/80 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2 cursor-default select-none hover:bg-white/[0.04] transition-colors">
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d61e7] text-xs font-bold text-white shadow-sm shadow-blue-500/20">
            {initials}
          </div>

          {/* User Information */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>

            <p className="truncate text-xs text-slate-400">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
