"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.08 },
  }),
};

export interface MetricCardProps {
  index: number;
  icon: LucideIcon;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: { value: number; positive: boolean };
  accentColor: string; // CSS variable string e.g. "var(--brand-500)"
  loading?: boolean;
}

export function MetricCard({
  index,
  icon: Icon,
  label,
  value,
  subLabel,
  trend,
  accentColor,
  loading = false,
}: MetricCardProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)";
        (e.currentTarget as HTMLElement).style.borderColor =
          `color-mix(in srgb, ${accentColor} 35%, transparent)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
      }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: accentColor }}
      />

      {/* Icon */}
      <div
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
          color: accentColor,
        }}
      >
        <Icon size={19} />
      </div>

      {/* Value */}
      {loading ? (
        <div
          className="mb-1 h-8 w-24 animate-pulse rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      ) : (
        <p
          className="mb-1 text-3xl font-extrabold tracking-tight leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
      )}

      {/* Label */}
      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>

      {/* Sub-label + trend */}
      <div className="mt-3 flex items-center gap-2">
        {subLabel && (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {subLabel}
          </span>
        )}
        {trend && (
          <span
            className="ml-auto flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: trend.positive
                ? "color-mix(in srgb, var(--accent-500) 12%, transparent)"
                : "color-mix(in srgb, var(--danger-500) 12%, transparent)",
              color: trend.positive ? "var(--accent-500)" : "var(--danger-500)",
            }}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
