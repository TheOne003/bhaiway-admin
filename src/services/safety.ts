import { MOCK_SAFETY_EVENTS } from "@/mock/incidents";
import { isActiveSos, MOCK_SOS } from "@/mock/sos";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import { ridesService } from "@/services/rides";
import type { SafetyEvent, SafetySummary } from "@/types/safety";
import type { SOSFilters, SOSRecord, SOSStatus } from "@/types/sos";

const sosStore = createSessionMockStore<SOSRecord[]>("sos", () => structuredClone(MOCK_SOS));
const safetyEventsStore = createSessionMockStore<SafetyEvent[]>(
  "safety_events",
  () => structuredClone(MOCK_SAFETY_EVENTS),
);
let forceError = false;

function sosState(): SOSRecord[] {
  return sosStore.get();
}

function safetyEventsState(): SafetyEvent[] {
  return safetyEventsStore.get();
}

function commitSos(next: SOSRecord[]): void {
  sosStore.set(next);
}

function commitSafetyEvents(next: SafetyEvent[]): void {
  safetyEventsStore.set(next);
}

export function __resetSafetyForTests(): void {
  sosStore.reset();
  safetyEventsStore.reset();
  forceError = false;
}

export function __setSafetyErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterSos(list: SOSRecord[], filters: SOSFilters = {}): SOSRecord[] {
  const status = filters.status ?? "ALL";
  const severity = filters.severity ?? "ALL";
  const network = filters.networkType ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return list.filter((item) => {
    if (status === "ACTIVE" && !isActiveSos(item.status)) return false;
    if (status !== "ALL" && status !== "ACTIVE" && item.status !== status) return false;
    if (severity !== "ALL" && item.severity !== severity) return false;
    if (network !== "ALL" && item.networkType !== network) return false;
    if (search) {
      const hay = [item.id, item.rideId, item.triggeredByUserId, item.driverId, item.locationLabel]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function pushSosTimeline(record: SOSRecord, label: string, actorId: string | null) {
  const timestamp = new Date().toISOString();
  record.timeline = [
    {
      id: `${record.id}_t_${record.timeline.length + 1}`,
      label,
      timestamp,
      actorId,
    },
    ...record.timeline,
  ];
  record.updatedAt = timestamp;
}

function syncSafetyEventFromSos(record: SOSRecord) {
  const safetyEvents = safetyEventsState();
  const existing = safetyEvents.find((e) => e.sosId === record.id);
  if (!existing) {
    commitSafetyEvents([
      {
        id: `sev_${record.id}`,
        type: "SOS",
        severity: record.severity,
        rideId: record.rideId,
        userId: record.triggeredByUserId,
        driverId: record.driverId,
        sosId: record.id,
        incidentId: null,
        status: record.status,
        latitude: record.latitude,
        longitude: record.longitude,
        locationLabel: record.locationLabel,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        acknowledgedAt: record.acknowledgedAt,
        acknowledgedBy: record.acknowledgedBy,
        resolvedAt: record.resolvedAt,
        resolvedBy: record.resolvedBy,
        description: `SOS ${record.status}`,
        metadata: { source: "safety_service" },
      },
      ...safetyEvents,
    ]);
    return;
  }
  existing.status = record.status;
  existing.severity = record.severity;
  existing.updatedAt = record.updatedAt;
  existing.acknowledgedAt = record.acknowledgedAt;
  existing.acknowledgedBy = record.acknowledgedBy;
  existing.resolvedAt = record.resolvedAt;
  existing.resolvedBy = record.resolvedBy;
  commitSafetyEvents(safetyEvents);
}

async function syncRideSafety(rideId: string, sosStatus: SOSStatus) {
  const active = isActiveSos(sosStatus);
  await ridesService.updateRideSafety(rideId, active ? "sos" : "safe");
}

export const safetyService = {
  async getSafetyEvents(): Promise<SafetyEvent[]> {
    if (forceError) throw new Error("Unable to load safety events.");
    return structuredClone(safetyEventsState()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getActiveSafetyEvents(): Promise<SafetyEvent[]> {
    const all = await this.getSafetyEvents();
    return all.filter((e) => {
      if (e.type === "SOS") return isActiveSos(e.status as SOSStatus);
      return e.status === "OPEN" || e.status === "TRIGGERED";
    });
  },

  async getSafetySummary(activeRideCount: number): Promise<SafetySummary> {
    const sosCases = sosState();
    const safetyEvents = safetyEventsState();
    const activeSos = sosCases.filter((s) => isActiveSos(s.status)).length;
    const { incidentsService } = await import("@/services/incidents");
    const incidents = await incidentsService.getIncidents();
    const openIncidents = incidents.filter(
      (i) => i.status === "OPEN" || i.status === "INVESTIGATING" || i.status === "ESCALATED",
    ).length;
    const criticalIncidents = incidents.filter(
      (i) =>
        i.severity === "CRITICAL" &&
        (i.status === "OPEN" || i.status === "INVESTIGATING" || i.status === "ESCALATED"),
    ).length;
    const routeDeviations = incidents.filter(
      (i) => i.type === "ROUTE_DEVIATION" && i.status !== "CLOSED" && i.status !== "RESOLVED",
    ).length;
    const today = "2026-09-20";
    const safetyEventsToday = safetyEvents.filter((e) => e.createdAt.startsWith(today)).length;
    return {
      activeRides: activeRideCount,
      activeSos,
      criticalIncidents,
      openIncidents,
      routeDeviations,
      safetyEventsToday,
    };
  },

  async getSOSCases(filters: SOSFilters = {}): Promise<SOSRecord[]> {
    if (forceError) throw new Error("Unable to load SOS cases.");
    return structuredClone(filterSos(sosState(), filters)).sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
    );
  },

  async getSOSById(id: string): Promise<SOSRecord | null> {
    if (forceError) throw new Error("Unable to load SOS cases.");
    return structuredClone(sosState().find((s) => s.id === id) ?? null);
  },

  async acknowledgeSOS(id: string, adminId = "adm_001"): Promise<SOSRecord | null> {
    const sosCases = sosState();
    const record = sosCases.find((s) => s.id === id);
    if (!record || record.status !== "TRIGGERED") return null;
    record.status = "ACKNOWLEDGED";
    record.acknowledgedAt = new Date().toISOString();
    record.acknowledgedBy = adminId;
    pushSosTimeline(record, "Admin acknowledged", adminId);
    syncSafetyEventFromSos(record);
    commitSos(sosCases);
    return structuredClone(record);
  },

  async startSOSResponse(id: string, adminId = "adm_001"): Promise<SOSRecord | null> {
    const sosCases = sosState();
    const record = sosCases.find((s) => s.id === id);
    if (!record || (record.status !== "ACKNOWLEDGED" && record.status !== "TRIGGERED")) {
      return null;
    }
    if (record.status === "TRIGGERED") {
      record.acknowledgedAt = new Date().toISOString();
      record.acknowledgedBy = adminId;
    }
    record.status = "RESPONDING";
    record.responseStartedAt = new Date().toISOString();
    pushSosTimeline(record, "Response started", adminId);
    syncSafetyEventFromSos(record);
    commitSos(sosCases);
    return structuredClone(record);
  },

  async resolveSOS(id: string, adminId = "adm_001", note?: string): Promise<SOSRecord | null> {
    const sosCases = sosState();
    const record = sosCases.find((s) => s.id === id);
    if (!record || record.status === "RESOLVED" || record.status === "FALSE_ALARM") return null;
    record.status = "RESOLVED";
    record.resolvedAt = new Date().toISOString();
    record.resolvedBy = adminId;
    if (note) record.notes = [note, ...record.notes];
    pushSosTimeline(record, "SOS resolved", adminId);
    syncSafetyEventFromSos(record);
    commitSos(sosCases);
    await syncRideSafety(record.rideId, "RESOLVED");
    return structuredClone(record);
  },

  async markFalseAlarm(id: string, adminId = "adm_001", note?: string): Promise<SOSRecord | null> {
    const sosCases = sosState();
    const record = sosCases.find((s) => s.id === id);
    if (!record || record.status === "FALSE_ALARM") return null;
    record.status = "FALSE_ALARM";
    record.resolvedAt = new Date().toISOString();
    record.resolvedBy = adminId;
    if (note) record.notes = [note, ...record.notes];
    pushSosTimeline(record, "Marked false alarm", adminId);
    syncSafetyEventFromSos(record);
    commitSos(sosCases);
    await syncRideSafety(record.rideId, "FALSE_ALARM");
    return structuredClone(record);
  },

  async addSOSNote(id: string, note: string, adminId = "adm_001"): Promise<SOSRecord | null> {
    const sosCases = sosState();
    const record = sosCases.find((s) => s.id === id);
    if (!record) return null;
    record.notes = [note, ...record.notes];
    pushSosTimeline(record, `Note: ${note}`, adminId);
    commitSos(sosCases);
    return structuredClone(record);
  },

  async upsertTriggeredSOS(input: {
    id?: string;
    rideId: string;
    triggeredByUserId: string;
    driverId: string;
    networkType: SOSRecord["networkType"];
    latitude: number;
    longitude: number;
    locationLabel: string;
    category?: SOSRecord["category"];
  }): Promise<SOSRecord> {
    const now = new Date().toISOString();
    const id = input.id ?? `sos_${Date.now()}`;
    const sosCases = sosState();
    const existing = sosCases.find((s) => s.id === id);
    if (existing) {
      existing.status = "TRIGGERED";
      existing.updatedAt = now;
      pushSosTimeline(existing, "SOS re-triggered", input.triggeredByUserId);
      syncSafetyEventFromSos(existing);
      commitSos(sosCases);
      await syncRideSafety(existing.rideId, "TRIGGERED");
      return structuredClone(existing);
    }
    const record: SOSRecord = {
      id,
      rideId: input.rideId,
      triggeredByUserId: input.triggeredByUserId,
      driverId: input.driverId,
      networkType: input.networkType,
      status: "TRIGGERED",
      severity: "CRITICAL",
      latitude: input.latitude,
      longitude: input.longitude,
      locationLabel: input.locationLabel,
      triggeredAt: now,
      acknowledgedAt: null,
      acknowledgedBy: null,
      responseStartedAt: null,
      resolvedAt: null,
      resolvedBy: null,
      category: input.category ?? "EMERGENCY",
      notes: [],
      timeline: [
        {
          id: `${id}_t1`,
          label: "SOS triggered",
          timestamp: now,
          actorId: input.triggeredByUserId,
        },
      ],
      relatedAlertId: null,
      createdAt: now,
      updatedAt: now,
    };
    commitSos([record, ...sosCases]);
    syncSafetyEventFromSos(record);
    await syncRideSafety(record.rideId, "TRIGGERED");
    return structuredClone(record);
  },
};
