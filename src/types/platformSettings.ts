export interface PlatformSettings {
  general: {
    platformName: string;
    supportContactPlaceholder: string;
    defaultCurrency: string;
    timezone: string;
  };
  ride: {
    minimumFarePaise: number;
    cancellationWindowMinutes: number;
    bookingLeadMinutes: number;
  };
  safety: {
    sosAutoEscalateMinutes: number;
    criticalIncidentThreshold: number;
  };
  assuredRide: {
    /** Fraction 0–1 — must stay 0.05 */
    securityPercent: number;
    /** Fraction 0–1 — must stay 0.60 */
    compensationPercent: number;
    disputeHoldHours: number;
  };
  communication: {
    defaultInAppEnabled: boolean;
    mockChannelsOnly: boolean;
  };
  system: {
    maintenanceMode: boolean;
    operationalBanner: string;
  };
}

export type PlatformSettingsGroup = keyof PlatformSettings;
