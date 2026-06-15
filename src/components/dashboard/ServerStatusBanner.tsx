"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServerStatusBannerProps {
  show: boolean;
  onRetry: () => void;
}

/**
 * Displays a sticky banner at the top of the main content area
 * when the FastAPI backend cannot be reached.
 */
export function ServerStatusBanner({ show, onRetry }: ServerStatusBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 text-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              borderBottom: "1px solid color-mix(in srgb, var(--danger-500) 20%, transparent)",
              color: "var(--danger-500)",
            }}
          >
            <WifiOff size={15} className="flex-shrink-0" />
            <p className="flex-1 text-xs font-medium">
              <span className="font-bold">Cannot connect to server.</span>{" "}
              The FastAPI backend at{" "}
              <code
                className="rounded px-1 py-0.5 font-mono text-[10px]"
                style={{ backgroundColor: "color-mix(in srgb, var(--danger-500) 15%, transparent)" }}
              >
                127.0.0.1:8000
              </code>{" "}
              appears to be offline. Some data may be unavailable.
            </p>
            <motion.button
              onClick={onRetry}
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.35 }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: "color-mix(in srgb, var(--danger-500) 40%, transparent)",
                color: "var(--danger-500)",
              }}
            >
              <RefreshCw size={11} />
              Retry
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
