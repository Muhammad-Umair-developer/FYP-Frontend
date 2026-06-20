"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ServerStatusBanner } from "@/components/dashboard/ServerStatusBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { useServerStatus } from "@/hooks/useServerStatus";
import { isAuthenticated } from "@/hooks/useAuth";

// Page title map — derived from pathname
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":            "Overview",
  "/dashboard/camera":     "Live Camera",
  "/dashboard/students":   "Student Management",
  "/dashboard/attendance": "Attendance Records",
  "/dashboard/courses":    "Course Management",
  "/dashboard/identify":   "Identify Student",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status: serverStatus, retry } = useServerStatus();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  // ── Auth guard (client-side) ─────────────────────────────────────────────
  useEffect(() => {
    const authed = isAuthenticated();
    setIsAuth(authed);
    setMounted(true);
    if (!authed) {
      router.replace("/");
    }
  }, [router]);

  if (!mounted) {
    return (
      <div className="flex h-dvh overflow-hidden bg-zinc-950">
        <div className="w-64 h-full border-r bg-zinc-900 border-zinc-800 flex flex-col p-5 space-y-4 animate-pulse">
          <div className="h-10 bg-zinc-800 rounded-xl w-32" />
          <div className="h-8 bg-zinc-800 rounded-lg w-full mt-8" />
          <div className="h-8 bg-zinc-800 rounded-lg w-full" />
          <div className="h-8 bg-zinc-800 rounded-lg w-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAuth) return null;


  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    // ToastProvider wraps the whole dashboard so any page can call useToast()
    <ToastProvider>
      <div
        className="flex h-dvh overflow-hidden"
        style={{ backgroundColor: "var(--bg-page)" }}
      >
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            title={title}
            onMenuClick={() => setSidebarOpen(true)}
            serverStatus={serverStatus}
            onRetry={retry}
          />
          <ServerStatusBanner show={serverStatus === "offline"} onRetry={retry} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
