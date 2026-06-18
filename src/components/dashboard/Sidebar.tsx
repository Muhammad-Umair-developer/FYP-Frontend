"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Camera,
  Users,
  CalendarCheck,
  BrainCircuit,
  BookOpen,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { href: "/dashboard",            icon: LayoutDashboard, label: "Overview"           },
  { href: "/dashboard/camera",     icon: Camera,          label: "Live Camera"        },
  { href: "/dashboard/students",   icon: Users,           label: "Student Management" },
  { href: "/dashboard/attendance", icon: CalendarCheck,   label: "Attendance Records" },
  { href: "/dashboard/courses",    icon: BookOpen,        label: "Courses"            },
  { href: "/dashboard/sentiment",  icon: BrainCircuit,    label: "Sentiment Analysis" },
] as const;

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.97 }}
        className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150"
        style={{
          backgroundColor: active
            ? "color-mix(in srgb, var(--brand-500) 12%, transparent)"
            : "transparent",
          color: active ? "var(--brand-500)" : "var(--text-secondary)",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--bg-elevated)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          }
        }}
      >
        {/* Active left accent bar */}
        {active && (
          <motion.div
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            style={{ backgroundColor: "var(--brand-500)" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon size={17} />
        <span>{label}</span>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className="flex items-center gap-3 border-b px-5 py-5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))",
          }}
        >
          F
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            FRAS
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Admin Dashboard
          </p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="ml-auto rounded-lg p-1.5 lg:hidden"
          style={{ color: "var(--text-muted)" }}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p
          className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          // Exact match for /dashboard, prefix match for sub-routes
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <NavItem
              key={item.href}
              {...item}
              active={active}
              onClick={onClose}
            />
          );
        })}
      </nav>

      {/* Bottom user + logout */}
      <div
        className="border-t px-3 py-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "var(--brand-500)" }}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              Admin
            </p>
            <p className="truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
              admin@fyp.com
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ color: "var(--danger-500)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "color-mix(in srgb, var(--danger-500) 10%, transparent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={16} />
          Sign Out
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex h-full w-64 flex-shrink-0 flex-col"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              onClick={onClose}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col lg:hidden"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderRight: "1px solid var(--border-subtle)",
              }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
