import { MOCK_RIDES } from "@/mock/rides";
import {
  advanceRouteProgress,
  buildLocationFromProgress,
} from "@/lib/rideGeo";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import type {
  Ride,
  RideFilters,
  RideLifecycleStatus,
  RideSummary,
} from "@/types/ride";
import { isLiveOnMap, toRideSummary } from "@/types/ride";

export interface RidesService {
  getRides(filters?: RideFilters): Promise<Ride[]>;
  getRideById(id: string): Promise<Ride | null>;
  getActiveRides(): Promise<Ride[]>;
  getRidesByNetwork(networkType: Ride["networkType"]): Promise<Ride[]>;
  getRidesByStatus(status: RideLifecycleStatus): Promise<Ride[]>;
  getRideSummaries(filters?: RideFilters): Promise<RideSummary[]>;
  updateRideLocation(
    rideId: string,
    progress: number,
    timestamp?: string,
  ): Promise<Ride | null>;
  updateRideStatus(
    rideId: string,
    status: RideLifecycleStatus,
    timestamp?: string,
  ): Promise<Ride | null>;
  updateRideSafety(
    rideId: string,
    safetyStatus: import("@/types/ride").SafetyStatus,
  ): Promise<Ride | null>;
  advanceRideAlongRoute(rideId: string, step?: number): Promise<Ride | null>;
}

const ridesStore = createSessionMockStore<Ride[]>("rides", () => structuredClone(MOCK_RIDES));
let forceError = false;

function ridesState(): Ride[] {
  return ridesStore.get();
}

function commitRides(next: Ride[]): void {
  ridesStore.set(next);
}

export function __resetRidesForTests(): void {
  ridesStore.reset();
  forceError = false;
}

export function __setRidesErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterRides(list: Ride[], filters: RideFilters = {}): Ride[] {
  const network = filters.networkType ?? "ALL";
  const status = filters.status ?? "ALL";
  const safety = filters.safetyStatus ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return list.filter((ride) => {
    if (filters.activeOnly && !isLiveOnMap(ride)) return false;
    if (network !== "ALL" && ride.networkType !== network) return false;
    if (status !== "ALL" && ride.status !== status) return false;
    if (safety === "attention") {
      if (ride.safetyStatus === "safe") return false;
    } else if (safety !== "ALL" && ride.safetyStatus !== safety) {
      return false;
    }
    if (search) {
      const haystack = [
        ride.id,
        ride.driver.name,
        ride.route.origin.name,
        ride.route.destination.name,
        ride.vehicle.registration,
        ride.city,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function mapRideStatusLabel(status: RideLifecycleStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ridesService: RidesService = {
  async getRides(filters = {}) {
    if (forceError) throw new Error("Unable to load rides.");
    return structuredClone(filterRides(ridesState(), filters));
  },

  async getRideById(id) {
    if (forceError) throw new Error("Unable to load rides.");
    return structuredClone(ridesState().find((r) => r.id === id) ?? null);
  },

  async getActiveRides() {
    return this.getRides({ activeOnly: true });
  },

  async getRidesByNetwork(networkType) {
    return this.getRides({ networkType });
  },

  async getRidesByStatus(status) {
    return this.getRides({ status });
  },

  async getRideSummaries(filters = {}) {
    const list = await this.getRides(filters);
    return list.map(toRideSummary);
  },

  async updateRideLocation(rideId, progress, timestamp = new Date().toISOString()) {
    const rides = ridesState();
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) return null;
    const clamped = Math.min(1, Math.max(0, progress));
    ride.routeProgress = clamped;
    ride.currentLocation = buildLocationFromProgress(
      ride.route.coordinates,
      clamped,
      timestamp,
      ride.currentLocation?.label,
    );
    if (ride.etaMinutes != null && ride.etaMinutes > 0) {
      ride.etaMinutes = Math.max(0, ride.etaMinutes - 2);
    }
    ride.updatedAt = timestamp;
    commitRides(rides);
    return structuredClone(ride);
  },

  async updateRideStatus(rideId, status, timestamp = new Date().toISOString()) {
    const rides = ridesState();
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) return null;
    ride.status = status;
    ride.updatedAt = timestamp;
    if (status === "cancelled" || status === "completed" || status === "expired") {
      ride.etaMinutes = status === "completed" ? 0 : null;
    }
    if (status === "delayed" && ride.etaMinutes != null) {
      ride.etaMinutes += 15;
    }
    commitRides(rides);
    return structuredClone(ride);
  },

  async updateRideSafety(rideId: string, safetyStatus: import("@/types/ride").SafetyStatus) {
    const rides = ridesState();
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) return null;
    ride.safetyStatus = safetyStatus;
    ride.updatedAt = new Date().toISOString();
    commitRides(rides);
    return structuredClone(ride);
  },

  async advanceRideAlongRoute(rideId, step = 0.05) {
    const ride = ridesState().find((r) => r.id === rideId);
    if (!ride || !isLiveOnMap(ride)) return null;
    const next = advanceRouteProgress(ride.routeProgress, step);
    return this.updateRideLocation(rideId, next);
  },
};
