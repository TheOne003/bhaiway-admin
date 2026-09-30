export type RealtimeEventType =
  | "sos.activated"
  | "sos.resolved"
  | "ride.status_changed"
  | "ride.location_updated"
  | "ride.cancelled"
  | "support.ticket_created"
  | "support.message_received"
  | "support.message_created"
  | "support.ticket_updated"
  | "support.ticket_assigned"
  | "support.ticket_escalated"
  | "support.ticket_resolved"
  | "system.health_changed"
  | "system.alert"
  | "system.service_down"
  | "system.service_recovered"
  | "system.service_degraded"
  | "alert.created"
  | "alert.updated"
  | "verification.result"
  | "verification.created"
  | "verification.status_changed"
  | "user.status_changed"
  | "driver.status_changed"
  | "payment.status_changed"
  | "wallet.updated"
  | "notification.delivered"
  | "notification.created"
  | "safety.sos_triggered"
  | "safety.sos_acknowledged"
  | "safety.sos_response_started"
  | "safety.sos_resolved"
  | "safety.incident_created"
  | "safety.incident_updated"
  | "safety.incident_escalated"
  | "safety.route_deviation"
  | "money.transaction_created"
  | "money.transaction_updated"
  | "money.wallet_updated"
  | "money.deposit_created"
  | "money.deposit_updated"
  | "money.refund_updated"
  | "money.credit_created"
  | "money.credit_updated"
  | "growth.coupon_updated"
  | "growth.referral_updated"
  | "admin.role_updated"
  | "admin.permission_updated"
  | "admin.status_changed"
  | "settings.updated"
  | "audit.created";

export interface RealtimeEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  payload: T;
}

export interface ServiceStatusChangePayload {
  serviceId: string;
  serviceName: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  httpStatus?: number | null;
  errorMessage?: string | null;
}

export interface RideLocationUpdatedPayload {
  rideId: string;
  location: { lat: number; lng: number; timestamp: string; label?: string };
  routeProgress: number;
  etaMinutes?: number | null;
  timestamp: string;
}

export interface RideStatusChangedPayload {
  rideId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface VerificationStatusChangedPayload {
  verificationId: string;
  userId: string;
  type: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface UserStatusChangedPayload {
  userId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface DriverStatusChangedPayload {
  driverId: string;
  userId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface SafetySosPayload {
  sosId: string;
  rideId: string;
  userId: string;
  driverId: string;
  previousStatus?: string;
  newStatus: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  networkType?: string;
}

export interface SafetyIncidentPayload {
  incidentId: string;
  rideId: string | null;
  previousStatus?: string;
  newStatus: string;
  timestamp: string;
  type?: string;
}

export interface MoneyTransactionPayload {
  transactionId: string;
  userId: string;
  walletId: string;
  amountPaise: number;
  type: string;
  direction: string;
  status: string;
  timestamp: string;
  referenceType?: string;
  referenceId?: string | null;
}

export interface MoneyWalletPayload {
  walletId: string;
  userId: string;
  availableBalancePaise: number;
  heldBalancePaise: number;
  status: string;
  timestamp: string;
}

export interface MoneyDepositPayload {
  depositId: string;
  rideId: string;
  userId: string;
  status: string;
  amountPaise: number;
  timestamp: string;
}

export interface MoneyRefundPayload {
  refundId: string;
  userId: string;
  previousStatus?: string;
  newStatus: string;
  amountPaise: number;
  timestamp: string;
}

export interface MoneyCreditPayload {
  creditId: string;
  userId: string;
  amountPaise: number;
  status: string;
  timestamp: string;
}

export interface GrowthCouponPayload {
  couponId: string;
  code: string;
  previousStatus?: string;
  newStatus: string;
  timestamp: string;
}

export interface GrowthReferralPayload {
  referralId: string;
  referrerUserId: string;
  previousStatus?: string;
  newStatus: string;
  timestamp: string;
  rewardTransactionId?: string | null;
}

export interface SupportTicketPayload {
  ticketId: string;
  userId: string;
  previousStatus?: string;
  newStatus?: string;
  assignedTo?: string | null;
  timestamp: string;
}

export interface SupportMessagePayload {
  ticketId: string;
  messageId: string;
  userId: string;
  senderType: string;
  internal: string;
  timestamp: string;
}

export interface AdminRoleUpdatedPayload {
  adminId: string;
  roleIds: string[];
  timestamp: string;
}

export interface AdminPermissionUpdatedPayload {
  roleId: string;
  permissionIds: string[];
  timestamp: string;
}

export interface AdminStatusChangedPayload {
  adminId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface SettingsUpdatedPayload {
  group: string;
  timestamp: string;
}

export interface AuditCreatedPayload {
  action: string;
  targetId: string;
  timestamp: string;
}

export type RealtimeListener = (event: RealtimeEvent) => void;

export interface RealtimeService {
  connect(): void;
  disconnect(): void;
  subscribe(listener: RealtimeListener): () => void;
  isConnected(): boolean;
}
