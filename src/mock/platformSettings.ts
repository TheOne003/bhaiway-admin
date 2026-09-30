import type { PlatformSettings } from "@/types/platformSettings";

/** Aligned with Phase 5 Assured Ride rules. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    platformName: "BhaiWay",
    supportContactPlaceholder: "support@example.invalid",
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
  },
  ride: {
    minimumFarePaise: 5000,
    cancellationWindowMinutes: 5,
    bookingLeadMinutes: 15,
  },
  safety: {
    sosAutoEscalateMinutes: 3,
    criticalIncidentThreshold: 1,
  },
  assuredRide: {
    securityPercent: 0.05,
    compensationPercent: 0.6,
    disputeHoldHours: 48,
  },
  communication: {
    defaultInAppEnabled: true,
    mockChannelsOnly: true,
  },
  system: {
    maintenanceMode: false,
    operationalBanner: "",
  },
};
