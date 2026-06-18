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
  "/dashboard/sentiment":  "Sentiment Analysis",
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

  // ── Auth guard (client-side) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/");
  }, [router]);

  if (typeof window !== "undefined" && !isAuthenticated()) return null;

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
