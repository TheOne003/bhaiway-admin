import { MOCK_DRIVER_PROFILES } from "@/mock/drivers";
import { MOCK_USERS } from "@/mock/users";
import { auditService } from "@/services/audit";
import { emitAdminRealtime } from "@/services/realtimeBridge";
import type {
  VehicleFilters,
  VehicleOperationalStatus,
  VehicleRecord,
} from "@/types/vehicle";

function seedVehicles(): VehicleRecord[] {
  const now = "2026-09-01T00:00:00.000Z";
  return MOCK_DRIVER_PROFILES.filter((p) => p.vehicle).map((p) => {
    const user = MOCK_USERS.find((u) => u.id === p.userId);
    const v = p.vehicle!;
    return {
      ...structuredClone(v),
      driverId: p.driverId,
      userId: p.userId,
      driverName: user?.name ?? p.driverId,
      operationalStatus: (p.status === "ACTIVE" ? "ACTIVE" : "INACTIVE") as VehicleOperationalStatus,
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    };
  });
}

let vehicles: VehicleRecord[] = seedVehicles();
let forceError = false;

export function __resetVehiclesForTests(): void {
  vehicles = seedVehicles();
  forceError = false;
}

export function __setVehiclesErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterVehicles(list: VehicleRecord[], filters: VehicleFilters = {}): VehicleRecord[] {
  return list.filter((v) => {
    if (filters.status && filters.status !== "ALL" && v.operationalStatus !== filters.status) {
      return false;
    }
    if (filters.rcStatus && filters.rcStatus !== "ALL" && v.rcStatus !== filters.rcStatus) {
      return false;
    }
    if (
      filters.insuranceStatus &&
      filters.insuranceStatus !== "ALL" &&
      v.insuranceStatus !== filters.insuranceStatus
    ) {
      return false;
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${v.vehicleId} ${v.registrationMasked} ${v.make} ${v.model} ${v.driverName} ${v.driverId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const vehiclesService = {
  async getVehicles(filters: VehicleFilters = {}): Promise<VehicleRecord[]> {
    if (forceError) throw new Error("Unable to load vehicles.");
    return structuredClone(filterVehicles(vehicles, filters));
  },

  async getVehicleById(vehicleId: string): Promise<VehicleRecord | null> {
    if (forceError) throw new Error("Unable to load vehicles.");
    return structuredClone(vehicles.find((v) => v.vehicleId === vehicleId) ?? null);
  },

  async getVehicleForDriver(userId: string): Promise<VehicleRecord | null> {
    return structuredClone(vehicles.find((v) => v.userId === userId) ?? null);
  },

  async setOperationalStatus(
    vehicleId: string,
    status: VehicleOperationalStatus,
    actor: { adminId: string; adminName: string },
    reason: string,
  ): Promise<VehicleRecord> {
    const current = vehicles.find((v) => v.vehicleId === vehicleId);
    if (!current) throw new Error("Vehicle not found.");
    const previous = current.operationalStatus;
    current.operationalStatus = status;
    current.updatedAt = new Date().toISOString();
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "vehicle.status_changed",
      targetType: "vehicle",
      targetId: vehicleId,
      oldValue: { status: previous },
      newValue: { status },
      reason,
    });
    emitAdminRealtime("admin.status_changed", {
      adminId: actor.adminId,
      previousStatus: previous,
      newStatus: status,
      timestamp: current.updatedAt,
      vehicleId,
    });
    return structuredClone(current);
  },
};
