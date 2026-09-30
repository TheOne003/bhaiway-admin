import type { AccountStatus, VerificationSummaryStatus } from "./user";

export interface DriverVehicleContext {
  vehicleId: string;
  registrationMasked: string;
  make: string;
  model: string;
  fuelType: "petrol" | "diesel" | "cng" | "electric" | "hybrid";
  rcStatus: VerificationSummaryStatus;
  insuranceStatus: VerificationSummaryStatus;
}

export interface DriverProfile {
  userId: string;
  driverId: string;
  status: AccountStatus;
  rating: number;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  cancellationRate: number;
  licenceStatus: VerificationSummaryStatus;
  governmentIdStatus: VerificationSummaryStatus;
  corporateStatus: VerificationSummaryStatus;
  vehicle: DriverVehicleContext | null;
  earningsSummaryNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverListItem {
  driverId: string;
  userId: string;
  name: string;
  phoneMasked: string;
  status: AccountStatus;
  rating: number;
  totalRides: number;
  cancellationRate: number;
  governmentIdStatus: VerificationSummaryStatus;
  licenceStatus: VerificationSummaryStatus;
  rcStatus: VerificationSummaryStatus;
  vehicleRegistrationMasked: string | null;
}

export interface DriverFilters {
  status?: AccountStatus | "ALL";
  verification?: "ALL" | "APPROVED" | "PENDING" | "FAILED";
  search?: string;
}
