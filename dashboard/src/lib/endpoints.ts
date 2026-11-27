// REST endpoint paths, defined relative to the API base URL.
//
// The base URL itself lives ONLY in `.env` (`VITE_API_URL`) and is read here.
// No host or port is ever hardcoded in source, so pointing the dashboard at a
// different backend is an env change, not a code change.
//
// Paths are kept as a single source of truth so a route rename happens in one
// place instead of scattered string literals across the codebase. They mirror
// `backend/src/app.ts` and each module's `*.routes.ts`.

/** Base URL of the API, e.g. http://localhost:5000/api/v1 (from .env). */
export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not set. Add it to dashboard/.env"
  );
}

/** Strip any trailing slash so joining never produces a double slash. */
const BASE = API_URL.replace(/\/+$/, "");

/**
 * Endpoints, grouped by module.
 *
 * Each entry is a path relative to `API_URL`; callers pass them straight to
 * `request()` in src/lib/api.ts, which prefixes `BASE`.
 */
export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  /** Current user's own profile (no admin needed). */
  profile: {
    me: "/auth/me",
  },
  /** Admin-only user management. */
  users: {
    list: "/users",
    /** GET / PATCH / DELETE — the method is chosen by the caller. */
    byId: (id: number) => `/users/${id}`,
  },
  /** Leads management. */
  leads: {
    list: "/leads",
    options: "/leads/options",
    stats: "/leads/stats",
    byId: (id: number) => `/leads/${id}`,
    assign: (id: number) => `/leads/${id}/assign`,
    status: (id: number) => `/leads/${id}/status`,
    importPreview: "/leads/import/preview",
    importConfirm: "/leads/import/confirm",
  },
  
  tasks: {
    list: "/tasks",
    options: "/tasks/options",
    followUpStats: "/tasks/follow-up-stats",
    byId: (id: number) => `/tasks/${id}`,
    create: "/tasks",
    update: (id: number) => `/tasks/${id}`,
    updateStatus: (id: number) => `/tasks/${id}/status`,
    delete: (id: number) => `/tasks/${id}`,
    remind: (id: number) => `/tasks/${id}/remind`,
  },

  activities: {
    list: "/activities",
    byId: (id: number) => `/activities/${id}`,
    create: "/activities",
  },

  deals: {
    list: "/deals",
    options: "/deals/options",
    byId: (id: number) => `/deals/${id}`,
    create: "/deals",
    update: (id: number) => `/deals/${id}`,
    delete: (id: number) => `/deals/${id}`,
    moveStage: (id: number) => `/deals/${id}/stage`,
    close: (id: number) => `/deals/${id}/close`,
  },

  permissions: {
    roles: "/permissions/roles",
    list: "/permissions/permissions",
    rolePermissions: (roleId: number) => `/permissions/roles/${roleId}/permissions`,
    me: "/permissions/me",
  },

  meetings: {
    list: "/meetings",
    options: "/meetings/options",
    byId: (id: number) => `/meetings/${id}`,
    create: "/meetings",
    update: (id: number) => `/meetings/${id}`,
    delete: (id: number) => `/meetings/${id}`,
  },

  contacts: {
    list: "/contacts",
    byId: (id: number) => `/contacts/${id}`,
    create: "/contacts",
    update: (id: number) => `/contacts/${id}`,
    delete: (id: number) => `/contacts/${id}`,
  },

  targets: {
    list: "/targets",
    options: "/targets/options",
    byId: (id: number) => `/targets/${id}`,
    create: "/targets",
    update: (id: number) => `/targets/${id}`,
    delete: (id: number) => `/targets/${id}`,
  },

  reports: {
    options: "/reports/options",
    overview: "/reports/overview",
    leads: "/reports/leads",
    deals: "/reports/deals",
    performance: "/reports/performance",
    export: "/reports/export",
  },

  productsServices: {
    list: "/products-services",
    byId: (id: number) => `/products-services/${id}`,
    create: "/products-services",
    update: (id: number) => `/products-services/${id}`,
    delete: (id: number) => `/products-services/${id}`,
  },

  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    readAll: "/notifications/read-all",
    read: (id: number) => `/notifications/${id}/read`,
    delete: (id: number) => `/notifications/${id}`,
  },

  customers: {
    list: "/customers",
    options: "/customers/options",
    byId: (id: number) => `/customers/${id}`,
    create: "/customers",
    update: (id: number) => `/customers/${id}`,
    delete: (id: number) => `/customers/${id}`,
  },

  proposals: {
    list: "/proposals",
    stats: "/proposals/stats",
    options: "/proposals/options",
    byId: (id: number) => `/proposals/${id}`,
    create: "/proposals",
    update: (id: number) => `/proposals/${id}`,
    status: (id: number) => `/proposals/${id}/status`,
    submitApproval: (id: number) => `/proposals/${id}/submit-approval`,
    approve: (id: number) => `/proposals/${id}/approve`,
    requestChanges: (id: number) => `/proposals/${id}/request-changes`,
    send: (id: number) => `/proposals/${id}/send`,
    delete: (id: number) => `/proposals/${id}`,
  },

  auditLogs: {
    list: "/audit-logs",
  },

  documents: {
    list: "/documents",
    options: "/documents/options",
    byId: (id: number) => `/documents/${id}`,
    create: "/documents",
    update: (id: number) => `/documents/${id}`,
    delete: (id: number) => `/documents/${id}`,
    addVersion: (id: number) => `/documents/${id}/versions`,
    download: (id: number) => `/documents/${id}/download`,
    downloadVersion: (id: number, versionNo: number) => `/documents/${id}/versions/${versionNo}/download`,
  },

  settings: {
    email: "/settings/email",
    testEmail: "/settings/email/test",
    whatsapp: "/settings/whatsapp",
    testWhatsapp: "/settings/whatsapp/test",
    facebook: "/settings/facebook",
    testFacebook: "/settings/facebook/test",
    facebookOAuthUrl: "/settings/facebook/oauth/url",
    facebookOAuthExchange: "/settings/facebook/oauth/exchange",
    facebookOAuthSelectPage: "/settings/facebook/oauth/select-page",
  },

  expenses: {
    list: "/expenses",
    summary: "/expenses/summary",
    options: "/expenses/options",
    byId: (id: number) => `/expenses/${id}`,
    create: "/expenses",
    update: (id: number) => `/expenses/${id}`,
    delete: (id: number) => `/expenses/${id}`,
  },

  invoices: {
    list: "/invoices",
    currencies: "/invoices/currencies",
    settings: "/invoices/settings",
    byId: (id: number) => `/invoices/${id}`,
    create: "/invoices",
    update: (id: number) => `/invoices/${id}`,
    delete: (id: number) => `/invoices/${id}`,
    payments: (id: number) => `/invoices/${id}/payments`,
    pdf: (id: number) => `/invoices/${id}/pdf`,
    email: (id: number) => `/invoices/${id}/email`,
    whatsapp: (id: number) => `/invoices/${id}/whatsapp`,
  },

  attendance: {
    list: "/attendance",
    options: "/attendance/options",
    bulk: "/attendance/bulk",
    byId: (id: number) => `/attendance/${id}`,
    create: "/attendance",
    update: (id: number) => `/attendance/${id}`,
    delete: (id: number) => `/attendance/${id}`,
  },

  leaves: {
    my: "/leaves/my",
    myStats: "/leaves/my/stats",
    apply: "/leaves/my",
    cancel: (id: number) => `/leaves/my/${id}/cancel`,
    list: "/leaves",
    review: (id: number) => `/leaves/${id}/review`,
  },

} as const;

/** Join the base URL with a path into an absolute request URL. */
export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
