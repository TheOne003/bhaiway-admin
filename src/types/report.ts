export type ReportCategory =
  | "RIDE_OPERATIONS"
  | "USER_ACTIVITY"
  | "DRIVER_OPERATIONS"
  | "SAFETY"
  | "VERIFICATION"
  | "MONEY"
  | "SUPPORT"
  | "COMMUNICATION"
  | "GROWTH";

export type ReportStatus = "READY" | "GENERATING" | "FAILED";

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  source: string;
}

export interface ReportRecord {
  id: string;
  definitionId: string;
  name: string;
  description: string;
  category: ReportCategory;
  source: string;
  filters: Record<string, string>;
  generatedAt: string;
  generatedBy: string;
  status: ReportStatus;
  summary: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
}

export interface ReportFilters {
  category?: ReportCategory | "ALL";
  search?: string;
}
