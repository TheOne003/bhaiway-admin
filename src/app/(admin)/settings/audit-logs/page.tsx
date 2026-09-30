"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { auditService, type AuditFilters } from "@/services/audit";
import type { AuditRecord } from "@/types/common";

function formatJson(value: unknown): string {
  if (value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function AuditLogsWorkspace() {
  const [filters, setFilters] = useState<AuditFilters>({
    adminId: "ALL",
    action: "ALL",
    targetType: "ALL",
    search: "",
    from: "",
    to: "",
  });
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, all] = await Promise.all([
        auditService.list({
          adminId: filters.adminId || "ALL",
          action: filters.action || "ALL",
          targetType: filters.targetType || "ALL",
          search: filters.search?.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }),
        auditService.list({}),
      ]);
      setRecords(list);
      setAllRecords(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load audit logs.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const actionOptions = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.action));
    return ["ALL", ...[...set].sort()];
  }, [allRecords]);

  const targetOptions = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.targetType));
    return ["ALL", ...[...set].sort()];
  }, [allRecords]);

  const adminOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allRecords) map.set(r.adminId, r.adminName);
    return [
      ["ALL", "All admins"] as const,
      ...[...map.entries()].map(([id, name]) => [id, name] as const),
    ];
  }, [allRecords]);
  if (loading && records.length === 0 && !error) {
    return <LoadingState label="Loading audit logs…" />;
  }

  if (error && records.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load audit logs." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="audit-logs-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Read-only trail of administrative actions. Secrets are redacted by the audit service.
        </p>
      </header>

      <section
        className="flex flex-wrap gap-3 border-b border-[var(--bw-border)] pb-4"
        aria-label="Audit filters"
        data-testid="audit-filters"
      >
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Admin</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.adminId ?? "ALL"}
            data-testid="audit-filter-admin"
            onChange={(e) => setFilters((f) => ({ ...f, adminId: e.target.value }))}
          >
            {adminOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Action</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.action ?? "ALL"}
            data-testid="audit-filter-action"
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          >
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Target type</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.targetType ?? "ALL"}
            onChange={(e) => setFilters((f) => ({ ...f, targetType: e.target.value }))}
          >
            {targetOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">From</span>
          <input
            type="date"
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.from ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">To</span>
          <input
            type="date"
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.to ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Search</span>
          <input
            type="search"
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={filters.search ?? ""}
            data-testid="audit-search"
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Action, target, admin…"
          />
        </label>
      </section>

      {records.length === 0 ? (
        <EmptyState title="No audit events match your filters." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--bw-border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Admin</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`audit-row-${row.id}`}
                >
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {formatIstDateTime(new Date(row.timestamp))}
                  </td>
                  <td className="px-3 py-3">{row.adminName}</td>
                  <td className="px-3 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                    {row.targetType}/{row.targetId}
                  </td>
                  <td className="max-w-xs px-3 py-3 text-[var(--bw-text-secondary)]">
                    {row.reason ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid={`audit-view-${row.id}`}
                      onClick={() => setSelected(row)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={selected != null}
        title="Audit event"
        onClose={() => setSelected(null)}
        className="max-w-lg"
      >
        {selected ? (
          <div className="space-y-4 text-sm" data-testid="audit-detail">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">ID</dt>
                <dd className="font-mono text-xs">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Admin</dt>
                <dd>
                  {selected.adminName} ({selected.adminId})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Action</dt>
                <dd className="font-mono text-xs">{selected.action}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Target</dt>
                <dd>
                  {selected.targetType} / {selected.targetId}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Timestamp</dt>
                <dd>{formatIstDateTime(new Date(selected.timestamp))}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Reason</dt>
                <dd>{selected.reason ?? "—"}</dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Old state
              </h3>
              <pre className="overflow-x-auto rounded-md bg-[var(--bw-elevated)] p-3 text-xs">
                {formatJson(selected.oldValue)}
              </pre>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                New state
              </h3>
              <pre className="overflow-x-auto rounded-md bg-[var(--bw-elevated)] p-3 text-xs">
                {formatJson(selected.newValue)}
              </pre>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Metadata
              </h3>
              <pre className="overflow-x-auto rounded-md bg-[var(--bw-elevated)] p-3 text-xs">
                {formatJson({
                  id: selected.id,
                  adminId: selected.adminId,
                  adminName: selected.adminName,
                  action: selected.action,
                  targetType: selected.targetType,
                  targetId: selected.targetId,
                  timestamp: selected.timestamp,
                  reason: selected.reason,
                })}
              </pre>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <PermissionGuard permission="audit.view">
      <AuditLogsWorkspace />
    </PermissionGuard>
  );
}
