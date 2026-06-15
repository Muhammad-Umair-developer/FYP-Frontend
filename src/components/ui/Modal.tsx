"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Tailwind max-w class or CSS value, default "max-w-lg" */
  maxWidth?: string;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`relative z-10 w-full ${maxWidth} overflow-hidden rounded-3xl border`}
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-6 py-5"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div>
                <h2
                  className="text-base font-bold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
                aria-label="Close modal"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Body — independently scrollable */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "min(calc(100dvh - 160px), 640px)" }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
