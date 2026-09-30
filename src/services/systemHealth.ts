import {
  MOCK_SYSTEM_HEALTH,
  MOCK_SERVICES,
  buildSystemHealthSummary,
} from "@/mock/systemHealth";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import { countByStatus, deriveOverallStatus } from "@/lib/systemHealth";
import type {
  ServiceHealthDetail,
  ServiceHealthStatus,
  SystemHealthSummary,
} from "@/types/systemHealth";

export type { ServiceHealthDetail as ServiceHealth };

export interface SystemHealthService {
  getSystemHealth(): Promise<SystemHealthSummary>;
  getServiceHealth(serviceId: string): Promise<ServiceHealthDetail | null>;
  updateServiceStatus(
    serviceId: string,
    newStatus: ServiceHealthStatus,
    options?: {
      httpStatus?: number | null;
      errorMessage?: string | null;
      timestamp?: string;
    },
  ): Promise<ServiceHealthDetail | null>;
}

const healthStore = createSessionMockStore<SystemHealthSummary>(
  "system_health",
  () => structuredClone(MOCK_SYSTEM_HEALTH),
);
let forceError = false;

function healthState(): SystemHealthSummary {
  return healthStore.get();
}

function commitHealth(next: SystemHealthSummary): void {
  healthStore.set(next);
}

export function __resetSystemHealthForTests(): void {
  healthStore.reset();
  commitHealth(buildSystemHealthSummary(structuredClone(MOCK_SERVICES)));
  forceError = false;
}

export function __setSystemHealthForTests(next: SystemHealthSummary): void {
  commitHealth(structuredClone(next));
}

export function __setSystemHealthErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

function recompute(checkedAt = new Date().toISOString()): void {
  const healthSnapshot = healthState();
  const counts = countByStatus(healthSnapshot.services);
  commitHealth({
    ...healthSnapshot,
    counts,
    operationalCount: counts.operational,
    degradedCount: counts.degraded,
    downCount: counts.down,
    overall: deriveOverallStatus(healthSnapshot.services),
    checkedAt,
  });
}

export const systemHealthService: SystemHealthService = {
  async getSystemHealth(): Promise<SystemHealthSummary> {
    if (forceError) {
      throw new Error("Unable to load service health.");
    }
    return {
      ...structuredClone(healthState()),
      checkedAt: new Date().toISOString(),
    };
  },

  async getServiceHealth(serviceId: string): Promise<ServiceHealthDetail | null> {
    if (forceError) {
      throw new Error("Unable to load service health.");
    }
    return structuredClone(
      healthState().services.find((service) => service.id === serviceId) ?? null,
    );
  },

  async updateServiceStatus(serviceId, newStatus, options = {}) {
    const healthSnapshot = healthState();
    const index = healthSnapshot.services.findIndex((s) => s.id === serviceId);
    if (index < 0) return null;

    const timestamp = options.timestamp ?? new Date().toISOString();
    const current = healthSnapshot.services[index];
    const next: ServiceHealthDetail = {
      ...current,
      status: newStatus,
      lastCheckedAt: timestamp,
      httpStatus:
        options.httpStatus !== undefined
          ? options.httpStatus
          : newStatus === "down"
            ? 503
            : newStatus === "operational"
              ? 200
              : current.httpStatus,
      errorMessage:
        options.errorMessage !== undefined
          ? options.errorMessage
          : newStatus === "operational"
            ? null
            : current.errorMessage,
      incidentStartedAt:
        newStatus === "operational"
          ? null
          : current.incidentStartedAt ?? timestamp,
      lastFailureAt:
        newStatus === "down" || newStatus === "degraded"
          ? timestamp
          : current.lastFailureAt,
      lastSuccessAt:
        newStatus === "operational" ? timestamp : current.lastSuccessAt,
      responseTimeMs:
        newStatus === "down" || newStatus === "not_configured"
          ? null
          : current.responseTimeMs ?? 120,
      errorRate:
        newStatus === "down"
          ? Math.max(current.errorRate, 50)
          : newStatus === "degraded"
            ? Math.max(current.errorRate, 5)
            : Math.min(current.errorRate, 1),
    };

    healthSnapshot.services[index] = next;
    commitHealth(healthSnapshot);
    recompute(timestamp);
    return structuredClone(next);
  },
};

export { deriveOverallStatus, countByStatus } from "@/lib/systemHealth";
