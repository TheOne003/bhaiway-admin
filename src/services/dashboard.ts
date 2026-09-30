import { MOCK_ACTIVE_NOW, MOCK_TIMELINE } from "@/mock/dashboard";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import { alertsService } from "@/services/alerts";
import { systemHealthService } from "@/services/systemHealth";
import type {
  ActiveNowMetrics,
  AttentionItem,
  DashboardSnapshot,
  OpsTimelineEvent,
} from "@/types/dashboard";
import type { OpsAlert } from "@/types/alert";
import type { SystemHealthSummary } from "@/types/systemHealth";

const activeNowStore = createSessionMockStore<ActiveNowMetrics>(
  "dashboard_active",
  () => structuredClone(MOCK_ACTIVE_NOW),
);
const timelineStore = createSessionMockStore<OpsTimelineEvent[]>(
  "dashboard_timeline",
  () => structuredClone(MOCK_TIMELINE),
);
let forceError = false;

export function __resetDashboardForTests(): void {
  activeNowStore.reset();
  timelineStore.reset();
  forceError = false;
}

export function __setDashboardErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function buildNeedsAttention(
  alerts: OpsAlert[],
  health: SystemHealthSummary,
): AttentionItem[] {
  const fromAlerts = alerts
    .filter((a) => a.status !== "resolved" && (a.priority === "critical" || a.priority === "warning"))
    .map<AttentionItem>((a) => ({
      id: `attn_${a.id}`,
      priority: a.priority,
      title: a.title,
      description: a.description,
      source: a.source,
      timestamp: a.createdAt,
      href: a.href ?? "/alerts",
      actionLabel: a.relatedServiceId ? "View System Health" : "Open Alert",
    }));

  const fromHealth = health.services
    .filter((s) => s.status === "down" || s.status === "degraded")
    .map<AttentionItem>((s) => ({
      id: `attn_svc_${s.id}`,
      priority: s.status === "down" ? "critical" : "warning",
      title: `${s.name} ${s.status === "down" ? "unavailable" : "degraded"}`,
      description:
        s.affectedFunctionality[0]
          ? `${s.affectedFunctionality[0]} may be affected.`
          : s.errorMessage ?? "Service requires attention.",
      source: "system_health",
      timestamp: s.lastCheckedAt,
      href: `/system-health?service=${s.id}`,
      actionLabel: "View System Health",
    }));

  const merged = [...fromAlerts, ...fromHealth];
  const seen = new Set<string>();
  return merged
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      if (rank[a.priority] !== rank[b.priority]) {
        return rank[a.priority] - rank[b.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

export async function pushTimelineEvent(
  event: Omit<OpsTimelineEvent, "id"> & { id?: string },
): Promise<OpsTimelineEvent> {
  const next: OpsTimelineEvent = {
    id: event.id ?? `evt_${Date.now()}`,
    kind: event.kind,
    title: event.title,
    timestamp: event.timestamp,
    href: event.href,
  };
  const timeline = timelineStore.get();
  timelineStore.set([next, ...timeline].slice(0, 20));
  return next;
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardSnapshot> {
    if (forceError) throw new Error("Unable to load dashboard.");
    const [alerts, health] = await Promise.all([
      alertsService.getAlerts(),
      systemHealthService.getSystemHealth(),
    ]);
    const activeNow = activeNowStore.get();
    return {
      activeNow: {
        ...activeNow,
        updatedAt: new Date().toISOString(),
      },
      needsAttention: buildNeedsAttention(alerts, health),
      recentEvents: structuredClone(timelineStore.get()).slice(0, 8),
    };
  },

  async getActiveNow(): Promise<ActiveNowMetrics> {
    const activeNow = activeNowStore.get();
    return { ...activeNow, updatedAt: new Date().toISOString() };
  },
};
