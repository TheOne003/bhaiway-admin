import type { VerificationSummaryStatus } from "@/types/user";
import type { DriverVehicleContext } from "@/types/driver";

export type VehicleOperationalStatus = "ACTIVE" | "RESTRICTED" | "INACTIVE";

export interface VehicleRecord extends DriverVehicleContext {
  driverId: string;
  userId: string;
  driverName: string;
  operationalStatus: VehicleOperationalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  status?: VehicleOperationalStatus | "ALL";
  rcStatus?: VerificationSummaryStatus | "ALL";
  insuranceStatus?: VerificationSummaryStatus | "ALL";
  search?: string;
}
