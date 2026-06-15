"use client";

import { useState, useEffect, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, RefreshCw, AlertCircle,
  BookOpen, ChevronRight, Camera, Trash2, X,
  CheckCircle2, Upload, FolderPlus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApiClient } from "@/hooks/useApiClient";
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api";
import type { Student, StudentsListResponse, StudentRegisterResponse } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Animation helpers
// ─────────────────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: EASE, delay: i * 0.045 },
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ImageSlot — single image upload tile for the register form
// ─────────────────────────────────────────────────────────────────────────────
function ImageSlot({
  index,
  file,
  onChange,
}: {
  index: number;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => !file && inputRef.current?.click()}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
        style={{
          borderColor: file
            ? "var(--accent-500)"
            : "var(--border-default)",
          backgroundColor: file ? "transparent" : "var(--bg-elevated)",
        }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Image ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow"
              style={{ backgroundColor: "var(--danger-500)" }}
            >
              <X size={10} />
            </button>
            {/* Checkmark */}
            <div
              className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "var(--accent-500)" }}
            >
              <CheckCircle2 size={11} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Camera size={20} style={{ color: "var(--text-muted)" }} />
          </div>
        )}
      </motion.div>
      <span className="text-[10px] font-medium" style={{ color: file ? "var(--accent-500)" : "var(--text-muted)" }}>
        Image {index + 1}{!file && " *"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = ""; // reset so same file can be re-selected
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClassCard — clickable class selector card
// ─────────────────────────────────────────────────────────────────────────────
function ClassCard({
  name,
  onSelect,
}: {
  name: string;
  onSelect: (name: string) => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(name)}
      className="flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all w-full"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "color-mix(in srgb, var(--brand-500) 40%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Click to load students
          </p>
        </div>
      </div>
      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterModal — complete student registration form
// ─────────────────────────────────────────────────────────────────────────────
function RegisterModal({
  isOpen,
  onClose,
  selectedClass,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: string;
  onSuccess: () => void;
}) {
  const { request } = useApiClient();
  const { toast } = useToast();
  const nameId   = useId();
  const regId    = useId();

  const [form, setForm] = useState({ name: "", regNumber: "" });
  const [images, setImages] = useState<(File | null)[]>(Array(5).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", regNumber: "" });
      setImages(Array(5).fill(null));
      setFormError(null);
    }
  }, [isOpen]);

  function updateImage(index: number, file: File | null) {
    setImages((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError("Student name must be at least 2 characters.");
      return;
    }
    if (!form.regNumber.trim() || form.regNumber.trim().length < 3) {
      setFormError("Registration number must be at least 3 characters.");
      return;
    }
    const missingImages = images.map((f, i) => f === null ? i + 1 : null).filter(Boolean);
    if (missingImages.length > 0) {
      setFormError(`Please upload all 5 face images. Missing: Image ${missingImages.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      // Build multipart/form-data payload
      // API: POST /students/register
      // Fields: name, reg_number, class_name, image1..image5 (File)
      const fd = new FormData();
      fd.append("name",       form.name.trim());
      fd.append("reg_number", form.regNumber.trim());
      fd.append("class_name", selectedClass);
      images.forEach((img, i) => {
        if (img) fd.append(`image${i + 1}`, img, img.name);
      });

      await request<StudentRegisterResponse>(API_ENDPOINTS.students.register, {
        method: "POST",
        body: fd,
      });

      toast(`✓ ${form.name.trim()} registered in ${selectedClass}`, "success");
      onSuccess(); // triggers parent list refetch
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Student"
      subtitle={`Adding to class: ${selectedClass}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">

        {/* ── Personal details ── */}
        <fieldset className="space-y-4">
          <legend
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Personal Details
          </legend>

          {/* Name */}
          <div>
            <label
              htmlFor={nameId}
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Full Name <span style={{ color: "var(--danger-500)" }}>*</span>
            </label>
            <input
              id={nameId}
              type="text"
              placeholder="e.g. Muhammad Ali"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
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

          {/* Registration Number */}
          <div>
            <label
              htmlFor={regId}
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Registration Number <span style={{ color: "var(--danger-500)" }}>*</span>
            </label>
            <input
              id={regId}
              type="text"
              placeholder="e.g. 22-NTU-CS-1192"
              value={form.regNumber}
              onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))}
              required
              className="w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all"
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

          {/* Class (readonly) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Class (auto-filled)
            </label>
            <div
              className="flex items-center gap-2 rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "var(--bg-page)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <BookOpen size={14} style={{ color: "var(--brand-500)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--brand-500)" }}>
                {selectedClass}
              </span>
              <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                Auto-injected
              </span>
            </div>
          </div>
        </fieldset>

        {/* ── Face images ── */}
        <fieldset className="space-y-3">
          <div>
            <legend
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Face Images (5 Required)
            </legend>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Upload 5 distinct face photos for accurate recognition embedding.
              Each image must clearly show the student's face.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {images.map((file, i) => (
              <ImageSlot
                key={i}
                index={i}
                file={file}
                onChange={(f) => updateImage(i, f)}
              />
            ))}
          </div>

          {/* Upload hint */}
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-500) 20%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--brand-500) 5%, transparent)",
              color: "var(--text-muted)",
            }}
          >
            <Upload size={12} style={{ color: "var(--brand-500)" }} className="flex-shrink-0" />
            Click each slot to upload · JPG, PNG, or WebP · Different angles recommended
          </div>
        </fieldset>

        {/* ── Error ── */}
        <AnimatePresence>
          {formError && (
            <motion.div
              key="form-error"
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

        {/* ── Actions ── */}
        <div className="flex gap-3 border-t pt-5" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
              boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Registering…
              </>
            ) : (
              <>
                <Plus size={14} />
                Register Student
              </>
            )}
          </motion.button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { request } = useApiClient();
  const { toast }   = useToast();

  // ── Class list state ──
  const [classes,       setClasses]       = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classFilter,   setClassFilter]   = useState("");
  const [newClassName,  setNewClassName]  = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Student directory state ──
  const [selectedClass,   setSelectedClass]   = useState<string | null>(null);
  const [students,        setStudents]        = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError,   setStudentsError]   = useState<string | null>(null);
  const [searchQuery,     setSearchQuery]     = useState("");

  // ── Modal state ──
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch available classes
  // Strategy: parse window.AVAILABLE_CLASSES injected by GET /camera HTML
  // This is the backend's native mechanism for exposing class collections.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/camera`, {
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      const html = await res.text();
      // Extract: window.AVAILABLE_CLASSES = ["BSCS-8A", "BSCS-8B", ...];
      const match = html.match(/window\.AVAILABLE_CLASSES\s*=\s*(\[[\s\S]*?\])/);
      if (match) {
        const parsed: string[] = JSON.parse(match[1]);
        setClasses(parsed);
      } else {
        setClasses([]);
      }
    } catch {
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch students for a selected class
  // API: GET /students/list?class_name={class}&limit=200
  // Requires Authorization header → handled by useApiClient
  // ─────────────────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async (className: string) => {
    setLoadingStudents(true);
    setStudentsError(null);
    setStudents([]);
    try {
      const data = await request<StudentsListResponse>(
        API_ENDPOINTS.students.list,
        { params: { class_name: className, limit: 200, skip: 0 } }
      );
      setStudents(data.students);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load students";
      setStudentsError(msg);
    } finally {
      setLoadingStudents(false);
    }
  }, [request]);

  function selectClass(name: string) {
    setSelectedClass(name);
    setSearchQuery("");
    fetchStudents(name);
  }

  function goBackToClasses() {
    setSelectedClass(null);
    setStudents([]);
    setStudentsError(null);
    setSearchQuery("");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create new class
  // API: POST /api/classes/create  body: { class_name }
  // ─────────────────────────────────────────────────────────────────────────
  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    if (!/^[a-zA-Z0-9\-_.]+$/.test(name)) {
      toast("Class name may only contain letters, numbers, hyphens, underscores, or dots.", "error");
      return;
    }
    setCreatingClass(true);
    try {
      await request(API_ENDPOINTS.classes.create, {
        method: "POST",
        body: { class_name: name },
      });
      toast(`Class "${name}" created successfully`, "success");
      setNewClassName("");
      setShowCreateForm(false);
      await fetchClasses(); // refresh list
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create class", "error");
    } finally {
      setCreatingClass(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered student list (client-side search)
  // ─────────────────────────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.reg_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students;

  const filteredClasses = classFilter.trim()
    ? classes.filter((c) => c.toLowerCase().includes(classFilter.toLowerCase()))
    : classes;

  // ─────────────────────────────────────────────────────────────────────────
  // Render — Class Selection Phase
  // ─────────────────────────────────────────────────────────────────────────
  if (!selectedClass) {
    return (
      <div className="p-5 sm:p-7 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Student Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Select a class to view and manage its enrolled students.
          </p>
        </motion.div>

        {/* Class search + refresh row */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-wrap gap-3"
        >
          <div
            className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", minWidth: 200 }}
          >
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Filter classes…"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            onClick={fetchClasses}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
          >
            <RefreshCw size={13} className={loadingClasses ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
          >
            <FolderPlus size={13} />
            New Class
          </button>
        </motion.div>

        {/* Create class inline form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.form
              key="create-class"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleCreateClass}
              className="overflow-hidden"
            >
              <div
                className="flex gap-3 rounded-2xl border p-4"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "color-mix(in srgb, var(--brand-500) 25%, transparent)" }}
              >
                <input
                  type="text"
                  placeholder="Class name (e.g. BSCS-8B)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 rounded-xl border px-3 py-2 font-mono text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={creatingClass || !newClassName.trim()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
                >
                  {creatingClass ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
                >
                  <X size={13} />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Class grid */}
        {loadingClasses ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              />
            ))}
          </div>
        ) : filteredClasses.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredClasses.map((cls, i) => (
              <motion.div
                key={cls}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                <ClassCard name={cls} onSelect={selectClass} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border py-20 gap-4"
            style={{ borderColor: "var(--border-subtle)", borderStyle: "dashed" }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            >
              🏫
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                No classes found
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Create your first class using the <strong>New Class</strong> button above.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — Student Directory Phase
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-7 space-y-5">

      {/* Breadcrumb header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <button onClick={goBackToClasses} className="hover:underline">All Classes</button>
            <ChevronRight size={12} />
            <span className="font-semibold" style={{ color: "var(--brand-500)" }}>{selectedClass}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {selectedClass}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {loadingStudents ? "Loading students…" : `${students.length} student${students.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchStudents(selectedClass)}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
          >
            <RefreshCw size={13} className={loadingStudents ? "animate-spin" : ""} />
            Refresh
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md"
            style={{
              background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
              boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
            }}
          >
            <Plus size={15} />
            Register Student
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <Search size={14} style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder={`Search students in ${selectedClass}…`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} style={{ color: "var(--text-muted)" }}>
            <X size={13} />
          </button>
        )}
      </motion.div>

      {/* Error */}
      {studentsError && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--danger-500) 20%, transparent)",
            color: "var(--danger-500)",
          }}
        >
          <AlertCircle size={15} />
          {studentsError}
          <button
            onClick={() => fetchStudents(selectedClass)}
            className="ml-auto text-xs font-semibold underline"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Student table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
      >
        {loadingStudents ? (
          <div className="space-y-px p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl px-2 py-3">
                <div className="h-9 w-9 animate-pulse rounded-full" style={{ backgroundColor: "var(--bg-elevated)" }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-36 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  <div className="h-2.5 w-24 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {searchQuery
                ? "No students match your search."
                : `No students registered in ${selectedClass} yet.`}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="mt-1 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
              >
                <Plus size={12} /> Register First Student
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {["Student", "Registration No.", "Images", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, i) => (
                  <motion.tr
                    key={student.student_id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    {/* Name + avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(student.name.charCodeAt(0) * 17) % 360}deg 60% 55%), hsl(${(student.name.charCodeAt(0) * 17 + 40) % 360}deg 60% 45%))`,
                          }}
                        >
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {student.name}
                        </span>
                      </div>
                    </td>

                    {/* Reg number */}
                    <td className="px-5 py-4">
                      <code
                        className="rounded-lg px-2.5 py-1 font-mono text-xs"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {student.reg_number}
                      </code>
                    </td>

                    {/* Image count */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {[...Array(5)].map((_, idx) => (
                          <div
                            key={idx}
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                idx < (student.image_paths?.length ?? 0)
                                  ? "var(--accent-500)"
                                  : "var(--bg-muted)",
                            }}
                          />
                        ))}
                        <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          {student.image_paths?.length ?? 0}/5
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={{ color: "var(--brand-500)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              "color-mix(in srgb, var(--brand-500) 10%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          View →
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

      {/* Register modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        selectedClass={selectedClass}
        onSuccess={() => fetchStudents(selectedClass)}
      />
    </div>
  );
}
