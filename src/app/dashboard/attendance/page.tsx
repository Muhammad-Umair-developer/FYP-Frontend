"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { API_ENDPOINTS, apiRequest, ApiError } from "@/config/api";
import { getStoredToken } from "@/hooks/useAuth";
import type { AttendanceListResponse, AttendanceRecord, AttendanceStatus } from "@/types/api";

/**
 * /dashboard/attendance
 *
 * DATA SOURCE:
 *   GET /attendance/?skip=0&limit=50&date={date}&class_name={class}&student_id={id}
 *   See: API_ENDPOINTS.attendance.list
 *
 * UPDATE: PUT /attendance/{id}?class_name={class}   body: { status: "Present"|"Absent"|"Late" }
 * DELETE: DELETE /attendance/{id}?class_name={class}
 */

const STATUS_CONFIG: Record<AttendanceStatus, { icon: React.ElementType; color: string; bg: string }> = {
  Present: { icon: CheckCircle, color: "var(--accent-500)", bg: "color-mix(in srgb, var(--accent-500) 10%, transparent)" },
  Absent:  { icon: XCircle,     color: "var(--danger-500)", bg: "color-mix(in srgb, var(--danger-500) 10%, transparent)" },
  Late:    { icon: Clock,       color: "var(--warning-500)", bg: "color-mix(in srgb, var(--warning-500) 10%, transparent)" },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const { icon: Icon, color, bg } = STATUS_CONFIG[status] ?? STATUS_CONFIG.Absent;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      <Icon size={11} />
      {status}
    </span>
  );
}

export default function AttendancePage() {
  const [records, setRecords]     = useState<AttendanceRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [classFilter, setClassFilter] = useState("");

  async function fetchRecords() {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken() ?? undefined;
      const params: Record<string, string> = { skip: "0", limit: "100" };
      if (dateFilter)  params.date       = dateFilter;
      if (classFilter) params.class_name = classFilter;

      const data = await apiRequest<AttendanceListResponse>(
        API_ENDPOINTS.attendance.list,
        { token, params }
      );
      setRecords(data.records);
      setTotal(data.count);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load attendance records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRecords(); }, [dateFilter, classFilter]); // eslint-disable-line

  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount  = records.filter((r) => r.status === "Absent").length;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="p-5 sm:p-7 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Attendance Records
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Browse, filter, and manage attendance logs
        </p>
      </motion.div>

      {/* Summary row */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: "Total", value: total, color: "var(--brand-500)" },
          { label: "Present", value: presentCount, color: "var(--accent-500)" },
          { label: "Absent", value: absentCount, color: "var(--danger-500)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-4 text-center"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Attendance rate bar */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>Attendance Rate</span>
          <span className="font-bold" style={{ color: "var(--accent-500)" }}>{rate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-elevated)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: "var(--accent-500)" }}
          />
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs outline-none"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
        <input
          type="text"
          placeholder="Filter by class (e.g. BSCS-8B)"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs outline-none"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)", minWidth: 200 }}
          onKeyDown={(e) => e.key === "Enter" && fetchRecords()}
        />
        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)", borderColor: "color-mix(in srgb, var(--danger-500) 20%, transparent)", color: "var(--danger-500)" }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading records…
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CalendarCheck size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No attendance records for this date/class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                  {["Student", "Reg Number", "Status", "Confidence", "Timestamp"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr
                    key={rec._id}
                    style={{ borderBottom: i < records.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    className="transition-colors"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: "var(--text-primary)" }}>{rec.name}</td>
                    <td className="px-5 py-3.5">
                      <code className="rounded px-2 py-0.5 font-mono text-xs" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                        {rec.student_id}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {rec.confidence != null ? `${Math.round(rec.confidence * 100)}%` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(rec.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
