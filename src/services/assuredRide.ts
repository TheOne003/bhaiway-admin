import {
  MOCK_ASSURED_RIDES,
  toCancellationCases,
  toCompensationCases,
} from "@/mock/assuredRides";
import {
  buildCompensationFromCase,
  calculateCompensationPoolPaise,
  calculateForfeiturePaise,
  calculatePassengerCompensation,
  calculateSecurityAmountPaise,
  formatInrFromPaise,
  toPaise,
} from "@/lib/assuredRideMath";
import type {
  AssuredRideCase,
  AssuredRideFilters,
  CancellationCase,
  CompensationCase,
} from "@/types/assuredRide";
import type { RiskCase } from "@/types/risk";

let cases: AssuredRideCase[] = structuredClone(MOCK_ASSURED_RIDES);
let forceError = false;

export function __resetAssuredRideForTests(): void {
  cases = structuredClone(MOCK_ASSURED_RIDES);
  forceError = false;
}

export function __setAssuredRideErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterAssuredRides(
  list: AssuredRideCase[],
  filters: AssuredRideFilters = {},
): AssuredRideCase[] {
  const status = filters.status ?? "ALL";
  const network = filters.networkType ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";
  return list.filter((item) => {
    if (status !== "ALL" && item.status !== status) return false;
    if (network !== "ALL" && item.networkType !== network) return false;
    if (filters.hasCancellation && item.cancellingParty === "NONE") return false;
    if (filters.hasRisk && !item.riskCaseId) return false;
    if (search) {
      const hay = [item.id, item.rideId, item.driverName, item.routeLabel].join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export const assuredRideService = {
  calculateSecurityAmount: calculateSecurityAmountPaise,
  calculateCompensationPool: calculateCompensationPoolPaise,
  calculateForfeiture: calculateForfeiturePaise,
  calculatePassengerCompensation,
  buildCompensationFromCase,
  toPaise,
  formatInrFromPaise,

  async getAssuredRides(filters: AssuredRideFilters = {}): Promise<AssuredRideCase[]> {
    if (forceError) throw new Error("Unable to load Assured Ride cases.");
    return structuredClone(filterAssuredRides(cases, filters)).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  async getAssuredRideById(id: string): Promise<AssuredRideCase | null> {
    if (forceError) throw new Error("Unable to load Assured Ride cases.");
    return structuredClone(
      cases.find((c) => c.id === id || c.rideId === id) ?? null,
    );
  },

  async getCancellationCases(): Promise<CancellationCase[]> {
    if (forceError) throw new Error("Unable to load cancellation cases.");
    return structuredClone(toCancellationCases(cases));
  },

  async getCompensationCases(): Promise<CompensationCase[]> {
    if (forceError) throw new Error("Unable to load compensation cases.");
    return structuredClone(toCompensationCases(cases));
  },

  async getCompensationCaseById(id: string): Promise<CompensationCase | null> {
    const all = await this.getCompensationCases();
    return all.find((c) => c.id === id || c.assuredRideId === id) ?? null;
  },

  async getRiskCases(): Promise<RiskCase[]> {
    const { riskService } = await import("@/services/risk");
    return riskService.getRiskCases();
  },

  async calculateCompensationPreview(assuredRideId: string) {
    const item = cases.find((c) => c.id === assuredRideId);
    if (!item) return null;
    return buildCompensationFromCase({
      cancellingParty: item.cancellingParty,
      passengers: item.passengers,
    });
  },
};
