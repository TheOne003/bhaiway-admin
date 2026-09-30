"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  NotificationChannelBadge,
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { renderTemplate, SAMPLE_TEMPLATE_VARS } from "@/lib/notificationTemplates";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { resolveAudience } from "@/services/audience";
import { notificationEngine } from "@/services/notificationEngine";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import { usersService } from "@/services/users";
import type { NotificationTemplate } from "@/types/communication";
import type {
  EngineNotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationFilters,
  NotificationPriority,
  NotificationSummary,
} from "@/types/notifications";
import type { User } from "@/types/user";

type RecipientAudienceMode = "PARTICULAR" | "RIDER" | "DRIVER" | "BOTH" | "ALL";

const AUDIENCE_OPTIONS: { id: RecipientAudienceMode; label: string; hint: string }[] = [
  { id: "PARTICULAR", label: "Particular user(s)", hint: "Search and pick specific users" },
  { id: "RIDER", label: "Riders only", hint: "All riders (incl. Both)" },
  { id: "DRIVER", label: "Drivers only", hint: "All drivers (incl. Both)" },
  { id: "BOTH", label: "Both roles", hint: "Users marked as Both" },
  { id: "ALL", label: "All users", hint: "Entire user directory" },
];

function resolveComposerAudience(mode: RecipientAudienceMode, selectedIds: string[]): string[] {
  switch (mode) {
    case "PARTICULAR":
      return [...new Set(selectedIds)];
    case "RIDER":
      return resolveAudience({ type: "RIDER" });
    case "DRIVER":
      return resolveAudience({ type: "DRIVER" });
    case "BOTH":
      return resolveAudience({ type: "BOTH" });
    case "ALL":
      return [
        ...new Set([
          ...resolveAudience({ type: "RIDER" }),
          ...resolveAudience({ type: "DRIVER" }),
        ]),
      ];
    default:
      return [];
  }
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading notification center…" />}>
      <NotificationsInner />
    </Suspense>
  );
}

function NotificationsInner() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [items, setItems] = useState<Awaited<ReturnType<typeof notificationEngine.getNotifications>>>(
    [],
  );
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<EngineNotificationCategory | "ALL">("ALL");
  const [priority, setPriority] = useState<NotificationPriority | "ALL">("ALL");
  const [channel, setChannel] = useState<NotificationChannel | "ALL">("ALL");
  const [status, setStatus] = useState<NotificationDeliveryStatus | "ALL">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [composerOpen, setComposerOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [audienceMode, setAudienceMode] = useState<RecipientAudienceMode>("PARTICULAR");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientHits, setRecipientHits] = useState<User[]>([]);
  const [composeChannel, setComposeChannel] = useState<NotificationChannel>("IN_APP");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [composeError, setComposeError] = useState<string | null>(null);

  const filters: NotificationFilters = useMemo(
    () => ({
      category,
      priority,
      channel,
      status,
      unreadOnly: unreadOnly || undefined,
      search: search || undefined,
    }),
    [category, priority, channel, status, unreadOnly, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        notificationEngine.getNotifications(filters),
        notificationEngine.getSummary(),
      ]);
      setItems(list);
      setSummary(sum);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    const compose = searchParams.get("compose") === "1";
    const userId = searchParams.get("userId");
    if (!compose && !userId) return;
    const id = window.setTimeout(() => {
      setComposerOpen(true);
      setAudienceMode("PARTICULAR");
      if (userId) setRecipientIds([userId]);
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchParams]);

  useEffect(() => {
    if (!composerOpen) return;
    const id = window.setTimeout(() => {
      void notificationTemplatesService.getTemplates().then((list) => {
        setTemplates(list.filter((t) => t.status === "ACTIVE"));
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen || audienceMode !== "PARTICULAR") return;
    const q = recipientQuery.trim();
    const id = window.setTimeout(() => {
      void usersService.searchUsers(q || "a").then((list) => {
        setRecipientHits(list.slice(0, 12));
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [composerOpen, recipientQuery, audienceMode]);

  const selected = useMemo(() => items.find((n) => n.id === selectedId) ?? null, [items, selectedId]);

  const resolvedRecipientIds = useMemo(
    () => resolveComposerAudience(audienceMode, recipientIds),
    [audienceMode, recipientIds],
  );

  const audienceLabel = useMemo(
    () => AUDIENCE_OPTIONS.find((o) => o.id === audienceMode)?.label ?? audienceMode,
    [audienceMode],
  );

  const preview = useMemo(
    () => renderTemplate(composeBody || " ", SAMPLE_TEMPLATE_VARS, composeTitle || " "),
    [composeBody, composeTitle],
  );

  async function markRead() {
    if (!selected) return;
    setBusy(true);
    try {
      await notificationEngine.markRead(selected.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mark read failed.");
    } finally {
      setBusy(false);
    }
  }

  async function markUnread() {
    if (!selected) return;
    setBusy(true);
    try {
      await notificationEngine.markUnread(selected.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mark unread failed.");
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await notificationEngine.markAllRead();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mark all read failed.");
    } finally {
      setBusy(false);
    }
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setComposeTitle(t.subject ?? t.name);
    setComposeBody(t.body);
    if (t.channels[0]) setComposeChannel(t.channels[0]);
  }

  function toggleRecipient(id: string) {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function sendNotification() {
    setBusy(true);
    setComposeError(null);
    try {
      const recipients = resolveComposerAudience(audienceMode, recipientIds);
      if (recipients.length === 0) {
        throw new Error("No recipients resolved for the selected audience.");
      }
      await notificationEngine.sendAdminNotification({
        recipientUserIds: recipients,
        title: composeTitle.trim(),
        body: composeBody.trim(),
        channel: composeChannel,
        templateId: templateId || null,
        adminId,
        adminName,
      });
      setConfirmSend(false);
      setComposerOpen(false);
      setComposeTitle("");
      setComposeBody("");
      setTemplateId("");
      setRecipientIds([]);
      setAudienceMode("PARTICULAR");
      setRecipientQuery("");
      await load();
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : "Send failed.");
      setConfirmSend(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading && items.length === 0 && !error) {
    return <LoadingState label="Loading notification center…" />;
  }

  return (
    <PageContainer width="wide" testId="notifications-page">
      <PageHeader
        title="Notification Center"
        description="Engine notifications across channels — filter, review, and compose."
        actions={
          <PermissionGuard permission="notifications.send" fallback="hide">
            <Button
              size="sm"
              data-testid="notif-create"
              onClick={() => setComposerOpen(true)}
            >
              Create Notification
            </Button>
          </PermissionGuard>
        }
      />

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load notifications." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {summary ? (
        <div
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          data-testid="notif-summary"
        >
          <SummaryCard label="Unread" value={summary.unread} />
          <SummaryCard label="Queued" value={summary.queued} />
          <SummaryCard label="Delivered" value={summary.delivered} />
          <SummaryCard label="Failed" value={summary.failed} />
          <SummaryCard label="Critical" value={summary.critical} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ID, user, title, ride…"
          className="h-10 min-w-[220px] flex-1 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
          data-testid="notif-search"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Unread only
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <FilterSelect
          label="Category"
          value={category}
          onChange={(v) => setCategory(v as EngineNotificationCategory | "ALL")}
          options={[
            "ALL",
            "RIDE",
            "SAFETY",
            "VERIFICATION",
            "MONEY",
            "SUPPORT",
            "SYSTEM",
            "GROWTH",
            "ACCOUNT",
          ]}
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={(v) => setPriority(v as NotificationPriority | "ALL")}
          options={["ALL", "LOW", "NORMAL", "HIGH", "CRITICAL"]}
        />
        <FilterSelect
          label="Channel"
          value={channel}
          onChange={(v) => setChannel(v as NotificationChannel | "ALL")}
          options={["ALL", "IN_APP", "PUSH", "SMS", "EMAIL", "WHATSAPP"]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as NotificationDeliveryStatus | "ALL")}
          options={["ALL", "QUEUED", "SENT", "DELIVERED", "FAILED", "READ", "CANCELLED"]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!selected || busy || Boolean(selected?.readAt)}
          data-testid="notif-mark-read"
          onClick={() => void markRead()}
        >
          Mark read
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!selected || busy || !selected?.readAt}
          data-testid="notif-mark-unread"
          onClick={() => void markUnread()}
        >
          Mark unread
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          data-testid="notif-mark-all-read"
          onClick={() => void markAllRead()}
        >
          Mark all read
        </Button>
        <Link href="/notifications/history" className="text-sm text-[var(--bw-brand)] hover:underline">
          Delivery history →
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="notif-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Read</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr
                  key={n.id}
                  className={cn(
                    "cursor-pointer border-b border-[var(--bw-border)] last:border-0",
                    selectedId === n.id && "bg-[var(--bw-brand-soft)]/40",
                  )}
                  onClick={() => setSelectedId(n.id)}
                >
                  <td className="px-3 py-2.5 font-medium">{n.title}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{n.recipientUserId}</td>
                  <td className="px-3 py-2.5">
                    <NotificationChannelBadge channel={n.channel} />
                  </td>
                  <td className="px-3 py-2.5">
                    <NotificationPriorityBadge priority={n.priority} />
                  </td>
                  <td className="px-3 py-2.5">
                    <NotificationStatusBadge status={n.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(n.createdAt))}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{n.readAt ? "Yes" : "No"}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/notifications/${n.id}`}
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      data-testid={`notif-open-${n.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={composerOpen}
        title="Create notification"
        onClose={() => setComposerOpen(false)}
        className="max-w-lg"
      >
        <div className="space-y-4" data-testid="notif-composer">
          {composeError ? (
            <p className="text-sm text-[var(--bw-danger)]">{composeError}</p>
          ) : null}

          <fieldset className="space-y-2" data-testid="notif-audience-mode">
            <legend className="text-xs text-[var(--bw-text-muted)]">Send to</legend>
            <div className="grid gap-1.5">
              {AUDIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-sm",
                    audienceMode === opt.id
                      ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)]/40"
                      : "border-[var(--bw-border)] hover:bg-[var(--bw-elevated)]",
                  )}
                >
                  <input
                    type="radio"
                    name="notif-audience"
                    className="mt-0.5"
                    checked={audienceMode === opt.id}
                    onChange={() => {
                      setAudienceMode(opt.id);
                      if (opt.id !== "PARTICULAR") setRecipientQuery("");
                    }}
                  />
                  <span>
                    <span className="font-medium">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--bw-text-muted)]">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--bw-text-secondary)]" data-testid="notif-audience-count">
              Resolved recipients:{" "}
              <span className="font-semibold tabular-nums">{resolvedRecipientIds.length}</span>
            </p>
          </fieldset>

          {audienceMode === "PARTICULAR" ? (
            <>
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-[var(--bw-text-muted)]">Search users</span>
                <input
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                  placeholder="Search by name or ID…"
                  className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
                  data-testid="notif-recipient-search"
                  aria-label="Search users"
                />
              </label>
              {recipientIds.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {recipientIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleRecipient(id)}
                      className="rounded border border-[var(--bw-border)] px-2 py-0.5 font-mono text-xs"
                    >
                      {id} ×
                    </button>
                  ))}
                </div>
              ) : null}
              <ul className="max-h-28 space-y-1 overflow-y-auto text-sm">
                {recipientHits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleRecipient(u.id)}
                      data-testid={`notif-recipient-${u.id}`}
                      className={cn(
                        "w-full rounded px-2 py-1 text-left hover:bg-[var(--bw-elevated)]",
                        recipientIds.includes(u.id) && "bg-[var(--bw-brand-soft)]/50",
                      )}
                    >
                      {u.name}{" "}
                      <span className="font-mono text-xs text-[var(--bw-text-muted)]">{u.id}</span>
                      <span className="ml-1 text-xs text-[var(--bw-text-muted)]">· {u.userType}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] px-3 py-2 text-xs text-[var(--bw-text-secondary)]">
              Audience resolved via existing audience service — no individual pick needed.
            </p>
          )}

          <label className="block space-y-1 text-sm">
            <span className="text-xs text-[var(--bw-text-muted)]">Channel</span>
            <select
              value={composeChannel}
              onChange={(e) => setComposeChannel(e.target.value as NotificationChannel)}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 text-sm"
            >
              {(["IN_APP", "PUSH", "SMS", "EMAIL", "WHATSAPP"] as const).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs text-[var(--bw-text-muted)]">Template (optional)</span>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 text-sm"
            >
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs text-[var(--bw-text-muted)]">Title</span>
            <input
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
              data-testid="notif-compose-title"
              aria-label="Title"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs text-[var(--bw-text-muted)]">
              Body — use {"{{var}}"} (userName, rideId, amount…)
            </span>
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2 text-sm"
              data-testid="notif-compose-body"
              aria-label="Message body"
            />
          </label>

          <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
            <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Preview</h3>
            <p className="mt-1 font-medium">{preview.subject}</p>
            <p className="mt-1 text-[var(--bw-text-secondary)] whitespace-pre-wrap">{preview.body}</p>
          </section>

          <Button
            size="sm"
            disabled={
              busy ||
              resolvedRecipientIds.length === 0 ||
              !composeTitle.trim() ||
              !composeBody.trim()
            }
            data-testid="notif-send-confirm"
            onClick={() => setConfirmSend(true)}
          >
            Confirm & send
          </Button>
        </div>
      </DetailDrawer>

      <ConfirmDialog
        open={confirmSend}
        title="Send notification?"
        description={`Deliver to ${resolvedRecipientIds.length} recipient(s) (${audienceLabel}) via ${composeChannel}.`}
        confirmLabel="Send"
        onCancel={() => setConfirmSend(false)}
        onConfirm={() => void sendNotification()}
      />
    </PageContainer>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  const tone =
    label.toLowerCase().includes("fail") || label.toLowerCase().includes("critical")
      ? "border-[var(--bw-danger)]/40 bg-[var(--bw-danger-soft)] text-[var(--bw-danger)]"
      : label.toLowerCase().includes("unread") || label.toLowerCase().includes("queue")
        ? "border-[var(--bw-warning)]/40 bg-[var(--bw-warning-soft)] text-[var(--bw-warning)]"
        : "border-[var(--bw-brand)]/35 bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]";
  return (
    <div className={`rounded-lg border px-3 py-2 shadow-sm ${tone}`}>
      <p className="text-xs font-medium text-[var(--bw-text-muted)]">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[var(--bw-text-muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "ALL" ? "All" : o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
