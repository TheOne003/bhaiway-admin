import type { ActiveNowMetrics, OpsTimelineEvent } from "@/types/dashboard";

export const MOCK_ACTIVE_NOW: ActiveNowMetrics = {
  activeRides: 142,
  activeDrivers: 118,
  activePassengers: 327,
  updatedAt: "2026-09-20T00:00:00.000Z",
};

export const MOCK_TIMELINE: OpsTimelineEvent[] = [
  {
    id: "evt_pay_recovered",
    kind: "health_recovered",
    title: "Payment service recovered",
    timestamp: "2026-09-19T20:47:00.000Z",
    href: "/system-health?service=svc_payment",
  },
  {
    id: "evt_alert_hp",
    kind: "alert_created",
    title: "New high-priority alert",
    timestamp: "2026-09-19T20:15:00.000Z",
    href: "/alerts",
  },
  {
    id: "evt_push_check",
    kind: "notification_checked",
    title: "Notification service checked",
    timestamp: "2026-09-19T20:12:00.000Z",
    href: "/system-health?service=svc_push",
  },
  {
    id: "evt_ride",
    kind: "ride_event",
    title: "Ride event received",
    timestamp: "2026-09-19T20:09:00.000Z",
  },
];
