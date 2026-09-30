export type AnalyticsRange = "TODAY" | "7D" | "30D" | "90D" | "CUSTOM";

export type AnalyticsNetworkFilter = "ALL" | "OFFICE" | "OUTSTATION";

export type AnalyticsUserTypeFilter = "ALL" | "RIDER" | "DRIVER" | "BOTH";

export interface AnalyticsFilters {
  range: AnalyticsRange;
  network: AnalyticsNetworkFilter;
  userType: AnalyticsUserTypeFilter;
  customFrom?: string;
  customTo?: string;
}

export interface MetricValue {
  key: string;
  label: string;
  value: number | null;
  /** When value is null */
  unavailableReason?: string;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  rides: number;
  users: number;
  sos: number;
  support: number;
}

export interface NetworkSplit {
  officeRides: number;
  outstationRides: number;
}

export interface AnalyticsOverview {
  filters: AnalyticsFilters;
  generatedAt: string;
  summary: MetricValue[];
  networkSplit: NetworkSplit;
  timeSeries: TimeSeriesPoint[];
  users: MetricValue[];
  rides: MetricValue[];
  safety: MetricValue[];
  verification: MetricValue[];
  money: MetricValue[];
  support: MetricValue[];
  communication: MetricValue[];
  growth: MetricValue[];
  assured: MetricValue[];
}
