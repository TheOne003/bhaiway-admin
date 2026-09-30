"use client";

import { useCallback, useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";
import {
  isCriticalSettingPath,
  platformSettingsService,
} from "@/services/platformSettings";
import type { PlatformSettings, PlatformSettingsGroup } from "@/types/platformSettings";

const GROUP_LABELS: Record<PlatformSettingsGroup, string> = {
  general: "General",
  ride: "Ride",
  safety: "Safety",
  assuredRide: "Assured Ride",
  communication: "Communication",
  system: "System",
};

type PendingCritical = {
  group: PlatformSettingsGroup;
  path: string;
  label: string;
  current: string;
  proposed: string;
  impact: string;
  apply: () => void;
};

function PlatformSettingsWorkspace() {
  const { session } = useAuth();
  const actor = {
    adminId: session?.admin.id ?? "admin",
    adminName: session?.admin.name ?? "BhaiWay Admin",
  };

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<Partial<Record<PlatformSettingsGroup, string>>>({});
  const [busyGroup, setBusyGroup] = useState<PlatformSettingsGroup | null>(null);
  const [pendingCritical, setPendingCritical] = useState<PendingCritical | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformSettingsService.getSettings();
      setSettings(data);
      setDraft(structuredClone(data));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load platform settings.");
      setSettings(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function patchGroup<G extends PlatformSettingsGroup>(
    group: G,
    patch: Partial<PlatformSettings[G]>,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [group]: { ...prev[group], ...patch } };
    });
    setGroupError((e) => ({ ...e, [group]: undefined }));
  }

  async function saveGroup(group: PlatformSettingsGroup, confirmCritical = false) {
    if (!draft || !settings) return;

    const patch = draft[group];
    const criticalKeys = Object.keys(patch).filter((key) =>
      isCriticalSettingPath(`${group}.${key}`),
    );

    if (criticalKeys.length > 0 && !confirmCritical) {
      // For group save with critical fields, confirm if any critical value changed
      const changedCritical = criticalKeys.filter((key) => {
        const cur = (settings[group] as Record<string, unknown>)[key];
        const next = (patch as Record<string, unknown>)[key];
        return cur !== next;
      });
      if (changedCritical.length > 0) {
        const key = changedCritical[0]!;
        const cur = (settings[group] as Record<string, unknown>)[key];
        const next = (patch as Record<string, unknown>)[key];
        setPendingCritical({
          group,
          path: `${group}.${key}`,
          label: key,
          current: String(cur),
          proposed: String(next),
          impact:
            key === "maintenanceMode"
              ? "Maintenance mode affects platform availability for riders and drivers."
              : key.includes("Percent")
                ? "Assured Ride percentages are locked operational config; invalid values will be rejected."
                : "Safety thresholds affect SOS escalation and incident priority.",
          apply: () => void saveGroup(group, true),
        });
        return;
      }
    }

    setBusyGroup(group);
    setGroupError((e) => ({ ...e, [group]: undefined }));
    try {
      const updated = await platformSettingsService.updateSettingsGroup(
        group,
        patch,
        actor,
        `Updated ${group} settings`,
        { confirmCritical: confirmCritical || criticalKeys.length > 0 },
      );
      setSettings(updated);
      setDraft(structuredClone(updated));
      setPendingCritical(null);
    } catch (e) {
      setGroupError((err) => ({
        ...err,
        [group]: e instanceof Error ? e.message : "Save failed.",
      }));
      setPendingCritical(null);
    } finally {
      setBusyGroup(null);
    }
  }

  if (loading && !draft) {
    return <LoadingState label="Loading platform settings…" />;
  }

  if (error && !draft) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Unable to load platform settings." message={error} />
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!draft || !settings) {
    return <EmptyState title="No platform settings." description="Settings store is empty." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8" data-testid="platform-settings-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform settings</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Operational configuration. Critical changes require confirmation; Assured Ride
          security/compensation percents are locked at 5% / 60%.
        </p>
      </header>

      {/* General */}
      <section
        className="space-y-4 border-b border-[var(--bw-border)] pb-8"
        data-testid="settings-group-general"
      >
        <h2 className="text-lg font-semibold">{GROUP_LABELS.general}</h2>
        <Input
          label="Platform name"
          value={draft.general.platformName}
          onChange={(e) => patchGroup("general", { platformName: e.target.value })}
        />
        <Input
          label="Support contact (placeholder)"
          value={draft.general.supportContactPlaceholder}
          onChange={(e) =>
            patchGroup("general", { supportContactPlaceholder: e.target.value })
          }
        />
        <Input
          label="Default currency"
          value={draft.general.defaultCurrency}
          onChange={(e) => patchGroup("general", { defaultCurrency: e.target.value })}
        />
        <Input
          label="Timezone"
          value={draft.general.timezone}
          onChange={(e) => patchGroup("general", { timezone: e.target.value })}
        />
        {groupError.general ? (
          <ErrorState title="Save failed" message={groupError.general} />
        ) : null}
        <Button
          data-testid="settings-save-general"
          loading={busyGroup === "general"}
          onClick={() => void saveGroup("general")}
        >
          Save general
        </Button>
      </section>

      {/* Ride */}
      <section
        className="space-y-4 border-b border-[var(--bw-border)] pb-8"
        data-testid="settings-group-ride"
      >
        <h2 className="text-lg font-semibold">{GROUP_LABELS.ride}</h2>
        <Input
          label="Minimum fare (paise)"
          type="number"
          value={String(draft.ride.minimumFarePaise)}
          onChange={(e) =>
            patchGroup("ride", { minimumFarePaise: Number(e.target.value) })
          }
        />
        <Input
          label="Cancellation window (minutes)"
          type="number"
          value={String(draft.ride.cancellationWindowMinutes)}
          onChange={(e) =>
            patchGroup("ride", {
              cancellationWindowMinutes: Number(e.target.value),
            })
          }
        />
        <Input
          label="Booking lead (minutes)"
          type="number"
          value={String(draft.ride.bookingLeadMinutes)}
          onChange={(e) =>
            patchGroup("ride", { bookingLeadMinutes: Number(e.target.value) })
          }
        />
        {groupError.ride ? (
          <ErrorState title="Save failed" message={groupError.ride} />
        ) : null}
        <Button
          data-testid="settings-save-ride"
          loading={busyGroup === "ride"}
          onClick={() => void saveGroup("ride")}
        >
          Save ride
        </Button>
      </section>

      {/* Safety */}
      <section
        className="space-y-4 border-b border-[var(--bw-border)] pb-8"
        data-testid="settings-group-safety"
      >
        <h2 className="text-lg font-semibold">{GROUP_LABELS.safety}</h2>
        <Input
          label="SOS auto-escalate (minutes)"
          type="number"
          value={String(draft.safety.sosAutoEscalateMinutes)}
          onChange={(e) =>
            patchGroup("safety", {
              sosAutoEscalateMinutes: Number(e.target.value),
            })
          }
        />
        <Input
          label="Critical incident threshold"
          type="number"
          value={String(draft.safety.criticalIncidentThreshold)}
          onChange={(e) =>
            patchGroup("safety", {
              criticalIncidentThreshold: Number(e.target.value),
            })
          }
        />
        {groupError.safety ? (
          <ErrorState title="Save failed" message={groupError.safety} />
        ) : null}
        <Button
          data-testid="settings-save-safety"
          loading={busyGroup === "safety"}
          onClick={() => void saveGroup("safety")}
        >
          Save safety
        </Button>
      </section>

      {/* Assured Ride */}
      <section
        className="space-y-4 border-b border-[var(--bw-border)] pb-8"
        data-testid="settings-group-assuredRide"
      >
        <h2 className="text-lg font-semibold">{GROUP_LABELS.assuredRide}</h2>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Current operational config: security 5% (0.05), compensation 60% (0.6) of forfeited
          security. These values are locked for this mock phase.
        </p>
        <Input
          label="Security percent (locked at 5%)"
          type="number"
          step="0.01"
          value={String(draft.assuredRide.securityPercent)}
          disabled
          readOnly
        />
        <Input
          label="Compensation percent (locked at 60%)"
          type="number"
          step="0.01"
          value={String(draft.assuredRide.compensationPercent)}
          disabled
          readOnly
        />
        <Input
          label="Dispute hold (hours)"
          type="number"
          value={String(draft.assuredRide.disputeHoldHours)}
          onChange={(e) =>
            patchGroup("assuredRide", {
              disputeHoldHours: Number(e.target.value),
            })
          }
        />
        {groupError.assuredRide ? (
          <ErrorState title="Save failed" message={groupError.assuredRide} />
        ) : null}
        <Button
          data-testid="settings-save-assuredRide"
          loading={busyGroup === "assuredRide"}
          onClick={() => void saveGroup("assuredRide")}
        >
          Save Assured Ride
        </Button>
      </section>

      {/* Communication */}
      <section
        className="space-y-4 border-b border-[var(--bw-border)] pb-8"
        data-testid="settings-group-communication"
      >
        <h2 className="text-lg font-semibold">{GROUP_LABELS.communication}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={draft.communication.defaultInAppEnabled}
            onChange={(e) =>
              patchGroup("communication", {
                defaultInAppEnabled: e.target.checked,
              })
            }
          />
          Default in-app notifications enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={draft.communication.mockChannelsOnly}
            onChange={(e) =>
              patchGroup("communication", {
                mockChannelsOnly: e.target.checked,
              })
            }
          />
          Mock channels only
        </label>
        {groupError.communication ? (
          <ErrorState title="Save failed" message={groupError.communication} />
        ) : null}
        <Button
          data-testid="settings-save-communication"
          loading={busyGroup === "communication"}
          onClick={() => void saveGroup("communication")}
        >
          Save communication
        </Button>
      </section>

      {/* System */}
      <section className="space-y-4" data-testid="settings-group-system">
        <h2 className="text-lg font-semibold">{GROUP_LABELS.system}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={draft.system.maintenanceMode}
            onChange={(e) =>
              patchGroup("system", { maintenanceMode: e.target.checked })
            }
          />
          Maintenance mode
        </label>
        <Input
          label="Operational banner"
          value={draft.system.operationalBanner}
          onChange={(e) =>
            patchGroup("system", { operationalBanner: e.target.value })
          }
        />
        {groupError.system ? (
          <ErrorState title="Save failed" message={groupError.system} />
        ) : null}
        <Button
          data-testid="settings-save-system"
          loading={busyGroup === "system"}
          onClick={() => void saveGroup("system")}
        >
          Save system
        </Button>
      </section>

      <ConfirmDialog
        open={pendingCritical != null}
        title="Confirm critical setting change"
        description={
          pendingCritical
            ? `${pendingCritical.path}: ${pendingCritical.current} → ${pendingCritical.proposed}. ${pendingCritical.impact}`
            : ""
        }
        confirmLabel="Confirm change"
        danger
        onCancel={() => setPendingCritical(null)}
        onConfirm={() => pendingCritical?.apply()}
      />
    </div>
  );
}

export default function PlatformSettingsPage() {
  return (
    <PermissionGuard permission="platform_settings.manage">
      <PlatformSettingsWorkspace />
    </PermissionGuard>
  );
}
