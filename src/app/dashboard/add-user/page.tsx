"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { API_BASE_URL } from "@/config/api";
import {
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Users,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const RegisterModal = dynamic(() => import("./components/RegisterModal"), { ssr: false });
const UpdateModal = dynamic(() => import("./components/UpdateModal"), { ssr: false });
const DeleteModal = dynamic(() => import("./components/DeleteModal"), { ssr: false });

interface UserRecord {
  id: string;
  email: string;
  is_super_admin: boolean;
}

export default function UserManagementPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Decode currently logged-in user's email
  const token = getToken();
  let loggedInEmail = "";
  let isCurrentUserSuperAdmin = false;
  if (token) {
    try {
      const payload = token.split(".")[1];
      if (payload) {
        const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        loggedInEmail = decoded.sub || "";
        isCurrentUserSuperAdmin = Boolean(decoded.is_super_admin);
      }
    } catch (e) {
      console.error("Error decoding token in user management:", e);
    }
  }

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
    if (loggedInEmail && !isCurrentUserSuperAdmin && loggedInEmail !== "admin@fyp.com") {
      router.replace("/dashboard");
    } else {
      fetchUsers();
    }
  }, [loggedInEmail, isCurrentUserSuperAdmin, router]);

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
                      {(user.email !== "admin@fyp.com" || loggedInEmail === "admin@fyp.com") && (
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
                      )}
                      {user.email !== "admin@fyp.com" && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="cursor-pointer inline-flex items-center justify-center p-2 rounded-lg border text-red-600 hover:bg-red-50/40 transition-colors"
                          style={{ borderColor: "var(--border-subtle)" }}
                          title="Delete user account"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals loaded dynamically */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isSuperAdmin={isSuperAdmin}
        setIsSuperAdmin={setIsSuperAdmin}
        onSubmit={handleRegister}
        submitting={submitting}
      />

      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedUser(null);
        }}
        selectedUser={selectedUser}
        updateEmail={updateEmail}
        setUpdateEmail={setUpdateEmail}
        updatePassword={updatePassword}
        setUpdatePassword={setUpdatePassword}
        updateIsSuperAdmin={updateIsSuperAdmin}
        setUpdateIsSuperAdmin={setUpdateIsSuperAdmin}
        onSubmit={handleUpdate}
        submitting={submitting}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        selectedUser={selectedUser}
        onConfirm={handleDelete}
        submitting={submitting}
      />
    </div>
  );
}
