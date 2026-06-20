"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Hash,
  School,
  Sparkles,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useApiClient } from "@/hooks/useApiClient";
import { API_ENDPOINTS } from "@/config/api";
import type { IdentifyResponse, Course, AttendanceListResponse } from "@/types/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { openPdfInNewTab } from "@/utils/exportViewer";

interface IdentifyResult {
  name: string;
  registration_number: string;
  class_details: string;
  confidence?: number;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function IdentifyPage() {
  const { request } = useApiClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // CRUD operation states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updateName, setUpdateName] = useState("");
  const [updateRegNumber, setUpdateRegNumber] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Clean up ObjectURL preview on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  async function handleIdentify() {
    if (!file) return;
    setIdentifying(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const data = await request<any>(API_ENDPOINTS.students.identify, {
        method: "POST",
        body: fd,
      });
      setResult({
        name: data.name,
        registration_number: data.registration_number || data.roll_number || data.reg_number || "",
        class_details: data.class_details || data.class || data.class_name || "",
        confidence: data.confidence,
      });
      toast("✓ Face recognition check complete", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identification failed");
      toast("Face recognition check failed", "error");
    } finally {
      setIdentifying(false);
    }
  }

  async function handleDownloadStudentReport() {
    if (!result) return;
    const className = result.class_details;
    const studentId = result.registration_number;
    if (!className) {
      toast("Student class details are missing", "error");
      return;
    }
    setDownloadingReport(true);
    try {
      // 1. Fetch class courses and class attendance records in parallel
      const [coursesData, attData] = await Promise.all([
        request<Course[]>(
          API_ENDPOINTS.subjects.list,
          { params: { class_name: className } }
        ),
        request<AttendanceListResponse>(
          API_ENDPOINTS.attendance.list,
          { params: { class_name: className, limit: 1000 } }
        )
      ]);

      const classCourses = Array.isArray(coursesData) ? coursesData : [];
      const attendanceRecords = attData.records || [];

      // 2. Map unique dates for each course to calculate completed lectures
      const courseDatesMap: Record<string, Set<string>> = {};
      classCourses.forEach(c => {
        courseDatesMap[c.course_code] = new Set<string>();
      });
      attendanceRecords.forEach(r => {
        let rCode = r.course_code;
        if (!rCode && r.course_name) {
          const matchedCourse = classCourses.find(c => c.course_name === r.course_name);
          if (matchedCourse) rCode = matchedCourse.course_code;
        }
        if (rCode && courseDatesMap[rCode]) {
          const dateStr = r.date ? r.date.split("T")[0] : "";
          if (dateStr) {
            courseDatesMap[rCode].add(dateStr);
          }
        }
      });

      // 3. Initialize jsPDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Title & Header info
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Student Attendance Report", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Student Name: ${result.name}`, 14, 26);
      doc.text(`Registration Number: ${studentId}`, 14, 31);
      doc.text(`Class: ${className}`, 14, 36);
      doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, 41);

      // --- Detailed Course Attendance Table for this student ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Course Attendance Breakdown", 14, 52);

      const studentCourseRows = classCourses.map(c => {
        const totalLectures = courseDatesMap[c.course_code]?.size || 0;
        const studentRecords = attendanceRecords.filter(r => {
          let rCode = r.course_code;
          if (!rCode && r.course_name) {
            const matchedCourse = classCourses.find(c => c.course_name === r.course_name);
            if (matchedCourse) rCode = matchedCourse.course_code;
          }
          if (rCode !== c.course_code) return false;

          const sId = studentId;
          const rId = r.student_id;
          if (rId === sId) return true;

          const cleanStudentId = sId.replace(/^0+/, "");
          const cleanRecordId = rId.replace(/^0+/, "");
          const rMatch = rId.match(/.*-(\d+)$/);
          const sMatch = sId.match(/.*-(\d+)$/);
          const rSuffix = rMatch ? rMatch[1].replace(/^0+/, "") : cleanRecordId;
          const sSuffix = sMatch ? sMatch[1].replace(/^0+/, "") : cleanStudentId;

          return rSuffix === sSuffix && rSuffix !== "";
        });
        const attended = studentRecords.filter(r => r.status === "Present" || r.status === "Late").length;
        const missed = Math.max(0, totalLectures - attended);
        const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 100;

        return [
          c.course_code,
          c.course_name,
          attended.toString(),
          missed.toString(),
          totalLectures.toString(),
          `${percentage}%`
        ];
      });

      autoTable(doc, {
        startY: 56,
        head: [["Course Code", "Course Name", "Attended", "Absent", "Total Lectures", "Percentage"]],
        body: studentCourseRows,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });

      // Open PDF in New Tab
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `attendance_report_${studentId}_${dateStr}.pdf`;
      openPdfInNewTab(doc, filename);

      toast("✓ PDF report opened in a new tab", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Failed to download report", "error");
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleUpdateStudent() {
    if (!result) return;
    setUpdating(true);
    try {
      await request<any>(API_ENDPOINTS.students.byId(result.registration_number), {
        method: "PATCH",
        params: { class_name: result.class_details },
        body: {
          name: updateName,
          registration_number: updateRegNumber,
        },
      });
      toast("✓ Student updated successfully", "success");
      setResult({
        ...result,
        name: updateName,
        registration_number: updateRegNumber,
      });
      setShowUpdateModal(false);
    } catch (err: any) {
      toast(err.message || "Failed to update student", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteStudent() {
    if (!result) return;
    setDeleting(true);
    try {
      await request<any>(API_ENDPOINTS.students.byId(result.registration_number), {
        method: "DELETE",
        params: { class_name: result.class_details },
      });
      toast("✓ Student deleted successfully", "success");
      setResult(null);
      setShowDeleteModal(false);
    } catch (err: any) {
      toast(err.message || "Failed to delete student", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto font-sans tracking-tight">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          Identify Student from Photo
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">
          Upload a student picture to compare it against database embeddings and extract metadata.
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        {/* Left: Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl p-6 lg:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[var(--border-subtle)]/70"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-50">
              Upload Image
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              Supported formats: JPG, JPEG, PNG. Max size: 5MB.
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center p-8 min-h-[220px] relative transition-all duration-300 group overflow-hidden bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
            style={{
              borderColor: dragActive
                ? "var(--brand-500)"
                : "var(--border-subtle)",
            }}
          >
            {preview ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Upload Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFile(null);
                  }}
                  className="cursor-pointer absolute top-3 right-3 p-2 rounded-lg bg-black/50 hover:bg-black/75 backdrop-blur-md text-white transition-all border border-white/10"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 group-hover:scale-[1.01] transition-transform duration-300">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--brand-500) 8%, transparent)",
                    color: "var(--brand-500)",
                    boxShadow: "0 0 20px 0 color-mix(in srgb, var(--brand-500) 6%, transparent)",
                  }}
                >
                  <Upload size={18} className="stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-50">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                    Ensure the student's face is clearly visible
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleFile(null)}
              disabled={!file || identifying}
              className="cursor-pointer flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 py-3 text-xs font-semibold transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!file || identifying}
              onClick={handleIdentify}
              className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-[0.96] active:scale-[0.98] shadow-sm hover:shadow"
              style={{
                background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
              }}
            >
              {identifying ? (
                <><RefreshCw size={13} className="animate-spin" /> Analyzing…</>
              ) : (
                <><ScanFace size={13} /> Run Recognition</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right: Results view */}
        <div className="space-y-6">
          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-start gap-2.5 rounded-xl border p-4 text-xs"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                  borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Match Failed</p>
                  <p className="mt-0.5 text-rose-600/90 dark:text-rose-400">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl p-6 lg:p-8 space-y-6 min-h-[300px] flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[var(--border-subtle)]/70"
            style={{
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div className="border-b border-slate-100 dark:border-zinc-800/65 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                Analysis & Match Results
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6"
                  >
                    {/* Avatar header */}
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white relative shadow-md transition-transform duration-300 hover:scale-105 border-4 border-slate-50 dark:border-zinc-800"
                        style={{
                          background: `linear-gradient(135deg, hsl(${(result.name.charCodeAt(0) * 17) % 360}deg 65% 55%), hsl(${(result.name.charCodeAt(0) * 17 + 40) % 360}deg 65% 45%))`,
                        }}
                      >
                        {result.name.charAt(0).toUpperCase()}
                        <div
                          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-emerald-500"
                        >
                          <CheckCircle2 size={13} className="fill-emerald-500/10" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                          {result.name}
                        </h4>
                        <span className="inline-block text-[10px] px-3 py-1 rounded-full font-bold font-mono bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 tracking-wider">
                          ID: {result.registration_number}
                        </span>
                      </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 gap-3.5 bg-slate-50/50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-800/60 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                          <User size={14} className="stroke-[2]" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Full Name</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{result.name}</p>
                        </div>
                      </div>

                      {result.registration_number && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <Hash size={14} className="stroke-[2]" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Registration Number</p>
                            <p className="text-sm font-semibold font-mono text-slate-900 dark:text-zinc-50">{result.registration_number}</p>
                          </div>
                        </div>
                      )}

                      {result.class_details && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                            <School size={14} className="stroke-[2]" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Assigned Class Collection</p>
                            <p className="text-sm font-semibold uppercase font-mono text-slate-900 dark:text-zinc-50">{result.class_details}</p>
                          </div>
                        </div>
                      )}

                      {result.confidence != null && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                            <Sparkles size={14} className="stroke-[2]" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Recognition Confidence</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{Math.round(result.confidence * 100)}% Match</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attendance Report Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={downloadingReport}
                        onClick={handleDownloadStudentReport}
                        className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 py-3 text-xs font-semibold shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-50"
                        style={{
                          color: "var(--text-primary)",
                          backgroundColor: "var(--bg-surface)",
                        }}
                      >
                        {downloadingReport ? (
                          <><RefreshCw size={13} className="animate-spin" /> Opening...</>
                        ) : (
                          <>
                            <Download size={13} className="text-emerald-600 dark:text-emerald-500" />
                            Show Attendance Report
                          </>
                        )}
                      </button>
                    </div>

                    {/* Update & Delete Actions */}
                    {/* <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUpdateName(result.name);
                          setUpdateRegNumber(result.registration_number);
                          setShowUpdateModal(true);
                        }}
                        className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all duration-200"
                        style={{
                          color: "var(--text-primary)",
                          backgroundColor: "var(--bg-surface)",
                        }}
                      >
                        <Edit size={13} className="text-violet-600 dark:text-violet-400" />
                        Update Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-red-200/50 dark:border-red-900/30 py-2.5 text-xs font-semibold hover:bg-red-50/20 dark:hover:bg-red-950/10 transition-all duration-200"
                        style={{
                          color: "var(--danger-500)",
                          backgroundColor: "var(--bg-surface)",
                        }}
                      >
                        <Trash2 size={13} />
                        Delete Student
                      </button>
                    </div> */}
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="text-center py-12 space-y-4 flex flex-col items-center justify-center"
                  >
                    {/* Sleek abstract scanning wireframe */}
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-dashed border-indigo-500/25 bg-indigo-500/[0.02] dark:bg-indigo-400/[0.01]">
                      <div className="absolute inset-2 rounded-full border border-dashed border-indigo-500/40 animate-[spin_12s_linear_infinite]" />
                      <div className="absolute inset-4 rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 flex items-center justify-center" />
                      <ScanFace size={22} className="text-indigo-500/60 dark:text-indigo-400/60 relative z-10 stroke-[1.5]" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold tracking-tight text-slate-800 dark:text-zinc-200">
                        No Match Results Ready
                      </p>
                      <p className="text-[10px] max-w-[220px] mx-auto leading-relaxed text-slate-600 dark:text-zinc-400 font-medium">
                        Pick a student photo and click <strong>Run Recognition</strong> to match faces.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {showUpdateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpdateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between border-b pb-3 mb-5 border-slate-100 dark:border-zinc-850">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-1.5">
                  <Edit size={16} className="text-violet-500" />
                  Update Student Profile
                </h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Student Name</label>
                  <input
                    type="text"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Registration Number</label>
                  <input
                    type="text"
                    value={updateRegNumber}
                    onChange={(e) => setUpdateRegNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                    style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStudent}
                    disabled={updating}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-center"
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-red-600 bg-red-50 dark:bg-red-950/20 mb-4"
              >
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">
                Delete Student Profile?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Are you sure you want to delete <strong>{result?.name}</strong>? This action will permanently remove their records, embeddings, and saved images.
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                  style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-red-600 hover:bg-red-700 active:scale-[0.98]"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
