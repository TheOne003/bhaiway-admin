"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SupportPriorityBadge,
  SupportStatusBadge,
} from "@/components/status/CommsBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { ridesService } from "@/services/rides";
import { supportService } from "@/services/support";
import { usersService } from "@/services/users";
import type { Ride } from "@/types/ride";
import type {
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
  SupportTimelineEntry,
} from "@/types/support";
import type { User } from "@/types/user";

type StatusAction = { status: SupportStatus; label: string; testId?: string; danger?: boolean };

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketParam = searchParams.get("ticket");

  const { session } = useAuth();
  const { getUser, getRide, refreshPeople, dashboard } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Renuka Ops";
  const latestEventId = dashboard?.recentEvents[0]?.id;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [timeline, setTimeline] = useState<SupportTimelineEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextUser, setContextUser] = useState<User | null>(null);
  const [contextRide, setContextRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusAction | null>(null);
  const [pendingPriority, setPendingPriority] = useState<SupportPriority | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const list = await supportService.getTickets();
      setTickets(list);
      setError(null);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load tickets.");
      return [];
    }
  }, []);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const [msgs, tl] = await Promise.all([
        supportService.getMessages(ticketId),
        supportService.getTimeline(ticketId),
      ]);
      setMessages(msgs);
      setTimeline(tl);
      const ticket = await supportService.getTicketById(ticketId);
      if (ticket) {
        const opsUser = getUser(ticket.userId);
        const user = opsUser ?? (await usersService.getUserById(ticket.userId));
        setContextUser(user ?? null);
        if (ticket.relatedRideId) {
          const ride = getRide(ticket.relatedRideId);
          setContextRide(
            ride ?? (await ridesService.getRideById(ticket.relatedRideId)),
          );
        } else {
          setContextRide(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load ticket detail.");
    }
  }, [getUser, getRide]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const list = await loadTickets();
        setLoading(false);
        const initial =
          ticketParam && list.some((t) => t.id === ticketParam)
            ? ticketParam
            : list[0]?.id ?? "tkt_001";
        setSelectedId(initial);
        if (!ticketParam && initial) {
          router.replace(`/support?ticket=${initial}`, { scroll: false });
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadTickets, ticketParam, router]);

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => void loadTicketDetail(selectedId), 0);
    return () => window.clearTimeout(id);
  }, [selectedId, loadTicketDetail]);

  // Reload when realtime timeline updates (support.message_created etc.)
  useEffect(() => {
    if (!latestEventId) return;
    const id = window.setTimeout(() => {
      void loadTickets();
      if (selectedId) void loadTicketDetail(selectedId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [latestEventId, selectedId, loadTickets, loadTicketDetail]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  function selectTicket(id: string) {
    setSelectedId(id);
    router.replace(`/support?ticket=${id}`, { scroll: false });
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await supportService.addMessage({
        ticketId: selected.id,
        senderType: "ADMIN",
        senderId: adminId,
        body: reply,
        internal: false,
        actorName: adminName,
      });
      setReply("");
      await loadTicketDetail(selected.id);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendNote() {
    if (!selected || !note.trim()) return;
    setBusy(true);
    try {
      await supportService.addMessage({
        ticketId: selected.id,
        senderType: "ADMIN",
        senderId: adminId,
        body: note,
        internal: true,
        actorName: adminName,
      });
      setNote("");
      await loadTicketDetail(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAssign() {
    if (!selected) return;
    setBusy(true);
    try {
      await supportService.assignTicket(selected.id, adminId, {
        actorId: adminId,
        actorName: adminName,
        reason: "Assigned from support workspace",
      });
      setAssignOpen(false);
      await loadTickets();
      await loadTicketDetail(selected.id);
      await refreshPeople();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus(reason: string) {
    if (!selected || !pendingStatus) return;
    setBusy(true);
    try {
      await supportService.setStatus(selected.id, pendingStatus.status, {
        actorId: adminId,
        actorName: adminName,
        reason,
      });
      setPendingStatus(null);
      await loadTickets();
      await loadTicketDetail(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyPriority(reason: string) {
    if (!selected || !pendingPriority) return;
    setBusy(true);
    try {
      await supportService.setPriority(selected.id, pendingPriority, {
        actorId: adminId,
        actorName: adminName,
        reason,
      });
      setPendingPriority(null);
      await loadTickets();
      await loadTicketDetail(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Priority update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && tickets.length === 0) {
    return <LoadingState label="Loading support workspace…" />;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" data-testid="support-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Ticket queue, conversation, and customer context in one workspace.
        </p>
      </header>

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Support workspace error" message={error} />
          <Button variant="secondary" onClick={() => void loadTickets()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-4">
        <aside
          className="lg:col-span-3 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]"
          data-testid="support-ticket-list"
        >
          <div className="border-b border-[var(--bw-border)] px-3 py-2 text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
            Tickets
          </div>
          <ul className="max-h-[480px] overflow-y-auto">
            {tickets.length === 0 ? (
              <li className="p-4">
                <EmptyState title="No tickets" />
              </li>
            ) : (
              tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => selectTicket(t.id)}
                    className={cn(
                      "w-full border-b border-[var(--bw-border)] px-3 py-3 text-left last:border-0 hover:bg-[var(--bw-elevated)]",
                      selectedId === t.id && "bg-[var(--bw-brand-soft)]/50",
                    )}
                    data-testid={`support-ticket-${t.id}`}
                  >
                    <p className="text-sm font-medium">{t.subject}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <SupportStatusBadge status={t.status} />
                      <SupportPriorityBadge priority={t.priority} />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--bw-text-muted)]">
                      {formatIstDateTime(new Date(t.lastMessageAt))}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section
          className="flex min-h-[420px] flex-col rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] lg:col-span-5"
          data-testid="support-conversation"
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bw-border)] px-3 py-2">
                <div>
                  <h2 className="text-sm font-semibold">{selected.subject}</h2>
                  <p className="font-mono text-[11px] text-[var(--bw-text-muted)]">{selected.id}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <SupportStatusBadge status={selected.status} />
                  <SupportPriorityBadge priority={selected.priority} />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[90%] rounded-md border px-3 py-2 text-sm",
                      m.internal
                        ? "ml-auto border-dashed border-[var(--bw-warning)] bg-[var(--bw-warning-soft)]"
                        : m.senderType === "ADMIN"
                          ? "ml-auto border-[var(--bw-brand)] bg-[var(--bw-brand-soft)]"
                          : "border-[var(--bw-border)] bg-[var(--bw-elevated)]",
                    )}
                    data-testid={m.internal ? "message-internal" : undefined}
                  >
                    <p className="text-[10px] font-semibold uppercase text-[var(--bw-text-muted)]">
                      {m.internal ? "Internal note" : m.senderType} ·{" "}
                      {formatIstDateTime(new Date(m.createdAt))}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[var(--bw-border)] p-3">
                <label className="block text-xs font-medium text-[var(--bw-text-muted)]">
                  Reply to customer
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2 text-sm"
                  data-testid="support-reply-input"
                />
                <Button
                  size="sm"
                  disabled={busy || !reply.trim()}
                  data-testid="support-reply-send"
                  onClick={() => void sendReply()}
                >
                  Send reply
                </Button>

                <label className="block pt-2 text-xs font-medium text-[var(--bw-text-muted)]">
                  Internal note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-dashed border-[var(--bw-warning)] bg-[var(--bw-warning-soft)]/30 px-3 py-2 text-sm"
                  data-testid="support-note-input"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || !note.trim()}
                  data-testid="support-note-send"
                  onClick={() => void sendNote()}
                >
                  Add note
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState title="Select a ticket" description="Choose a ticket from the list." />
            </div>
          )}
        </section>

        <aside
          className="space-y-3 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-3 lg:col-span-4"
          data-testid="support-context"
        >
          <h2 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Context</h2>
          {selected ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  data-testid="support-assign"
                  onClick={() => setAssignOpen(true)}
                >
                  Assign to me
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  data-testid="support-escalate"
                  onClick={() =>
                    setPendingStatus({ status: "ESCALATED", label: "Escalate", testId: "support-escalate" })
                  }
                >
                  Escalate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  data-testid="support-resolve"
                  onClick={() =>
                    setPendingStatus({ status: "RESOLVED", label: "Resolve", testId: "support-resolve" })
                  }
                >
                  Resolve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    setPendingStatus({ status: "CLOSED", label: "Close", danger: true })
                  }
                >
                  Close
                </Button>
              </div>

              <label className="block text-xs text-[var(--bw-text-muted)]">
                Priority
                <select
                  className="mt-1 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2 py-1.5 text-sm"
                  value={selected.priority}
                  onChange={(e) => {
                    const p = e.target.value as SupportPriority;
                    if (p !== selected.priority) setPendingPriority(p);
                  }}
                >
                  {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <dl className="grid gap-2 text-sm">
                <Row label="Category" value={selected.category} />
                <Row label="Channel" value={selected.channel} />
                <Row label="Assigned" value={selected.assignedTo ?? "Unassigned"} mono />
              </dl>

              <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
                <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">User</h3>
                {contextUser ? (
                  <dl className="mt-2 grid gap-1">
                    <Row label="Name" value={contextUser.name} />
                    <Row label="ID" value={contextUser.id} mono />
                    <Row label="Phone" value={contextUser.phoneMasked} />
                    <Link href={`/users/${contextUser.id}`} className="text-xs text-[var(--bw-brand)] hover:underline">
                      Open profile
                    </Link>
                  </dl>
                ) : (
                  <p className="mt-1 text-xs text-[var(--bw-text-secondary)]">User not loaded.</p>
                )}
              </section>

              {selected.relatedRideId ? (
                <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
                  <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">Ride</h3>
                  {contextRide ? (
                    <dl className="mt-2 grid gap-1">
                      <Row label="Ride ID" value={contextRide.id} mono />
                      <Row
                        label="Route"
                        value={`${contextRide.route.origin.name} → ${contextRide.route.destination.name}`}
                      />
                      <Link
                        href={`/rides/${contextRide.id}`}
                        className="text-xs text-[var(--bw-brand)] hover:underline"
                      >
                        Open ride
                      </Link>
                    </dl>
                  ) : (
                    <p className="mt-1 font-mono text-xs">{selected.relatedRideId}</p>
                  )}
                </section>
              ) : null}

              {selected.relatedTransactionId ? (
                <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
                  <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                    Transaction
                  </h3>
                  <Link
                    href={`/transactions/${selected.relatedTransactionId}`}
                    className="mt-1 inline-block font-mono text-xs text-[var(--bw-brand)] hover:underline"
                  >
                    {selected.relatedTransactionId}
                  </Link>
                </section>
              ) : null}

              {timeline.length > 0 ? (
                <section className="text-xs">
                  <h3 className="font-semibold uppercase text-[var(--bw-text-muted)]">Timeline</h3>
                  <ul className="mt-2 space-y-1">
                    {timeline.map((e) => (
                      <li key={e.id} className="text-[var(--bw-text-secondary)]">
                        {formatIstDateTime(new Date(e.timestamp))} — {e.label}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <EmptyState title="No ticket selected" />
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={assignOpen}
        title="Assign ticket?"
        description={`Assign this ticket to ${adminName} (${adminId})?`}
        confirmLabel="Assign"
        onCancel={() => setAssignOpen(false)}
        onConfirm={() => void confirmAssign()}
      />

      <ReasonConfirmDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus ? `${pendingStatus.label} ticket` : "Ticket action"}
        description="Status changes are audited."
        confirmLabel={pendingStatus?.label ?? "Confirm"}
        danger={pendingStatus?.danger}
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => void applyStatus(reason)}
      />

      <ReasonConfirmDialog
        open={Boolean(pendingPriority && selected && pendingPriority !== selected.priority)}
        title="Change priority"
        description={`Set priority to ${pendingPriority ?? ""}?`}
        confirmLabel="Update priority"
        onCancel={() => setPendingPriority(null)}
        onConfirm={(reason) => void applyPriority(reason)}
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
