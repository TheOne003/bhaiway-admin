import { MOCK_DRIVER_PROFILES } from "@/mock/drivers";
import { MOCK_USERS, isDriverUser } from "@/mock/users";
import type { DriverFilters, DriverListItem, DriverProfile } from "@/types/driver";
import type { AccountStatus } from "@/types/user";
import { usersService } from "@/services/users";

let profiles: DriverProfile[] = structuredClone(MOCK_DRIVER_PROFILES);
let forceError = false;

export function __resetDriversForTests(): void {
  profiles = structuredClone(MOCK_DRIVER_PROFILES);
  forceError = false;
}

export function __setDriversErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function toDriverListItem(
  profile: DriverProfile,
  name: string,
  phoneMasked: string,
): DriverListItem {
  return {
    driverId: profile.driverId,
    userId: profile.userId,
    name,
    phoneMasked,
    status: profile.status,
    rating: profile.rating,
    totalRides: profile.totalRides,
    cancellationRate: profile.cancellationRate,
    governmentIdStatus: profile.governmentIdStatus,
    licenceStatus: profile.licenceStatus,
    rcStatus: profile.vehicle?.rcStatus ?? "NOT_STARTED",
    vehicleRegistrationMasked: profile.vehicle?.registrationMasked ?? null,
  };
}

export function filterDrivers(
  items: DriverListItem[],
  filters: DriverFilters = {},
): DriverListItem[] {
  const status = filters.status ?? "ALL";
  const verification = filters.verification ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return items.filter((item) => {
    if (status !== "ALL" && item.status !== status) return false;
    if (verification !== "ALL") {
      const statuses = [item.governmentIdStatus, item.licenceStatus, item.rcStatus];
      if (verification === "APPROVED" && !statuses.every((s) => s === "APPROVED" || s === "NOT_REQUIRED")) {
        return false;
      }
      if (verification === "PENDING" && !statuses.some((s) => s === "PENDING" || s === "MANUAL_REVIEW")) {
        return false;
      }
      if (verification === "FAILED" && !statuses.some((s) => s === "FAILED")) {
        return false;
      }
    }
    if (search) {
      const hay = [
        item.name,
        item.driverId,
        item.userId,
        item.phoneMasked,
        item.vehicleRegistrationMasked ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function syncDriverStatusForUser(userId: string, status: AccountStatus): void {
  const profile = profiles.find((p) => p.userId === userId);
  if (!profile) return;
  profile.status = status;
  profile.updatedAt = new Date().toISOString();
}

export const driversService = {
  async getDrivers(filters: DriverFilters = {}): Promise<DriverListItem[]> {
    if (forceError) throw new Error("Unable to load drivers.");
    const users = await usersService.getUsers();
    const items = profiles
      .map((profile) => {
        const user = users.find((u) => u.id === profile.userId) ?? MOCK_USERS.find((u) => u.id === profile.userId);
        if (!user || !isDriverUser(user)) return null;
        return toDriverListItem(profile, user.name, user.phoneMasked);
      })
      .filter(Boolean) as DriverListItem[];
    return structuredClone(filterDrivers(items, filters));
  },

  async getDriverById(driverId: string): Promise<(DriverProfile & { name: string; phoneMasked: string; email: string; gender: string; joinedAt: string; lastActiveAt: string }) | null> {
    if (forceError) throw new Error("Unable to load drivers.");
    const profile = profiles.find((p) => p.driverId === driverId || p.userId === driverId);
    if (!profile) return null;
    const user = await usersService.getUserById(profile.userId);
    if (!user) return null;
    return structuredClone({
      ...profile,
      name: user.name,
      phoneMasked: user.phoneMasked,
      email: user.email,
      gender: user.gender,
      joinedAt: user.joinedAt,
      lastActiveAt: user.lastActiveAt,
    });
  },

  async getDriverByUserId(userId: string): Promise<DriverProfile | null> {
    return structuredClone(profiles.find((p) => p.userId === userId) ?? null);
  },

  async updateDriverStatus(driverId: string, status: AccountStatus): Promise<DriverProfile | null> {
    const profile = profiles.find((p) => p.driverId === driverId || p.userId === driverId);
    if (!profile) return null;
    profile.status = status;
    profile.updatedAt = new Date().toISOString();
    const existing = await usersService.getUserById(profile.userId);
    if (existing && existing.status !== status) {
      await usersService.updateUserStatus(profile.userId, status);
    }
    return structuredClone(profile);
  },

  async syncVerificationFromRecords(
    userId: string,
    patch: Partial<
      Pick<DriverProfile, "governmentIdStatus" | "licenceStatus" | "corporateStatus">
    > & { rcStatus?: DriverProfile["vehicle"] extends null ? never : NonNullable<DriverProfile["vehicle"]>["rcStatus"]; insuranceStatus?: NonNullable<DriverProfile["vehicle"]>["insuranceStatus"] },
  ): Promise<void> {
    const profile = profiles.find((p) => p.userId === userId);
    if (!profile) return;
    if (patch.governmentIdStatus) profile.governmentIdStatus = patch.governmentIdStatus;
    if (patch.licenceStatus) profile.licenceStatus = patch.licenceStatus;
    if (patch.corporateStatus) profile.corporateStatus = patch.corporateStatus;
    if (profile.vehicle) {
      if (patch.rcStatus) profile.vehicle.rcStatus = patch.rcStatus;
      if (patch.insuranceStatus) profile.vehicle.insuranceStatus = patch.insuranceStatus;
    }
    profile.updatedAt = new Date().toISOString();
  },
};
