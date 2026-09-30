"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NotificationChannelBadge,
  TemplateStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { SAMPLE_TEMPLATE_VARS } from "@/lib/notificationTemplates";
import { useAuth } from "@/providers/AuthProvider";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import type { NotificationTemplate, TemplateStatus } from "@/types/communication";

type StatusAction = { status: TemplateStatus; label: string; danger?: boolean };

export default function TemplatesPage() {
  const { session } = useAuth();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Renuka Ops";

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<StatusAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await notificationTemplatesService.getTemplates());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const preview = selected
    ? notificationTemplatesService.preview(selected.id, SAMPLE_TEMPLATE_VARS)
    : null;

  function actionsFor(t: NotificationTemplate): StatusAction[] {
    if (t.status === "DRAFT") {
      return [
        { status: "ACTIVE", label: "Activate" },
        { status: "ARCHIVED", label: "Archive" },
      ];
    }
    if (t.status === "ACTIVE") {
      return [{ status: "ARCHIVED", label: "Archive", danger: true }];
    }
    if (t.status === "ARCHIVED") {
      return [{ status: "DRAFT", label: "Restore to draft" }];
    }
    return [];
  }

  async function applyStatus(reason: string) {
    if (!selected || !pending) return;
    setBusy(true);
    try {
      await notificationTemplatesService.setStatus(selected.id, pending.status, {
        adminId,
        adminName,
        reason,
      });
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Template update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && templates.length === 0 && !error) {
    return <LoadingState label="Loading templates…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="templates-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notification templates</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Review copy, preview with sample variables, activate or archive.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load templates." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {templates.length === 0 ? (
        <EmptyState title="No templates." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="templates-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Channels</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{t.name}</td>
                  <td className="px-3 py-2.5 text-xs">{t.category}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {t.channels.map((ch) => (
                        <NotificationChannelBadge key={ch} channel={ch} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <TemplateStatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(t.updatedAt))}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(t.id)}
                      data-testid={`template-open-${t.id}`}
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
        title={selected ? selected.name : "Template"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="template-detail">
            <TemplateStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Description" value={selected.description} />
              <Row label="Event type" value={selected.eventType} />
              <Row label="Version" value={String(selected.version)} />
              <Row label="Variables" value={selected.variables.join(", ") || "—"} />
            </dl>

            <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
              <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Body</h3>
              <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{selected.body}</p>
            </section>

            <section data-testid="template-preview" className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Preview (sample vars)
              </h3>
              {preview ? (
                <div
                  className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-3 text-sm"
                  data-testid="template-preview-body"
                >
                  {preview.subject ? (
                    <p className="mb-2 font-medium">Subject: {preview.subject}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{preview.body}</p>
                  {preview.unknownVariables.length > 0 ? (
                    <p className="mt-2 text-xs text-[var(--bw-warning)]">
                      Unknown vars: {preview.unknownVariables.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap gap-2">
              {actionsFor(selected).map((action) => (
                <Button
                  key={action.status}
                  variant={action.danger ? "danger" : "secondary"}
                  size="sm"
                  disabled={busy}
                  onClick={() => setPending(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pending)}
        title={pending ? `${pending.label} template` : "Template action"}
        description="Template status changes are audited."
        confirmLabel={pending?.label ?? "Confirm"}
        danger={pending?.danger}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void applyStatus(reason)}
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
