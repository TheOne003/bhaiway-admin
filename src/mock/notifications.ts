import type { OpsNotification } from "@/types/notification";

export const MOCK_NOTIFICATIONS: OpsNotification[] = [
  {
    id: "notif_rc_down",
    category: "critical",
    title: "RC Verification API unavailable",
    description: "System · Vehicle verification may be affected",
    createdAt: "2026-09-19T23:58:00.000Z",
    read: false,
    href: "/system-health?service=svc_rc",
    relatedAlertId: "alert_rc_down",
    relatedServiceId: "svc_rc",
  },
  {
    id: "notif_sms",
    category: "system",
    title: "SMS delivery degraded",
    description: "System · Elevated latency detected",
    createdAt: "2026-09-19T23:40:00.000Z",
    read: false,
    href: "/system-health?service=svc_sms",
    relatedAlertId: "alert_sms_degraded",
    relatedServiceId: "svc_sms",
  },
  {
    id: "notif_ops",
    category: "operations",
    title: "Verification backlog rising",
    description: "Operations · Manual review queue elevated",
    createdAt: "2026-09-19T22:10:00.000Z",
    read: true,
    href: "/alerts",
    relatedAlertId: "alert_verify_backlog",
  },
];
