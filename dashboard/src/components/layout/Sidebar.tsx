
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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSession } from "../../lib/useSession";
import { useNotifications } from "../../context/NotificationContext";

const primaryNav = [
  { name: "Dashboard", path: "/", icon: Home },
  { name: "Calendar", path: "/calendar", icon: Calendar },
  { name: "Tasks", path: "/tasks", icon: CheckSquare },
  { name: "Meetings", path: "/meetings", icon: CalendarDays },
  { name: "Daily Calls", path: "/daily-calls", icon: PhoneCall },
];

const salesNav = [
  { name: "Leads", path: "/leads", icon: Users },
  { name: "Follow-ups", path: "/follow-ups", icon: CalendarClock },
  { name: "Deals & Pipeline", path: "/deals", icon: GitFork },
  {
    name: "Products & Services",
    path: "/products-services",
    icon: Package,
  },
  { name: "Sales Targets", path: "/targets", icon: Target },
];

// NEW CRM SECTION
const crmNav = [
  { name: "Contacts", path: "/contacts", icon: Contact },
  { name: "Customers", path: "/customers", icon: UserRound },
];

const managementNav = [
  { name: "User Management", path: "/users", icon: UserCog },
  {
    name: "Roles & Permissions",
    path: "/permissions",
    icon: ShieldCheck,
  },
  { name: "Audit Logs", path: "/audit-logs", icon: Shield },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Notifications", path: "/notifications", icon: Bell },
];

export default function Sidebar() {
  const session = useSession();
  const { unreadCount } = useNotifications();

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

              if (
                parent &&
                !parent.querySelector(".fallback-brand")
              ) {
                const brand = document.createElement("div");

                brand.className =
                  "fallback-brand flex flex-col";

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
      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4 [&::-webkit-scrollbar]:hidden">

        {/* WORKSPACE / PRIMARY */}
        <div className="space-y-1">
          {primaryNav.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
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
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* SALES */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            SALES
          </p>

          <div className="space-y-1">
            {salesNav.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={name}
                to={path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
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
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* CRM - NEW SECTION */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            CRM
          </p>

          <div className="space-y-1">
            {crmNav.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={name}
                to={path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
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
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* MANAGEMENT */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            MANAGEMENT
          </p>

          <div className="space-y-1">
            {managementNav.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={name}
                to={path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-[#1d61e7] text-white font-semibold shadow-sm shadow-blue-600/30"
                      : `text-slate-300 hover:bg-white/5 hover:text-white${
                          name === "Documents"
                            ? " pointer-events-none opacity-50 cursor-not-allowed"
                            : ""
                        }`
                  }`
                }
                onClick={(e) => {
                  if (name === "Documents") {
                    e.preventDefault();
                  }
                }}
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

                    {name === "Notifications" &&
                      unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Profile Card */}
      <div className="shrink-0 border-t border-slate-800/80 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2 cursor-default select-none">

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
