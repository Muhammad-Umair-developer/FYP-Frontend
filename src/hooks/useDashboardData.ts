"use client";

import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS, ApiError } from "@/config/api";
import { getStoredToken } from "@/hooks/useAuth";
import type { StudentsListResponse, AttendanceListResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  totalStudents: number;
  /** null = no dedicated API endpoint yet; see POST /api/classes/create */
  activeClasses: number | null;
  todayPresentCount: number;
  todayTotalCount: number;
  /** Placeholder — wire to RoBERTa sentiment endpoint when available */
  sentimentIndex: number;
}

export interface AttendanceDayPoint {
  date: string;   // short readable label e.g. "Mon Jun 15"
  present: number;
  absent: number;
  total: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  attendanceTrend: AttendanceDayPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a Date as "YYYY-MM-DD" for the API date filter */
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Short readable label for chart x-axis */
function toChartLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Generates 7-day mock attendance trend.
 * ──────────────────────────────────────────────────────
 * REPLACE WITH REAL DATA:
 *   For each day d in the last 7 days:
 *     GET /attendance/?date={toISODate(d)}&limit=200
 *     then count records by status === "Present"
 * ──────────────────────────────────────────────────────
 */
function generateMockTrend(): AttendanceDayPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const total = 28 + Math.floor(Math.random() * 15);
    const present = Math.floor(total * (0.68 + Math.random() * 0.27));
    return { date: toChartLabel(d), present, absent: total - present, total };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useDashboardData(): DashboardData {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    activeClasses: null,
    todayPresentCount: 0,
    todayTotalCount: 0,
    sentimentIndex: 74, // mock — replace with real RoBERTa endpoint
  });
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceDayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getStoredToken() ?? undefined;

    try {
      // ── 1. Dashboard Stats ──────────────────────────────────────────────
      // API: GET /dashboard/stats
      const statsRes = await fetch(
        API_ENDPOINTS.dashboardStats,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const statsData = statsRes.ok
        ? await statsRes.json() as { total_students: number; active_classes: number }
        : { total_students: 0, active_classes: 0 };

      // ── 2. Today's attendance ──────────────────────────────────────────
      // API: GET /attendance/?date=YYYY-MM-DD&limit=200
      // We fetch all of today's records and tally Present vs total.
      const today = toISODate(new Date());
      const attendanceRes = await fetch(
        `${API_ENDPOINTS.attendance.list}?date=${today}&limit=200`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const attendanceData: AttendanceListResponse = attendanceRes.ok
        ? await attendanceRes.json()
        : { records: [], count: 0 };

      const presentToday = attendanceData.records.filter(
        (r) => r.status === "Present"
      ).length;

      // ── 3. 7-day trend ─────────────────────────────────────────────────
      // PRODUCTION: loop 7 days, call GET /attendance/?date=d each time.
      // Currently using seeded mock data to avoid 7 sequential requests.
      const trend = generateMockTrend();

      setMetrics({
        totalStudents: statsData.total_students,
        activeClasses: statsData.active_classes,
        todayPresentCount: presentToday,
        todayTotalCount: attendanceData.count,
        sentimentIndex: 74,
      });
      setAttendanceTrend(trend);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Cannot connect to server.";
      setError(msg);
      // Still show mock trend so UI isn't empty
      setAttendanceTrend(generateMockTrend());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { metrics, attendanceTrend, loading, error, refetch: fetchAll };
}
