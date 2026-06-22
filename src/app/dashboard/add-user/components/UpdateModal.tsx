"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Edit2, X } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  is_super_admin: boolean;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserRecord | null;
  updateEmail: string;
  setUpdateEmail: (val: string) => void;
  updatePassword: string;
  setUpdatePassword: (val: string) => void;
  updateIsSuperAdmin: boolean;
  setUpdateIsSuperAdmin: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export default function UpdateModal({
  isOpen,
  onClose,
  selectedUser,
  updateEmail,
  setUpdateEmail,
  updatePassword,
  setUpdatePassword,
  updateIsSuperAdmin,
  setUpdateIsSuperAdmin,
  onSubmit,
  submitting,
}: UpdateModalProps) {
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
            className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-5 border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Edit2 size={16} className="text-violet-500" />
                Update User Profile
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={updateEmail}
                  onChange={(e) => setUpdateEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">New Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  value={updatePassword}
                  onChange={(e) => setUpdatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                />
              </div>

              <div className="rounded-xl border p-3 flex items-start gap-2.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-slate-200 dark:border-zinc-700">
                <input
                  type="checkbox"
                  id="update-super-admin-chk"
                  checked={updateIsSuperAdmin}
                  onChange={(e) => setUpdateIsSuperAdmin(e.target.checked)}
                  disabled={selectedUser.email === "admin@fyp.com"}
                  className="rounded border-zinc-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <label htmlFor="update-super-admin-chk" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-950 dark:text-zinc-50">
                    Assign Super Admin Role
                  </label>
                  <p className="text-[10px] mt-0.5 text-slate-500 dark:text-zinc-400 leading-normal">Super Admins can view, edit, register, and delete users.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                  style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
