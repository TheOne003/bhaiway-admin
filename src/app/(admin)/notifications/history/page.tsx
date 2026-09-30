"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  NotificationChannelBadge,
  NotificationStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { notificationEngine } from "@/services/notificationEngine";
import type { DeliveryAttempt } from "@/types/notifications";

export default function NotificationHistoryPage() {
  const [rows, setRows] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await notificationEngine.getDeliveryHistory());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load delivery history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading && rows.length === 0 && !error) {
    return <LoadingState label="Loading delivery history…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="notification-history-page">
      <header className="space-y-1">
        <Link href="/notifications" className="text-sm text-[var(--bw-brand)] hover:underline">
          ← Notification Center
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery history</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Provider attempts across all engine notifications.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load history." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No delivery attempts yet." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="delivery-history-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Notification</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Attempt</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Attempted</th>
                <th className="px-3 py-2">Failure</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/notifications/${d.notificationId}`}
                      className="font-mono text-xs text-[var(--bw-brand)] hover:underline"
                    >
                      {d.notificationId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{d.recipientUserId}</td>
                  <td className="px-3 py-2.5">
                    <NotificationChannelBadge channel={d.channel} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{d.attemptNumber}</td>
                  <td className="px-3 py-2.5">
                    <NotificationStatusBadge status={d.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs">{d.provider}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(d.attemptedAt))}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-danger)]">
                    {d.failureReason ?? "—"}
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
