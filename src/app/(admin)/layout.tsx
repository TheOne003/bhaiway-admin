"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { OpsProvider } from "@/providers/OpsProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <OpsProvider>
        <AdminShell>{children}</AdminShell>
      </OpsProvider>
    </RequireAuth>
  );
}
