import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { getSession } from "../../lib/auth";

export interface ProtectedRouteProps {
  permission?: string | string[];
  adminOnly?: boolean;
  children: React.ReactNode;
}

export function hasPermission(
  permission?: string | string[],
  adminOnly?: boolean
): boolean {
  const session = getSession();
  const user = session?.user;
  if (!user) return false;

  const isAdmin = user.role?.toUpperCase() === "ADMIN";
  if (isAdmin) return true;
  if (adminOnly) return false;
  if (!permission) return true;

  const perms = user.permissions || [];
  if (Array.isArray(permission)) {
    return permission.some((p) => perms.includes(p));
  }
  return perms.includes(permission);
}

export default function ProtectedRoute({
  permission,
  adminOnly,
  children,
}: ProtectedRouteProps) {
  const allowed = hasPermission(permission, adminOnly);

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100 shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          You do not have permission to view or manage this module. Please contact your system administrator if you require access.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
