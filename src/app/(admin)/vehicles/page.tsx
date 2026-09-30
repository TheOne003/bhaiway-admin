"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { VerificationBadge } from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { vehiclesService } from "@/services/vehicles";
import type { VehicleOperationalStatus, VehicleRecord } from "@/types/vehicle";
import type { VerificationSummaryStatus } from "@/types/user";

export default function VehiclesPage() {
  return (
    <PermissionGuard permission="vehicles.view">
      <VehiclesWorkspace />
    </PermissionGuard>
  );
}

function VehiclesWorkspace() {
  const { session } = useAuth();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VehicleOperationalStatus | "ALL">("ALL");
  const [rcStatus, setRcStatus] = useState<VerificationSummaryStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<VehicleOperationalStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await vehiclesService.getVehicles({
        status,
        rcStatus,
        search: search || undefined,
      });
      setVehicles(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, [status, rcStatus, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => vehicles.find((v) => v.vehicleId === selectedId) ?? null,
    [vehicles, selectedId],
  );

  async function applyStatus(reason: string) {
    if (!selected || !pending) return;
    setBusy(true);
    try {
      await vehiclesService.setOperationalStatus(
        selected.vehicleId,
        pending,
        { adminId, adminName },
        reason,
      );
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && vehicles.length === 0 && !error) {
    return <LoadingState label="Loading vehicles…" />;
  }

  return (
    <PageContainer width="wide" testId="vehicles-page">
      <PageHeader
        title="Vehicles"
        description="Driver vehicles — operational status, RC, and insurance."
      />

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load vehicles." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ACTIVE", "RESTRICTED", "INACTIVE"] as const).map((id) => (
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
            {id === "ALL" ? "All" : id}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plate, make, driver…"
          className="h-10 min-w-[220px] flex-1 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        />
        <select
          value={rcStatus}
          onChange={(e) => setRcStatus(e.target.value as VerificationSummaryStatus | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All RC</option>
          <option value="APPROVED">RC approved</option>
          <option value="PENDING">RC pending</option>
          <option value="FAILED">RC failed</option>
        </select>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2">RC</th>
                <th className="px-3 py-2">Insurance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.vehicleId}
                  className="cursor-pointer border-b border-[var(--bw-border)] last:border-0 hover:bg-[var(--bw-elevated)]"
                  data-testid={`vehicle-row-${v.vehicleId}`}
                  onClick={() => setSelectedId(v.vehicleId)}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">
                      {v.make} {v.model}
                    </div>
                    <div className="font-mono text-xs text-[var(--bw-text-muted)]">
                      {v.registrationMasked}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{v.driverName}</td>
                  <td className="px-3 py-2.5">
                    <VerificationBadge status={v.rcStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <VerificationBadge status={v.insuranceStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium">{v.operationalStatus}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(v.vehicleId);
                      }}
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
        open={Boolean(selected)}
        title={selected ? `${selected.make} ${selected.model}` : "Vehicle"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="vehicle-detail">
            <p className="text-sm font-medium">{selected.operationalStatus}</p>
            <dl className="grid gap-2 text-sm">
              <Row label="Vehicle ID" value={selected.vehicleId} mono />
              <Row label="Registration" value={selected.registrationMasked} mono />
              <Row label="Fuel" value={selected.fuelType} />
              <Row label="Driver" value={selected.driverName} />
              <div>
                <dt className="text-xs text-[var(--bw-text-muted)]">Links</dt>
                <dd className="mt-1 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/drivers/${selected.userId}`}
                    className="text-[var(--bw-brand)] hover:underline"
                  >
                    Driver profile
                  </Link>
                  <Link
                    href={`/users/${selected.userId}`}
                    className="text-[var(--bw-brand)] hover:underline"
                  >
                    User
                  </Link>
                </dd>
              </div>
              <Row label="Updated" value={formatIstDateTime(new Date(selected.updatedAt))} />
            </dl>

            <PermissionGuard permission="vehicles.manage" fallback="hide">
              <div className="flex flex-wrap gap-2">
                {selected.operationalStatus !== "RESTRICTED" ? (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => setPending("RESTRICTED")}
                  >
                    Restrict
                  </Button>
                ) : null}
                {selected.operationalStatus !== "ACTIVE" ? (
                  <Button size="sm" disabled={busy} onClick={() => setPending("ACTIVE")}>
                    Activate
                  </Button>
                ) : null}
                {selected.operationalStatus !== "INACTIVE" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setPending("INACTIVE")}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </PermissionGuard>
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pending)}
        title={
          pending === "RESTRICTED"
            ? "Restrict vehicle"
            : pending === "ACTIVE"
              ? "Activate vehicle"
              : "Deactivate vehicle"
        }
        description="Operational status change is audited."
        confirmLabel="Confirm"
        danger={pending === "RESTRICTED"}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void applyStatus(reason)}
      />
    </PageContainer>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
