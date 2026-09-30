import { MOCK_RISK_CASES } from "@/mock/assuredRides";
import type { RiskCase, RiskCaseStatus, RiskFilters } from "@/types/risk";

let cases: RiskCase[] = structuredClone(MOCK_RISK_CASES);
let forceError = false;

export function __resetRiskForTests(): void {
  cases = structuredClone(MOCK_RISK_CASES);
  forceError = false;
}

export function __setRiskErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

/** Deterministic mock rule engine — not ML. */
export function evaluateMockRiskScore(signals: { code: string }[]): number {
  let score = 20;
  for (const signal of signals) {
    if (signal.code === "REPEAT_CANCEL") score += 30;
    if (signal.code === "FAST_CANCEL") score += 15;
    if (signal.code === "COMP_PATTERN") score += 25;
    if (signal.code === "DRIVER_CANCEL_FORFEIT") score += 35;
    if (signal.code === "SHARED_ACTOR") score += 10;
  }
  return Math.min(100, score);
}

export function filterRiskCases(list: RiskCase[], filters: RiskFilters = {}): RiskCase[] {
  const severity = filters.severity ?? "ALL";
  const riskType = filters.riskType ?? "ALL";
  const status = filters.status ?? "ALL";
  const network = filters.networkType ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";
  return list.filter((item) => {
    if (severity !== "ALL" && item.severity !== severity) return false;
    if (riskType !== "ALL" && item.riskType !== riskType) return false;
    if (status !== "ALL" && item.status !== status) return false;
    if (network !== "ALL" && item.networkType !== network) return false;
    if (search) {
      const hay = [item.id, item.rideId, item.userId ?? "", item.driverId ?? "", item.reason]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function pushTimeline(record: RiskCase, label: string, actorId: string | null) {
  const timestamp = new Date().toISOString();
  record.timeline = [
    { id: `${record.id}_t_${record.timeline.length + 1}`, label, timestamp, actorId },
    ...record.timeline,
  ];
}

export const riskService = {
  evaluateMockRiskScore,

  async getRiskCases(filters: RiskFilters = {}): Promise<RiskCase[]> {
    if (forceError) throw new Error("Unable to load risk cases.");
    return structuredClone(filterRiskCases(cases, filters)).sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    );
  },

  async getRiskCaseById(id: string): Promise<RiskCase | null> {
    if (forceError) throw new Error("Unable to load risk cases.");
    return structuredClone(cases.find((c) => c.id === id) ?? null);
  },

  async reviewRiskCase(id: string, adminId = "adm_001"): Promise<RiskCase | null> {
    const record = cases.find((c) => c.id === id);
    if (!record) return null;
    record.status = "UNDER_REVIEW";
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = adminId;
    pushTimeline(record, "Case under review", adminId);
    return structuredClone(record);
  },

  async escalateRiskCase(id: string, adminId = "adm_001"): Promise<RiskCase | null> {
    const record = cases.find((c) => c.id === id);
    if (!record) return null;
    record.status = "ESCALATED";
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = adminId;
    pushTimeline(record, "Risk case escalated", adminId);
    return structuredClone(record);
  },

  async resolveRiskCase(
    id: string,
    resolution: string,
    status: Extract<RiskCaseStatus, "RESOLVED" | "FALSE_POSITIVE"> = "RESOLVED",
    adminId = "adm_001",
  ): Promise<RiskCase | null> {
    const record = cases.find((c) => c.id === id);
    if (!record) return null;
    record.status = status;
    record.resolution = resolution;
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = adminId;
    pushTimeline(record, `Resolved (${status})`, adminId);
    return structuredClone(record);
  },
};
