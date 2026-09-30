import {
  MOCK_SUPPORT_MESSAGES,
  MOCK_SUPPORT_TICKETS,
  MOCK_SUPPORT_TIMELINE,
} from "@/mock/support";
import { auditService } from "@/services/audit";
import { getMockRealtimeService } from "@/services/realtime";
import type {
  SupportFilters,
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
  SupportTimelineEntry,
} from "@/types/support";

let tickets: SupportTicket[] = structuredClone(MOCK_SUPPORT_TICKETS);
let messages: SupportMessage[] = structuredClone(MOCK_SUPPORT_MESSAGES);
let timeline: SupportTimelineEntry[] = structuredClone(MOCK_SUPPORT_TIMELINE);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

function emitSupport(type: string, payload: Record<string, unknown>) {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  const timestamp = new Date().toISOString();
  bus.emit({
    id: `rt_support_${Date.now()}`,
    type: type as never,
    timestamp,
    payload: { ...payload, timestamp },
  });
}

function pushTimeline(
  ticketId: string,
  label: string,
  actorId: string | null,
): void {
  timeline = [
    {
      id: `stl_${Date.now()}_${timeline.length}`,
      ticketId,
      label,
      actorId,
      timestamp: new Date().toISOString(),
    },
    ...timeline,
  ];
}

export function filterTickets(list: SupportTicket[], filters?: SupportFilters): SupportTicket[] {
  if (!filters) return list;
  return list.filter((t) => {
    if (filters.status && filters.status !== "ALL" && t.status !== filters.status) return false;
    if (filters.priority && filters.priority !== "ALL" && t.priority !== filters.priority)
      return false;
    if (filters.category && filters.category !== "ALL" && t.category !== filters.category)
      return false;
    if (filters.channel && filters.channel !== "ALL" && t.channel !== filters.channel) return false;
    if (filters.assignedTo === "UNASSIGNED" && t.assignedTo) return false;
    if (
      filters.assignedTo &&
      filters.assignedTo !== "ALL" &&
      filters.assignedTo !== "UNASSIGNED" &&
      t.assignedTo !== filters.assignedTo
    )
      return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${t.id} ${t.subject} ${t.userId} ${t.relatedRideId ?? ""} ${t.relatedTransactionId ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const STATUS_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED", "OPEN"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "RESOLVED", "CLOSED", "ESCALATED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

export const supportService = {
  async getTickets(filters?: SupportFilters): Promise<SupportTicket[]> {
    assertOk();
    return structuredClone(
      filterTickets(tickets, filters).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      ),
    );
  },

  async getTicketById(id: string): Promise<SupportTicket | null> {
    assertOk();
    const t = tickets.find((x) => x.id === id);
    return t ? structuredClone(t) : null;
  },

  async getMessages(ticketId: string): Promise<SupportMessage[]> {
    assertOk();
    return structuredClone(
      messages
        .filter((m) => m.ticketId === ticketId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );
  },

  async getTimeline(ticketId: string): Promise<SupportTimelineEntry[]> {
    assertOk();
    return structuredClone(
      timeline
        .filter((e) => e.ticketId === ticketId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    );
  },

  async assignTicket(
    id: string,
    adminId: string,
    input: { actorId: string; actorName: string; reason: string },
  ): Promise<SupportTicket> {
    assertOk();
    const current = tickets.find((t) => t.id === id);
    if (!current) throw new Error("Ticket not found.");
    const updated = {
      ...current,
      assignedTo: adminId,
      status: current.status === "OPEN" ? ("IN_PROGRESS" as const) : current.status,
      updatedAt: new Date().toISOString(),
    };
    tickets = tickets.map((t) => (t.id === id ? updated : t));
    pushTimeline(id, `Assigned to ${adminId}`, input.actorId);
    await auditService.record({
      adminId: input.actorId,
      adminName: input.actorName,
      action: "support.ticket_assigned",
      targetType: "support_ticket",
      targetId: id,
      oldValue: { assignedTo: current.assignedTo },
      newValue: { assignedTo: adminId },
      reason: input.reason,
    });
    emitSupport("support.ticket_assigned", {
      ticketId: id,
      assignedTo: adminId,
      userId: current.userId,
    });
    return structuredClone(updated);
  },

  async setPriority(
    id: string,
    priority: SupportPriority,
    input: { actorId: string; actorName: string; reason: string },
  ): Promise<SupportTicket> {
    assertOk();
    const current = tickets.find((t) => t.id === id);
    if (!current) throw new Error("Ticket not found.");
    const updated = { ...current, priority, updatedAt: new Date().toISOString() };
    tickets = tickets.map((t) => (t.id === id ? updated : t));
    pushTimeline(id, `Priority → ${priority}`, input.actorId);
    await auditService.record({
      adminId: input.actorId,
      adminName: input.actorName,
      action: "support.priority_changed",
      targetType: "support_ticket",
      targetId: id,
      oldValue: { priority: current.priority },
      newValue: { priority },
      reason: input.reason,
    });
    emitSupport("support.ticket_updated", {
      ticketId: id,
      previousStatus: current.status,
      newStatus: current.status,
      userId: current.userId,
    });
    return structuredClone(updated);
  },

  async setStatus(
    id: string,
    status: SupportStatus,
    input: { actorId: string; actorName: string; reason: string },
  ): Promise<SupportTicket> {
    assertOk();
    const current = tickets.find((t) => t.id === id);
    if (!current) throw new Error("Ticket not found.");
    if (!STATUS_TRANSITIONS[current.status].includes(status)) {
      throw new Error(`Cannot transition ticket from ${current.status} to ${status}.`);
    }
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    tickets = tickets.map((t) => (t.id === id ? updated : t));
    pushTimeline(id, `Status → ${status}`, input.actorId);
    await auditService.record({
      adminId: input.actorId,
      adminName: input.actorName,
      action: "support.status_changed",
      targetType: "support_ticket",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status },
      reason: input.reason,
    });
    const eventType =
      status === "ESCALATED"
        ? "support.ticket_escalated"
        : status === "RESOLVED"
          ? "support.ticket_resolved"
          : "support.ticket_updated";
    emitSupport(eventType, {
      ticketId: id,
      previousStatus: current.status,
      newStatus: status,
      userId: current.userId,
    });
    return structuredClone(updated);
  },

  async addMessage(input: {
    ticketId: string;
    senderType: SupportMessage["senderType"];
    senderId: string;
    body: string;
    internal: boolean;
    actorName?: string;
  }): Promise<SupportMessage> {
    assertOk();
    const ticket = tickets.find((t) => t.id === input.ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    if (!input.body.trim()) throw new Error("Message body is required.");
    const now = new Date().toISOString();
    const message: SupportMessage = {
      id: `msg_${Date.now()}_${messages.length}`,
      ticketId: input.ticketId,
      senderType: input.senderType,
      senderId: input.senderId,
      body: input.body.trim(),
      internal: input.internal,
      createdAt: now,
      attachmentMeta: null,
    };
    messages = [...messages, message];
    tickets = tickets.map((t) =>
      t.id === input.ticketId
        ? { ...t, lastMessageAt: now, updatedAt: now }
        : t,
    );
    const label = input.internal
      ? "Internal note added"
      : input.senderType === "ADMIN"
        ? "Admin replied"
        : input.senderType === "CUSTOMER"
          ? "Customer replied"
          : "System message";
    pushTimeline(input.ticketId, label, input.senderId);
    if (input.internal || input.senderType === "ADMIN") {
      await auditService.record({
        adminId: input.senderId,
        adminName: input.actorName ?? input.senderId,
        action: input.internal ? "support.internal_note" : "support.admin_reply",
        targetType: "support_ticket",
        targetId: input.ticketId,
        oldValue: null,
        newValue: { messageId: message.id, internal: input.internal },
        reason: input.internal ? "Internal note" : "Customer reply",
      });
    }
    emitSupport("support.message_created", {
      ticketId: input.ticketId,
      messageId: message.id,
      userId: ticket.userId,
      senderType: input.senderType,
      internal: String(input.internal),
    });
    return structuredClone(message);
  },

  __resetForTests() {
    tickets = structuredClone(MOCK_SUPPORT_TICKETS);
    messages = structuredClone(MOCK_SUPPORT_MESSAGES);
    timeline = structuredClone(MOCK_SUPPORT_TIMELINE);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
