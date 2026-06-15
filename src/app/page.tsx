"use client";

import { useState, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/config/api";

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// Framer Motion v12 requires cubic-bezier arrays typed as a 4-tuple.
// ─────────────────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: i * 0.1 },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "🎯",
    title: "Real-Time Face Recognition",
    desc: "Sub-second identification using InsightFace + MTCNN with 512-dim embeddings.",
  },
  {
    icon: "🏫",
    title: "Class-Isolated Tracking",
    desc: "Per-class MongoDB collections ensure zero cross-class data leakage.",
  },
  {
    icon: "📊",
    title: "Live WebSocket Streaming",
    desc: "Camera frames analysed at 2 fps; match results streamed back instantly.",
  },
  {
    icon: "🧠",
    title: "Sentiment Analysis",
    desc: "RoBERTa-powered NLP pipeline scores class feedback and engagement.",
  },
];

const STATS = [
  { value: "512", label: "Embedding Dimensions" },
  { value: "<1s", label: "Recognition Latency" },
  { value: "99%+", label: "Detection Accuracy" },
  { value: "∞", label: "Classes Supported" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tilt card wrapper (mouse-follow 3D effect)
// ─────────────────────────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [6, -6]);
  const rotateY = useTransform(x, [-60, 60], [-6, 6]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login card
// ─────────────────────────────────────────────────────────────────────────────
function LoginCard() {
  const router = useRouter();
  const { login } = useAuth();
  const emailId = useId();
  const passId = useId();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      setSuccess(true);
      // Brief success flash before redirect
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid credentials. Please try again." : err.message);
      } else {
        setError("Cannot reach the server. Is the FastAPI backend running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      <TiltCard>
        <div
          className="relative overflow-hidden rounded-3xl border p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          {/* Card glow accent */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: "var(--brand-500)" }}
          />

          {/* Header */}
          <div className="mb-8">
            <div
              className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: "var(--brand-500)" }}
            >
              🔐
            </div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Admin Sign In
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Access the FRAS management dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username */}
            <div>
              <label
                htmlFor={emailId}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Username / Email
              </label>
              <input
                id={emailId}
                type="text"
                autoComplete="username"
                placeholder="admin@fyp.com"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-500)";
                  e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor={passId}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <input
                id={passId}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-500)";
                  e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                    borderColor: "color-mix(in srgb, var(--danger-500) 30%, transparent)",
                    color: "var(--danger-500)",
                  }}
                >
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || success}
              whileHover={{ scale: loading || success ? 1 : 1.02 }}
              whileTap={{ scale: loading || success ? 1 : 0.97 }}
              className="relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold text-white outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: success
                  ? "var(--accent-500)"
                  : "linear-gradient(135deg, var(--brand-600), var(--brand-500))",
                boxShadow: "0 4px 15px color-mix(in srgb, var(--brand-500) 35%, transparent)",
              }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    ✓ Authenticated — Redirecting…
                  </motion.span>
                ) : loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    Sign In to Dashboard →
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* Hint */}
          <p
            className="mt-6 text-center text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Default credentials:{" "}
            <span className="font-mono" style={{ color: "var(--brand-400)" }}>
              admin@fyp.com
            </span>{" "}
            /{" "}
            <span className="font-mono" style={{ color: "var(--brand-400)" }}>
              admin123
            </span>
          </p>
        </div>
      </TiltCard>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  index,
}: {
  icon: string;
  title: string;
  desc: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group rounded-2xl border p-5 transition-all duration-300"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--brand-500) 40%, transparent)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md), 0 0 0 1px color-mix(in srgb, var(--brand-500) 20%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div className="mb-3 text-2xl">{icon}</div>
      <h3
        className="mb-1.5 text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {desc}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated gradient orb
// ─────────────────────────────────────────────────────────────────────────────
function GradientOrb({ className, color }: { className: string; color: string }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ backgroundColor: color }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      {/* ── Ambient background orbs ── */}
      <GradientOrb
        className="h-[600px] w-[600px] -top-40 -left-40"
        color="var(--brand-500)"
      />
      <GradientOrb
        className="h-[500px] w-[500px] top-1/2 -right-32"
        color="var(--accent-500)"
      />
      <GradientOrb
        className="h-[400px] w-[400px] bottom-0 left-1/3"
        color="var(--brand-700)"
      />

      {/* ── Dot-grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, color-mix(in srgb, var(--text-primary) 8%, transparent) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Nav bar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}
          >
            F
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            FRAS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="hidden rounded-full border px-3 py-1 text-xs font-medium sm:block"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            v2.0.0
          </span>
          <a
            href="http://127.0.0.1:8000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border px-4 py-2 text-xs font-medium transition-all duration-200 hover:shadow-md"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            API Docs ↗
          </a>
        </div>
      </motion.nav>

      {/* ── Hero + Login two-column layout ── */}
      <div className="relative z-10 flex flex-1 flex-col items-center gap-16 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:gap-12 lg:px-16 xl:gap-24">

        {/* ── Left — Hero copy ── */}
        <div className="flex max-w-xl flex-1 flex-col items-center text-center lg:items-start lg:text-left">

          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-500) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--brand-500) 30%, transparent)",
              color: "var(--brand-500)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "var(--accent-500)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent-500)" }} />
            </span>
            AI-Powered · Real-Time · Class-Isolated
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Face Recognition{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--brand-400), var(--brand-600))",
              }}
            >
              Attendance
            </span>{" "}
            System
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-8 max-w-lg text-base leading-7 sm:text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Real-time facial recognition with class-isolated tracking, live WebSocket
            camera streaming, and AI-powered sentiment analysis — all in one platform.
          </motion.p>

          {/* Stats row */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <p
                  className="text-2xl font-bold leading-none"
                  style={{ color: "var(--brand-500)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Feature grid */}
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} index={i + 4} {...f} />
            ))}
          </div>
        </div>

        {/* ── Right — Login card ── */}
        <div className="flex w-full flex-col items-center lg:w-auto lg:items-end">
          <LoginCard />

          {/* Backend status indicator */}
          <motion.div
            custom={6}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="mt-4 flex items-center gap-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: "var(--accent-500)" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--accent-500)" }}
              />
            </span>
            FastAPI backend at{" "}
            <code
              className="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-secondary)",
              }}
            >
              127.0.0.1:8000
            </code>
          </motion.div>
        </div>
      </div>

      {/* ── Footer ── */}
      <motion.footer
        custom={7}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-6 py-5 text-center text-xs sm:px-10"
        style={{
          borderTop: `1px solid var(--border-subtle)`,
          color: "var(--text-muted)",
        }}
      >
        FRAS · Real-Time Face Recognition Attendance System · Built with FastAPI &amp; Next.js
      </motion.footer>
    </main>
  );
}
