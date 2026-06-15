"use client";

import { useCallback } from "react";
import { API_ENDPOINTS, ApiError } from "@/config/api";
import type { LoginResponse } from "@/types/api";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const TOKEN_KEY = "fras_access_token";

// --------------------------------------------------------------------------
// Token helpers (pure functions — no React dependency)
// --------------------------------------------------------------------------

/** Reads the stored JWT from localStorage. Returns null when not available. */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Persists the JWT to localStorage. */
export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Removes the JWT from localStorage (logout). */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Returns true when a token exists (does NOT validate expiry). */
export function isAuthenticated(): boolean {
  return Boolean(getStoredToken());
}

// --------------------------------------------------------------------------
// Login API call
// The backend uses OAuth2PasswordRequestForm which requires:
//   Content-Type: application/x-www-form-urlencoded
//   Fields:       username, password  (NOT email — FastAPI form field name is "username")
// --------------------------------------------------------------------------
export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  // Pass URLSearchParams directly — browser automatically sets the correct
  // Content-Type header including the encoding. DO NOT call .toString() here
  // because that can cause double-encoding of special chars like "@".
  const body = new URLSearchParams();
  body.append("username", username);  // field must be named "username" (OAuth2 spec)
  body.append("password", password);

  const response = await fetch(API_ENDPOINTS.login, {
    method: "POST",
    // Let fetch set Content-Type automatically from URLSearchParams
    body,
  });

  if (!response.ok) {
    // FastAPI 422 detail is an array of validation error objects, not a plain string.
    // Flatten it into a readable message before throwing.
    const payload = await response.json().catch(() => null);
    let message = "Login failed";

    if (payload?.detail) {
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        // e.g. [{ loc: ["body","username"], msg: "field required", type: "..." }]
        message = payload.detail
          .map((e: { msg?: string; loc?: string[] }) =>
            e.msg ? `${e.loc?.slice(1).join(" → ")}: ${e.msg}` : JSON.stringify(e)
          )
          .join("; ");
      }
    } else if (response.status === 401) {
      message = "Invalid credentials";
    } else {
      message = `Server error ${response.status}`;
    }

    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<LoginResponse>;
}

// --------------------------------------------------------------------------
// React hook
// --------------------------------------------------------------------------

/**
 * useAuth — provides login / logout helpers and the raw token.
 * The hook itself is intentionally lightweight; state lives in localStorage
 * so it is shared across tabs without a Context Provider.
 */
export function useAuth() {
  const login = useCallback(async (username: string, password: string) => {
    const data = await loginRequest(username, password);
    storeToken(data.access_token);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
  }, []);

  return { login, logout, getToken: getStoredToken };
}
