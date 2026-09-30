import { DEFAULT_PLATFORM_SETTINGS } from "@/mock/platformSettings";
import { auditService } from "@/services/audit";
import { emitAdminRealtime } from "@/services/realtimeBridge";
import type {
  PlatformSettings,
  PlatformSettingsGroup,
} from "@/types/platformSettings";

let settings: PlatformSettings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
let forceError = false;

export function __resetPlatformSettingsForTests(): void {
  settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  forceError = false;
}

export function __setPlatformSettingsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

const CRITICAL_PATHS = new Set([
  "assuredRide.securityPercent",
  "assuredRide.compensationPercent",
  "safety.sosAutoEscalateMinutes",
  "safety.criticalIncidentThreshold",
  "system.maintenanceMode",
]);

export function isCriticalSettingPath(path: string): boolean {
  return CRITICAL_PATHS.has(path);
}

export function validateSettings(next: PlatformSettings): string[] {
  const errors: string[] = [];
  if (!next.general.platformName.trim()) errors.push("Platform name is required.");
  if (!next.general.defaultCurrency.trim()) errors.push("Default currency is required.");
  if (!next.general.timezone.trim()) errors.push("Timezone is required.");
  if (next.ride.minimumFarePaise < 0) errors.push("Minimum fare cannot be negative.");
  if (next.ride.cancellationWindowMinutes < 0) {
    errors.push("Cancellation window cannot be negative.");
  }
  if (next.safety.sosAutoEscalateMinutes < 1) {
    errors.push("SOS escalate minutes must be at least 1.");
  }
  if (next.assuredRide.securityPercent !== 0.05) {
    errors.push("Assured Ride security percent must remain 5% (0.05) in this mock phase.");
  }
  if (next.assuredRide.compensationPercent !== 0.6) {
    errors.push(
      "Assured Ride compensation percent must remain 60% (0.6) of forfeited security.",
    );
  }
  if (next.assuredRide.disputeHoldHours < 0) {
    errors.push("Dispute hold hours cannot be negative.");
  }
  return errors;
}

export const platformSettingsService = {
  async getSettings(): Promise<PlatformSettings> {
    if (forceError) throw new Error("Unable to load platform settings.");
    return structuredClone(settings);
  },

  isCriticalSettingPath,

  validateSettings,

  async updateSettingsGroup<G extends PlatformSettingsGroup>(
    group: G,
    patch: Partial<PlatformSettings[G]>,
    actor: { adminId: string; adminName: string },
    reason: string,
    options?: { confirmCritical?: boolean },
  ): Promise<PlatformSettings> {
    if (forceError) throw new Error("Unable to update platform settings.");

    const criticalTouched = Object.keys(patch).some((key) =>
      isCriticalSettingPath(`${group}.${key}`),
    );
    if (criticalTouched && !options?.confirmCritical) {
      throw new Error("Critical setting change requires confirmation.");
    }

    const nextGroup = { ...settings[group], ...patch } as PlatformSettings[G];
    const next: PlatformSettings = { ...settings, [group]: nextGroup };
    const errors = validateSettings(next);
    if (errors.length) throw new Error(errors.join(" "));

    const oldGroup = structuredClone(settings[group]);
    settings = next;
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "settings.updated",
      targetType: "platform_settings",
      targetId: group,
      oldValue: oldGroup,
      newValue: nextGroup,
      reason,
    });
    emitAdminRealtime("settings.updated", {
      group,
      timestamp: new Date().toISOString(),
    });
    emitAdminRealtime("audit.created", {
      action: "settings.updated",
      targetId: group,
      timestamp: new Date().toISOString(),
    });
    return structuredClone(settings);
  },

  async updateSetting(
    path: string,
    value: unknown,
    actor: { adminId: string; adminName: string },
    reason: string,
    options?: { confirmCritical?: boolean },
  ): Promise<PlatformSettings> {
    const [group, key] = path.split(".") as [PlatformSettingsGroup, string];
    if (!group || !key || !(group in settings)) {
      throw new Error("Invalid settings path.");
    }
    return this.updateSettingsGroup(
      group,
      { [key]: value } as Partial<PlatformSettings[typeof group]>,
      actor,
      reason,
      options,
    );
  },
};

export type PlatformSettingsService = typeof platformSettingsService;
