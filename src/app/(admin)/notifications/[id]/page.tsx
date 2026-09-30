"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  NotificationChannelBadge,
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { notificationEngine } from "@/services/notificationEngine";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import { useOps } from "@/providers/OpsProvider";
import type { DeliveryAttempt, EngineNotification } from "@/types/notifications";
import type { NotificationTemplate } from "@/types/communication";

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const notifId = params.id;
  const { getUser } = useOps();

  const [notification, setNotification] = useState<EngineNotification | null>(null);
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const n = await notificationEngine.getNotificationById(notifId);
      setNotification(n);
      if (n?.templateId) {
        setTemplate(await notificationTemplatesService.getTemplateById(n.templateId));
      } else {
        setTemplate(null);
      }
      setDeliveries(await notificationEngine.getDeliveryHistory(notifId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notification.");
    } finally {
      setLoading(false);
    }
  }, [notifId]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading && !notification && !error) {
    return <LoadingState label="Loading notification…" />;
  }

  if (error && !notification) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load notification." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="space-y-3">
        <ErrorState title="Not found" message={`No notification ${notifId}.`} />
        <Link href="/notifications">
          <Button variant="secondary">Back to center</Button>
        </Link>
      </div>
    );
  }

  const recipient = getUser(notification.recipientUserId);

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="notification-detail">
      <Link href="/notifications" className="text-sm text-[var(--bw-brand)] hover:underline">
        ← Notification Center
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{notification.title}</h1>
        <div className="flex flex-wrap gap-2">
          <NotificationStatusBadge status={notification.status} />
          <NotificationPriorityBadge priority={notification.priority} />
          <NotificationChannelBadge channel={notification.channel} />
        </div>
      </header>

      <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
        <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Content</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--bw-text-primary)]">
          {notification.body}
        </p>
      </section>

      <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
        <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Recipient</h2>
        <dl className="mt-2 grid gap-2 text-sm">
          <Row label="User ID" value={notification.recipientUserId} mono />
          <Row label="Name" value={recipient?.name ?? "—"} />
        </dl>
      </section>

      <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
        <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Source</h2>
        <dl className="mt-2 grid gap-2 text-sm">
          <Row label="Event type" value={notification.sourceEventType ?? "—"} />
          <Row label="Event ID" value={notification.sourceEventId ?? "—"} mono />
          <Row label="Automation" value={notification.automationId ?? "—"} mono />
          <Row label="Campaign" value={notification.campaignId ?? "—"} mono />
          <Row label="Related ride" value={notification.relatedRideId ?? "—"} mono />
          <Row label="Related ticket" value={notification.relatedTicketId ?? "—"} mono />
          <Row label="Related txn" value={notification.relatedTransactionId ?? "—"} mono />
          <Row label="Created" value={formatIstDateTime(new Date(notification.createdAt))} />
          <Row
            label="Read at"
            value={notification.readAt ? formatIstDateTime(new Date(notification.readAt)) : "Unread"}
          />
        </dl>
      </section>

      {template ? (
        <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
          <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Template</h2>
          <dl className="mt-2 grid gap-2 text-sm">
            <Row label="Template ID" value={template.id} mono />
            <Row label="Name" value={template.name} />
            <Row label="Version" value={String(template.version)} />
          </dl>
        </section>
      ) : null}

      <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
        <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
          Delivery attempts
        </h2>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--bw-text-secondary)]">No delivery attempts recorded.</p>
        ) : (
          <div className="mt-3 overflow-x-auto" data-testid="delivery-attempts">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--bw-text-muted)]">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Provider</th>
                  <th className="px-2 py-1">Attempted</th>
                  <th className="px-2 py-1">Failure</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--bw-border)]">
                    <td className="px-2 py-1.5 tabular-nums">{d.attemptNumber}</td>
                    <td className="px-2 py-1.5">
                      <NotificationStatusBadge status={d.status} />
                    </td>
                    <td className="px-2 py-1.5 text-xs">{d.provider}</td>
                    <td className="px-2 py-1.5 text-xs text-[var(--bw-text-muted)]">
                      {formatIstDateTime(new Date(d.attemptedAt))}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-[var(--bw-danger)]">
                      {d.failureReason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
