"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Fire a toast notification. */
  toast: (message: string, type?: ToastType) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Individual Toast item
// ---------------------------------------------------------------------------
const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  success: {
    icon: CheckCircle2,
    color: "var(--accent-500)",
    bg: "color-mix(in srgb, var(--accent-500) 8%, var(--bg-surface))",
    border: "color-mix(in srgb, var(--accent-500) 30%, transparent)",
  },
  error: {
    icon: XCircle,
    color: "var(--danger-500)",
    bg: "color-mix(in srgb, var(--danger-500) 8%, var(--bg-surface))",
    border: "color-mix(in srgb, var(--danger-500) 30%, transparent)",
  },
  info: {
    icon: Info,
    color: "var(--brand-500)",
    bg: "color-mix(in srgb, var(--brand-500) 8%, var(--bg-surface))",
    border: "color-mix(in srgb, var(--brand-500) 30%, transparent)",
  },
};

const AUTO_DISMISS_MS = 4_500;

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, color, bg, border } = TOAST_CONFIG[item.type];

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="flex w-full items-start gap-3 rounded-2xl border p-4 shadow-lg"
      style={{
        backgroundColor: bg,
        borderColor: border,
        boxShadow: `var(--shadow-lg), 0 0 0 1px ${border}`,
      }}
    >
      <Icon size={17} className="mt-0.5 flex-shrink-0" style={{ color }} />

      <p
        className="flex-1 text-sm leading-snug font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {item.message}
      </p>

      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 rounded-md p-0.5 transition-opacity hover:opacity-60"
        style={{ color: "var(--text-muted)" }}
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Provider — wrap the dashboard layout with this
// ---------------------------------------------------------------------------
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — bottom-right, above everything */}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex w-80 flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <ToastCard item={item} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
