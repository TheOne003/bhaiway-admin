export type InfraStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED";

export interface InfrastructureComponent {
  id: string;
  name: string;
  status: InfraStatus;
  /** Mock uptime percentage 0–100 */
  uptimePercent: number | null;
  lastCheckedAt: string;
  dependency: string;
  recentIssue: string | null;
  mock: true;
}
