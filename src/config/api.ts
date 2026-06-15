// ============================================================
//  Central API Configuration
//  All API calls in the application MUST reference constants
//  from this file. Never hard-code URLs elsewhere.
// ============================================================

// --------------- Base URLs ---------------
export const API_BASE_URL = "http://127.0.0.1:8000";
export const WS_BASE_URL  = "ws://127.0.0.1:8000";

// --------------- REST Endpoints ---------------
export const API_ENDPOINTS = {
  // --- System ---
  health:   `${API_BASE_URL}/health`,
  test:     `${API_BASE_URL}/test`,
  apiInfo:  `${API_BASE_URL}/api/info`,
  apiRoot:  `${API_BASE_URL}/api`,

  // --- Auth ---
  login:    `${API_BASE_URL}/auth/login`,

  // --- Students ---
  students: {
    list:     `${API_BASE_URL}/students/list`,
    register: `${API_BASE_URL}/students/register`,
    enroll:   `${API_BASE_URL}/students/enroll`,
    searchByName: `${API_BASE_URL}/students/search/by-name`,
    /** Pass studentId to get /students/:id */
    byId: (studentId: string) => `${API_BASE_URL}/students/${studentId}`,
  },

  // --- Attendance ---
  attendance: {
    list:          `${API_BASE_URL}/attendance/`,
    mark:          `${API_BASE_URL}/attendance/mark`,
    markFromImage: `${API_BASE_URL}/attendance/mark-from-image`,
    /** Pass attendanceId to get /attendance/:id */
    byId: (attendanceId: string) => `${API_BASE_URL}/attendance/${attendanceId}`,
  },

  // --- Classes ---
  classes: {
    create: `${API_BASE_URL}/api/classes/create`,
    delete: (className: string) => `${API_BASE_URL}/classes/${className}`,
  },

  // --- Camera (Jinja-rendered page, not a JSON API) ---
  camera: `${API_BASE_URL}/camera`,
} as const;

// --------------- WebSocket Endpoints ---------------
export const WS_ENDPOINTS = {
  /**
   * Live camera WebSocket.
   * @param sessionId  Unique session identifier (e.g. uuid)
   * @param classTag   Optional class tag for class-isolated face recognition
   */
  camera: (sessionId: string, classTag?: string): string => {
    const base = `${WS_BASE_URL}/ws/camera/${sessionId}`;
    return classTag ? `${base}?class_tag=${encodeURIComponent(classTag)}` : base;
  },
} as const;

// --------------- Default Request Config ---------------
export const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

/**
 * Returns Authorization header object for authenticated requests.
 * @param token  JWT access token
 */
export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// --------------- API Client (fetch wrapper) ---------------

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  token?: string;
  body?: Record<string, unknown> | FormData;
  params?: Record<string, string | number | boolean | undefined>;
};

/**
 * Core fetch wrapper. Builds the final URL (including query params),
 * attaches auth headers, serialises JSON bodies, and returns parsed JSON.
 * Throws an ApiError on non-2xx responses.
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", token, body, params } = options;

  // Append query parameters when provided
  let finalUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) finalUrl = `${url}?${qs}`;
  }

  const headers: Record<string, string> = {};

  // Only set Content-Type for JSON payloads; FormData sets its own boundary
  const isFormData = body instanceof FormData;
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) Object.assign(headers, authHeader(token));

  const response = await fetch(finalUrl, {
    method,
    headers,
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    let message = `Server error ${response.status}`;

    if (errorPayload?.detail) {
      if (typeof errorPayload.detail === "string") {
        message = errorPayload.detail;
      } else if (Array.isArray(errorPayload.detail)) {
        message = errorPayload.detail
          .map((e: { msg?: string; loc?: string[] }) =>
            e.msg ? `${e.loc?.slice(1).join(" → ")}: ${e.msg}` : JSON.stringify(e)
          )
          .join("; ");
      }
    }

    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

// --------------- Custom Error Class ---------------
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
