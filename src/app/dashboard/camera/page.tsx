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
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);

            // ── Draw Label background ──
            ctx.fillStyle = color;
            ctx.font = "bold 15px sans-serif";
            const labelWidth = ctx.measureText(label).width;
            ctx.fillRect(x - 2, y - 32, labelWidth + 16, 32);

            // ── Draw Label text ──
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, x + 6, y - 10);
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
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[var(--bg-page)] relative">
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
            className="flex-1 flex items-center justify-center p-6"
          >
            <div
              className="w-full max-w-lg rounded-3xl border p-8 space-y-6 text-center"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}
                >
                  <Camera size={32} />
                </div>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Live Camera Attendance
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Stream live webcam feeds dynamically to isolate face matching logs by target class.
                </p>
              </div>

              {errorMsg && (
                <div
                  className="flex gap-2 rounded-2xl border p-4 text-xs text-left"
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
                <div className="flex items-center justify-center py-6 gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  <RefreshCw className="animate-spin" size={16} />
                  Scanning database collections…
                </div>
              ) : classes.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Target Class Collection
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        fetchCourses(e.target.value);
                      }}
                      className="cursor-pointer w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all font-semibold uppercase"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {classes.map((cls) => (
                        <option key={cls} value={cls} className="uppercase">
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Dropdown */}
                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Course / Subject
                    </label>
                    {loadingCourses ? (
                      <div className="text-xs py-3.5 px-4 border rounded-xl" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
                        <RefreshCw className="animate-spin inline mr-2" size={12} />
                        Loading courses for {selectedClass}…
                      </div>
                    ) : courses.length > 0 ? (
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
                          className="w-full appearance-none rounded-xl border pr-8 pl-4 py-3 text-sm outline-none transition-all cursor-pointer font-semibold"
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-default)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {courses.map((c) => (
                            <option key={`${c.course_code}-${c.course_name}`} value={JSON.stringify(c)}>
                              {c.course_code} · {c.course_name}
                            </option>
                          ))}
                        </select>
                        <ChevronRight size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90" style={{ color: "var(--text-muted)" }} />
                      </div>
                    ) : (
                      <div className="text-xs text-red-500 py-3.5 px-4 rounded-xl border border-red-500/20 bg-red-500/5">
                        No courses registered for class {selectedClass}. Go to <strong>Courses</strong> to add subjects first.
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startStreaming}
                    disabled={!selectedCourse}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                      boxShadow: "0 4px 12px color-mix(in srgb, var(--brand-500) 30%, transparent)",
                    }}
                  >
                    <Play size={16} />
                    Launch Camera Feed
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <span className="text-4xl">🏫</span>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No classes discovered</div>
                  <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>
                    You must register a class collection from the Student Management screen before starting live camera attendance.
                  </p>
                  <button
                    onClick={fetchClasses}
                    className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                  >
                    <RefreshCw size={13} />
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
            className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4"
          >
            {/* Hidden capture element */}
            <video ref={videoRef} className="hidden" playsInline muted />

            {/* Main Canvas Viewport */}
            <div className="flex-1 relative bg-black rounded-3xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner group">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-cover"
              />

              {/* Status HUD Overlays */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                {/* Connection Dot */}
                <div
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-ping"
                    }`}
                  />
                  {connectionStatus === "connected" ? "Streaming Active" : "Connecting…"}
                </div>

                {/* Selected Class tag */}
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Users size={12} className="text-[var(--brand-400)]" />
                  Class: {selectedClass}
                </div>

                {/* Selected Course tag */}
                {selectedCourse && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow backdrop-blur-md animate-pulse-once"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <Sparkles size={12} className="text-[var(--accent-400)]" />
                    Course: {selectedCourse.course_code}
                  </div>
                )}
              </div>

              {/* Error HUD */}
              {errorMsg && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2.5 rounded-2xl border p-4 text-xs text-white backdrop-blur-md bg-red-950/70 border-red-900/30">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="flex-1">{errorMsg}</p>
                </div>
              )}
            </div>

            {/* Sidebar Results and Action HUD */}
            <div className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden h-full flex-shrink-0">
              
              {/* Controls */}
              <div
                className="rounded-3xl border p-5 space-y-4"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Session Actions
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={stopStreaming}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow transition-colors"
                  >
                    <Square size={13} />
                    Stop Camera
                  </button>
                  <button
                    onClick={() => {
                      stopTracks();
                      setStreamActive(false);
                      toast("Class selector loaded", "info");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors"
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
                className="rounded-3xl border p-5 space-y-4"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Metrics & Detections
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border p-3.5 text-center" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Faces Visible</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{facesDetected}</p>
                  </div>
                  <div className="rounded-2xl border p-3.5 text-center" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Marked Present</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{markedCount}</p>
                  </div>
                </div>
              </div>

              {/* Real-time Match List */}
              <div
                className="flex-1 rounded-3xl border p-5 flex flex-col overflow-hidden min-h-[200px]"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: "var(--border-subtle)" }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Live Match Stream
                  </h3>
                  {facesDetected > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Sparkles size={10} className="animate-spin" />
                      Analyzing
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {matches.length > 0 ? (
                    matches.map((match, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl border text-xs"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-subtle)",
                        }}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {match.name || "Unknown"}
                          </p>
                          <p className="text-[10px] font-mono tracking-tight" style={{ color: "var(--text-muted)" }}>
                            {match.student_id !== "UNKNOWN" ? match.student_id : "Unrecognized"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                            {Math.round(match.confidence * 100)}% Match
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide ${
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
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-6 text-zinc-500">
                      <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-zinc-800 text-lg">📹</div>
                      <div>
                        <p className="text-xs font-semibold">No face matching events</p>
                        <p className="text-[10px] mt-0.5 max-w-[160px] mx-auto text-zinc-600">Waiting for webcam frames to capture faces.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
