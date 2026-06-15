"use client";

import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "@/config/api";

export type ServerStatus = "checking" | "online" | "offline";

/**
 * Polls GET /health every `intervalMs` milliseconds.
 * Returns the current backend status and a manual retry function.
 */
export function useServerStatus(intervalMs = 30_000) {
  const [status, setStatus] = useState<ServerStatus>("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.health, {
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      });
      setStatus(res.ok ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { status, retry: check };
}
