export type SupportCategory =
  | "RIDE"
  | "PAYMENT"
  | "SAFETY"
  | "VERIFICATION"
  | "ACCOUNT"
  | "REFUND"
  | "ASSURED_RIDE"
  | "TECHNICAL"
  | "OTHER";

export type SupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type SupportChannel = "IN_APP" | "EMAIL" | "PHONE" | "WHATSAPP" | "OTHER";

export type SupportSenderType = "CUSTOMER" | "ADMIN" | "SYSTEM";

export interface SupportTicket {
  id: string;
  userId: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  channel: SupportChannel;
  relatedRideId: string | null;
  relatedTransactionId: string | null;
  relatedVerificationId: string | null;
  relatedIncidentId: string | null;
  relatedAssuredRideId: string | null;
  lastMessageAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: SupportSenderType;
  senderId: string;
  body: string;
  /** Internal notes are never shown as customer messages. */
  internal: boolean;
  createdAt: string;
  attachmentMeta: { name: string; mimeType: string; sizeBytes: number } | null;
}

export interface SupportTimelineEntry {
  id: string;
  ticketId: string;
  label: string;
  actorId: string | null;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface SupportFilters {
  status?: SupportStatus | "ALL";
  priority?: SupportPriority | "ALL";
  category?: SupportCategory | "ALL";
  assignedTo?: string | "ALL" | "UNASSIGNED";
  channel?: SupportChannel | "ALL";
  search?: string;
}
