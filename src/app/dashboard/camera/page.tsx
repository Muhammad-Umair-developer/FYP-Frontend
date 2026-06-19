"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, RefreshCw, Play, Square, AlertTriangle,
  CheckCircle2, Info, Users, ChevronRight, Sparkles
} from "lucide-react";
import { API_BASE_URL, WS_BASE_URL } from "@/config/api";
import { useToast } from "@/components/ui/Toast";
import type { Course } from "@/types/api";

// Bounding box interface
interface FaceMatch {
  student_id: string;
  name: string;
  confidence: number;
  bbox: [number, number, number, number];
  status: "newly_marked" | "already_marked" | "unknown";
}

export default function CameraPage() {
  const { toast } = useToast();

  // ── Class State ──
  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");

  // ── Course State ──
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // ── Camera Streaming State ──
  const [streamActive, setStreamActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error" | "stopped">("idle");
  const [facesDetected, setFacesDetected] = useState(0);
  const [markedCount, setMarkedCount] = useState(0);
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch subjects when class changes
  const fetchCourses = useCallback(async (className: string) => {
    if (!className) {
      setCourses([]);
      setSelectedCourse(null);
      return;
    }
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/subjects?class_name=${encodeURIComponent(className)}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("fras_access_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedCourse(data[0]);
        } else {
          setSelectedCourse(null);
        }
      } else {
        setCourses([]);
        setSelectedCourse(null);
      }
    } catch (err) {
      console.error("Failed to fetch courses for class:", err);
      setCourses([]);
      setSelectedCourse(null);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // ── HTML Refs ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Refs to read inside animation loop synchronously
  const streamActiveRef = useRef(false);
  const latestMatchesRef = useRef<FaceMatch[]>([]);
  const isProcessingFrameRef = useRef(false);

  // Keep track of stream state inside ref
  useEffect(() => {
    streamActiveRef.current = streamActive;
  }, [streamActive]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch available classes dynamically
  // ─────────────────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/camera`, {
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      const html = await res.text();
      const match = html.match(/window\.AVAILABLE_CLASSES\s*=\s*(\[[\s\S]*?\])/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        const classNames = parsed.map((c: any) => c.class_name || c);
        setClasses(classNames.sort());
        if (classNames.length > 0) {
          setSelectedClass(classNames[0]);
          fetchCourses(classNames[0]);
        }
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
      setErrorMsg("Failed to load available classes. Verify backend connection.");
    } finally {
      setLoadingClasses(false);
    }
  }, [fetchCourses]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // ─────────────────────────────────────────────────────────────────────────
  // Canvas Video + BBox Overlay Render Loop
  // ─────────────────────────────────────────────────────────────────────────
  const renderCanvasLoop = useCallback(() => {
    if (!streamActiveRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Draw the raw camera frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw face bboxes overlays from the latest server frame analysis
          const currentMatches = latestMatchesRef.current;
          currentMatches.forEach((match) => {
            if (!match.bbox) return;
            const [x, y, x2, y2] = match.bbox;
            const w = x2 - x;
            const h = y2 - y;

            let color = "#ef4444"; // unknown / red
            let label = "Unknown Face";

            if (match.status === "newly_marked") {
              color = "#10b981"; // success / green
              label = `${match.name || match.student_id} (${Math.round(match.confidence * 100)}%) - Present`;
            } else if (match.status === "already_marked") {
              color = "#3b82f6"; // info / blue
              label = `${match.name || match.student_id} (${Math.round(match.confidence * 100)}%) - Marked`;
            }

            // ── Draw Bounding Box ──
            // Draw thin outline
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);

            // Draw corners
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            const cornerLen = Math.min(24, w * 0.25, h * 0.25);
            
            // Top Left
            ctx.beginPath();
            ctx.moveTo(x, y + cornerLen);
            ctx.lineTo(x, y);
            ctx.lineTo(x + cornerLen, y);
            ctx.stroke();

            // Top Right
            ctx.beginPath();
            ctx.moveTo(x + w, y + cornerLen);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w - cornerLen, y);
            ctx.stroke();

            // Bottom Left
            ctx.beginPath();
            ctx.moveTo(x, y + h - cornerLen);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + cornerLen, y + h);
            ctx.stroke();

            // Bottom Right
            ctx.beginPath();
            ctx.moveTo(x + w, y + h - cornerLen);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w - cornerLen, y + h);
            ctx.stroke();

            // ── Draw Label background ──
            ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // Deep slate overlay
            ctx.font = "bold 14px sans-serif";
            const labelWidth = ctx.measureText(label).width;
            
            const tagX = x;
            const tagY = y - 36;
            const tagW = labelWidth + 24;
            const tagH = 28;
            
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(tagX, tagY, tagW, tagH, 6);
            } else {
              ctx.rect(tagX, tagY, tagW, tagH);
            }
            ctx.fill();

            // Left accent color strip on the label tag
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(tagX, tagY, 4, tagH, [6, 0, 0, 6]);
            } else {
              ctx.rect(tagX, tagY, 4, tagH);
            }
            ctx.fill();

            // ── Draw Label text ──
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, tagX + 12, tagY + 18);
          });
        } else {
          // Blank canvas waiting state
          ctx.fillStyle = "#121214";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#a1a1aa";
          ctx.font = "16px sans-serif";
          ctx.fillText("Syncing video stream state...", 40, canvas.height / 2);
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(renderCanvasLoop);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // WebSocket Lifecycle & Streaming Frame capture
  // ─────────────────────────────────────────────────────────────────────────
  const startStreaming = async () => {
    if (!selectedClass) {
      toast("Please select a class first", "error");
      return;
    }

    setErrorMsg(null);
    setConnectionStatus("connecting");
    setStreamActive(true);

    try {
      // 1. Request High-Definition native video capture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: "user"
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start the local canvas draw loop
      animationFrameIdRef.current = requestAnimationFrame(renderCanvasLoop);

      // 2. Establish connection to Backend WebSocket
      const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      let wsUrl = `${WS_BASE_URL}/ws/camera/${sessionId}?class_tag=${encodeURIComponent(selectedClass)}`;
      if (selectedCourse) {
        wsUrl += `&course_name=${encodeURIComponent(selectedCourse.course_name)}&course_code=${encodeURIComponent(selectedCourse.course_code)}`;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        toast("Connected to backend face recognition server", "success");
      };

      ws.onmessage = (event) => {
        // Unlock frame processing lock since the backend responded
        isProcessingFrameRef.current = false;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "match_result") {
            setFacesDetected(payload.faces_detected || 0);
            setMarkedCount(payload.marked_today || 0);
            setMatches(payload.matches || []);
            latestMatchesRef.current = payload.matches || [];
          } else if (payload.type === "error") {
            setErrorMsg(payload.message);
          }
        } catch (err) {
          console.error("Error decoding message:", err);
        }
      };

      ws.onerror = () => {
        isProcessingFrameRef.current = false;
        setConnectionStatus("error");
        setErrorMsg("WebSocket connection failed. Verify server is active.");
      };

      ws.onclose = () => {
        isProcessingFrameRef.current = false;
        setConnectionStatus("disconnected");
      };

      // 3. Setup interval frame capturing strictly at 5 FPS (every 200ms) with Mutex processing lock
      captureIntervalRef.current = setInterval(() => {
        if (isProcessingFrameRef.current) {
          return; // Skip capture if previous frame is still processing
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const wsCurrent = wsRef.current;
        if (!video || !canvas || !wsCurrent || wsCurrent.readyState !== WebSocket.OPEN) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          isProcessingFrameRef.current = true; // Set lock before processing/transmission
          try {
            // Offscreen draw and encode
            const offscreenCanvas = document.createElement("canvas");
            offscreenCanvas.width = 1280;
            offscreenCanvas.height = 720;
            const oCtx = offscreenCanvas.getContext("2d");
            if (oCtx) {
              oCtx.imageSmoothingEnabled = true;
              oCtx.imageSmoothingQuality = "high";
              oCtx.drawImage(video, 0, 0, 1280, 720);
              const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.7);
              const base64 = dataUrl.split(",")[1];
              wsCurrent.send(JSON.stringify({
                type: "frame",
                data: base64,
                timestamp: new Date().toISOString()
              }));
            } else {
              isProcessingFrameRef.current = false;
            }
          } catch (err) {
            console.error("Frame capture error:", err);
            isProcessingFrameRef.current = false; // Reset lock on error
          }
        }
      }, 200);

    } catch (err: any) {
      console.error("Capture device initialization failed:", err);
      let descriptiveError = err.message || "Failed to access camera device.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        descriptiveError = "Camera permission denied. Allow browser access in permissions setting.";
      } else if (err.name === "NotFoundError") {
        descriptiveError = "No functional camera hardware discovered on local computer.";
      }
      setConnectionStatus("error");
      setErrorMsg(descriptiveError);
      setStreamActive(false);
      stopTracks();
    }
  };

  const stopTracks = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "end" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    latestMatchesRef.current = [];
    isProcessingFrameRef.current = false;
    setMatches([]);
    setFacesDetected(0);
  };

  const stopStreaming = () => {
    stopTracks();
    setStreamActive(false);
    setConnectionStatus("stopped");
    toast("Camera streaming stopped successfully", "info");
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  return (
    <div className={`flex flex-col w-full bg-[var(--bg-page)] relative transition-all duration-300 ${
      streamActive 
        ? "lg:h-[calc(100vh-80px)] min-h-[calc(100vh-80px)] lg:overflow-hidden overflow-y-auto" 
        : "min-h-[calc(100vh-80px)] overflow-y-auto py-10 md:py-16"
    }`}>
      {/* Decorative Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-brand-400/10 to-brand-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-accent-400/5 to-brand-500/10 blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!streamActive ? (
          // ───────────────────────────────────────────────────────────────────
          // Phase 1: Pre-Flight Class Selection Dropdown
          // ───────────────────────────────────────────────────────────────────
          <motion.div
            key="pre-flight"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex items-center justify-center p-4 md:p-6 z-10"
          >
            <div
              className="w-full max-w-lg rounded-3xl border p-6 md:p-8 space-y-5 md:space-y-6 text-center backdrop-blur-xl relative overflow-hidden"
              style={{
                backgroundColor: "color-mix(in srgb, var(--bg-surface) 75%, transparent)",
                borderColor: "color-mix(in srgb, var(--border-subtle) 50%, transparent)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* Top accent gradient bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5" 
                style={{ background: "linear-gradient(90deg, var(--brand-500), var(--accent-500))" }}
              />

              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ 
                    background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))",
                    boxShadow: "0 8px 20px -4px color-mix(in srgb, var(--brand-500) 40%, transparent)"
                  }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Camera size={30} />
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-400 dark:to-brand-200 bg-clip-text text-transparent mt-1">
                  Live Camera Attendance
                </h2>
                <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
                  Stream live webcam feeds dynamically to isolate face matching logs by target class.
                </p>
              </div>

              {errorMsg && (
                <div
                  className="flex gap-2.5 rounded-2xl border p-4 text-xs text-left"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--danger-500) 8%, transparent)",
                    borderColor: "color-mix(in srgb, var(--danger-500) 25%, transparent)",
                    color: "var(--danger-500)",
                  }}
                >
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {loadingClasses ? (
                <div className="flex items-center justify-center py-6 gap-2 text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
                  <RefreshCw className="animate-spin" size={16} />
                  Scanning database collections…
                </div>
              ) : classes.length > 0 ? (
                <div className="space-y-5">
                  {/* Class Dropdown */}
                  <div className="text-left space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--text-secondary)" }}>
                      Target Class Collection
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          fetchCourses(e.target.value);
                        }}
                        className="cursor-pointer w-full appearance-none rounded-2xl border px-4 py-3.5 text-sm outline-none transition-all duration-200 font-semibold uppercase pr-10 focus:ring-2 focus:ring-brand-500/20"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-default)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {classes.map((cls) => (
                          <option key={cls} value={cls} className="uppercase bg-[var(--bg-surface)]">
                            {cls}
                          </option>
                        ))}
                      </select>
                      <ChevronRight size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 transition-transform duration-200 group-hover:translate-y-[-40%]" style={{ color: "var(--text-secondary)" }} />
                    </div>
                  </div>

                  {/* Course Dropdown */}
                  <div className="text-left space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--text-secondary)" }}>
                      Course / Subject
                    </label>
                    {loadingCourses ? (
                      <div className="text-xs py-3.5 px-4 border rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
                        <RefreshCw className="animate-spin" size={14} />
                        Loading courses for {selectedClass}…
                      </div>
                    ) : courses.length > 0 ? (
                      <div className="relative group">
                        <select
                          value={selectedCourse ? JSON.stringify(selectedCourse) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedCourse(JSON.parse(e.target.value) as Course);
                            } else {
                              setSelectedCourse(null);
                            }
                          }}
                          className="w-full appearance-none rounded-2xl border pr-10 pl-4 py-3.5 text-sm outline-none transition-all duration-200 cursor-pointer font-semibold focus:ring-2 focus:ring-brand-500/20"
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-default)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {courses.map((c) => (
                            <option key={`${c.course_code}-${c.course_name}`} value={JSON.stringify(c)} className="bg-[var(--bg-surface)]">
                              {c.course_code} · {c.course_name}
                            </option>
                          ))}
                        </select>
                        <ChevronRight size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 transition-transform duration-200 group-hover:translate-y-[-40%]" style={{ color: "var(--text-secondary)" }} />
                      </div>
                    ) : (
                      <div 
                        className="text-xs py-3.5 px-4 rounded-2xl border text-left flex gap-2.5 items-start"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--danger-500) 5%, transparent)",
                          borderColor: "color-mix(in srgb, var(--danger-500) 20%, transparent)",
                          color: "var(--danger-500)"
                        }}
                      >
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                          No courses registered for class <span className="font-bold">{selectedClass}</span>. Go to <strong>Courses</strong> to add subjects first.
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.015, translateY: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={startStreaming}
                    disabled={!selectedCourse}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                      boxShadow: "0 8px 16px -4px color-mix(in srgb, var(--brand-500) 30%, transparent)",
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    Launch Camera Feed
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-500 text-3xl">
                    🏫
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>No Classes Discovered</h3>
                    <p className="text-xs max-w-sm mt-1 mx-auto" style={{ color: "var(--text-muted)" }}>
                      You must register a class collection from the Student Management screen before starting live camera attendance.
                    </p>
                  </div>
                  <button
                    onClick={fetchClasses}
                    className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-semibold hover:bg-muted/10 active:scale-95 transition-all cursor-pointer mt-2"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                  >
                    <RefreshCw size={14} />
                    Retry Search
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // ───────────────────────────────────────────────────────────────────
          // Phase 2: Maximized Streaming Viewport
          // ───────────────────────────────────────────────────────────────────
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 gap-6 max-w-7xl mx-auto w-full z-10"
          >
            {/* Hidden capture element */}
            <video ref={videoRef} className="hidden" playsInline muted />

            {/* Main Canvas Viewport */}
            <div className="flex-1 relative bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800/80 flex items-center justify-center shadow-2xl aspect-video lg:h-full w-full">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-cover bg-zinc-950"
              />

              {/* Status HUD Overlays */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none z-10">
                {/* Connection Dot */}
                <div
                  className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow backdrop-blur-md transition-all duration-300"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    {connectionStatus === "connected" ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </>
                    )}
                  </span>
                  {connectionStatus === "connected" ? "Streaming Active" : "Connecting…"}
                </div>

                {/* Selected Class tag */}
                <div
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <Users size={12} className="text-[var(--brand-400)]" />
                  Class: {selectedClass}
                </div>

                {/* Selected Course tag */}
                {selectedCourse && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow backdrop-blur-md"
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    Course: {selectedCourse.course_code}
                  </div>
                )}
              </div>

              {/* Error HUD */}
              {errorMsg && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border p-4 text-xs text-white backdrop-blur-md bg-rose-950/80 border-rose-900/40 shadow-lg z-10">
                  <AlertTriangle size={18} className="text-rose-500 flex-shrink-0" />
                  <p className="flex-1 font-semibold">{errorMsg}</p>
                </div>
              )}
            </div>

            {/* Sidebar Results and Action HUD */}
            <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto lg:overflow-hidden h-auto lg:h-full flex-shrink-0">
              
              {/* Controls */}
              <div
                className="rounded-3xl border p-5 space-y-4 shadow-md backdrop-blur-md"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Session Actions
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={stopStreaming}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 active:scale-95 shadow-md shadow-red-500/10 transition-all duration-200 cursor-pointer"
                  >
                    <Square size={13} fill="currentColor" />
                    Stop Camera
                  </button>
                  <button
                    onClick={() => {
                      stopTracks();
                      setStreamActive(false);
                      toast("Class selector loaded", "info");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all duration-200 hover:bg-[var(--bg-elevated)] active:scale-95 cursor-pointer"
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Change Class
                  </button>
                </div>
              </div>

              {/* Statistics Card */}
              <div
                className="rounded-3xl border p-5 space-y-4 shadow-md backdrop-blur-md"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Metrics & Detections
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border p-4 text-center relative overflow-hidden transition-all duration-200 hover:border-[var(--brand-300)]" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                    <div className="flex justify-center mb-1 text-[var(--brand-500)] opacity-80">
                      <Users size={16} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Faces Visible</p>
                    <p className="text-3xl font-extrabold mt-1 tracking-tight" style={{ color: "var(--text-primary)" }}>{facesDetected}</p>
                  </div>
                  <div className="rounded-2xl border p-4 text-center relative overflow-hidden transition-all duration-200 hover:border-emerald-300" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                    <div className="flex justify-center mb-1 text-emerald-500 opacity-80">
                      <CheckCircle2 size={16} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Marked Present</p>
                    <p className="text-3xl font-extrabold mt-1 tracking-tight" style={{ color: "var(--text-primary)" }}>{markedCount}</p>
                  </div>
                </div>
              </div>

              {/* Real-time Match List */}
              <div
                className="flex-1 rounded-3xl border p-5 flex flex-col overflow-hidden min-h-[300px] shadow-md backdrop-blur-md"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between pb-3.5 border-b mb-4" style={{ borderColor: "var(--border-subtle)" }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Live Match Stream
                  </h3>
                  {facesDetected > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <RefreshCw size={10} className="animate-spin" />
                      Analyzing
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <AnimatePresence initial={false}>
                    {matches.length > 0 ? (
                      matches.map((match, idx) => (
                        <motion.div
                          key={`${match.student_id}-${idx}`}
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-xs shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-subtle)",
                          }}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${
                                match.status === "newly_marked" 
                                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/35" 
                                  : match.status === "already_marked" 
                                  ? "bg-blue-500 shadow-sm shadow-blue-500/35" 
                                  : "bg-rose-500 shadow-sm shadow-rose-500/35"
                              }`} />
                              <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
                                {match.name || "Unknown"}
                              </p>
                            </div>
                            <p className="text-[10px] font-mono tracking-tight pl-4" style={{ color: "var(--text-muted)" }}>
                              {match.student_id !== "UNKNOWN" ? match.student_id : "Unrecognized"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                              {Math.round(match.confidence * 100)}% Match
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                                match.status === "newly_marked"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : match.status === "already_marked"
                                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                  : "bg-red-500/10 text-red-500 border border-red-500/20"
                              }`}
                            >
                              {match.status === "newly_marked" ? "Marked" : match.status === "already_marked" ? "Present" : "Unknown"}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center gap-3 py-10 text-zinc-500"
                      >
                        <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-zinc-800/10 dark:bg-zinc-800/40 text-xl border border-zinc-200/50 dark:border-zinc-800">📹</div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">No face matching events</p>
                          <p className="text-[10px] mt-1 max-w-[200px] mx-auto text-[var(--text-muted)]">Waiting for webcam frames to capture and identify faces.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
