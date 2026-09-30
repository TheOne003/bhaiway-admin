"use client";

import { useCallback, useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { infrastructureService } from "@/services/infrastructure";
import type { InfraStatus, InfrastructureComponent } from "@/types/infrastructure";

const STATUS_CLASS: Record<InfraStatus, string> = {
  HEALTHY: "text-[var(--bw-success)]",
  DEGRADED: "text-[var(--bw-warning)]",
  DOWN: "text-[var(--bw-danger)]",
  NOT_CONFIGURED: "text-[var(--bw-text-muted)]",
};

function InfrastructureWorkspace() {
  const [components, setComponents] = useState<InfrastructureComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await infrastructureService.getComponents();
      setComponents(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load infrastructure.");
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading && components.length === 0) {
    return <LoadingState label="Loading infrastructure…" />;
  }

  if (error && components.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load infrastructure." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="infrastructure-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Infrastructure</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Component inventory and dependency status.{" "}
          <span className="font-medium text-[var(--bw-warning)]">
            Mock infrastructure data
          </span>{" "}
          — not live production telemetry.
        </p>
      </header>

      {components.length === 0 ? (
        <EmptyState
          title="No infrastructure components."
          description="Mock inventory is empty."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--bw-border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Uptime</th>
                <th className="px-3 py-2 font-medium">Last check</th>
                <th className="px-3 py-2 font-medium">Dependency</th>
                <th className="px-3 py-2 font-medium">Recent issue</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`infra-row-${c.id}`}
                >
                  <td className="px-3 py-3 font-medium">{c.name}</td>
                  <td className={cn("px-3 py-3 font-medium", STATUS_CLASS[c.status])}>
                    {c.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[var(--bw-text-secondary)]">
                    {c.uptimePercent == null ? "—" : `${c.uptimePercent}%`}
                  </td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {formatIstDateTime(new Date(c.lastCheckedAt))}
                  </td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">{c.dependency}</td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {c.recentIssue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InfrastructurePage() {
  return (
    <PermissionGuard permission="system.health.view">
      <InfrastructureWorkspace />
    </PermissionGuard>
  );
}
