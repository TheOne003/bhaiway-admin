"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CampaignStatusBadge,
  NotificationChannelBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { notificationCampaignsService } from "@/services/notificationCampaigns";
import type { NotificationCampaign } from "@/types/communication";

export default function CampaignsPage() {
  const { session } = useAuth();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Renuka Ops";

  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validateErrors, setValidateErrors] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [startOpen, setStartOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await notificationCampaignsService.getCampaigns());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  async function runValidate() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await notificationCampaignsService.validateStart(selected.id);
      setValidateErrors(result.errors);
      setRecipientCount(result.recipientCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openStartConfirm() {
    if (!selected) return;
    const result = await notificationCampaignsService.validateStart(selected.id);
    setValidateErrors(result.errors);
    setRecipientCount(result.recipientCount);
    if (result.valid) setStartOpen(true);
  }

  async function confirmStart() {
    if (!selected) return;
    setBusy(true);
    try {
      await notificationCampaignsService.startCampaign(selected.id, {
        adminId,
        adminName,
        reason: "Manual start from admin UI",
      });
      setStartOpen(false);
      setValidateErrors([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start campaign failed.");
    } finally {
      setBusy(false);
    }
  }

  const canStart =
    selected && ["DRAFT", "SCHEDULED", "PAUSED"].includes(selected.status);

  if (loading && campaigns.length === 0 && !error) {
    return <LoadingState label="Loading campaigns…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="campaigns-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Manual audience sends — validate audience size before starting.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load campaigns." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="campaigns-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Recipients</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5 text-xs">{c.category}</td>
                  <td className="px-3 py-2.5">
                    <CampaignStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">
                    {c.deliveredCount}/{c.recipientCount || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(c.updatedAt))}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => {
                        setSelectedId(c.id);
                        setValidateErrors([]);
                      }}
                      data-testid={`campaign-open-${c.id}`}
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
        title={selected ? selected.name : "Campaign"}
        onClose={() => {
          setSelectedId(null);
          setValidateErrors([]);
        }}
      >
        {selected ? (
          <div className="space-y-4" data-testid="campaign-detail">
            <CampaignStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Description" value={selected.description} />
              <Row label="Template" value={selected.templateId} mono />
              <Row label="Audience" value={selected.audience.type} />
              <Row label="Delivered" value={String(selected.deliveredCount)} />
              <Row label="Failed" value={String(selected.failedCount)} />
            </dl>
            <div className="flex flex-wrap gap-1">
              {selected.channels.map((ch) => (
                <NotificationChannelBadge key={ch} channel={ch} />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void runValidate()}>
                Validate start
              </Button>
              {canStart ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  data-testid="campaign-start"
                  onClick={() => void openStartConfirm()}
                >
                  Start campaign
                </Button>
              ) : null}
            </div>

            {validateErrors.length > 0 ? (
              <ul
                className="rounded-md border border-[var(--bw-danger)] bg-[var(--bw-danger-soft)] p-3 text-xs text-[var(--bw-danger)]"
                data-testid="campaign-validate-errors"
              >
                {validateErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={startOpen}
        title="Start campaign?"
        description={`This will send notifications to ${recipientCount} recipient(s). Continue?`}
        confirmLabel="Start"
        onCancel={() => setStartOpen(false)}
        onConfirm={() => void confirmStart()}
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
