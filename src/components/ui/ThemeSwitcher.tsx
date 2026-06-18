"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion } from "framer-motion";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; icon: React.ReactNode; label: string }[] = [
  { value: "light",  icon: <Sun  size={14} />, label: "Light"  },
  { value: "dark",   icon: <Moon size={14} />, label: "Dark"   },
  { value: "system", icon: <Monitor size={14} />, label: "System" },
];

/**
 * Three-button theme switcher (Light / Dark / System).
 * Requires next-themes ThemeProvider in the tree.
 */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — render nothing on the server
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-24 rounded-xl" style={{ backgroundColor: "var(--bg-elevated)" }} />;

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl p-1"
      style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
    >
      {OPTIONS.map(({ value, icon, label }) => {
        const isActive = theme === value;
        return (
          <motion.button
            key={value}
            onClick={() => setTheme(value)}
            whileTap={{ scale: 0.92 }}
            className="cursor-pointer relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors"
            style={{
              color: isActive ? "var(--text-inverted)" : "var(--text-muted)",
            }}
            aria-label={`Switch to ${label} theme`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-pill"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: "var(--brand-500)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{icon}</span>
            {!compact && <span className="relative z-10">{label}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
