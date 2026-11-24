import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Contact,
  UserRound,
  CheckSquare,
  CalendarClock,
  CalendarDays,
  PhoneCall,
  Calendar,
  GitFork,
  Target,
  BarChart3,
  FileText,
  UserCog,
  ShieldCheck,
  Package,
  Bell,
  Shield,
  CreditCard,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSession } from "../../lib/useSession";
import { useNotifications } from "../../context/NotificationContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
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
      { name: "Products & Services", path: "/products-services", icon: Package },
      { name: "Sales Targets", path: "/targets", icon: Target },
    ],
  },
  {
    key: "crm",
    title: "CRM",
    items: [
      { name: "Contacts", path: "/contacts", icon: Contact },
      { name: "Customers", path: "/customers", icon: UserRound },
    ],
  },
  {
    key: "finance",
    title: "FINANCE",
    items: [
      { name: "Expense Management", path: "/expenses", icon: CreditCard },
    ],
  },
  {
    key: "management",
    title: "MANAGEMENT",
    items: [
      { name: "User Management", path: "/users", icon: UserCog },
      { name: "Roles & Permissions", path: "/permissions", icon: ShieldCheck },
      { name: "Audit Logs", path: "/audit-logs", icon: Shield },
      { name: "Reports", path: "/reports", icon: BarChart3 },
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

  // Automatically expand a collapsed section if the user navigates into one of its routes
  useEffect(() => {
    const activeSection = navSections.find((sec) =>
      sec.items.some((item) =>
        item.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.path)
      )
    );
    if (activeSection && collapsedSections[activeSection.key]) {
      setCollapsedSections((prev) => {
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800/80 bg-[#0b1328] md:flex">
      {/* Brand Header */}
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <NavLink to="/" className="flex items-center gap-3">
          <img
            src="/logo/vis-white.png"
            alt="Vibrantick Infotech Solutions"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";

              const parent = target.parentElement;

              if (parent && !parent.querySelector(".fallback-brand")) {
                const brand = document.createElement("div");

                brand.className = "fallback-brand flex flex-col";

                brand.innerHTML = `
                  <span class="text-base font-bold text-white tracking-tight">
                    Vibrantick
                  </span>
                  <span class="text-[9px] font-semibold text-sky-400 tracking-[0.2em] uppercase">
                    INFOTECH SOLUTIONS
                  </span>
                `;

                parent.appendChild(brand);
              }
            }}
          />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-4 [&::-webkit-scrollbar]:hidden">
        {navSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.key];

          return (
            <div key={section.key} className="space-y-1">
              {/* Collapsible Section Header */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                aria-expanded={!isCollapsed}
                className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[14px] font-bold tracking-[0.1em] text-slate-300 uppercase transition-all duration-150 hover:bg-white/[0.08] hover:text-white cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="truncate">{section.title}</span>
                  {/* Visual indicator for unread notifications if management is collapsed */}
                  {isCollapsed && section.key === "management" && unreadCount > 0 && (
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 shrink-0" />
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
                <div className="space-y-1 pt-0.5">
                  {section.items.map(({ name, path, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={path === "/"}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                          isActive
                            ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                            : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={18}
                            strokeWidth={isActive ? 2.2 : 1.8}
                            className={`shrink-0 ${
                              isActive
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
                      )}
                    </NavLink>
                  ))}
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
