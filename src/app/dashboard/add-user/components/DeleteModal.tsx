"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  is_super_admin: boolean;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserRecord | null;
  onConfirm: () => void;
  submitting: boolean;
}

export default function DeleteModal({
  isOpen,
  onClose,
  selectedUser,
  onConfirm,
  submitting,
}: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-red-600 bg-red-50 dark:bg-red-950/20 mb-4">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">
              Delete User Account?
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Are you sure you want to delete administrator <strong>{selectedUser.email}</strong>? They will lose access immediately.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-red-600 hover:bg-red-700 active:scale-[0.98]"
              >
                {submitting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
