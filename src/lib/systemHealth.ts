import type {
  OverallSystemStatus,
  ServiceHealthDetail,
  ServiceHealthStatus,
  SystemHealthCounts,
} from "@/types/systemHealth";

export function deriveOverallStatus(
  services: Pick<ServiceHealthDetail, "status">[],
): OverallSystemStatus {
  if (services.some((s) => s.status === "down")) return "critical";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "all_operational";
}

export function countByStatus(
  services: Pick<ServiceHealthDetail, "status">[],
): SystemHealthCounts {
  return services.reduce<SystemHealthCounts>(
    (acc, service) => {
      if (service.status === "operational") acc.operational += 1;
      else if (service.status === "degraded") acc.degraded += 1;
      else if (service.status === "down") acc.down += 1;
      else acc.notConfigured += 1;
      return acc;
    },
    { operational: 0, degraded: 0, down: 0, notConfigured: 0 },
  );
}

export function formatServiceStatus(status: ServiceHealthStatus): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    case "not_configured":
      return "Not Configured";
    default:
      return status;
  }
}

export function overallStatusLabel(status: OverallSystemStatus): string {
  switch (status) {
    case "all_operational":
      return "All Systems Operational";
    case "degraded":
      return "Some Services Degraded";
    case "critical":
      return "Service Outage";
    default:
      return status;
  }
}

export function formatCategory(category: string): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
