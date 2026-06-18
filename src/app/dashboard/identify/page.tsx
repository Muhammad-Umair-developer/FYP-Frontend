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
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useApiClient } from "@/hooks/useApiClient";
import { API_ENDPOINTS } from "@/config/api";
import type { IdentifyResponse } from "@/types/api";

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

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Identify Student from Photo
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Upload a student picture to compare it against database embeddings and extract metadata.
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-3xl border p-6 space-y-5 shadow-sm"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Upload Image
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
            className="cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 min-h-[200px] relative transition-all group overflow-hidden"
            style={{
              borderColor: dragActive
                ? "var(--brand-500)"
                : "color-mix(in srgb, var(--border-default) 80%, transparent)",
              backgroundColor: dragActive
                ? "color-mix(in srgb, var(--brand-500) 6%, transparent)"
                : "var(--bg-elevated)",
            }}
          >
            {preview ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Upload Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFile(null);
                  }}
                  className="cursor-pointer absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center space-y-2 group-hover:scale-[1.02] transition-transform">
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--brand-500) 12%, transparent)",
                    color: "var(--brand-500)",
                  }}
                >
                  <Upload size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
              className="cursor-pointer flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--border-default)",
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
              className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                className="flex items-start gap-2.5 rounded-2xl border p-4 text-xs"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                  borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Match Failed</p>
                  <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl border p-6 space-y-6 min-h-[300px] flex flex-col"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white relative shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, hsl(${(result.name.charCodeAt(0) * 17) % 360}deg 60% 55%), hsl(${(result.name.charCodeAt(0) * 17 + 40) % 360}deg 60% 45%))`,
                        }}
                      >
                        {result.name.charAt(0).toUpperCase()}
                        <div
                          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border bg-white dark:bg-zinc-900 shadow"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        </div>
                      </div>
                      <h4 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                        {result.name}
                      </h4>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold font-mono" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                        ID: {result.registration_number}
                      </span>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                          <User size={13} />
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Full Name</p>
                          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{result.name}</p>
                        </div>
                      </div>

                      {result.registration_number && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                            <Hash size={13} />
                          </div>
                          <div>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Registration Number</p>
                            <p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{result.registration_number}</p>
                          </div>
                        </div>
                      )}

                      {result.class_details && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                            <School size={13} />
                          </div>
                          <div>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Assigned Class Collection</p>
                            <p className="text-xs font-semibold uppercase font-mono" style={{ color: "var(--text-primary)" }}>{result.class_details}</p>
                          </div>
                        </div>
                      )}

                      {result.confidence != null && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                            <Sparkles size={13} />
                          </div>
                          <div>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Recognition Confidence</p>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(result.confidence * 100)}% Match</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-10 space-y-3"
                  >
                    <div className="text-3xl">🤖</div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        No Match Results Ready
                      </p>
                      <p className="text-[10px] max-w-[200px] mx-auto" style={{ color: "var(--text-muted)" }}>
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
    </div>
  );
}
