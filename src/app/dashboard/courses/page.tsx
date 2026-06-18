"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, RefreshCw, AlertCircle, Trash2, X,
  ChevronDown, GraduationCap, Tag, Search, CheckCircle2, Edit,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useApiClient } from "@/hooks/useApiClient";
import { API_ENDPOINTS } from "@/config/api";
import type { Course, DegreeEnum } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DEGREES: DegreeEnum[] = ["BSCS", "BSSE", "BSAI"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: EASE, delay: i * 0.04 },
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteCourseModal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteCourseModal({
  isOpen,
  onClose,
  course,
  degree,
  semester,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  degree: string;
  semester: number;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && course && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <Trash2 size={22} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Delete Course
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Remove <strong>{course.course_name}</strong> ({course.course_code}) from{" "}
                  {degree} Semester {semester}?
                </p>
              </div>
              <div className="flex w-full gap-3 mt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={onConfirm}
                  disabled={isDeleting}
                  whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                  whileTap={{ scale: isDeleting ? 1 : 0.97 }}
                  className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {isDeleting ? <><RefreshCw size={13} className="animate-spin" /> Deleting…</> : "Delete Course"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateCourseModal
// ─────────────────────────────────────────────────────────────────────────────
function UpdateCourseModal({
  isOpen,
  onClose,
  course,
  degree,
  semester,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  degree: string;
  semester: number;
  onSuccess: () => void;
}) {
  const { request } = useApiClient();
  const { toast } = useToast();
  const inputId = useId();

  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync newName when modal opens or course changes
  useEffect(() => {
    if (isOpen && course) {
      setNewName(course.course_name);
      setError(null);
    }
  }, [isOpen, course]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Course name cannot be empty.");
      return;
    }
    if (course && trimmed === course.course_name) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      if (!course) return;
      await request(API_ENDPOINTS.subjects.updateName, {
        method: "PATCH",
        params: {
          degree,
          semester,
          old_course_name: course.course_name,
          new_course_name: trimmed,
        },
      });
      toast(`✓ Course renamed to "${trimmed}" successfully`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update course name");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && course && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Update Course Name
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-lg p-1 text-muted hover:bg-zinc-50/10 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  Course Code (read-only)
                </label>
                <code
                  className="inline-block rounded-lg px-2.5 py-1 font-mono text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--brand-500)",
                  }}
                >
                  {course.course_code}
                </code>
              </div>

              <div>
                <label
                  htmlFor={inputId}
                  className="mb-1.5 block text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  New Course Name
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                  autoFocus
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="modal-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 overflow-hidden rounded-xl border px-4 py-3 text-xs"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                      borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                      color: "var(--danger-500)",
                    }}
                  >
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="cursor-pointer flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all hover:bg-zinc-50/10 disabled:opacity-50"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.97 }}
                  className="cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:brightness-110 transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                    boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
                  }}
                >
                  {submitting ? (
                    <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                  ) : (
                    "Save Changes"
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Dropdown Component
// ─────────────────────────────────────────────────────────────────────────────
function CustomDropdown<T extends string | number>({
  value,
  options,
  onChange,
  renderLabel,
}: {
  value: T;
  options: T[];
  onChange: (val: T) => void;
  renderLabel: (val: T) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm font-semibold outline-none transition-all w-full min-w-[120px]"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      >
        <span>{renderLabel(value)}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 mt-1.5 z-50 min-w-full rounded-xl border p-1 shadow-lg max-h-60 overflow-y-auto"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="cursor-pointer flex w-full items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors text-left"
                style={{
                  backgroundColor: opt === value
                    ? "color-mix(in srgb, var(--brand-500) 12%, transparent)"
                    : "transparent",
                  color: opt === value ? "var(--brand-500)" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (opt !== value) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (opt !== value) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                {renderLabel(opt)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const { request } = useApiClient();
  const { toast } = useToast();

  // ── Filter/view state ──
  const [degree, setDegree] = useState<DegreeEnum>("BSCS");
  const [semester, setSemester] = useState<number>(1);

  // ── Course list state ──
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Create form state ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null); // from dropdown
  const [manualName, setManualName] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete state ──
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Edit/Update state ──
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  const nameId = useId();
  const codeId = useId();

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch courses
  // ─────────────────────────────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCourses([]);
    try {
      const data = await request<Course[]>(API_ENDPOINTS.subjects.list, {
        params: { degree, semester },
      });
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [request, degree, semester]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Reset create form when dropdown opens
  useEffect(() => {
    if (showCreateForm) {
      setSelectedCourse(null);
      setManualName("");
      setManualCode("");
      setFormError(null);
    }
  }, [showCreateForm]);

  // ─────────────────────────────────────────────────────────────────────────
  // Create course
  // ─────────────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const finalName = manualName.trim();
    const finalCode = manualCode.trim();

    if (!finalName || !finalCode) {
      setFormError("Please fill both name and code fields.");
      return;
    }

    setSubmitting(true);
    try {
      await request(API_ENDPOINTS.subjects.create, {
        method: "POST",
        body: { degree, semester, course_name: finalName, course_code: finalCode },
      });
      toast(`✓ Course "${finalName}" added to ${degree} Sem ${semester}`, "success");
      setShowCreateForm(false);
      fetchCourses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete course
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await request(API_ENDPOINTS.subjects.delete, {
        method: "DELETE",
        params: { degree, semester, course_name: courseToDelete.course_name },
      });
      toast(`✓ "${courseToDelete.course_name}" deleted`, "success");
      setCourseToDelete(null);
      fetchCourses();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete course", "error");
    } finally {
      setDeleting(false);
    }
  }, [courseToDelete, degree, semester, request, toast, fetchCourses]);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered list
  // ─────────────────────────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? courses.filter(
        (c) =>
          c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.course_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : courses;

  return (
    <div className="p-5 sm:p-7 space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Course Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage the subject catalogue for each degree programme and semester.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="cursor-pointer flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
          >
            <Plus size={13} />
            Add Course
          </button>
        </div>
      </motion.div>

      {/* ── Filters: Degree + Semester ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Degree selector */}
          <CustomDropdown
            value={degree}
            options={DEGREES}
            onChange={(val) => setDegree(val as DegreeEnum)}
            renderLabel={(val) => String(val)}
          />

          {/* Semester selector */}
          <CustomDropdown
            value={semester}
            options={SEMESTERS}
            onChange={(val) => setSemester(Number(val))}
            renderLabel={(val) => `Semester ${val}`}
          />
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 sm:max-w-xs w-full"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search courses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="cursor-pointer hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Create form ── */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "color-mix(in srgb, var(--brand-500) 25%, transparent)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Add Course to {degree} · Semester {semester}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="cursor-pointer rounded-lg p-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Manual inputs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={nameId}
                    className="mb-1.5 block text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Course Name
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    placeholder="e.g. Programming Fundamentals"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--brand-500)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-default)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor={codeId}
                    className="mb-1.5 block text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Course Code
                  </label>
                  <input
                    id={codeId}
                    type="text"
                    placeholder="e.g. COC-1075"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all uppercase"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--brand-500)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-default)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Form error */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    key="form-err"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 overflow-hidden rounded-xl border px-4 py-3 text-xs"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                      borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                      color: "var(--danger-500)",
                    }}
                  >
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div className="flex gap-3 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={submitting}
                  className="cursor-pointer flex-1 rounded-xl border py-3 text-sm font-semibold disabled:opacity-50"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.97 }}
                  className="cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                    boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
                  }}
                >
                  {submitting ? (
                    <><RefreshCw size={14} className="animate-spin" /> Adding…</>
                  ) : (
                    <><Plus size={14} /> Add Course</>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary badge ── */}
      {!loading && !error && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-500) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--brand-500) 20%, transparent)",
              color: "var(--brand-500)",
            }}
          >
            <GraduationCap size={12} />
            {degree} · Semester {semester} · {courses.length} course{courses.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--danger-500) 20%, transparent)",
            color: "var(--danger-500)",
          }}
        >
          <AlertCircle size={15} />
          {error}
          <button onClick={fetchCourses} className="cursor-pointer ml-auto text-xs font-semibold underline">
            Retry
          </button>
        </motion.div>
      )}

      {/* ── Table / empty state ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
      >
        {loading ? (
          <div className="space-y-px p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl px-2 py-3">
                <div className="h-8 w-8 animate-pulse rounded-full" style={{ backgroundColor: "var(--bg-elevated)" }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  <div className="h-2.5 w-24 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            >
              📚
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {searchQuery ? "No courses match your search." : `No courses for ${degree} Semester ${semester}.`}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  Use the <strong>Add Course</strong> button to populate this semester.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                  {["#", "Course Code", "Course Name", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((course, i) => (
                  <motion.tr
                    key={`${course.course_code}-${i}`}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      {i + 1}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--brand-500) 10%, transparent)",
                          color: "var(--brand-500)",
                        }}
                      >
                        <Tag size={10} />
                        {course.course_code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--brand-500)" }}
                        >
                          <BookOpen size={14} />
                        </div>
                        <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                          {course.course_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCourseToEdit(course)}
                          title="Edit course"
                          className="cursor-pointer rounded-lg p-1.5 transition-colors"
                          style={{ color: "var(--brand-500)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              "color-mix(in srgb, var(--brand-500) 10%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setCourseToDelete(course)}
                          title="Delete course"
                          className="cursor-pointer rounded-lg p-1.5 transition-colors"
                          style={{ color: "var(--danger-500)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              "color-mix(in srgb, var(--danger-500) 10%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Delete Modal ── */}
      <DeleteCourseModal
        isOpen={courseToDelete !== null}
        onClose={() => setCourseToDelete(null)}
        course={courseToDelete}
        degree={degree}
        semester={semester}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
      />

      {/* ── Update Modal ── */}
      <UpdateCourseModal
        isOpen={courseToEdit !== null}
        onClose={() => setCourseToEdit(null)}
        course={courseToEdit}
        degree={degree}
        semester={semester}
        onSuccess={fetchCourses}
      />
    </div>
  );
}
