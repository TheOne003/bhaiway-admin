"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NotificationChannelBadge,
  NotificationStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { communicationsService, type CommunicationFilters } from "@/services/communications";
import type { CommunicationLogEntry } from "@/types/communication";
import type {
  EngineNotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@/types/notifications";

export default function CommunicationsPage() {
  const [entries, setEntries] = useState<CommunicationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<CommunicationFilters["source"]>("ALL");
  const [channel, setChannel] = useState<NotificationChannel | "ALL">("ALL");
  const [status, setStatus] = useState<NotificationDeliveryStatus | "ALL">("ALL");
  const [category, setCategory] = useState<EngineNotificationCategory | "ALL">("ALL");

  const filters: CommunicationFilters = useMemo(
    () => ({
      search: search || undefined,
      source,
      channel,
      status,
      category,
    }),
    [search, source, channel, status, category],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await communicationsService.getActivity(filters));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load communications.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading && entries.length === 0 && !error) {
    return <LoadingState label="Loading communications…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="communications-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Communications</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Unified activity log across automations, campaigns, and system sends.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load activity." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notification, user, title…"
          className="h-10 min-w-[220px] flex-1 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="communications-search"
        />
        <select
          value={source ?? "ALL"}
          onChange={(e) => setSource(e.target.value as CommunicationFilters["source"])}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All sources</option>
          <option value="AUTOMATION">Automation</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="SYSTEM">System</option>
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as NotificationChannel | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All channels</option>
          <option value="IN_APP">In-app</option>
          <option value="PUSH">Push</option>
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as NotificationDeliveryStatus | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="READ">Read</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EngineNotificationCategory | "ALL")}
          className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
        >
          <option value="ALL">All categories</option>
          <option value="RIDE">Ride</option>
          <option value="SAFETY">Safety</option>
          <option value="MONEY">Money</option>
          <option value="GROWTH">Growth</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="No communications match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="communications-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{e.title}</td>
                  <td className="px-3 py-2.5 text-xs">{e.source}</td>
                  <td className="px-3 py-2.5">
                    <NotificationChannelBadge channel={e.channel} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{e.recipientUserId}</td>
                  <td className="px-3 py-2.5">
                    <NotificationStatusBadge status={e.status as NotificationDeliveryStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(e.createdAt))}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/notifications/${e.notificationId}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                    >
                      View
                    </Link>
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
