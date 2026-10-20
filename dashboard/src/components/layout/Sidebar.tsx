
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  Handshake,
  CheckSquare,
  CalendarDays,
  Target,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigationGroups = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Leads", path: "/leads", icon: Users },
      { name: "Contacts", path: "/contacts", icon: Contact },
      { name: "Companies", path: "/companies", icon: Building2 },
      { name: "Customers", path: "/customers", icon: UserRound },
    ],
  },
  {
    title: "SALES",
    items: [
      { name: "Deals & Pipeline", path: "/deals", icon: Handshake },
      { name: "Tasks", path: "/tasks", icon: CheckSquare },
      { name: "Meetings", path: "/meetings", icon: CalendarDays },
      { name: "Sales Targets", path: "/targets", icon: Target },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { name: "Reports", path: "/reports", icon: BarChart3 },
      { name: "Documents", path: "/documents", icon: FileText },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 md:flex ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-slate-100 ${
          collapsed ? "justify-center" : "gap-3 px-5"
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
          <Zap size={22} fill="currentColor" />
        </div>

        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              SalesFlow
            </h1>
            <p className="text-xs text-slate-500">
              CRM Workspace
            </p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[84px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-indigo-600"
      >
        {collapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-7 overflow-y-auto overflow-x-hidden px-3 py-7">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-slate-400">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map(({ name, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  title={collapsed ? name : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center rounded-xl py-2.5 text-[13px] transition-all duration-200 ${
                      collapsed
                        ? "justify-center px-0"
                        : "gap-3 px-3"
                    } ${
                      isActive
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-indigo-600" />
                      )}

                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className="shrink-0"
                      />

                      {!collapsed && (
                        <span className="truncate">{name}</span>
                      )}

                      {!collapsed && isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div
          className={`flex items-center rounded-xl p-2 transition-colors hover:bg-slate-50 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-white">
            GD
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  Gabriel Deora
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  Sales Manager
                </p>
              </div>

              <Settings size={16} className="text-slate-400" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
