"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { API_BASE_URL } from "@/config/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Mail,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface UserRecord {
  id: string;
  email: string;
  is_super_admin: boolean;
}

export default function UserManagementPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modals visibility
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected user for update/delete
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [updateEmail, setUpdateEmail] = useState("");
  const [updatePassword, setUpdatePassword] = useState("");
  const [updateIsSuperAdmin, setUpdateIsSuperAdmin] = useState(false);

  // Action status states
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoadingUsers(true);
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast("Failed to load registered users", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          is_super_admin: isSuperAdmin,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      toast("✓ User registered successfully", "success");
      setShowRegisterModal(false);
      setEmail("");
      setPassword("");
      setIsSuperAdmin(false);
      fetchUsers();
    } catch (err: any) {
      toast(err.message || "Failed to register user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: updateEmail || undefined,
          password: updatePassword || undefined,
          is_super_admin: updateIsSuperAdmin,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Update failed.");
      }

      toast("✓ User profile updated successfully", "success");
      setShowUpdateModal(false);
      setUpdatePassword("");
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast(err.message || "Failed to update user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setSubmitting(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.email}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Deletion failed.");
      }

      toast("✓ User deleted successfully", "success");
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast(err.message || "Failed to delete user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto font-sans tracking-tight bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer mb-2" style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft size={14} /> Back to Dashboard
            </span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="text-indigo-500" size={22} />
            User Management Panel
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            View, create, update privileges, and remove system administrator accounts.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] shadow-sm hover:shadow"
          style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
        >
          <UserPlus size={14} />
          Register New User
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
        {loadingUsers ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">Loading user registry...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert size={36} className="mx-auto text-amber-500/80" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">No Users Registered</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Seeded databases will dynamically sync on backend restarts.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50/55 dark:bg-zinc-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400" style={{ borderColor: "var(--border-subtle)" }}>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Access Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-medium text-slate-800 dark:text-zinc-300" style={{ borderColor: "var(--border-subtle)" }}>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600 dark:text-zinc-400">{user.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-950 dark:text-zinc-100">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.is_super_admin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/30">
                          <Shield size={10} className="fill-violet-700/10" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/55">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2.5">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setUpdateEmail(user.email);
                          setUpdateIsSuperAdmin(user.is_super_admin);
                          setShowUpdateModal(true);
                        }}
                        className="cursor-pointer inline-flex items-center justify-center p-2 rounded-lg border text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                        style={{ borderColor: "var(--border-subtle)" }}
                        title="Update user profile"
                      >
                        <Edit2 size={13} className="text-violet-600 dark:text-violet-400" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        disabled={user.email === "admin@fyp.com"}
                        className="cursor-pointer inline-flex items-center justify-center p-2 rounded-lg border text-red-600 hover:bg-red-50/40 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        style={{ borderColor: "var(--border-subtle)" }}
                        title="Delete user account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Register User Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegisterModal(false)}
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
                  <UserPlus size={16} className="text-indigo-500" />
                  Register New Account
                </h3>
                <button onClick={() => setShowRegisterModal(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-zinc-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-50"
                  />
                </div>

                <div className="rounded-xl border p-3 flex items-start gap-2.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-slate-200 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    id="super-admin-chk"
                    checked={isSuperAdmin}
                    onChange={(e) => setIsSuperAdmin(e.target.checked)}
                    className="rounded border-zinc-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                  />
                  <div>
                    <label htmlFor="super-admin-chk" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-950 dark:text-zinc-50">
                      Assign Super Admin Role
                    </label>
                    <p className="text-[10px] mt-0.5 text-slate-500 dark:text-zinc-400 leading-normal">Super Admins can view, edit, register, and delete users.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
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
                    {submitting ? "Registering..." : "Register User"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Update User Modal */}
      <AnimatePresence>
        {showUpdateModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpdateModal(false)}
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
                <button onClick={() => setShowUpdateModal(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
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
                    onClick={() => setShowUpdateModal(false)}
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

      {/* 3. Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-red-650 bg-red-50 dark:bg-red-950/20 mb-4">
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
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900"
                  style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
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
    </div>
  );
}
