import { alertsService } from "@/services/alerts";
import { notificationsService } from "@/services/notifications";
import { pushTimelineEvent } from "@/services/dashboard";
import { getMockRealtimeService } from "@/services/realtime";
import { ridesService } from "@/services/rides";
import { systemHealthService } from "@/services/systemHealth";
import { usersService } from "@/services/users";
import { driversService } from "@/services/drivers";
import { verificationService } from "@/services/verification";
import { safetyService } from "@/services/safety";
import { incidentsService } from "@/services/incidents";
import { notificationEngine } from "@/services/notificationEngine";
import type {
  RealtimeEvent,
  RideLocationUpdatedPayload,
  RideStatusChangedPayload,
  ServiceStatusChangePayload,
  UserStatusChangedPayload,
  DriverStatusChangedPayload,
  VerificationStatusChangedPayload,
  SafetySosPayload,
  SafetyIncidentPayload,
  MoneyTransactionPayload,
  MoneyWalletPayload,
  MoneyDepositPayload,
  MoneyRefundPayload,
  MoneyCreditPayload,
  GrowthCouponPayload,
  GrowthReferralPayload,
  SupportTicketPayload,
  SupportMessagePayload,
} from "@/types/realtime";
import type { RideLifecycleStatus } from "@/types/ride";
import type { ServiceHealthStatus } from "@/types/systemHealth";
import type { AccountStatus } from "@/types/user";
import type { RideNetwork } from "@/types/network";

function isStatusChangePayload(value: unknown): value is ServiceStatusChangePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.serviceId === "string" &&
    typeof payload.serviceName === "string" &&
    typeof payload.previousStatus === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isRideLocationPayload(value: unknown): value is RideLocationUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  const location = payload.location as Record<string, unknown> | undefined;
  return (
    typeof payload.rideId === "string" &&
    typeof payload.routeProgress === "number" &&
    typeof payload.timestamp === "string" &&
    Boolean(location) &&
    typeof location?.lat === "number" &&
    typeof location?.lng === "number"
  );
}

function isRideStatusPayload(value: unknown): value is RideStatusChangedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.rideId === "string" &&
    typeof payload.previousStatus === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isVerificationStatusPayload(
  value: unknown,
): value is VerificationStatusChangedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.verificationId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.type === "string" &&
    typeof payload.previousStatus === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isUserStatusPayload(value: unknown): value is UserStatusChangedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.userId === "string" &&
    typeof payload.previousStatus === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isDriverStatusPayload(value: unknown): value is DriverStatusChangedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.driverId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.previousStatus === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isSafetySosPayload(value: unknown): value is SafetySosPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sosId === "string" &&
    typeof payload.rideId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.driverId === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

function isSafetyIncidentPayload(value: unknown): value is SafetyIncidentPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.incidentId === "string" &&
    typeof payload.newStatus === "string" &&
    typeof payload.timestamp === "string"
  );
}

export async function applyRealtimeEvent(event: RealtimeEvent): Promise<void> {
  try {
  switch (event.type) {
    case "system.service_down":
    case "system.service_degraded":
    case "system.service_recovered":
    case "system.health_changed": {
      if (!isStatusChangePayload(event.payload)) return;
      const payload = event.payload;
      const newStatus = payload.newStatus as ServiceHealthStatus;
      const updated = await systemHealthService.updateServiceStatus(
        payload.serviceId,
        newStatus,
        {
          timestamp: payload.timestamp,
          httpStatus: payload.httpStatus,
          errorMessage: payload.errorMessage,
        },
      );
      if (!updated) return;

      const isDown = newStatus === "down";
      const isDegraded = newStatus === "degraded";
      const isRecovered = newStatus === "operational";

      if (isDown || isDegraded) {
        const alert = await alertsService.createAlert({
          id: `alert_${payload.serviceId}_${newStatus}`,
          priority: isDown ? "critical" : "warning",
          title: `${payload.serviceName} ${isDown ? "unavailable" : "degraded"}`,
          description: isDown
            ? `${updated.affectedFunctionality[0] ?? "Dependent functionality"} may be affected.`
            : updated.errorMessage ?? "Service performance is degraded.",
          source: "system_health",
          href: `/system-health?service=${payload.serviceId}`,
          relatedServiceId: payload.serviceId,
          createdAt: payload.timestamp,
        });

        await notificationsService.createNotification({
          id: `notif_${payload.serviceId}_${newStatus}`,
          category: isDown ? "critical" : "system",
          title: alert.title,
          description: `System · ${alert.description}`,
          href: alert.href,
          relatedAlertId: alert.id,
          relatedServiceId: payload.serviceId,
          createdAt: payload.timestamp,
        });

        await pushTimelineEvent({
          id: `evt_${payload.serviceId}_${newStatus}`,
          kind: isDown ? "health_down" : "health_degraded",
          title: alert.title,
          timestamp: payload.timestamp,
          href: alert.href,
        });
      }

      if (isRecovered) {
        await alertsService.createAlert({
          id: `alert_${payload.serviceId}_recovered`,
          priority: "info",
          title: `${payload.serviceName} recovered`,
          description: "Service returned to operational status.",
          source: "system_health",
          href: `/system-health?service=${payload.serviceId}`,
          relatedServiceId: payload.serviceId,
          status: "resolved",
          read: false,
          createdAt: payload.timestamp,
        });

        await notificationsService.createNotification({
          id: `notif_${payload.serviceId}_recovered`,
          category: "system",
          title: `${payload.serviceName} recovered`,
          description: "System · Service is operational again",
          href: `/system-health?service=${payload.serviceId}`,
          relatedServiceId: payload.serviceId,
          createdAt: payload.timestamp,
        });

        await pushTimelineEvent({
          id: `evt_${payload.serviceId}_recovered`,
          kind: "health_recovered",
          title: `${payload.serviceName} recovered`,
          timestamp: payload.timestamp,
          href: `/system-health?service=${payload.serviceId}`,
        });
      }
      break;
    }
    case "alert.created":
    case "system.alert": {
      await pushTimelineEvent({
        kind: "alert_created",
        title: "New high-priority alert",
        timestamp: event.timestamp,
        href: "/alerts",
      });
      break;
    }
    case "ride.location_updated": {
      if (!isRideLocationPayload(event.payload)) return;
      const payload = event.payload;
      await ridesService.updateRideLocation(
        payload.rideId,
        payload.routeProgress,
        payload.timestamp,
      );
      await pushTimelineEvent({
        id: `evt_ride_loc_${payload.rideId}_${payload.timestamp}`,
        kind: "ride_event",
        title: `Ride ${payload.rideId} location updated`,
        timestamp: payload.timestamp,
        href: `/rides/${payload.rideId}`,
      });
      break;
    }
    case "ride.status_changed":
    case "ride.cancelled": {
      if (!isRideStatusPayload(event.payload)) return;
      const payload = event.payload;
      await ridesService.updateRideStatus(
        payload.rideId,
        payload.newStatus as RideLifecycleStatus,
        payload.timestamp,
      );
      await pushTimelineEvent({
        id: `evt_ride_status_${payload.rideId}_${payload.newStatus}`,
        kind: "ride_event",
        title: `Ride ${payload.rideId} → ${payload.newStatus}`,
        timestamp: payload.timestamp,
        href: `/rides/${payload.rideId}`,
      });
      break;
    }
    case "verification.created": {
      if (!isVerificationStatusPayload(event.payload)) return;
      const payload = event.payload;
      await pushTimelineEvent({
        id: `evt_ver_created_${payload.verificationId}`,
        kind: "system",
        title: `Verification submitted · ${payload.type}`,
        timestamp: payload.timestamp,
        href: `/verification?id=${payload.verificationId}`,
      });
      break;
    }
    case "verification.status_changed":
    case "verification.result": {
      if (!isVerificationStatusPayload(event.payload)) return;
      const payload = event.payload;
      if (payload.newStatus === "APPROVED") {
        await verificationService.approve(payload.verificationId, "system");
      } else if (payload.newStatus === "FAILED") {
        await verificationService.fail(
          payload.verificationId,
          "Realtime failure update (mock)",
          "system",
        );
      } else if (payload.newStatus === "MANUAL_REVIEW") {
        await verificationService.sendToManualReview(
          payload.verificationId,
          "Realtime manual review (mock)",
          "system",
        );
      } else if (payload.newStatus === "PENDING") {
        await verificationService.retry(payload.verificationId);
      }
      await pushTimelineEvent({
        id: `evt_ver_${payload.verificationId}_${payload.newStatus}`,
        kind: "system",
        title: `Verification ${payload.type} → ${payload.newStatus}`,
        timestamp: payload.timestamp,
        href: `/verification?id=${payload.verificationId}`,
      });
      break;
    }
    case "user.status_changed": {
      if (!isUserStatusPayload(event.payload)) return;
      const payload = event.payload;
      await usersService.updateUserStatus(
        payload.userId,
        payload.newStatus as AccountStatus,
      );
      await pushTimelineEvent({
        id: `evt_user_${payload.userId}_${payload.newStatus}`,
        kind: "system",
        title: `User ${payload.userId} → ${payload.newStatus}`,
        timestamp: payload.timestamp,
        href: `/users/${payload.userId}`,
      });
      break;
    }
    case "driver.status_changed": {
      if (!isDriverStatusPayload(event.payload)) return;
      const payload = event.payload;
      await driversService.updateDriverStatus(
        payload.driverId,
        payload.newStatus as AccountStatus,
      );
      await pushTimelineEvent({
        id: `evt_drv_${payload.driverId}_${payload.newStatus}`,
        kind: "system",
        title: `Driver ${payload.driverId} → ${payload.newStatus}`,
        timestamp: payload.timestamp,
        href: `/drivers/${payload.driverId}`,
      });
      break;
    }
    case "safety.sos_triggered":
    case "sos.activated": {
      if (!isSafetySosPayload(event.payload)) return;
      const payload = event.payload;
      const sos = await safetyService.upsertTriggeredSOS({
        id: payload.sosId,
        rideId: payload.rideId,
        triggeredByUserId: payload.userId,
        driverId: payload.driverId,
        networkType: (payload.networkType as RideNetwork) ?? "OFFICE",
        latitude: payload.latitude ?? 28.57,
        longitude: payload.longitude ?? 77.05,
        locationLabel: payload.locationLabel ?? "Synthetic location",
      });
      await incidentsService.createFromSos({
        sosId: sos.id,
        rideId: sos.rideId,
        userId: sos.triggeredByUserId,
        driverId: sos.driverId,
        networkType: sos.networkType,
        title: `Active SOS on ${sos.rideId}`,
        description: "Critical SOS triggered (realtime).",
        locationLabel: sos.locationLabel,
        latitude: sos.latitude,
        longitude: sos.longitude,
      });
      const alert = await alertsService.createAlert({
        id: `alert_${sos.id}`,
        priority: "critical",
        title: `SOS active · ${sos.rideId}`,
        description: `Critical safety event at ${sos.locationLabel}`,
        source: "safety",
        href: `/safety/sos?id=${sos.id}`,
        createdAt: payload.timestamp,
      });
      await notificationsService.createNotification({
        id: `notif_${sos.id}`,
        category: "critical",
        title: alert.title,
        description: "Safety · SOS triggered",
        href: alert.href,
        relatedAlertId: alert.id,
        createdAt: payload.timestamp,
      });
      await pushTimelineEvent({
        id: `evt_${sos.id}_triggered`,
        kind: "alert_created",
        title: `SOS triggered · ${sos.rideId}`,
        timestamp: payload.timestamp,
        href: `/safety/live-monitoring?sos=${sos.id}`,
      });
      break;
    }
    case "safety.sos_acknowledged": {
      if (!isSafetySosPayload(event.payload)) return;
      await safetyService.acknowledgeSOS(event.payload.sosId, "system");
      await incidentsService.syncStatusFromSos(event.payload.sosId, "INVESTIGATING", "system");
      await pushTimelineEvent({
        id: `evt_${event.payload.sosId}_ack`,
        kind: "system",
        title: `SOS acknowledged · ${event.payload.rideId}`,
        timestamp: event.payload.timestamp,
        href: `/safety/sos?id=${event.payload.sosId}`,
      });
      break;
    }
    case "safety.sos_response_started": {
      if (!isSafetySosPayload(event.payload)) return;
      await safetyService.startSOSResponse(event.payload.sosId, "system");
      await pushTimelineEvent({
        id: `evt_${event.payload.sosId}_resp`,
        kind: "system",
        title: `SOS response started · ${event.payload.rideId}`,
        timestamp: event.payload.timestamp,
        href: `/safety/sos?id=${event.payload.sosId}`,
      });
      break;
    }
    case "safety.sos_resolved":
    case "sos.resolved": {
      if (!isSafetySosPayload(event.payload)) return;
      if (event.payload.newStatus === "FALSE_ALARM") {
        await safetyService.markFalseAlarm(event.payload.sosId, "system");
      } else {
        await safetyService.resolveSOS(event.payload.sosId, "system");
      }
      await incidentsService.syncStatusFromSos(event.payload.sosId, "RESOLVED", "system");
      await pushTimelineEvent({
        id: `evt_${event.payload.sosId}_resolved`,
        kind: "system",
        title: `SOS ${event.payload.newStatus} · ${event.payload.rideId}`,
        timestamp: event.payload.timestamp,
        href: `/safety/sos?id=${event.payload.sosId}`,
      });
      break;
    }
    case "safety.incident_created":
    case "safety.incident_updated":
    case "safety.incident_escalated": {
      if (!isSafetyIncidentPayload(event.payload)) return;
      const payload = event.payload;
      if (event.type === "safety.incident_escalated") {
        await incidentsService.escalateIncident(payload.incidentId, "system");
      }
      await pushTimelineEvent({
        id: `evt_inc_${payload.incidentId}_${payload.newStatus}`,
        kind: "system",
        title: `Incident ${payload.incidentId} → ${payload.newStatus}`,
        timestamp: payload.timestamp,
        href: `/safety/incidents?id=${payload.incidentId}`,
      });
      break;
    }
    case "safety.route_deviation": {
      if (!isSafetyIncidentPayload(event.payload)) return;
      await pushTimelineEvent({
        id: `evt_dev_${event.payload.incidentId}`,
        kind: "system",
        title: `Route deviation · ${event.payload.rideId ?? "unknown"}`,
        timestamp: event.payload.timestamp,
        href: `/safety/incidents?id=${event.payload.incidentId}`,
      });
      break;
    }
    case "money.transaction_created":
    case "money.transaction_updated":
    case "wallet.updated":
    case "money.wallet_updated": {
      const p = event.payload as MoneyTransactionPayload | MoneyWalletPayload;
      const title =
        "transactionId" in p && p.transactionId
          ? `Ledger ${event.type === "money.transaction_created" ? "entry" : "update"} · ${p.transactionId}`
          : `Wallet updated · ${(p as MoneyWalletPayload).walletId}`;
      await pushTimelineEvent({
        id: `evt_money_${event.id}`,
        kind: "system",
        title,
        timestamp: event.timestamp,
        href: "transactionId" in p && p.transactionId
          ? `/transactions?id=${p.transactionId}`
          : `/wallet`,
      });
      await notificationsService.createNotification({
        id: `notif_money_${event.id}`,
        category: "system",
        title,
        description: "Money · ledger / wallet update",
        href: "transactionId" in p && p.transactionId
          ? `/transactions?id=${p.transactionId}`
          : `/wallet`,
        createdAt: event.timestamp,
      });
      break;
    }
    case "money.deposit_created":
    case "money.deposit_updated": {
      const p = event.payload as MoneyDepositPayload;
      if (p?.depositId) {
        await pushTimelineEvent({
          id: `evt_dep_${p.depositId}_${p.status}`,
          kind: "system",
          title: `Security deposit ${p.status} · ${p.rideId}`,
          timestamp: p.timestamp,
          href: `/security-deposits?id=${p.depositId}`,
        });
      }
      break;
    }
    case "money.refund_updated": {
      const p = event.payload as MoneyRefundPayload;
      if (p?.refundId) {
        await pushTimelineEvent({
          id: `evt_ref_${p.refundId}_${p.newStatus}`,
          kind: "system",
          title: `Refund ${p.refundId} → ${p.newStatus}`,
          timestamp: p.timestamp,
          href: `/refunds?id=${p.refundId}`,
        });
      }
      break;
    }
    case "money.credit_created":
    case "money.credit_updated": {
      const p = event.payload as MoneyCreditPayload;
      if (p?.creditId) {
        await pushTimelineEvent({
          id: `evt_crd_${p.creditId}_${p.status}`,
          kind: "system",
          title: `Credit ${p.creditId} · ${p.status}`,
          timestamp: p.timestamp,
          href: `/credits?id=${p.creditId}`,
        });
      }
      break;
    }
    case "growth.coupon_updated": {
      const p = event.payload as GrowthCouponPayload;
      if (p?.couponId) {
        await pushTimelineEvent({
          id: `evt_cpn_${p.couponId}_${p.newStatus}`,
          kind: "system",
          title: `Coupon ${p.code} → ${p.newStatus}`,
          timestamp: p.timestamp,
          href: `/coupons?id=${p.couponId}`,
        });
      }
      break;
    }
    case "growth.referral_updated": {
      const p = event.payload as GrowthReferralPayload;
      if (p?.referralId) {
        await pushTimelineEvent({
          id: `evt_refc_${p.referralId}_${p.newStatus}`,
          kind: "system",
          title: `Referral ${p.referralId} → ${p.newStatus}`,
          timestamp: p.timestamp,
          href: `/referrals?id=${p.referralId}`,
        });
      }
      break;
    }
    case "support.ticket_created":
    case "support.ticket_updated":
    case "support.ticket_assigned":
    case "support.ticket_escalated":
    case "support.ticket_resolved": {
      const p = event.payload as SupportTicketPayload;
      if (p?.ticketId) {
        await pushTimelineEvent({
          id: `evt_tkt_${p.ticketId}_${event.type}`,
          kind: "system",
          title: `Support ${p.ticketId} · ${event.type.replace("support.", "")}`,
          timestamp: p.timestamp ?? event.timestamp,
          href: `/support?ticket=${p.ticketId}`,
        });
      }
      break;
    }
    case "support.message_created":
    case "support.message_received": {
      const p = event.payload as SupportMessagePayload;
      if (p?.ticketId) {
        await pushTimelineEvent({
          id: `evt_msg_${p.messageId ?? event.id}`,
          kind: "system",
          title: `Support message · ${p.ticketId}`,
          timestamp: p.timestamp ?? event.timestamp,
          href: `/support?ticket=${p.ticketId}`,
        });
      }
      break;
    }
    case "notification.created":
    case "notification.delivered":
      // Admin UI refresh only — engine must not re-process notification events.
      break;
    default:
      break;
  }
  } finally {
    await feedNotificationEngine(event);
  }
}

const ENGINE_EVENT_TYPES = new Set([
  "ride.status_changed",
  "ride.cancelled",
  "safety.sos_triggered",
  "safety.sos_acknowledged",
  "safety.sos_resolved",
  "safety.incident_created",
  "safety.incident_escalated",
  "verification.created",
  "verification.status_changed",
  "money.transaction_created",
  "money.transaction_updated",
  "money.refund_updated",
  "money.credit_created",
  "growth.coupon_updated",
  "growth.referral_updated",
  "support.ticket_created",
  "support.message_created",
  "support.ticket_updated",
  "system.service_down",
  "system.service_degraded",
  "system.service_recovered",
  "alert.created",
]);

async function feedNotificationEngine(event: RealtimeEvent): Promise<void> {
  if (!ENGINE_EVENT_TYPES.has(event.type)) return;
  if (event.type.startsWith("notification.")) return;
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};
  const eventId =
    String(
      payload.sosId ??
        payload.incidentId ??
        payload.verificationId ??
        payload.refundId ??
        payload.transactionId ??
        payload.ticketId ??
        payload.messageId ??
        payload.rideId ??
        payload.couponId ??
        payload.referralId ??
        payload.serviceId ??
        event.id,
    );
  try {
    await notificationEngine.processEvent({
      eventType: event.type,
      eventId,
      payload,
    });
  } catch {
    // Engine failures must not break domain realtime handling.
  }
}

export function emitServiceStatusChange(
  type: "system.service_down" | "system.service_degraded" | "system.service_recovered",
  payload: ServiceStatusChangePayload,
): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_${payload.serviceId}_${payload.newStatus}_${Date.now()}`,
    type,
    timestamp: payload.timestamp,
    payload,
  });
}

/** DEV / test helper: emit a deterministic SERVICE_DOWN for RC Verification. */
export function simulateServiceDown(serviceId = "svc_rc"): void {
  void systemHealthService.getServiceHealth(serviceId).then((service) => {
    if (!service) return;
    emitServiceStatusChange("system.service_down", {
      serviceId: service.id,
      serviceName: service.name,
      previousStatus: service.status,
      newStatus: "down",
      timestamp: new Date().toISOString(),
      httpStatus: 503,
      errorMessage: "Upstream service unavailable (503)",
    });
  });
}

export function simulateServiceRecovered(serviceId = "svc_rc"): void {
  void systemHealthService.getServiceHealth(serviceId).then((service) => {
    if (!service) return;
    emitServiceStatusChange("system.service_recovered", {
      serviceId: service.id,
      serviceName: service.name,
      previousStatus: service.status,
      newStatus: "operational",
      timestamp: new Date().toISOString(),
      httpStatus: 200,
      errorMessage: null,
    });
  });
}

export function simulateServiceDegraded(serviceId = "svc_sms"): void {
  void systemHealthService.getServiceHealth(serviceId).then((service) => {
    if (!service) return;
    emitServiceStatusChange("system.service_degraded", {
      serviceId: service.id,
      serviceName: service.name,
      previousStatus: service.status,
      newStatus: "degraded",
      timestamp: new Date().toISOString(),
      httpStatus: 200,
      errorMessage: "Elevated latency detected",
    });
  });
}

export function emitRideLocationUpdate(payload: RideLocationUpdatedPayload): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_ride_loc_${payload.rideId}_${Date.now()}`,
    type: "ride.location_updated",
    timestamp: payload.timestamp,
    payload,
  });
}

export function emitRideStatusChange(payload: RideStatusChangedPayload): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  const type = payload.newStatus === "cancelled" ? "ride.cancelled" : "ride.status_changed";
  bus.emit({
    id: `rt_ride_status_${payload.rideId}_${Date.now()}`,
    type,
    timestamp: payload.timestamp,
    payload,
  });
}

/** Emit a location update that advances a live ride along its route (bridge applies mutation). */
export async function simulateRideMove(rideId = "BW10291"): Promise<void> {
  const ride = await ridesService.getRideById(rideId);
  if (!ride) return;
  const { advanceRouteProgress, buildLocationFromProgress } = await import("@/lib/rideGeo");
  const nextProgress = advanceRouteProgress(ride.routeProgress, 0.05);
  const timestamp = new Date().toISOString();
  const location = buildLocationFromProgress(
    ride.route.coordinates,
    nextProgress,
    timestamp,
    ride.currentLocation?.label,
  );
  emitRideLocationUpdate({
    rideId: ride.id,
    location,
    routeProgress: nextProgress,
    etaMinutes: ride.etaMinutes == null ? null : Math.max(0, ride.etaMinutes - 2),
    timestamp,
  });
}

export async function simulateRideDelayed(rideId = "BW10291"): Promise<void> {
  const ride = await ridesService.getRideById(rideId);
  if (!ride) return;
  emitRideStatusChange({
    rideId: ride.id,
    previousStatus: ride.status,
    newStatus: "delayed",
    timestamp: new Date().toISOString(),
  });
}

export async function simulateRideEtaUpdate(rideId = "BW10291"): Promise<void> {
  const ride = await ridesService.getRideById(rideId);
  if (!ride?.currentLocation) return;
  const nextProgress = Math.min(1, ride.routeProgress + 0.02);
  emitRideLocationUpdate({
    rideId: ride.id,
    location: {
      ...ride.currentLocation,
      timestamp: new Date().toISOString(),
    },
    routeProgress: nextProgress,
    etaMinutes: Math.max(0, (ride.etaMinutes ?? 10) - 3),
    timestamp: new Date().toISOString(),
  });
}

export function emitVerificationStatusChange(
  payload: VerificationStatusChangedPayload,
): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_ver_${payload.verificationId}_${Date.now()}`,
    type: "verification.status_changed",
    timestamp: payload.timestamp,
    payload,
  });
}

export function emitUserStatusChange(payload: UserStatusChangedPayload): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_user_${payload.userId}_${Date.now()}`,
    type: "user.status_changed",
    timestamp: payload.timestamp,
    payload,
  });
}

export function emitDriverStatusChange(payload: DriverStatusChangedPayload): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_drv_${payload.driverId}_${Date.now()}`,
    type: "driver.status_changed",
    timestamp: payload.timestamp,
    payload,
  });
}

export async function simulateVerificationApprove(
  verificationId = "ver_gov_004",
): Promise<void> {
  const current = await verificationService.getVerificationById(verificationId);
  if (!current) return;
  emitVerificationStatusChange({
    verificationId: current.id,
    userId: current.userId,
    type: current.type,
    previousStatus: current.status,
    newStatus: "APPROVED",
    timestamp: new Date().toISOString(),
  });
}

export function emitSafetySosEvent(
  type:
    | "safety.sos_triggered"
    | "safety.sos_acknowledged"
    | "safety.sos_response_started"
    | "safety.sos_resolved",
  payload: SafetySosPayload,
): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_sos_${payload.sosId}_${Date.now()}`,
    type,
    timestamp: payload.timestamp,
    payload,
  });
}

/** DEV helper: trigger a new critical SOS on a safe ride. */
export async function simulateSosTriggered(rideId = "BW10294"): Promise<void> {
  const ride = await ridesService.getRideById(rideId);
  if (!ride) return;
  const point = ride.currentLocation ?? ride.route.origin.point;
  const sosId = `sos_sim_${rideId}`;
  emitSafetySosEvent("safety.sos_triggered", {
    sosId,
    rideId: ride.id,
    userId: ride.passengers[0]?.id ?? "usr_001",
    driverId: ride.driver.id,
    newStatus: "TRIGGERED",
    timestamp: new Date().toISOString(),
    latitude: point.lat,
    longitude: point.lng,
    locationLabel: ride.currentLocation?.label ?? ride.route.origin.name,
    networkType: ride.networkType,
  });
}

function emitMoneyBus(
  type: RealtimeEvent["type"],
  payload: unknown,
  idPrefix: string,
): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  const timestamp =
    payload && typeof payload === "object" && "timestamp" in payload
      ? String((payload as { timestamp: string }).timestamp)
      : new Date().toISOString();
  bus.emit({
    id: `rt_${idPrefix}_${Date.now()}`,
    type,
    timestamp,
    payload,
  });
}

/** DEV helper: create a deterministic mock adjustment and emit money realtime events. */
export async function simulateMoneyAdjustment(userId = "usr_001"): Promise<void> {
  const { transactionsService } = await import("@/services/transactions");
  const { walletService } = await import("@/services/wallet");
  const key = `dev_adj_${userId}_${Math.floor(Date.now() / 1000)}`;
  const txn = await transactionsService.createAdjustment({
    userId,
    amountPaise: 100,
    direction: "CREDIT",
    reason: "DEV simulator mock credit",
    adminId: "adm_dev",
    adminName: "Dev Simulator",
    idempotencyKey: key,
  });
  const wallet = await walletService.getWalletByUserId(userId);
  const timestamp = new Date().toISOString();
  emitMoneyBus(
    "money.transaction_created",
    {
      transactionId: txn.id,
      userId: txn.userId,
      walletId: txn.walletId,
      amountPaise: txn.amountPaise,
      type: txn.type,
      direction: txn.direction,
      status: txn.status,
      timestamp,
      referenceType: txn.referenceType,
      referenceId: txn.referenceId,
    } satisfies MoneyTransactionPayload,
    "txn",
  );
  if (wallet) {
    emitMoneyBus(
      "money.wallet_updated",
      {
        walletId: wallet.id,
        userId: wallet.userId,
        availableBalancePaise: wallet.availableBalancePaise,
        heldBalancePaise: wallet.heldBalancePaise,
        status: wallet.status,
        timestamp,
      } satisfies MoneyWalletPayload,
      "wal",
    );
  }
}

export function emitMoneyTransactionCreated(payload: MoneyTransactionPayload): void {
  emitMoneyBus("money.transaction_created", payload, "txn");
}

export function emitMoneyRefundUpdated(payload: MoneyRefundPayload): void {
  emitMoneyBus("money.refund_updated", payload, "refund");
}

export function emitGrowthCouponUpdated(payload: GrowthCouponPayload): void {
  emitMoneyBus("growth.coupon_updated", payload, "cpn");
}

export function emitGrowthReferralUpdated(payload: GrowthReferralPayload): void {
  emitMoneyBus("growth.referral_updated", payload, "refc");
}

export function emitSafetyIncidentUpdated(payload: SafetyIncidentPayload): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  bus.emit({
    id: `rt_inc_${payload.incidentId}_${Date.now()}`,
    type: "safety.incident_updated",
    timestamp: payload.timestamp,
    payload,
  });
}

export function emitAdminRealtime(
  type:
    | "admin.role_updated"
    | "admin.permission_updated"
    | "admin.status_changed"
    | "settings.updated"
    | "audit.created",
  payload: Record<string, unknown>,
): void {
  const bus = getMockRealtimeService();
  if (!bus.isConnected()) bus.connect();
  const timestamp =
    typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString();
  const idHint =
    (typeof payload.adminId === "string" && payload.adminId) ||
    (typeof payload.roleId === "string" && payload.roleId) ||
    (typeof payload.group === "string" && payload.group) ||
    (typeof payload.targetId === "string" && payload.targetId) ||
    "admin";
  bus.emit({
    id: `rt_${type}_${idHint}_${Date.now()}`,
    type,
    timestamp,
    payload,
  });
}
