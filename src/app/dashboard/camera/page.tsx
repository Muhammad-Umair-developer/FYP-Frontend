"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, ExternalLink, Info } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

/**
 * /dashboard/camera
 *
 * The live camera attendance interface is a Jinja2-rendered HTML page
 * served directly by the FastAPI backend at GET /camera.
 * It is NOT a Next.js page — it runs the WebSocket camera pipeline internally.
 *
 * This page serves as a launch pad that:
 *  1. Explains the workflow to the admin.
 *  2. Opens the backend camera page in a new tab (or an iframe).
 *
 * WebSocket endpoint: ws://127.0.0.1:8000/ws/camera/{session_id}?class_tag={class}
 * See: WS_ENDPOINTS.camera() in @/config/api.ts
 */
export default function CameraPage() {
  const [iframeMode, setIframeMode] = useState(false);

  return (
    <div className="p-5 sm:p-7 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Live Camera Attendance
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Class-isolated real-time face recognition via WebSocket streaming
        </p>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--brand-500) 6%, transparent)",
          borderColor: "color-mix(in srgb, var(--brand-500) 20%, transparent)",
        }}
      >
        <div className="flex gap-3">
          <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-500)" }} />
          <div className="text-xs leading-relaxed space-y-1" style={{ color: "var(--text-secondary)" }}>
            <p>
              The camera interface is a <strong>server-rendered page</strong> served by FastAPI
              at <code className="rounded bg-white/10 px-1 font-mono">http://127.0.0.1:8000/camera</code>.
            </p>
            <p>
              Select a class from the dropdown, then click <em>Launch Camera</em> to begin
              WebSocket-based face recognition. The backend streams recognition results at ~2 fps
              and automatically marks attendance in the class-specific MongoDB collection.
            </p>
            <p className="mt-2 font-semibold">
              WebSocket: <code className="font-mono font-normal">ws://127.0.0.1:8000/ws/camera/{"{session_id}"}?class_tag={"{class}"}</code>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Launch options */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <a
          href={API_ENDPOINTS.camera}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
        >
          <ExternalLink size={15} />
          Open Camera in New Tab
        </a>
        <button
          onClick={() => setIframeMode((v) => !v)}
          className="flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <Camera size={15} />
          {iframeMode ? "Hide Embedded View" : "Embed Camera Here"}
        </button>
      </motion.div>

      {/* Embedded iframe */}
      {iframeMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <iframe
            src={API_ENDPOINTS.camera}
            className="h-[600px] w-full"
            title="FRAS Live Camera Interface"
            allow="camera; microphone"
          />
        </motion.div>
      )}
    </div>
  );
}
