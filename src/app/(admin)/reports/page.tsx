"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { REPORT_DEFINITIONS, reportsService } from "@/services/reports";
import type { ReportCategory, ReportDefinition, ReportRecord } from "@/types/report";

const CATEGORIES: Array<ReportCategory | "ALL"> = [
  "ALL",
  "RIDE_OPERATIONS",
  "USER_ACTIVITY",
  "DRIVER_OPERATIONS",
  "SAFETY",
  "VERIFICATION",
  "MONEY",
  "SUPPORT",
  "COMMUNICATION",
  "GROWTH",
];

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsWorkspace() {
  const { session } = useAuth();
  const adminName = session?.admin.name ?? "BhaiWay Admin";

  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [generated, setGenerated] = useState<ReportRecord[]>([]);
  const [category, setCategory] = useState<ReportCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReportRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [defs, list] = await Promise.all([
        reportsService.getDefinitions(),
        reportsService.listGenerated({
          category,
          search: search.trim() || undefined,
        }),
      ]);
      setDefinitions(defs);
      setGenerated(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const filteredDefinitions = useMemo(() => {
    let list = definitions.length ? definitions : REPORT_DEFINITIONS;
    if (category !== "ALL") list = list.filter((d) => d.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [definitions, category, search]);

  const latestByDef = useMemo(() => {
    const map = new Map<string, ReportRecord>();
    for (const r of generated) {
      if (!map.has(r.definitionId)) map.set(r.definitionId, r);
    }
    return map;
  }, [generated]);

  async function confirmGenerate() {
    if (!pendingGenerate) return;
    setBusy(true);
    try {
      const report = await reportsService.generate(pendingGenerate, adminName);
      setPendingGenerate(null);
      setSelected(report);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate report.");
      setPendingGenerate(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh(reportId: string) {
    setBusy(true);
    try {
      const report = await reportsService.refresh(reportId, adminName);
      if (report) setSelected(report);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh report.");
    } finally {
      setBusy(false);
    }
  }

  function handleExport(report: ReportRecord) {
    const csv = reportsService.exportCsv(report);
    downloadCsv(`${report.id}.csv`, csv);
  }

  if (loading && definitions.length === 0 && generated.length === 0) {
    return <LoadingState label="Loading reports…" />;
  }

  if (error && definitions.length === 0 && generated.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load reports." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="reports-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Operational report definitions and generated snapshots from domain services.
        </p>
      </header>

      {error ? (
        <ErrorState title="Reports error" message={error} />
      ) : null}

      <section
        className="flex flex-wrap gap-3 border-b border-[var(--bw-border)] pb-4"
        aria-label="Report filters"
      >
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Category</span>
          <select
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory | "ALL")}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All categories" : c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-[var(--bw-text-muted)]">Search</span>
          <input
            type="search"
            className="rounded border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or category"
          />
        </label>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={busy}>
          Refresh list
        </Button>
      </section>

      {filteredDefinitions.length === 0 ? (
        <EmptyState
          title="No report definitions match."
          description="Try a different category or search term."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--bw-border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Last generated</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefinitions.map((def) => {
                const latest = latestByDef.get(def.id);
                return (
                  <tr
                    key={def.id}
                    className="border-b border-[var(--bw-border)] last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">{def.name}</td>
                    <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                      {def.category.replace(/_/g, " ")}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-[var(--bw-text-secondary)]">
                      {def.description}
                    </td>
                    <td className="px-3 py-3 text-[var(--bw-text-secondary)]">
                      {latest
                        ? formatIstDateTime(new Date(latest.generatedAt))
                        : "Never"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          latest?.status === "READY"
                            ? "text-[var(--bw-success)]"
                            : latest?.status === "FAILED"
                              ? "text-[var(--bw-danger)]"
                              : "text-[var(--bw-text-muted)]"
                        }
                      >
                        {latest?.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          data-testid={`report-generate-${def.id}`}
                          onClick={() => setPendingGenerate(def.id)}
                        >
                          Generate
                        </Button>
                        {latest ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              data-testid={`report-open-${latest.id}`}
                              onClick={() => setSelected(latest)}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void handleRefresh(latest.id)}
                            >
                              Refresh
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid="report-export"
                              onClick={() => handleExport(latest)}
                            >
                              Export CSV
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {generated.length > 0 ? (
        <section className="space-y-2" aria-labelledby="generated-heading">
          <h2 id="generated-heading" className="text-lg font-semibold">
            Generated reports
          </h2>
          <ul className="space-y-2">
            {generated.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bw-border)] py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-[var(--bw-text-muted)]">
                    {r.id} · {formatIstDateTime(new Date(r.generatedAt))} · {r.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid={`report-open-${r.id}`}
                    onClick={() => setSelected(r)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid="report-export"
                    onClick={() => handleExport(r)}
                  >
                    Export CSV
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={pendingGenerate != null}
        title="Generate report"
        description="Generate a fresh report snapshot from current domain data? Previous snapshot for this definition will be replaced."
        confirmLabel="Generate"
        onCancel={() => setPendingGenerate(null)}
        onConfirm={() => void confirmGenerate()}
      />

      <DetailDrawer
        open={selected != null}
        title={selected?.name ?? "Report"}
        onClose={() => setSelected(null)}
        className="max-w-lg"
      >
        {selected ? (
          <div className="space-y-4" data-testid="report-detail">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Status</dt>
                <dd>{selected.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Category</dt>
                <dd>{selected.category.replace(/_/g, " ")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-[var(--bw-text-muted)]">Generated</dt>
                <dd>
                  {formatIstDateTime(new Date(selected.generatedAt))} by {selected.generatedBy}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Summary</h3>
              <ul className="space-y-1 text-sm">
                {selected.summary.map((s) => (
                  <li key={s.label} className="flex justify-between gap-4">
                    <span className="text-[var(--bw-text-secondary)]">{s.label}</span>
                    <span className="tabular-nums font-medium">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--bw-border)] text-[var(--bw-text-muted)]">
                    {selected.columns.map((c) => (
                      <th key={c} className="px-2 py-1 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--bw-border)]">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected.rows.length > 50 ? (
                <p className="mt-2 text-xs text-[var(--bw-text-muted)]">
                  Showing first 50 of {selected.rows.length} rows. Export CSV for full data.
                </p>
              ) : null}
            </div>
            <Button
              data-testid="report-export"
              onClick={() => handleExport(selected)}
            >
              Export CSV
            </Button>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <PermissionGuard permission="reports.view">
      <ReportsWorkspace />
    </PermissionGuard>
  );
}
