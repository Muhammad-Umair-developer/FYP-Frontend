"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AttendanceDayPoint } from "@/hooks/useDashboardData";

// ─────────────────────────────────────────────────────────────────────────────
// Colour constants — recharts SVG cannot read CSS vars, so we use hex values
// that match our design tokens exactly.
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  brand:   "#6366f1",  // --brand-500
  accent:  "#10b981",  // --accent-500
  danger:  "#f43f5e",  // --danger-500
  warning: "#f59e0b",  // --warning-500
};

const SENTIMENT_DATA = [
  { name: "Positive", value: 62, color: COLORS.accent  },
  { name: "Neutral",  value: 24, color: COLORS.brand   },
  { name: "Negative", value: 14, color: COLORS.danger  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Theme-aware chart colours helper
// ─────────────────────────────────────────────────────────────────────────────
function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  return {
    grid:      dark ? "#3f3f46" : "#e2e8f0",
    axis:      dark ? "#71717a" : "#94a3b8",
    tooltip:   dark ? "#18181b" : "#ffffff",
    tooltipBorder: dark ? "#3f3f46" : "#e2e8f0",
    tooltipText:   dark ? "#fafafa" : "#0f172a",
    legendText:    dark ? "#a1a1aa" : "#64748b",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip — Attendance
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}

function AttendanceTooltip({ active, payload, label }: CustomTooltipProps) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;

  const present = (payload.find((p) => p.dataKey === "present")?.value ?? 0) as number;
  const absent  = (payload.find((p) => p.dataKey === "absent")?.value  ?? 0) as number;
  const total   = present + absent;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div
      className="rounded-xl border p-3 shadow-lg text-xs"
      style={{
        backgroundColor: t.tooltip,
        borderColor: t.tooltipBorder,
        color: t.tooltipText,
        minWidth: 140,
      }}
    >
      <p className="mb-2 font-semibold">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: COLORS.accent }}>● Present</span>
          <span className="font-bold">{present}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: COLORS.danger }}>● Absent</span>
          <span className="font-bold">{absent}</span>
        </div>
        <div
          className="mt-2 border-t pt-2 flex justify-between gap-4"
          style={{ borderColor: t.tooltipBorder }}
        >
          <span>Rate</span>
          <span className="font-bold" style={{ color: COLORS.brand }}>{rate}%</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Area Chart
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Displays a 7-day attendance trend.
 *
 * DATA SOURCE (production wiring):
 *   For each date d in the last 7 days:
 *     GET /attendance/?date={d}&limit=200   (from API_ENDPOINTS.attendance.list)
 *   Then aggregate by status === "Present" vs. "Absent".
 *   Pass the resulting array as `data` prop.
 */
export function AttendanceAreaChart({ data }: { data: AttendanceDayPoint[] }) {
  const t = useChartTheme();

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Attendance Trend
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Last 7 days · All classes
          </p>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--brand-500) 30%, transparent)",
            color: "var(--brand-500)",
            backgroundColor: "color-mix(in srgb, var(--brand-500) 8%, transparent)",
          }}
        >
          7d
        </span>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.accent}  stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.accent}  stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.danger}  stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.danger}  stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: t.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: t.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<AttendanceTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: t.legendText, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="present"
              name="Present"
              stroke={COLORS.accent}
              strokeWidth={2}
              fill="url(#gradPresent)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="absent"
              name="Absent"
              stroke={COLORS.danger}
              strokeWidth={2}
              fill="url(#gradAbsent)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Pie Tooltip
// ─────────────────────────────────────────────────────────────────────────────
function SentimentTooltip({ active, payload }: CustomTooltipProps) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div
      className="rounded-xl border p-3 shadow-lg text-xs"
      style={{
        backgroundColor: t.tooltip,
        borderColor: t.tooltipBorder,
        color: t.tooltipText,
      }}
    >
      <p className="font-semibold" style={{ color: item.payload?.color }}>
        ● {item.name as string}
      </p>
      <p className="mt-1">
        <span className="font-bold">{item.value}%</span> of responses
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentiment Pie Chart
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sentiment distribution pie chart.
 *
 * DATA SOURCE (production wiring):
 *   When the RoBERTa sentiment endpoint is available, replace SENTIMENT_DATA with:
 *     GET /api/sentiment/summary  (future endpoint)
 *   Expected shape: { positive: number, neutral: number, negative: number }
 *   Convert percentages and pass as data array matching { name, value, color }.
 */
export function SentimentPieChart() {
  const t = useChartTheme();

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Sentiment Distribution
        </h3>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          RoBERTa NLP · Class feedback analysis
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Pie */}
        <div className="h-[200px] w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={SENTIMENT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {SENTIMENT_DATA.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<SentimentTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 w-full">
          {SENTIMENT_DATA.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs" style={{ color: t.legendText }}>
                  {item.name}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--bg-elevated)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <span
                  className="w-8 text-right text-xs font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.value}%
                </span>
              </div>
            </div>
          ))}

          {/* Disclaimer badge */}
          <div
            className="mt-2 rounded-xl border p-2.5 text-[10px] leading-relaxed"
            style={{
              borderColor: "color-mix(in srgb, var(--warning-500) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--warning-500) 6%, transparent)",
              color: "var(--text-muted)",
            }}
          >
            ⚠ Mock data — wire to RoBERTa pipeline
            endpoint when available.
          </div>
        </div>
      </div>
    </div>
  );
}
