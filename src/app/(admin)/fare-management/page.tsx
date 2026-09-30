"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { faresService } from "@/services/fares";
import type { CreateFareInput, FareConfigStatus, FareConfiguration } from "@/types/fare";
import type { RideNetwork } from "@/types/network";

export default function FareManagementPage() {
  return (
    <PermissionGuard permission="fare.view">
      <FareWorkspace />
    </PermissionGuard>
  );
}

function FareWorkspace() {
  const { session } = useAuth();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [configs, setConfigs] = useState<FareConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<RideNetwork | "ALL">("ALL");
  const [status, setStatus] = useState<FareConfigStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<FareConfigStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewKm, setPreviewKm] = useState("10");

  const [form, setForm] = useState({
    name: "",
    network: "OFFICE" as RideNetwork,
    baseRupees: "40",
    perKmRupees: "12",
    minRupees: "50",
    cancelRupees: "20",
    effectiveFrom: "2026-10-01",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await faresService.getConfigurations({
        network,
        status,
        search: search || undefined,
      });
      setConfigs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load fare configs.");
    } finally {
      setLoading(false);
    }
  }, [network, status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => configs.find((c) => c.id === selectedId) ?? null,
    [configs, selectedId],
  );

  const previewPaise = useMemo(() => {
    if (!selected) return null;
    const km = Number(previewKm);
    if (!Number.isFinite(km)) return null;
    return faresService.previewFare(selected, km);
  }, [selected, previewKm]);

  async function createFare() {
    setBusy(true);
    try {
      const input: CreateFareInput = {
        name: form.name,
        network: form.network,
        baseFarePaise: rupeesToPaise(Number(form.baseRupees)),
        perKmPaise: rupeesToPaise(Number(form.perKmRupees)),
        minimumFarePaise: rupeesToPaise(Number(form.minRupees)),
        cancellationFeePaise: rupeesToPaise(Number(form.cancelRupees)),
        effectiveFrom: `${form.effectiveFrom}T00:00:00.000Z`,
      };
      const created = await faresService.create(input, { adminId, adminName });
      setCreateOpen(false);
      setSelectedId(created.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus(reason: string) {
    if (!selected || !pendingStatus) return;
    setBusy(true);
    try {
      await faresService.setStatus(selected.id, pendingStatus, { adminId, adminName }, reason);
      setPendingStatus(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && configs.length === 0 && !error) {
    return <LoadingState label="Loading fare configurations…" />;
  }

  return (
    <PageContainer width="wide" testId="fare-page">
      <PageHeader
        title="Fare Management"
        description="Network fare configs — draft, activate, and preview estimates."
        actions={
          <PermissionGuard permission="fare.manage" fallback="hide">
            <Button size="sm" data-testid="fare-create" onClick={() => setCreateOpen(true)}>
              Create fare
            </Button>
          </PermissionGuard>
        }
      />

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load fares." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "OFFICE", "OUTSTATION"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={network === id}
            onClick={() => setNetwork(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              network === id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
          >
            {id === "ALL" ? "All networks" : id === "OFFICE" ? "Office" : "Outstation"}
          </button>
        ))}
        {(["ALL", "ACTIVE", "DRAFT", "INACTIVE"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={status === id}
            onClick={() => setStatus(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              status === id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
          >
            {id === "ALL" ? "All status" : id}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name or ID…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {configs.length === 0 ? (
        <EmptyState title="No fare configs match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Base</th>
                <th className="px-3 py-2">Per km</th>
                <th className="px-3 py-2">Min</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`fare-row-${c.id}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-xs text-[var(--bw-text-muted)]">v{c.version}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <NetworkBadge network={c.network} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">{formatMoney(c.baseFarePaise)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">{formatMoney(c.perKmPaise)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">{formatMoney(c.minimumFarePaise)}</td>
                  <td className="px-3 py-2.5 text-xs font-medium">{c.status}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(c.id)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected) && !createOpen}
        title={selected?.name ?? "Fare config"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <NetworkBadge network={selected.network} />
              <span className="text-xs font-medium">{selected.status}</span>
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Base / per km / min</dt>
                <dd className="tabular-nums">
                  {formatMoney(selected.baseFarePaise)} · {formatMoney(selected.perKmPaise)} ·{" "}
                  {formatMoney(selected.minimumFarePaise)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Cancellation fee</dt>
                <dd className="tabular-nums">{formatMoney(selected.cancellationFeePaise)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Effective</dt>
                <dd>{formatIstDateTime(new Date(selected.effectiveFrom))}</dd>
              </div>
            </dl>

            <label className="block space-y-1 text-sm">
              <span className="text-xs text-[var(--bw-text-muted)]">Preview distance (km)</span>
              <input
                value={previewKm}
                onChange={(e) => setPreviewKm(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
              />
            </label>
            {previewPaise != null ? (
              <p className="text-sm tabular-nums">
                Estimate: <strong>{formatMoney(previewPaise)}</strong>
              </p>
            ) : null}

            <PermissionGuard permission="fare.manage" fallback="hide">
              <div className="flex flex-wrap gap-2">
                {selected.status !== "ACTIVE" ? (
                  <Button size="sm" disabled={busy} onClick={() => setPendingStatus("ACTIVE")}>
                    Activate
                  </Button>
                ) : null}
                {selected.status === "ACTIVE" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setPendingStatus("INACTIVE")}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </PermissionGuard>
          </div>
        ) : null}
      </DetailDrawer>

      <DetailDrawer open={createOpen} title="Create fare config" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3 text-sm">
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Network</span>
            <select
              value={form.network}
              onChange={(e) =>
                setForm((f) => ({ ...f, network: e.target.value as RideNetwork }))
              }
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            >
              <option value="OFFICE">Office</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
          </label>
          <Field
            label="Base (₹)"
            value={form.baseRupees}
            onChange={(v) => setForm((f) => ({ ...f, baseRupees: v }))}
          />
          <Field
            label="Per km (₹)"
            value={form.perKmRupees}
            onChange={(v) => setForm((f) => ({ ...f, perKmRupees: v }))}
          />
          <Field
            label="Minimum (₹)"
            value={form.minRupees}
            onChange={(v) => setForm((f) => ({ ...f, minRupees: v }))}
          />
          <Field
            label="Cancellation fee (₹)"
            value={form.cancelRupees}
            onChange={(v) => setForm((f) => ({ ...f, cancelRupees: v }))}
          />
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Effective from</span>
            <input
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            />
          </label>
          <Button size="sm" disabled={busy || !form.name.trim()} onClick={() => void createFare()}>
            Create draft
          </Button>
        </div>
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus === "ACTIVE" ? "Activate fare config" : "Deactivate fare config"}
        description={
          pendingStatus === "ACTIVE"
            ? "Activating deactivates other ACTIVE configs on the same network."
            : "Fare config will no longer be used for new estimates."
        }
        confirmLabel="Confirm"
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => void applyStatus(reason)}
      />
    </PageContainer>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--bw-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />
    </label>
  );
}
