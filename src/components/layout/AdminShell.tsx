"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DevEventSimulator } from "@/components/dev/DevEventSimulator";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Fixed sidebar + sticky topbar + independently scrollable main content.
 * DevEventSimulator returns null when NODE_ENV === "production".
 */
export function AdminShell({ children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className="flex h-dvh max-h-dvh overflow-hidden bg-[var(--bw-bg)] text-[var(--bw-text-primary)]"
      data-testid="admin-shell"
    >
      <Sidebar
        open={sidebarOpen}
        onNavigate={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
      />

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main
          className="bw-main-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4"
          id="main-content"
          data-testid="admin-main"
        >
          {children}
        </main>
      </div>
      {process.env.NODE_ENV !== "production" ? <DevEventSimulator /> : null}
    </div>
  );
}
