"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Smile, Meh, Frown, Zap, Info } from "lucide-react";
import { SentimentPieChart } from "@/components/dashboard/Charts";

/**
 * /dashboard/sentiment
 *
 * DATA SOURCE (FUTURE — when RoBERTa pipeline is exposed):
 *   GET /api/sentiment/summary
 *   Expected: { positive: number, neutral: number, negative: number, total: number }
 *
 *   GET /api/sentiment/history?days=30
 *   Expected: Array<{ date: string, score: number, label: "Positive"|"Neutral"|"Negative" }>
 *
 * Currently displays mock data and the SentimentPieChart component.
 * Replace SENTIMENT_MOCK with real API data when the RoBERTa endpoint is available.
 */

const SENTIMENT_BREAKDOWN = [
  { icon: Smile, label: "Positive", value: 62, color: "var(--accent-500)", desc: "Students expressed positive engagement" },
  { icon: Meh,   label: "Neutral",  value: 24, color: "var(--brand-500)", desc: "Neutral or mixed feedback detected" },
  { icon: Frown, label: "Negative", value: 14, color: "var(--danger-500)", desc: "Negative sentiment flagged for review" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function SentimentPage() {
  return (
    <div className="p-5 sm:p-7 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Sentiment Analysis
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          AI-powered class feedback scoring via RoBERTa NLP transformer
        </p>
      </motion.div>

      {/* Pipeline notice */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-3 rounded-2xl border p-5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--warning-500) 6%, transparent)",
          borderColor: "color-mix(in srgb, var(--warning-500) 25%, transparent)",
        }}
      >
        <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warning-500)" }} />
        <div className="text-xs leading-relaxed space-y-1" style={{ color: "var(--text-secondary)" }}>
          <p className="font-semibold" style={{ color: "var(--warning-500)" }}>Mock Data Mode</p>
          <p>
            The RoBERTa sentiment analysis pipeline processes class feedback text
            using a fine-tuned transformer model. The backend API endpoint for
            sentiment aggregation is not yet exposed. Data below is illustrative.
          </p>
          <p>
            When ready, wire to:{" "}
            <code className="font-mono rounded px-1 py-0.5" style={{ backgroundColor: "color-mix(in srgb, var(--warning-500) 12%, transparent)" }}>
              GET /api/sentiment/summary
            </code>
          </p>
        </div>
      </motion.div>

      {/* Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SENTIMENT_BREAKDOWN.map(({ icon: Icon, label, value, color, desc }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: i * 0.08 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border p-5"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              <Icon size={18} />
            </div>
            <p className="text-3xl font-extrabold" style={{ color }}>{value}%</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
            {/* Mini bar */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-elevated)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.1 + 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <SentimentPieChart />
        </motion.div>

        {/* How it works card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border p-6 space-y-4"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>How it works</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>RoBERTa NLP pipeline</p>
          </div>
          {[
            { step: "1", label: "Collect Feedback", desc: "Students submit class feedback text via the frontend form." },
            { step: "2", label: "Tokenize & Encode", desc: "Text is tokenized using the RoBERTa tokenizer and encoded into 768-dim vectors." },
            { step: "3", label: "Classify Sentiment", desc: "The fine-tuned classifier assigns Positive / Neutral / Negative labels with confidence scores." },
            { step: "4", label: "Aggregate & Report", desc: "Results are stored in MongoDB and surfaced here as percentage distributions." },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex gap-4">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--brand-500)" }}
              >
                {step}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
            </div>
          ))}

          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-xs"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-500) 25%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--brand-500) 6%, transparent)",
              color: "var(--brand-500)",
            }}
          >
            <Zap size={13} />
            <span>Model: <strong>cardiffnlp/twitter-roberta-base-sentiment</strong></span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
