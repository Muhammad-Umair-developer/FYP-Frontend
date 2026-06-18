"use client";

import { useState, useEffect, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, RefreshCw, AlertCircle,
  ChevronRight, Camera, Trash2, X, School,
  CheckCircle2, Upload, FolderPlus, Download, ScanFace,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApiClient } from "@/hooks/useApiClient";
import { getStoredToken } from "@/hooks/useAuth";
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api";
import type { Student, StudentsListResponse, StudentRegisterResponse, AttendanceRecord, AttendanceListResponse, IdentifyResponse } from "@/types/api";

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
              onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value.toUpperCase() }))}
              required
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
              <School size={14} style={{ color: "var(--brand-500)" }} />
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
// DeleteClassModal — confirmation modal for deleting a class
// ─────────────────────────────────────────────────────────────────────────────
function DeleteClassModal({
  isOpen,
  onClose,
  classNameToDelete,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  classNameToDelete: string;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Central warning card */}
          <motion.div
            key="warning-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              {/* Warning/Trash Icon */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <Trash2 size={24} />
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Delete Class
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Are you sure you want to permanently delete the class &quot;{classNameToDelete}&quot; and all of its enrolled students? This action is permanent and cannot be undone.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex w-full gap-3 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{
                    borderColor: "var(--border-default)",
                    color: "var(--text-secondary)",
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={onConfirm}
                  disabled={isDeleting}
                  whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                  whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                  className="flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    "Delete Class"
                  )}
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
// IdentifyPanel — upload one image and call /students/identify
// ─────────────────────────────────────────────────────────────────────────────
function IdentifyPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { request } = useApiClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function handleIdentify() {
    if (!file) return;
    setIdentifying(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const data = await request<IdentifyResponse>(API_ENDPOINTS.students.identify, {
        method: "POST",
        body: fd,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identification failed");
    } finally {
      setIdentifying(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "color-mix(in srgb, var(--brand-500) 12%, transparent)", color: "var(--brand-500)" }}
                >
                  <ScanFace size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Identify Student</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Upload a face photo to find the student</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Upload slot */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Face Photo
                </label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => !file && fileRef.current?.click()}
                  className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors"
                  style={{
                    borderColor: file ? "var(--brand-500)" : "var(--border-default)",
                    backgroundColor: file ? "transparent" : "var(--bg-elevated)",
                  }}
                >
                  {preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleFile(null); }}
                        className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white shadow"
                        style={{ backgroundColor: "var(--danger-500)" }}
                      >
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Camera size={28} style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Click to upload face photo</p>
                    </div>
                  )}
                </motion.div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
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

              {/* Result card */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border p-4 space-y-2"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--accent-500) 6%, transparent)",
                      borderColor: "color-mix(in srgb, var(--accent-500) 25%, transparent)",
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--accent-500)" }}>
                      <CheckCircle2 size={14} /> Student Identified
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Name</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{result.name}</span>
                      {result.reg_number && <>
                        <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Reg No.</span>
                        <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{result.reg_number}</span>
                      </>}
                      {result.class_name && <>
                        <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Class</span>
                        <span style={{ color: "var(--text-secondary)" }}>{result.class_name}</span>
                      </>}
                      {result.confidence != null && <>
                        <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Confidence</span>
                        <span style={{ color: "var(--text-secondary)" }}>{Math.round(result.confidence * 100)}%</span>
                      </>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex gap-3 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer flex-1 rounded-xl border py-3 text-sm font-semibold"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Close
                </button>
                <motion.button
                  type="button"
                  disabled={!file || identifying}
                  whileHover={{ scale: !file || identifying ? 1 : 1.02 }}
                  whileTap={{ scale: !file || identifying ? 1 : 0.97 }}
                  onClick={handleIdentify}
                  className="cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                    boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
                  }}
                >
                  {identifying ? (
                    <><RefreshCw size={14} className="animate-spin" /> Identifying…</>
                  ) : (
                    <><ScanFace size={14} /> Identify</>
                  )}
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // ── Modal state ──
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeStudentModal, setActiveStudentModal] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [showIdentifyPanel, setShowIdentifyPanel] = useState(false);
  
  // ── Edit Profile state ──
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentReg, setEditStudentReg] = useState("");
  const [submittingEditStudent, setSubmittingEditStudent] = useState(false);

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
        const parsed = JSON.parse(match[1]);
        const classNames = parsed.map((c: any) => c.class_name || c);
        setClasses(classNames.sort());
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
    setAttendanceRecords([]);
    try {
      const data = await request<StudentsListResponse>(
        API_ENDPOINTS.students.list,
        { params: { class_name: className, limit: 200, skip: 0 } }
      );
      setStudents(data.students);

      try {
        const attData = await request<AttendanceListResponse>(
          API_ENDPOINTS.attendance.list,
          { params: { class_name: className, limit: 1000 } }
        );
        setAttendanceRecords(attData.records);
      } catch (attErr) {
        console.error("Failed to load attendance records:", attErr);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load students";
      setStudentsError(msg);
    } finally {
      setLoadingStudents(false);
    }
  }, [request]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!studentToDelete || !selectedClass) return;
    setDeleting(true);
    try {
      await request(API_ENDPOINTS.students.byId(studentToDelete.student_id), {
        method: "DELETE",
        params: { class_name: selectedClass }
      });
      toast(`✓ Student ${studentToDelete.name} has been deleted`, "success");
      setStudentToDelete(null);
      if (activeStudentModal?.student_id === studentToDelete.student_id) {
        setActiveStudentModal(null);
      }
      fetchStudents(selectedClass);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete student", "error");
    } finally {
      setDeleting(false);
    }
  }, [studentToDelete, selectedClass, activeStudentModal, request, toast, fetchStudents]);

  // Sync edit student state when modal student changes
  useEffect(() => {
    if (activeStudentModal) {
      setEditStudentName(activeStudentModal.name);
      setEditStudentReg(activeStudentModal.reg_number);
      setIsEditingProfile(false);
    }
  }, [activeStudentModal]);

  const handleUpdateStudent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentModal || !selectedClass) return;

    const nameVal = editStudentName.trim();
    const regVal = editStudentReg.trim();

    if (!nameVal || !regVal) {
      toast("Name and Registration Number cannot be empty.", "error");
      return;
    }

    setSubmittingEditStudent(true);
    try {
      const payload: Record<string, string> = {};
      if (nameVal !== activeStudentModal.name) {
        payload.name = nameVal;
      }
      if (regVal !== activeStudentModal.reg_number) {
        payload.registration_number = regVal;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditingProfile(false);
        return;
      }

      await request(API_ENDPOINTS.students.byId(activeStudentModal.student_id), {
        method: "PATCH",
        body: payload,
        params: { class_name: selectedClass }
      });

      toast("✓ Student profile updated successfully", "success");
      
      const updatedStudent = {
        ...activeStudentModal,
        name: nameVal,
        reg_number: regVal,
        student_id: regVal
      };
      setActiveStudentModal(updatedStudent);
      setIsEditingProfile(false);
      
      fetchStudents(selectedClass);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update student profile", "error");
    } finally {
      setSubmittingEditStudent(false);
    }
  }, [activeStudentModal, editStudentName, editStudentReg, selectedClass, request, toast, fetchStudents]);

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
    setAttendanceRecords([]);
  }

  const getStudentAttendanceStatus = useCallback((studentId: string, records: AttendanceRecord[]) => {
    const todayLocalStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    const todayUTCStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    const isToday = (dateStr: string) => {
      if (!dateStr) return false;
      const datePart = dateStr.split('T')[0];
      return datePart === todayLocalStr || datePart === todayUTCStr;
    };

    const cleanStudentId = studentId.replace(/^0+/, "");
    
    const match = records.find(r => {
      if (!isToday(r.date)) return false;
      
      const recordId = r.student_id;
      if (recordId === studentId) return true;
      
      const cleanRecordId = recordId.replace(/^0+/, "");
      const rMatch = recordId.match(/.*-(\d+)$/);
      const sMatch = studentId.match(/.*-(\d+)$/);
      const rSuffix = rMatch ? rMatch[1].replace(/^0+/, "") : cleanRecordId;
      const sSuffix = sMatch ? sMatch[1].replace(/^0+/, "") : cleanStudentId;
      
      return rSuffix === sSuffix && rSuffix !== "";
    });
    
    return match ? "Present" : "Absent";
  }, []);

  const handleDownloadReport = useCallback(async () => {
    if (!selectedClass) return;
    setDownloadingReport(true);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(API_ENDPOINTS.classes.exportAttendance(selectedClass), {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${selectedClass}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast("✓ Attendance report downloaded successfully", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to download report", "error");
    } finally {
      setDownloadingReport(false);
    }
  }, [selectedClass, toast]);

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
      
      // Update local classes state immediately to ensure the newly created class
      // appears in the UI dashboard without requiring any page reload
      setClasses((prev) => {
        if (!prev.includes(name)) {
          return [...prev, name].sort((a, b) => a.localeCompare(b));
        }
        return prev;
      });

      await fetchClasses(); // background refresh/re-fetch
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create class", "error");
    } finally {
      setCreatingClass(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete class selection & confirmation handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteClassClick = useCallback((className: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card select action from triggering loading class phase
    setClassToDelete(className);
  }, []);

  const handleDeleteClassConfirm = useCallback(async () => {
    if (!classToDelete) return;
    setDeletingClass(true);
    try {
      await request(API_ENDPOINTS.classes.delete(classToDelete), {
        method: "DELETE",
      });
      toast(`✓ Class "${classToDelete}" has been deleted successfully`, "success");
      
      // Update local state immediately
      setClasses((prev) => prev.filter((c) => c !== classToDelete));
      
      if (selectedClass === classToDelete) {
        setSelectedClass(null);
      }
      setClassToDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete class", "error");
    } finally {
      setDeletingClass(false);
    }
  }, [classToDelete, request, toast, selectedClass]);

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
              onChange={(e) => setClassFilter(e.target.value.toUpperCase())}
              className="flex-1 bg-transparent text-xs outline-none uppercase"
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
                  onChange={(e) => setNewClassName(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border px-3 py-2 font-mono text-sm outline-none uppercase"
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

  const studentsWithAttendance = filtered.map(s => ({
    ...s,
    attendance: getStudentAttendanceStatus(s.student_id, attendanceRecords)
  }));
  const presentStudents = studentsWithAttendance.filter(s => s.attendance === "Present");
  const registeredStudents = studentsWithAttendance;

  const renderStudentTable = (studentList: typeof registeredStudents) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              {["Student", "Registration No.", "Images", "Attendance", "Actions"].map((h) => (
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
            {studentList.map((student, i) => (
              <motion.tr
                key={student.student_id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                style={{
                  borderBottom:
                    i < studentList.length - 1
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

                {/* Attendance status badge */}
                <td className="px-5 py-4">
                  {(() => {
                    const status = student.attendance;
                    const isPresent = status === "Present";
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: isPresent
                            ? "color-mix(in srgb, var(--success-500, #10b981) 12%, transparent)"
                            : "color-mix(in srgb, var(--danger-500, #ef4444) 12%, transparent)",
                          color: isPresent ? "var(--success-600, #059669)" : "var(--danger-600, #dc2626)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: isPresent ? "var(--success-500, #10b981)" : "var(--danger-500, #ef4444)",
                          }}
                        />
                        {status}
                      </span>
                    );
                  })()}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveStudentModal(student)}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
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
                    <button
                      onClick={() => setStudentToDelete(student)}
                      className="cursor-pointer rounded-lg p-1.5 transition-colors"
                      style={{ color: "var(--danger-500)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "color-mix(in srgb, var(--danger-500) 10%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }}
                      title="Delete Student"
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
    );
  };

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

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setClassToDelete(selectedClass)}
            className="cursor-pointer flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50/10 border-red-500/20 transition-all"
          >
            <Trash2 size={13} />
            Delete Class
          </button>
          <button
            disabled={downloadingReport}
            onClick={handleDownloadReport}
            className="cursor-pointer flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
          >
            {downloadingReport ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Download Attendance Report
          </button>
          <button
            onClick={() => setShowIdentifyPanel(true)}
            className="cursor-pointer flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors"
            style={{ borderColor: "color-mix(in srgb, var(--brand-500) 30%, transparent)", color: "var(--brand-500)", backgroundColor: "color-mix(in srgb, var(--brand-500) 6%, transparent)" }}
          >
            <ScanFace size={13} />
            Identify Student
          </button>
          <button
            onClick={() => fetchStudents(selectedClass)}
            className="cursor-pointer flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
          >
            <RefreshCw size={13} className={loadingStudents ? "animate-spin" : ""} />
            Refresh
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRegisterModal(true)}
            className="cursor-pointer flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md"
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
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          className="flex-1 bg-transparent text-sm outline-none uppercase"
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

      {loadingStudents ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-2xl border p-4"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <div className="space-y-px">
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
        </motion.div>
      ) : registeredStudents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-2xl border"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
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
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Class Registry */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Class Registry ({registeredStudents.length})
            </h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="overflow-hidden rounded-2xl border"
              style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
            >
              {renderStudentTable(registeredStudents)}
            </motion.div>
          </div>

          {/* Section 2: Today's Attendance (Present) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Today's Attendance (Present) ({presentStudents.length})
            </h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="overflow-hidden rounded-2xl border"
              style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
            >
              {presentStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Users size={20} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                  No students marked present today yet.
                </div>
              ) : (
                renderStudentTable(presentStudents)
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Register modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        selectedClass={selectedClass}
        onSuccess={() => fetchStudents(selectedClass)}
      />

      {/* View Student Modal */}
      <Modal
        isOpen={activeStudentModal !== null}
        onClose={() => setActiveStudentModal(null)}
        title="Student Profile Overview"
        subtitle="Registered Student Details"
      >
        {activeStudentModal && (
          <div className="p-6 space-y-6">
            {/* Avatar section */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${(activeStudentModal.name.charCodeAt(0) * 17) % 360}deg 60% 55%), hsl(${(activeStudentModal.name.charCodeAt(0) * 17 + 40) % 360}deg 60% 45%))`,
                }}
              >
                {activeStudentModal.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {activeStudentModal.name}
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold font-mono" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                ID: {activeStudentModal.student_id}
              </span>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editStudentName}
                      onChange={(e) => setEditStudentName(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={editStudentReg}
                      onChange={(e) => setEditStudentReg(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none transition-all uppercase"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={submittingEditStudent}
                    className="cursor-pointer flex-1 rounded-xl border py-2 text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-default)",
                      color: "var(--text-secondary)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEditStudent}
                    className="cursor-pointer flex-1 rounded-xl py-2 text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                    }}
                  >
                    {submittingEditStudent ? (
                      <><RefreshCw size={12} className="animate-spin" /> Saving…</>
                    ) : (
                      "Save Profile"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Profile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                      Registration Number
                    </span>
                    <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-secondary)" }}>
                      {activeStudentModal.reg_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                      Assigned Class
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {selectedClass || "N/A"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                      Registration Date
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {activeStudentModal.created_at
                        ? new Date(activeStudentModal.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStudentModal(null)}
                    className="cursor-pointer flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "var(--border-default)",
                      color: "var(--text-secondary)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="cursor-pointer flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "var(--brand-500)",
                      color: "var(--brand-500)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(activeStudentModal)}
                    className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--danger-500)",
                      width: "120px",
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={studentToDelete !== null}
        onClose={() => setStudentToDelete(null)}
        title="Confirm Student Deletion"
        subtitle="High-risk administrative action"
        maxWidth="max-w-md"
      >
        {studentToDelete && (
          <div className="p-6 space-y-5">
            <div
              className="flex items-start gap-3 rounded-2xl border p-4 text-sm"
              style={{
                backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                color: "var(--danger-500)",
              }}
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Warning: This action cannot be undone!</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Deleting <strong>{studentToDelete.name}</strong> will permanently remove their face recognition profile, image references, and all metadata from the database collection.
                </p>
              </div>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete this student profile?
            </p>

            <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setStudentToDelete(null)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                disabled={deleting}
                whileHover={{ scale: deleting ? 1 : 1.02 }}
                whileTap={{ scale: deleting ? 1 : 0.97 }}
                onClick={handleDeleteConfirm}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{
                  backgroundColor: "var(--danger-500)",
                  boxShadow: "0 4px 12px color-mix(in srgb, var(--danger-500) 30%, transparent)",
                }}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete Student
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Class Confirmation Modal */}
      <DeleteClassModal
        isOpen={classToDelete !== null}
        onClose={() => setClassToDelete(null)}
        classNameToDelete={classToDelete ?? ""}
        onConfirm={handleDeleteClassConfirm}
        isDeleting={deletingClass}
      />

      {/* Student Identification Panel */}
      <IdentifyPanel
        isOpen={showIdentifyPanel}
        onClose={() => setShowIdentifyPanel(false)}
      />
    </div>
  );
}
