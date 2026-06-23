"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  CalendarCheck,
  Camera,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AttendanceAreaChart } from "@/components/dashboard/Charts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { API_ENDPOINTS } from "@/config/api";

// ─────────────────────────────────────────────────────────────────────────────
// Quick action cards
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    href:  "/dashboard/camera",
    icon:  Camera,
    label: "Launch Live Camera",
    desc:  "Start class-isolated face recognition attendance",
    color: "var(--brand-500)",
  },
  {
    href:  "/dashboard/students",
    icon:  Users,
    label: "Register Student",
    desc:  "Add a new student and upload face embeddings",
    color: "var(--accent-500)",
  },
  {
    href:  "/dashboard/attendance",
    icon:  CalendarCheck,
    label: "View Attendance",
    desc:  "Browse and filter attendance records by class & date",
    color: "var(--warning-500)",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview page
// ─────────────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { metrics, attendanceTrend, loading, error } = useDashboardData();

  // Derived metric values
  const attendanceRate = useMemo(() => {
    if (metrics.todayTotalCount === 0) return "—";
    return `${Math.round((metrics.todayPresentCount / metrics.todayTotalCount) * 100)}%`;
  }, [metrics]);

  // Current date
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 p-5 sm:p-7">

      {/* ── Welcome header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Good {getGreeting()}, Admin 👋
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {dateLabel}
          </p>
        </div>

        {/* Backend camera quick-link */}
        
        {/* <a
          href={API_ENDPOINTS.camera}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all hover:shadow-md"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <Camera size={13} />
          Open Camera Interface ↗
        </a> */}
      </motion.div>

      {/* ── Data fetch error state ─────────────────────────────────────── */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--warning-500) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--warning-500) 25%, transparent)",
            color: "var(--warning-500)",
          }}
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            <strong>Partial data loaded.</strong> {error} — Charts below may show demo data.
          </span>
        </motion.div>
      )}

      {/* ── Metric cards ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Key Metrics"
          subtitle="Live figures from the FastAPI backend"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            index={0}
            icon={Users}
            label="Total Students"
            value={loading ? "—" : metrics.totalStudents}
            subLabel="Across all class collections"
            accentColor="var(--brand-500)"
            loading={loading}
          />
          <MetricCard
            index={1}
            icon={BookOpen}
            label="Active Classes"
            value={metrics.activeClasses ?? "N/A"}
            subLabel="No list-classes endpoint yet"
            accentColor="var(--accent-500)"
            loading={loading}
          />
          <MetricCard
            index={2}
            icon={CalendarCheck}
            label="Today's Attendance"
            value={attendanceRate}
            subLabel={`${metrics.todayPresentCount} of ${metrics.todayTotalCount} present`}
            trend={
              metrics.todayTotalCount > 0
                ? {
                    value: Math.round(
                      (metrics.todayPresentCount / metrics.todayTotalCount) * 100
                    ),
                    positive: metrics.todayPresentCount / metrics.todayTotalCount > 0.7,
                  }
                : undefined
            }
            accentColor="var(--warning-500)"
            loading={loading}
          />
        </div>
      </section>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Analytics"
          subtitle="Attendance trends and attendance by subject"
        />
        <div className="grid grid-cols-1 gap-5">
          <AttendanceAreaChart data={attendanceTrend} />
        </div>
      </section>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Quick Actions"
          subtitle="Navigate to key workflows"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ y: -3 }}
            >
              <Link href={href}>
                <div
                  className="cursor-pointer group flex h-full flex-col gap-3 rounded-2xl border p-5 transition-all duration-200"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      `color-mix(in srgb, ${color} 35%, transparent)`;
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border-subtle)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                      color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {desc}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color }}
                  >
                    Go <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom padding for scroll breathing room */}
      <div className="h-6" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
