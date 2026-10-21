// Thin fetch wrapper for the Sales CRM backend.
//
// The API base URL lives only in `.env` (VITE_API_URL) and is read in
// src/lib/endpoints.ts; this module never hardcodes a host. Endpoint paths come
// from that same file, so callers use `ENDPOINTS.auth.login` rather than
// spelling out strings.
//
// Response shapes come from backend/src/common/middleware/error.middleware.ts
// and the auth controller:
//   success: { success: true,  message?: string, data: T }
//   failure: { success: false, error: { message: string } }
//
// Note: the backend's auth service throws `AuthError`, which extends `Error`
// rather than `AppError`, so the error middleware reports failed logins as
// HTTP 500 with the generic message "Internal server error". `request()` maps
// that back to a usable message so the login form never surfaces a bare 500.

import { apiUrl } from "./endpoints";

/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer token to send, when the caller has one. */
  token?: string;
  signal?: AbortSignal;
};

function readErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;

    const nested = body.error;
    if (nested && typeof nested === "object") {
      const message = (nested as Record<string, unknown>).message;
      if (typeof message === "string" && message) return message;
    }

    if (typeof body.message === "string" && body.message) return body.message;
  }

  return `Request failed with status ${status}`;
}

/** Perform an API request and return the unwrapped `data` payload. */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // Network-level failure: the server is down, CORS blocked, or offline.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running.",
      0,
    );
  }

  // 204 and other empty responses have no JSON to parse.
  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    throw new ApiError(readErrorMessage(payload, response.status), response.status);
  }

  // Some endpoints return `{ success, data }`; others may return the body itself.
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
