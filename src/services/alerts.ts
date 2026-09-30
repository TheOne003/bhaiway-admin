import { MOCK_ALERTS } from "@/mock/alerts";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import type { AlertFilter, AlertPriority, AlertStatus, OpsAlert } from "@/types/alert";

export interface AlertsService {
  getAlerts(): Promise<OpsAlert[]>;
  getAlertById(id: string): Promise<OpsAlert | null>;
  filterAlerts(alerts: OpsAlert[], filter: AlertFilter): OpsAlert[];
  acknowledge(id: string): Promise<OpsAlert | null>;
  resolve(id: string): Promise<OpsAlert | null>;
  createAlert(input: Omit<OpsAlert, "id" | "createdAt" | "updatedAt" | "read" | "status"> & {
    id?: string;
    status?: AlertStatus;
    read?: boolean;
    createdAt?: string;
  }): Promise<OpsAlert>;
}

const alertsStore = createSessionMockStore<OpsAlert[]>("alerts", () => structuredClone(MOCK_ALERTS));
let forceError = false;

function alertsState(): OpsAlert[] {
  return alertsStore.get();
}

function commitAlerts(next: OpsAlert[]): void {
  alertsStore.set(next);
}

export function __resetAlertsForTests(): void {
  alertsStore.reset();
  forceError = false;
}

export function __setAlertsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function mapPriorityLabel(priority: AlertPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function filterAlerts(list: OpsAlert[], filter: AlertFilter): OpsAlert[] {
  switch (filter) {
    case "critical":
    case "warning":
    case "info":
      return list.filter((a) => a.priority === filter);
    case "unread":
      return list.filter((a) => !a.read);
    case "resolved":
      return list.filter((a) => a.status === "resolved");
    default:
      return list;
  }
}

export const alertsService: AlertsService = {
  async getAlerts() {
    if (forceError) throw new Error("Unable to load alerts.");
    return structuredClone(alertsState()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getAlertById(id) {
    return structuredClone(alertsState().find((a) => a.id === id) ?? null);
  },

  filterAlerts,

  async acknowledge(id) {
    const alerts = alertsState();
    const alert = alerts.find((a) => a.id === id);
    if (!alert || alert.status === "resolved") return null;
    alert.status = "acknowledged";
    alert.read = true;
    alert.updatedAt = new Date().toISOString();
    commitAlerts(alerts);
    return structuredClone(alert);
  },

  async resolve(id) {
    const alerts = alertsState();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return null;
    alert.status = "resolved";
    alert.read = true;
    alert.updatedAt = new Date().toISOString();
    commitAlerts(alerts);
    return structuredClone(alert);
  },

  async createAlert(input) {
    const now = input.createdAt ?? new Date().toISOString();
    const alert: OpsAlert = {
      id: input.id ?? `alert_${Date.now()}`,
      priority: input.priority,
      title: input.title,
      description: input.description,
      source: input.source,
      status: input.status ?? "open",
      createdAt: now,
      updatedAt: now,
      read: input.read ?? false,
      href: input.href,
      relatedServiceId: input.relatedServiceId,
    };
    const alerts = alertsState();
    commitAlerts([alert, ...alerts.filter((a) => a.id !== alert.id)]);
    return structuredClone(alert);
  },
};
