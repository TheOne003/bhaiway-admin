export type ServiceHealthStatus =
  | "operational"
  | "degraded"
  | "down"
  | "not_configured";

export type OverallSystemStatus =
  | "all_operational"
  | "degraded"
  | "critical";

export type ServiceCategory =
  | "core"
  | "verification"
  | "messaging"
  | "payments"
  | "maps"
  | "mobility"
  | "growth"
  | "risk";

export interface ServiceHealthDetail {
  id: string;
  name: string;
  provider: string;
  category: ServiceCategory;
  status: ServiceHealthStatus;
  responseTimeMs: number | null;
  errorRate: number;
  requestCount: number;
  failedRequestCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastCheckedAt: string;
  uptimePercent: number;
  affectedFunctionality: string[];
  httpStatus: number | null;
  incidentStartedAt: string | null;
  errorMessage: string | null;
}

/** @deprecated Prefer ServiceHealthDetail */
export type ServiceHealth = ServiceHealthDetail;

export interface SystemHealthCounts {
  operational: number;
  degraded: number;
  down: number;
  notConfigured: number;
}

export interface SystemHealthSummary {
  overall: OverallSystemStatus;
  counts: SystemHealthCounts;
  /** @deprecated use counts.operational */
  operationalCount: number;
  /** @deprecated use counts.degraded */
  degradedCount: number;
  /** @deprecated use counts.down */
  downCount: number;
  services: ServiceHealthDetail[];
  checkedAt: string;
}
