import type {
  CreateFareInput,
  FareConfiguration,
  FareConfigStatus,
  FareFilters,
} from "@/types/fare";
import { auditService } from "@/services/audit";
import { emitAdminRealtime } from "@/services/realtimeBridge";

const SEED: FareConfiguration[] = [
  {
    id: "fare_office_v3",
    name: "Office Commute Standard",
    network: "OFFICE",
    baseFarePaise: 4000,
    perKmPaise: 1200,
    minimumFarePaise: 5000,
    cancellationFeePaise: 2000,
    status: "ACTIVE",
    effectiveFrom: "2026-08-01T00:00:00.000Z",
    version: 3,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "fare_outstation_v2",
    name: "Outstation Standard",
    network: "OUTSTATION",
    baseFarePaise: 15000,
    perKmPaise: 1800,
    minimumFarePaise: 25000,
    cancellationFeePaise: 5000,
    status: "ACTIVE",
    effectiveFrom: "2026-08-01T00:00:00.000Z",
    version: 2,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "fare_office_draft",
    name: "Office Peak Draft",
    network: "OFFICE",
    baseFarePaise: 5000,
    perKmPaise: 1400,
    minimumFarePaise: 6000,
    cancellationFeePaise: 2500,
    status: "DRAFT",
    effectiveFrom: "2026-10-01T00:00:00.000Z",
    version: 1,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
];

let configs: FareConfiguration[] = structuredClone(SEED);
let forceError = false;

export function __resetFaresForTests(): void {
  configs = structuredClone(SEED);
  forceError = false;
}

export function validateFareConfig(input: CreateFareInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Name is required.");
  if (!Number.isInteger(input.baseFarePaise) || input.baseFarePaise < 0) {
    errors.push("Base fare must be a non-negative integer (paise).");
  }
  if (!Number.isInteger(input.perKmPaise) || input.perKmPaise < 0) {
    errors.push("Per-km fare must be a non-negative integer (paise).");
  }
  if (!Number.isInteger(input.minimumFarePaise) || input.minimumFarePaise < 0) {
    errors.push("Minimum fare must be a non-negative integer (paise).");
  }
  if (!Number.isInteger(input.cancellationFeePaise) || input.cancellationFeePaise < 0) {
    errors.push("Cancellation fee must be a non-negative integer (paise).");
  }
  if (input.minimumFarePaise < input.baseFarePaise) {
    errors.push("Minimum fare should be at least the base fare.");
  }
  if (!input.effectiveFrom) errors.push("Effective date is required.");
  return errors;
}

/** Preview estimate for distanceKm using integer paise only. */
export function previewFare(config: FareConfiguration, distanceKm: number): number {
  const km = Math.max(0, Math.round(distanceKm));
  const raw = config.baseFarePaise + km * config.perKmPaise;
  return Math.max(raw, config.minimumFarePaise);
}

export function filterFares(list: FareConfiguration[], filters: FareFilters = {}): FareConfiguration[] {
  return list.filter((c) => {
    if (filters.network && filters.network !== "ALL" && c.network !== filters.network) return false;
    if (filters.status && filters.status !== "ALL" && c.status !== filters.status) return false;
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      if (!`${c.id} ${c.name} ${c.network}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const faresService = {
  async getConfigurations(filters: FareFilters = {}): Promise<FareConfiguration[]> {
    if (forceError) throw new Error("Unable to load fare configurations.");
    return structuredClone(filterFares(configs, filters));
  },

  async getById(id: string): Promise<FareConfiguration | null> {
    return structuredClone(configs.find((c) => c.id === id) ?? null);
  },

  async create(
    input: CreateFareInput,
    actor: { adminId: string; adminName: string },
  ): Promise<FareConfiguration> {
    const errors = validateFareConfig(input);
    if (errors.length) throw new Error(errors.join(" "));
    const now = new Date().toISOString();
    const created: FareConfiguration = {
      id: `fare_${input.network.toLowerCase()}_${Date.now()}`,
      name: input.name.trim(),
      network: input.network,
      baseFarePaise: input.baseFarePaise,
      perKmPaise: input.perKmPaise,
      minimumFarePaise: input.minimumFarePaise,
      cancellationFeePaise: input.cancellationFeePaise,
      status: "DRAFT",
      effectiveFrom: input.effectiveFrom,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    configs = [created, ...configs];
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "fare.created",
      targetType: "fare_config",
      targetId: created.id,
      newValue: { name: created.name, network: created.network },
      reason: "Fare configuration created",
    });
    emitAdminRealtime("settings.updated", {
      group: "fare",
      timestamp: now,
      fareConfigId: created.id,
    });
    return structuredClone(created);
  },

  async update(
    id: string,
    patch: Partial<CreateFareInput>,
    actor: { adminId: string; adminName: string },
  ): Promise<FareConfiguration> {
    const current = configs.find((c) => c.id === id);
    if (!current) throw new Error("Fare configuration not found.");
    if (current.status === "ACTIVE") {
      throw new Error("Deactivate before editing an active fare configuration.");
    }
    const nextInput: CreateFareInput = {
      name: patch.name ?? current.name,
      network: patch.network ?? current.network,
      baseFarePaise: patch.baseFarePaise ?? current.baseFarePaise,
      perKmPaise: patch.perKmPaise ?? current.perKmPaise,
      minimumFarePaise: patch.minimumFarePaise ?? current.minimumFarePaise,
      cancellationFeePaise: patch.cancellationFeePaise ?? current.cancellationFeePaise,
      effectiveFrom: patch.effectiveFrom ?? current.effectiveFrom,
    };
    const errors = validateFareConfig(nextInput);
    if (errors.length) throw new Error(errors.join(" "));
    const updated: FareConfiguration = {
      ...current,
      ...nextInput,
      name: nextInput.name.trim(),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    configs = configs.map((c) => (c.id === id ? updated : c));
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "fare.updated",
      targetType: "fare_config",
      targetId: id,
      oldValue: { version: current.version },
      newValue: { version: updated.version },
      reason: "Fare configuration updated",
    });
    emitAdminRealtime("settings.updated", {
      group: "fare",
      timestamp: updated.updatedAt,
      fareConfigId: id,
    });
    return structuredClone(updated);
  },

  async setStatus(
    id: string,
    status: FareConfigStatus,
    actor: { adminId: string; adminName: string },
    reason: string,
  ): Promise<FareConfiguration> {
    const current = configs.find((c) => c.id === id);
    if (!current) throw new Error("Fare configuration not found.");
    if (status === "ACTIVE") {
      const errors = validateFareConfig(current);
      if (errors.length) throw new Error(errors.join(" "));
      // Only one ACTIVE per network
      configs = configs.map((c) =>
        c.network === current.network && c.status === "ACTIVE" && c.id !== id
          ? { ...c, status: "INACTIVE" as const, updatedAt: new Date().toISOString() }
          : c,
      );
    }
    const previous = current.status;
    current.status = status;
    current.updatedAt = new Date().toISOString();
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "fare.status_changed",
      targetType: "fare_config",
      targetId: id,
      oldValue: { status: previous },
      newValue: { status },
      reason,
    });
    emitAdminRealtime("settings.updated", {
      group: "fare",
      timestamp: current.updatedAt,
      fareConfigId: id,
    });
    return structuredClone(current);
  },

  validateFareConfig,
  previewFare,
};
