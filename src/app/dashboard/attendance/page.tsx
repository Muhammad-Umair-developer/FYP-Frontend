"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  X,
  ChevronDown,
  Check,
  BookOpen,
  Tag,
} from "lucide-react";
import { API_ENDPOINTS, apiRequest, ApiError, API_BASE_URL } from "@/config/api";
import { getStoredToken } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import type { AttendanceListResponse, AttendanceRecord, AttendanceStatus, Course } from "@/types/api";

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
  const { toast } = useToast();

  // ── Core State ──
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter State ──
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [classFilter, setClassFilter] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // ── Edit Modal State ──
  const [activeEditRecord, setActiveEditRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("Present");
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseCode, setEditCourseCode] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // ── Delete Modal State ──
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // Fetch subjects for a specific class to allow course filtering
  useEffect(() => {
    if (!classFilter.trim()) {
      setCourses([]);
      setSelectedCourse(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = getStoredToken() ?? undefined;
        const data = await apiRequest<Course[]>(API_ENDPOINTS.subjects.list, {
          token,
          params: { class_name: classFilter.trim() },
        });
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load courses for class filter:", err);
        setCourses([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [classFilter]);

  // Fetch attendance records based on filters
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken() ?? undefined;
      const params: Record<string, string> = { skip: "0", limit: "100" };
      if (dateFilter) params.date = dateFilter;
      if (classFilter.trim()) params.class_name = classFilter.trim();
      if (selectedCourse) {
        params.course_name = selectedCourse.course_name;
        params.course_code = selectedCourse.course_code;
      }

      const data = await apiRequest<AttendanceListResponse>(API_ENDPOINTS.attendance.list, {
        token,
        params,
      });
      setRecords(data.records);
      setTotal(data.count);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, classFilter, selectedCourse]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Update attendance record (strict partial update: only sending modified fields)
  async function handleUpdateAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEditRecord) return;
    setSubmittingEdit(true);

    try {
      const token = getStoredToken() ?? undefined;
      const payload: Record<string, any> = {};

      if (editStatus !== activeEditRecord.status) {
        payload.status = editStatus;
      }
      if (editCourseName.trim() !== (activeEditRecord.course_name ?? "")) {
        payload.course_name = editCourseName.trim();
      }
      if (editCourseCode.trim().toUpperCase() !== (activeEditRecord.course_code ?? "")) {
        payload.course_code = editCourseCode.trim().toUpperCase();
      }

      if (Object.keys(payload).length === 0) {
        setActiveEditRecord(null);
        return;
      }

      const currentClass = classFilter.trim() || activeEditRecord.class_name || "BSCS-8B";

      await apiRequest(API_ENDPOINTS.attendance.byId(activeEditRecord._id), {
        method: "PATCH",
        token,
        body: payload,
        params: { class_name: currentClass },
      });

      toast("✓ Attendance record updated successfully", "success");
      setActiveEditRecord(null);
      fetchRecords();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update record", "error");
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Delete attendance record (passing student_id, class_name, course_name, course_code)
  async function handleDeleteAttendance() {
    if (!recordToDelete) return;
    setDeletingRecord(true);

    try {
      const token = getStoredToken() ?? undefined;
      const targetClass = classFilter.trim() || recordToDelete.class_name || "BSCS-8B";

      await apiRequest(`${API_BASE_URL}/attendance/${recordToDelete.student_id}`, {
        method: "DELETE",
        token,
        params: {
          class_name: targetClass,
          course_name: recordToDelete.course_name || "",
          course_code: recordToDelete.course_code || "",
        },
      });

      toast("✓ Attendance record deleted successfully", "success");
      setRecordToDelete(null);
      fetchRecords();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete record", "error");
    } finally {
      setDeletingRecord(false);
    }
  }

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
            className="rounded-2xl border p-4 text-center animate-pulse-once"
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
        className="flex flex-wrap gap-3 items-center"
      >
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="cursor-pointer rounded-xl border px-3 py-2 text-xs outline-none"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
        <input
          type="text"
          placeholder="Filter by class (e.g. BSCS-8B)"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value.toUpperCase())}
          className="rounded-xl border px-3 py-2 text-xs outline-none uppercase"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)", minWidth: 200 }}
          onKeyDown={(e) => e.key === "Enter" && fetchRecords()}
        />

        {/* Dynamic Course Filter Dropdown */}
        {courses.length > 0 && (
          <div className="relative">
            <select
              value={selectedCourse ? JSON.stringify(selectedCourse) : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedCourse(JSON.parse(e.target.value) as Course);
                } else {
                  setSelectedCourse(null);
                }
              }}
              className="cursor-pointer appearance-none rounded-xl border pr-8 pl-4 py-2 text-xs font-semibold outline-none transition-all"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={`${c.course_code}-${c.course_name}`} value={JSON.stringify(c)}>
                  {c.course_code} · {c.course_name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          </div>
        )}

        <button
          onClick={fetchRecords}
          className="cursor-pointer flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
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
              No attendance records for this date/class/course.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                  {["Student", "Reg Number", "Course / Subject", "Status", "Confidence", "Timestamp", "Actions"].map((h) => (
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
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {rec.course_name ? (
                        <span className="flex items-center gap-1.5">
                          <strong className="font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">{rec.course_code}</strong>
                          <span className="truncate max-w-[150px]">{rec.course_name}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">General / None</span>
                      )}
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveEditRecord(rec);
                            setEditStatus(rec.status);
                            setEditCourseName(rec.course_name ?? "");
                            setEditCourseCode(rec.course_code ?? "");
                          }}
                          title="Correct record"
                          className="cursor-pointer rounded-lg p-1.5 transition-colors"
                          style={{ color: "var(--brand-500)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "color-mix(in srgb, var(--brand-500) 10%, transparent)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setRecordToDelete(rec)}
                          title="Delete record"
                          className="cursor-pointer rounded-lg p-1.5 transition-colors"
                          style={{ color: "var(--danger-500)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "color-mix(in srgb, var(--danger-500) 10%, transparent)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {activeEditRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setActiveEditRecord(null)}
            />
            <motion.div
              key="edit-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border p-6 space-y-4"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Correct Attendance Record
                </h3>
                <button
                  onClick={() => setActiveEditRecord(null)}
                  className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateAttendance} className="space-y-4">
                {/* Info summary */}
                <div className="rounded-xl p-3 text-xs space-y-1" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  <p><strong>Student:</strong> {activeEditRecord.name}</p>
                  <p><strong>Reg No:</strong> {activeEditRecord.student_id}</p>
                  <p><strong>Original Date:</strong> {new Date(activeEditRecord.date).toLocaleString()}</p>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Present", "Absent", "Late"] as AttendanceStatus[]).map((st) => {
                      const active = editStatus === st;
                      let activeStyle = {};
                      if (active) {
                        if (st === "Present") activeStyle = { backgroundColor: "var(--accent-500)", color: "white" };
                        else if (st === "Absent") activeStyle = { backgroundColor: "var(--danger-500)", color: "white" };
                        else activeStyle = { backgroundColor: "var(--warning-500)", color: "white" };
                      }
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditStatus(st)}
                          className="cursor-pointer py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all"
                          style={{
                            borderColor: active ? "transparent" : "var(--border-default)",
                            backgroundColor: active ? undefined : "var(--bg-surface)",
                            color: active ? undefined : "var(--text-secondary)",
                            ...activeStyle,
                          }}
                        >
                          {active && <Check size={11} />}
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Course Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                    Course Name
                  </label>
                  <div className="relative">
                    <BookOpen size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. Programming Fundamentals"
                      value={editCourseName}
                      onChange={(e) => setEditCourseName(e.target.value)}
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-xs outline-none transition-all"
                      style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Course Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                    Course Code
                  </label>
                  <div className="relative">
                    <Tag size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. COC-1075"
                      value={editCourseCode}
                      onChange={(e) => setEditCourseCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 font-mono uppercase text-xs outline-none transition-all"
                      style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Submit / Cancel */}
                <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <button
                    type="button"
                    onClick={() => setActiveEditRecord(null)}
                    disabled={submittingEdit}
                    className="cursor-pointer flex-1 rounded-xl border py-2.5 text-xs font-semibold"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="cursor-pointer flex-1 rounded-xl py-2.5 text-xs font-semibold text-white shadow-md flex items-center justify-center gap-1.5"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                    }}
                  >
                    {submittingEdit ? (
                      <><RefreshCw size={12} className="animate-spin" /> Saving…</>
                    ) : (
                      "Save Corrections"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Record Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setRecordToDelete(null)}
            />
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border p-6 text-center"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>
                Delete Attendance Record
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-5">
                Remove attendance record for <strong>{recordToDelete.name}</strong> ({recordToDelete.student_id})?
                {recordToDelete.course_name && (
                  <span className="block mt-1">Course: {recordToDelete.course_code}</span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  disabled={deletingRecord}
                  className="cursor-pointer flex-1 rounded-xl border py-2.5 text-xs font-semibold"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAttendance}
                  disabled={deletingRecord}
                  className="cursor-pointer flex-1 rounded-xl py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5"
                >
                  {deletingRecord ? (
                    <><RefreshCw size={12} className="animate-spin" /> Deleting…</>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
