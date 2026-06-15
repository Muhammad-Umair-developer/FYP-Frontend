"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, clearToken } from "@/hooks/useAuth";
import { ApiError } from "@/config/api";

// ---------------------------------------------------------------------------
// Error normaliser — handles FastAPI 422 detail arrays
// ---------------------------------------------------------------------------
function parseFastApiError(status: number, payload: unknown): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const { detail } = payload as { detail: unknown };
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((e: { msg?: string; loc?: string[] }) =>
          e.msg
            ? `${(e.loc ?? []).slice(1).join(" → ")}: ${e.msg}`
            : JSON.stringify(e)
        )
        .join("; ");
    }
  }
  return `Server error ${status}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ApiClientOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** JSON object or FormData (multipart). */
  body?: Record<string, unknown> | FormData;
  /** Query params appended to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useApiClient — returns an authorized `request<T>()` function that:
 *
 *  1. Reads the JWT from localStorage and injects `Authorization: Bearer <token>`
 *     on every request. No manual header management needed in page components.
 *
 *  2. On HTTP 401 → clears the stored token and redirects to `/` (login).
 *     The user never needs to visit /api/docs to re-authenticate.
 *
 *  3. Parses FastAPI 422 `detail` arrays into human-readable error strings.
 *
 *  4. Returns the parsed JSON response typed as `T`.
 */
export function useApiClient() {
  const router = useRouter();

  const request = useCallback(
    async <T = unknown>(url: string, opts: ApiClientOptions = {}): Promise<T> => {
      const { method = "GET", body, params } = opts;
      const token = getStoredToken();

      // ── Build final URL with query params ──
      let finalUrl = url;
      if (params) {
        const sp = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined) sp.set(k, String(v));
        });
        const qs = sp.toString();
        if (qs) finalUrl = `${url}?${qs}`;
      }

      // ── Build headers ──
      const headers: Record<string, string> = {};
      // Inject token — this is the ONLY place auth headers are set.
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // Set Content-Type for JSON only; FormData sets its own boundary automatically.
      const isFormData = body instanceof FormData;
      if (!isFormData && body) headers["Content-Type"] = "application/json";

      // ── Fetch ──
      const response = await fetch(finalUrl, {
        method,
        headers,
        body: body
          ? isFormData
            ? body
            : JSON.stringify(body)
          : undefined,
      });

      // ── 401 → session expired → redirect to login ──
      if (response.status === 401) {
        clearToken();
        router.replace("/");
        throw new ApiError(401, "Session expired. Please sign in again.");
      }

      // ── Other errors ──
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new ApiError(
          response.status,
          parseFastApiError(response.status, payload)
        );
      }

      // ── 204 No Content ──
      if (response.status === 204) return undefined as T;

      return response.json() as Promise<T>;
    },
    [router]
  );

  return { request };
}
