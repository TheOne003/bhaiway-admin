"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReferralStatusBadge } from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { referralsService } from "@/services/referrals";
import type { ReferralRecord, ReferralStatus } from "@/types/referral";

export default function ReferralsPage() {
  const { session } = useAuth();
  const { refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ReferralStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await referralsService.getReferrals({
        status,
        search: search || undefined,
      });
      setReferrals(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load referrals.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => referrals.find((r) => r.id === selectedId) ?? null,
    [referrals, selectedId],
  );

  async function handleIssueReward(reason: string) {
    if (!issueId) return;
    setBusy(true);
    try {
      await referralsService.issueReward(issueId, {
        adminId,
        adminName,
        reason,
        idempotencyKey: `referral_reward_${issueId}`,
      });
      setIssueId(null);
      await refreshOps();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issue reward failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && referrals.length === 0 && !error) {
    return <LoadingState label="Loading referrals…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="referrals-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Track invites, qualification, and reward payouts.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load referrals." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            "ALL",
            "INVITED",
            "QUALIFIED",
            "REWARDED",
            "FRAUD_REVIEW",
            "EXPIRED",
            "REJECTED",
          ] as const
        ).map((id) => (
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
        placeholder="Search code, user…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {referrals.length === 0 ? (
        <EmptyState title="No referrals match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="referrals-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Referral</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Referrer</th>
                <th className="px-3 py-2">Referred</th>
                <th className="px-3 py-2">Reward</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.referrerUserId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.referredUserId ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(r.rewardAmountPaise)}</td>
                  <td className="px-3 py-2">
                    <ReferralStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(r.id)}
                      data-testid={`referral-open-${r.id}`}
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
        title={selected ? `Referral ${selected.code}` : "Referral"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="referral-detail">
            <ReferralStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Referrer" value={selected.referrerUserId} mono />
              <Row label="Referred user" value={selected.referredUserId ?? "—"} mono />
              <Row label="Qualification" value={selected.qualification.replace(/_/g, " ")} />
              <Row label="Reward" value={formatMoney(selected.rewardAmountPaise)} />
              <Row label="Created" value={formatIstDateTime(new Date(selected.createdAt))} />
              {selected.qualifiedAt ? (
                <Row label="Qualified" value={formatIstDateTime(new Date(selected.qualifiedAt))} />
              ) : null}
              {selected.rewardedAt ? (
                <Row label="Rewarded" value={formatIstDateTime(new Date(selected.rewardedAt))} />
              ) : null}
              <Row
                label="Reward txn"
                value={selected.rewardTransactionId ?? "—"}
                mono={Boolean(selected.rewardTransactionId)}
              />
            </dl>
            {selected.status === "QUALIFIED" ? (
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => setIssueId(selected.id)}
              >
                Issue reward
              </Button>
            ) : null}
            {selected.rewardTransactionId ? (
              <Link
                href={`/transactions/${selected.rewardTransactionId}`}
                className="text-sm text-[var(--bw-brand)] hover:underline"
              >
                View reward ledger entry →
              </Link>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(issueId)}
        title="Issue referral reward"
        description="Credits the referrer wallet and marks the referral as rewarded."
        confirmLabel="Issue reward"
        onCancel={() => setIssueId(null)}
        onConfirm={(reason) => void handleIssueReward(reason)}
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
