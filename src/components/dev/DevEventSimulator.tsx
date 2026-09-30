"use client";

import { useState } from "react";
import {
  emitUserStatusChange,
  emitVerificationStatusChange,
  simulateRideDelayed,
  simulateRideEtaUpdate,
  simulateRideMove,
  simulateServiceDegraded,
  simulateServiceDown,
  simulateServiceRecovered,
  simulateMoneyAdjustment,
  simulateSosTriggered,
  simulateVerificationApprove,
} from "@/services/realtimeBridge";
import { getMockRealtimeService } from "@/services/realtime";
import { alertsService } from "@/services/alerts";
import { notificationsService } from "@/services/notifications";
import { supportService } from "@/services/support";
import { verificationService } from "@/services/verification";

/**
 * DEV ONLY — hidden from production builds.
 * Placed bottom-right so it never covers the left sidebar navigation.
 */
export function DevEventSimulator() {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  function ensureBus() {
    const bus = getMockRealtimeService();
    if (!bus.isConnected()) bus.connect();
    return bus;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2"
      data-testid="dev-event-simulator"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto rounded-md border border-dashed border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--bw-warning)] shadow-sm"
      >
        {open ? "Close DEV" : "DEV Events"}
      </button>
      {open ? (
        <div className="pointer-events-auto max-h-[min(70vh,28rem)] w-56 overflow-y-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-2 shadow-lg">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--bw-warning)]">
            Dev only · uses RealtimeService
          </p>
          <div className="flex flex-col gap-1">
            <SimButton
              label="Service Down (Payment)"
              onClick={() => {
                ensureBus();
                simulateServiceDown("svc_payment");
              }}
              testId="dev-service-down"
            />
            <SimButton
              label="Service Degraded (SMS)"
              onClick={() => {
                ensureBus();
                simulateServiceDegraded("svc_sms");
              }}
              testId="dev-service-degraded"
            />
            <SimButton
              label="Service Recovered (RC)"
              onClick={() => {
                ensureBus();
                simulateServiceRecovered("svc_rc");
              }}
              testId="dev-service-recovered"
            />
            <SimButton
              label="New Critical Alert"
              onClick={() => {
                const bus = ensureBus();
                const timestamp = new Date().toISOString();
                void (async () => {
                  const alert = await alertsService.createAlert({
                    priority: "critical",
                    title: "Simulated critical alert",
                    description: "Created by DEV event simulator.",
                    source: "operations",
                    href: "/alerts",
                    createdAt: timestamp,
                  });
                  await notificationsService.createNotification({
                    category: "critical",
                    title: alert.title,
                    description: "Operations · Simulated",
                    href: "/alerts",
                    relatedAlertId: alert.id,
                    createdAt: timestamp,
                  });
                  bus.emit({
                    id: `rt_alert_${Date.now()}`,
                    type: "alert.created",
                    timestamp,
                    payload: { alertId: alert.id },
                  });
                })();
              }}
              testId="dev-critical-alert"
            />
            <SimButton
              label="New Warning Alert"
              onClick={() => {
                const bus = ensureBus();
                const timestamp = new Date().toISOString();
                void (async () => {
                  const alert = await alertsService.createAlert({
                    priority: "warning",
                    title: "Simulated warning alert",
                    description: "Created by DEV event simulator.",
                    source: "operations",
                    href: "/alerts",
                    createdAt: timestamp,
                  });
                  await notificationsService.createNotification({
                    category: "operations",
                    title: alert.title,
                    description: "Operations · Simulated",
                    href: "/alerts",
                    relatedAlertId: alert.id,
                    createdAt: timestamp,
                  });
                  bus.emit({
                    id: `rt_warn_${Date.now()}`,
                    type: "alert.created",
                    timestamp,
                    payload: { alertId: alert.id },
                  });
                })();
              }}
              testId="dev-warning-alert"
            />
            <SimButton
              label="Move ride BW10291"
              onClick={() => {
                ensureBus();
                void simulateRideMove("BW10291");
              }}
              testId="dev-ride-move"
            />
            <SimButton
              label="Delay ride BW10291"
              onClick={() => {
                ensureBus();
                void simulateRideDelayed("BW10291");
              }}
              testId="dev-ride-delay"
            />
            <SimButton
              label="ETA update BW10291"
              onClick={() => {
                ensureBus();
                void simulateRideEtaUpdate("BW10291");
              }}
              testId="dev-ride-eta"
            />
            <SimButton
              label="Approve ver_gov_004"
              onClick={() => {
                ensureBus();
                void simulateVerificationApprove("ver_gov_004");
              }}
              testId="dev-verification-approve"
            />
            <SimButton
              label="New verification event"
              onClick={() => {
                ensureBus();
                void (async () => {
                  const pending = await verificationService.getVerifications({
                    type: "CORPORATE",
                    status: "PENDING",
                  });
                  const sample = pending[0];
                  const timestamp = new Date().toISOString();
                  const bus = getMockRealtimeService();
                  bus.emit({
                    id: `rt_ver_created_${Date.now()}`,
                    type: "verification.created",
                    timestamp,
                    payload: {
                      verificationId: sample?.id ?? "ver_corp_002",
                      userId: sample?.userId ?? "usr_002",
                      type: "CORPORATE",
                      previousStatus: "PENDING",
                      newStatus: "PENDING",
                      timestamp,
                    },
                  });
                  if (sample) {
                    emitVerificationStatusChange({
                      verificationId: sample.id,
                      userId: sample.userId,
                      type: sample.type,
                      previousStatus: sample.status,
                      newStatus: sample.status,
                      timestamp,
                    });
                  }
                })();
              }}
              testId="dev-verification-created"
            />
            <SimButton
              label="Suspend usr_010"
              onClick={() => {
                ensureBus();
                emitUserStatusChange({
                  userId: "usr_010",
                  previousStatus: "ACTIVE",
                  newStatus: "SUSPENDED",
                  timestamp: new Date().toISOString(),
                });
              }}
              testId="dev-user-suspend"
            />
            <SimButton
              label="Trigger SOS (BW10294)"
              onClick={() => {
                ensureBus();
                void simulateSosTriggered("BW10294");
              }}
              testId="dev-sos-trigger"
            />
            <SimButton
              label="Mock money credit"
              onClick={() => {
                ensureBus();
                void simulateMoneyAdjustment("usr_001");
              }}
              testId="dev-money-adjust"
            />
            <SimButton
              label="Support admin reply"
              onClick={() => {
                ensureBus();
                void supportService.addMessage({
                  ticketId: "tkt_002",
                  senderType: "ADMIN",
                  senderId: "adm_001",
                  body: "DEV simulator: we are reviewing your refund.",
                  internal: false,
                  actorName: "Dev Simulator",
                });
              }}
              testId="dev-support-message"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SimButton({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="rounded px-2 py-1.5 text-left text-xs text-[var(--bw-text-secondary)] hover:bg-[var(--bw-elevated)] hover:text-[var(--bw-text-primary)]"
    >
      {label}
    </button>
  );
}
