import type { AuditRecord } from "@/types/common";

export interface AuditFilters {
  adminId?: string | "ALL";
  action?: string | "ALL";
  targetType?: string | "ALL";
  search?: string;
  from?: string;
  to?: string;
}

const SEED_AUDITS: AuditRecord[] = [
  {
    id: "aud_seed_001",
    adminId: "admin",
    adminName: "BhaiWay Admin",
    action: "admin.login",
    targetType: "session",
    targetId: "admin",
    timestamp: "2026-09-18T08:00:00.000Z",
    reason: "Successful login",
  },
  {
    id: "aud_seed_002",
    adminId: "admin",
    adminName: "BhaiWay Admin",
    action: "settings.updated",
    targetType: "platform_settings",
    targetId: "general",
    timestamp: "2026-09-19T10:00:00.000Z",
    oldValue: { platformName: "BhaiWay" },
    newValue: { platformName: "BhaiWay" },
    reason: "Confirmed platform name",
  },
  {
    id: "aud_seed_003",
    adminId: "admin",
    adminName: "BhaiWay Admin",
    action: "role.permissions_updated",
    targetType: "role",
    targetId: "role_analyst",
    timestamp: "2026-09-19T11:30:00.000Z",
    oldValue: { permissionIds: ["dashboard.view", "analytics.view"] },
    newValue: {
      permissionIds: ["dashboard.view", "analytics.view", "reports.view", "audit.view"],
    },
    reason: "Expanded analyst read access",
  },
];

let audits: AuditRecord[] = structuredClone(SEED_AUDITS);

export function __resetAuditForTests(): void {
  audits = structuredClone(SEED_AUDITS);
}

export function filterAudits(list: AuditRecord[], filters: AuditFilters = {}): AuditRecord[] {
  return list.filter((a) => {
    if (filters.adminId && filters.adminId !== "ALL" && a.adminId !== filters.adminId) {
      return false;
    }
    if (filters.action && filters.action !== "ALL" && a.action !== filters.action) {
      return false;
    }
    if (
      filters.targetType &&
      filters.targetType !== "ALL" &&
      a.targetType !== filters.targetType
    ) {
      return false;
    }
    if (filters.from && new Date(a.timestamp) < new Date(filters.from)) return false;
    if (filters.to && new Date(a.timestamp) > new Date(filters.to)) return false;
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${a.targetId} ${a.action} ${a.adminId} ${a.adminName} ${a.reason ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function scrubSecrets(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubSecrets);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/password|secret|api[_-]?key|credential/i.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = scrubSecrets(v);
  }
  return out;
}

export const auditService = {
  async record(
    input: Omit<AuditRecord, "id" | "timestamp"> & { timestamp?: string },
  ): Promise<AuditRecord> {
    const entry: AuditRecord = {
      id: `aud_${Date.now()}_${audits.length}`,
      timestamp: input.timestamp ?? new Date().toISOString(),
      adminId: input.adminId,
      adminName: input.adminName,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      oldValue: scrubSecrets(input.oldValue),
      newValue: scrubSecrets(input.newValue),
      reason: input.reason,
    };
    audits = [entry, ...audits];
    return structuredClone(entry);
  },

  async list(filters: AuditFilters = {}): Promise<AuditRecord[]> {
    return structuredClone(
      filterAudits(audits, filters).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    );
  },

  async listForTarget(targetType: string, targetId: string): Promise<AuditRecord[]> {
    return structuredClone(
      audits.filter((a) => a.targetType === targetType && a.targetId === targetId),
    );
  },

  async getById(id: string): Promise<AuditRecord | null> {
    return structuredClone(audits.find((a) => a.id === id) ?? null);
  },
};
