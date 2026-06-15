"use client";

import { Menu, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import type { ServerStatus } from "@/hooks/useServerStatus";

const STATUS_STYLES: Record<
  ServerStatus,
  { dot: string; label: string; bg: string; text: string }
> = {
  online: {
    dot: "var(--accent-500)",
    label: "Backend Online",
    bg: "color-mix(in srgb, var(--accent-500) 12%, transparent)",
    text: "var(--accent-500)",
  },
  offline: {
    dot: "var(--danger-500)",
    label: "Backend Offline",
    bg: "color-mix(in srgb, var(--danger-500) 12%, transparent)",
    text: "var(--danger-500)",
  },
  checking: {
    dot: "var(--warning-500)",
    label: "Connecting…",
    bg: "color-mix(in srgb, var(--warning-500) 12%, transparent)",
    text: "var(--warning-500)",
  },
};

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  serverStatus: ServerStatus;
  onRetry: () => void;
}

export function TopBar({ title, onMenuClick, serverStatus, onRetry }: TopBarProps) {
  const s = STATUS_STYLES[serverStatus];

  return (
    <header
      className="flex h-[60px] flex-shrink-0 items-center justify-between gap-4 px-4 sm:px-6"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 transition-colors lg:hidden"
          style={{ color: "var(--text-muted)" }}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <h1
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Server status badge */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: s.bg, color: s.text }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {serverStatus === "online" && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: s.dot }}
              />
            )}
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: s.dot }}
            />
          </span>
          <span className="hidden sm:block">{s.label}</span>

          {/* Retry button when offline */}
          {serverStatus === "offline" && (
            <motion.button
              onClick={onRetry}
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="ml-1"
              aria-label="Retry connection"
            >
              <RefreshCw size={11} />
            </motion.button>
          )}
        </div>

        {/* Theme switcher */}
        <ThemeSwitcher />

        {/* Avatar */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: "var(--brand-500)" }}
        >
          A
        </div>
      </div>
    </header>
  );
}
