"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CreditStatusBadge } from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { creditsService } from "@/services/credits";
import type { CreditRecord, CreditStatus } from "@/types/credit";

export default function CreditsPage() {
  const { session } = useAuth();
  const { users, refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CreditStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [formUserId, setFormUserId] = useState("usr_001");
  const [formRupees, setFormRupees] = useState("100");
  const [formReason, setFormReason] = useState("");
  const [formExpiry, setFormExpiry] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await creditsService.getCredits({
        status,
        search: search || undefined,
      });
      setCredits(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load credits.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => credits.find((c) => c.id === selectedId) ?? null,
    [credits, selectedId],
  );

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const amountPaise = rupeesToPaise(Number(formRupees));
    if (amountPaise <= 0 || !formReason.trim()) return;
    setBusy(true);
    try {
      await creditsService.createCredit({
        userId: formUserId,
        amountPaise,
        reason: formReason.trim(),
        source: "ADMIN_ADJUSTMENT",
        expiresAt: formExpiry ? new Date(formExpiry).toISOString() : null,
        adminId,
        adminName,
        idempotencyKey: `credit_create_${formUserId}_${Date.now()}`,
      });
      setCreateOpen(false);
      setFormReason("");
      setFormRupees("100");
      await refreshOps();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create credit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(reason: string) {
    if (!revokeId) return;
    setBusy(true);
    try {
      await creditsService.revokeCredit(revokeId, {
        adminId,
        adminName,
        reason,
        idempotencyKey: `credit_revoke_${revokeId}_${Date.now()}`,
      });
      setRevokeId(null);
      await refreshOps();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && credits.length === 0 && !error) {
    return <LoadingState label="Loading credits…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="credits-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
          <p className="text-sm text-[var(--bw-text-secondary)]">
            Promotional and recovery credits with ledger backing.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-testid="credit-create-open"
        >
          Create credit
        </Button>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load credits." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "PARTIALLY_USED", "USED", "EXPIRED", "REVOKED"] as const).map((id) => (
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
            {id === "ALL" ? "All" : id.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search credit, user, reason…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {credits.length === 0 ? (
        <EmptyState title="No credits match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="credits-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Credit</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => (
                <tr key={c.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.userId}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(c.amountPaise)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(c.remainingPaise)}</td>
                  <td className="px-3 py-2">
                    <CreditStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(c.id)}
                      data-testid={`credit-open-${c.id}`}
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
        title={selected ? `Credit ${selected.id}` : "Credit"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="credit-detail">
            <CreditStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="User" value={selected.userId} mono />
              <Row label="Amount" value={formatMoney(selected.amountPaise)} />
              <Row label="Remaining" value={formatMoney(selected.remainingPaise)} />
              <Row label="Source" value={selected.source.replace(/_/g, " ")} />
              <Row label="Reason" value={selected.reason} />
              <Row
                label="Expires"
                value={
                  selected.expiresAt
                    ? formatIstDateTime(new Date(selected.expiresAt))
                    : "No expiry"
                }
              />
              <Row
                label="Ledger txn"
                value={selected.relatedTransactionId ?? "—"}
                mono={Boolean(selected.relatedTransactionId)}
              />
            </dl>
            {selected.status === "ACTIVE" || selected.status === "PARTIALLY_USED" ? (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => setRevokeId(selected.id)}>
                Revoke credit
              </Button>
            ) : null}
            {selected.relatedTransactionId ? (
              <Link
                href={`/transactions/${selected.relatedTransactionId}`}
                className="text-sm text-[var(--bw-brand)] hover:underline"
              >
                View ledger entry →
              </Link>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close create credit"
            onClick={() => setCreateOpen(false)}
          />
          <form
            onSubmit={(e) => void submitCreate(e)}
            className="relative w-full max-w-md space-y-4 rounded-lg border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5 shadow-xl"
            data-testid="credit-create-form"
          >
            <h2 className="text-base font-semibold">Create credit</h2>
            <label className="block text-sm">
              User
              <select
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] px-2 text-sm"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Amount (₹)
              <input
                type="number"
                min="1"
                step="1"
                value={formRupees}
                onChange={(e) => setFormRupees(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              Reason
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={3}
                required
                className="mt-1 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              Expiry (optional)
              <input
                type="datetime-local"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] px-3 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} data-testid="credit-create-submit">
                Create
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ReasonConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke credit"
        description="Remaining balance will be debited from the user wallet."
        confirmLabel="Revoke"
        danger
        onCancel={() => setRevokeId(null)}
        onConfirm={(reason) => void handleRevoke(reason)}
      />
    </div>
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
