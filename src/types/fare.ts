import type { RideNetwork } from "@/types/network";

export type FareConfigStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

/**
 * Operational fare configuration — aligned with existing mock fare usage
 * (INR integer paise, network-scoped, minimum fare from platform settings pattern).
 */
export interface FareConfiguration {
  id: string;
  name: string;
  network: RideNetwork;
  /** Base fare in paise */
  baseFarePaise: number;
  /** Per-km fare in paise */
  perKmPaise: number;
  /** Minimum charge in paise */
  minimumFarePaise: number;
  /** Cancellation fee in paise */
  cancellationFeePaise: number;
  status: FareConfigStatus;
  effectiveFrom: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FareFilters {
  network?: RideNetwork | "ALL";
  status?: FareConfigStatus | "ALL";
  search?: string;
}

export interface CreateFareInput {
  name: string;
  network: RideNetwork;
  baseFarePaise: number;
  perKmPaise: number;
  minimumFarePaise: number;
  cancellationFeePaise: number;
  effectiveFrom: string;
}
