export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditRecord {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}
