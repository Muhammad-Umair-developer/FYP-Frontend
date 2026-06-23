"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import logo from "./logo.png";
import { useTheme } from "next-themes";
import {
  motion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  ScanFace,
  ShieldCheck,
  Video,
  BookOpen,
  Sun,
  Moon,
  Laptop,
  Lock,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/config/api";

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay: i * 0.08 },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: ScanFace,
    title: "Real-Time Face Recognition",
    desc: "Sub-second identification using InsightFace + MTCNN with 512-dim embeddings.",
  },
  {
    icon: ShieldCheck,
    title: "Class-Isolated Tracking",
    desc: "Per-class MongoDB collections ensure zero cross-class data leakage.",
  },
  {
    icon: Video,
    title: "Live WebSocket Streaming",
    desc: "Camera frames analysed at 2 fps; match results streamed back instantly.",
  },
  {
    icon: BookOpen,
    title: "Attendance by Subject",
    desc: "Track student presence and attendance trends for individual subjects and courses.",
  },
];

const STATS = [
  { value: "512", label: "Embedding Dimensions" },
  { value: "<1s", label: "Recognition Latency" },
  { value: "99%+", label: "Detection Accuracy" },
  { value: "∞", label: "Classes Supported" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Premium Card Container
// ─────────────────────────────────────────────────────────────────────────────
function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-8 transition-all duration-300 hover:shadow-lg ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Mode Toggle (Light / Dark / System)
// ─────────────────────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-32 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 animate-pulse" />;
  }

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Laptop, label: "System" },
  ] as const;

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border p-0.5"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className="cursor-pointer flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all duration-200"
            style={{
              backgroundColor: active ? "var(--bg-elevated)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
            }}
            title={`${opt.label} Mode`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      setSuccess(true);
      router.push("/dashboard");
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
      <PremiumCard>
        {/* Card glow accent */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: "var(--brand-500)" }}
        />

        {/* Header */}
        <div className="mb-8">
          <div
            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
          >
            <Lock size={18} />
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
              autoComplete="new-password"
              placeholder="username"
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
            <div className="relative">
              <input
                id={passId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="w-full rounded-xl border pl-4 pr-11 py-3 text-sm outline-none transition-all duration-200"
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
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                style={{ color: "var(--text-muted)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={showPassword ? "eye-off" : "eye"}
                    initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 15 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
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
                className="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--danger-500) 30%, transparent)",
                  color: "var(--danger-500)",
                }}
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={loading || success}
            whileHover={{ scale: loading || success ? 1 : 1.01 }}
            whileTap={{ scale: loading || success ? 1 : 0.98 }}
            className="cursor-pointer relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold text-white outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
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
                  <RefreshCw className="h-4 w-4 animate-spin" />
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
      </PremiumCard>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ElementType;
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
    >
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300"
        style={{
          backgroundColor: "color-mix(in srgb, var(--brand-500) 10%, transparent)",
          color: "var(--brand-500)",
        }}
      >
        <Icon size={18} />
      </div>
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
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      {/* ── Subtle Top Center Ambient Glow ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full opacity-25 dark:opacity-30 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--brand-500), transparent)",
        }}
      />

      {/* ── Dot-grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Nav bar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))" }}
          >
           <Image 
             src={logo} 
             alt="Logo" 
             className="h-full w-full object-cover rounded-xl"
             // Since you have fixed dimensions (h-9 w-9 is 36px x 36px), 
             // providing width and height prevents layout shifts.
             width={36} 
             height={36} 
           />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            FRAS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
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
              borderColor: "color-mix(in srgb, var(--brand-500) 20%, transparent)",
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
            Automated Facial Recognition{" "}
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
            camera streaming, and attendance tracking by subject — all in one platform.
          </motion.p>

          {/* Stats row */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6 w-full border-t border-b py-6"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <p
                  className="text-2xl font-bold leading-none"
                  style={{ color: "var(--brand-500)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Feature grid */}
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} index={i + 4} {...f} />
            ))}
          </div>
        </div>

        {/* ── Right — Login card ── */}
        <div className="flex w-full flex-col items-center lg:w-auto lg:items-end">
          <LoginCard />
        </div>
      </div>

      {/* ── Footer ── */}
      <motion.footer
        custom={7}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-6 py-5 text-center text-xs sm:px-10 mt-auto"
        style={{
          borderTop: `1px solid var(--border-subtle)`,
          color: "var(--text-muted)",
        }}
      >
        Built with ❤️ by 1211, 1200, 1192
      </motion.footer>
    </main>
  );
}
