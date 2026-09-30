import { MOCK_INCIDENTS } from "@/mock/incidents";
import { createSessionMockStore } from "@/lib/mockSessionStore";
import { emitSafetyIncidentUpdated } from "@/services/realtimeBridge";
import type { IncidentFilters, IncidentRecord, IncidentStatus } from "@/types/incident";

const incidentsStore = createSessionMockStore<IncidentRecord[]>(
  "incidents",
  () => structuredClone(MOCK_INCIDENTS),
);
let forceError = false;

function incidentsState(): IncidentRecord[] {
  return incidentsStore.get();
}

function commitIncidents(next: IncidentRecord[]): void {
  incidentsStore.set(next);
}

export function __resetIncidentsForTests(): void {
  incidentsStore.reset();
  forceError = false;
}

export function __setIncidentsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterIncidents(
  list: IncidentRecord[],
  filters: IncidentFilters = {},
): IncidentRecord[] {
  const status = filters.status ?? "ALL";
  const severity = filters.severity ?? "ALL";
  const type = filters.type ?? "ALL";
  const network = filters.networkType ?? "ALL";
  const assigned = filters.assignedTo ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return list.filter((item) => {
    if (status === "OPENISH") {
      if (!["OPEN", "INVESTIGATING", "ESCALATED"].includes(item.status)) return false;
    } else if (status !== "ALL" && item.status !== status) return false;
    if (severity !== "ALL" && item.severity !== severity) return false;
    if (type !== "ALL" && item.type !== type) return false;
    if (network !== "ALL" && item.networkType !== network) return false;
    if (assigned === "UNASSIGNED" && item.assignedTo != null) return false;
    if (assigned !== "ALL" && assigned !== "UNASSIGNED" && item.assignedTo !== assigned) {
      return false;
    }
    if (filters.createdFrom && item.createdAt < filters.createdFrom) return false;
    if (filters.createdTo && item.createdAt > filters.createdTo) return false;
    if (search) {
      const hay = [item.id, item.title, item.rideId ?? "", item.userId ?? "", item.driverId ?? ""]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function pushTimeline(record: IncidentRecord, label: string, actorId: string | null) {
  const timestamp = new Date().toISOString();
  record.timeline = [
    { id: `${record.id}_t_${record.timeline.length + 1}`, label, timestamp, actorId },
    ...record.timeline,
  ];
  record.updatedAt = timestamp;
}

function emitUpdate(record: IncidentRecord, previousStatus: IncidentStatus) {
  emitSafetyIncidentUpdated({
    incidentId: record.id,
    rideId: record.rideId,
    previousStatus,
    newStatus: record.status,
    timestamp: record.updatedAt,
    type: record.type,
  });
}

export const incidentsService = {
  async getIncidents(filters: IncidentFilters = {}): Promise<IncidentRecord[]> {
    if (forceError) throw new Error("Unable to load incident data.");
    return structuredClone(filterIncidents(incidentsState(), filters)).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  async getIncidentById(id: string): Promise<IncidentRecord | null> {
    if (forceError) throw new Error("Unable to load incident data.");
    return structuredClone(incidentsState().find((i) => i.id === id) ?? null);
  },

  async acknowledgeIncident(id: string, adminId = "adm_001"): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record || record.status === "CLOSED" || record.status === "RESOLVED") return null;
    const previous = record.status;
    record.acknowledgedBy = adminId;
    if (record.status === "OPEN") record.status = "INVESTIGATING";
    pushTimeline(record, "Incident acknowledged", adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async assignIncident(id: string, assigneeId: string, adminId = "adm_001"): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record) return null;
    const previous = record.status;
    record.assignedTo = assigneeId;
    pushTimeline(record, `Assigned to ${assigneeId}`, adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async escalateIncident(id: string, adminId = "adm_001"): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record || record.status === "CLOSED" || record.status === "RESOLVED") return null;
    const previous = record.status;
    record.status = "ESCALATED";
    pushTimeline(record, "Incident escalated", adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async resolveIncident(
    id: string,
    resolution: string,
    adminId = "adm_001",
  ): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record) return null;
    const previous = record.status;
    record.status = "RESOLVED";
    record.resolution = resolution;
    record.resolvedBy = adminId;
    pushTimeline(record, "Incident resolved", adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async closeIncident(id: string, adminId = "adm_001"): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record) return null;
    const previous = record.status;
    record.status = "CLOSED";
    pushTimeline(record, "Incident closed", adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async addIncidentNote(id: string, note: string, adminId = "adm_001"): Promise<IncidentRecord | null> {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.id === id);
    if (!record) return null;
    const previous = record.status;
    record.internalNotes = [note, ...record.internalNotes];
    pushTimeline(record, `Note: ${note}`, adminId);
    commitIncidents(incidents);
    emitUpdate(record, previous);
    return structuredClone(record);
  },

  async createFromSos(input: {
    sosId: string;
    rideId: string;
    userId: string;
    driverId: string;
    networkType: IncidentRecord["networkType"];
    title: string;
    description: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
  }): Promise<IncidentRecord> {
    const incidents = incidentsState();
    const existing = incidents.find((i) => i.sosId === input.sosId);
    if (existing) return structuredClone(existing);
    const now = new Date().toISOString();
    const record: IncidentRecord = {
      id: `inc_${input.sosId}`,
      type: "SOS",
      severity: "CRITICAL",
      status: "OPEN",
      rideId: input.rideId,
      userId: input.userId,
      driverId: input.driverId,
      sosId: input.sosId,
      networkType: input.networkType,
      title: input.title,
      description: input.description,
      locationLabel: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt: now,
      updatedAt: now,
      assignedTo: null,
      acknowledgedBy: null,
      resolvedBy: null,
      resolution: null,
      internalNotes: [],
      timeline: [
        {
          id: `inc_${input.sosId}_t1`,
          label: "Incident created from SOS",
          timestamp: now,
          actorId: "system",
        },
      ],
    };
    commitIncidents([record, ...incidents]);
    return structuredClone(record);
  },

  async syncStatusFromSos(sosId: string, status: IncidentStatus, adminId: string | null) {
    const incidents = incidentsState();
    const record = incidents.find((i) => i.sosId === sosId);
    if (!record) return null;
    if (status === "INVESTIGATING" || status === "OPEN" || status === "ESCALATED") {
      record.status = status;
    }
    if (status === "RESOLVED") {
      record.status = "RESOLVED";
      record.resolvedBy = adminId;
    }
    pushTimeline(record, `Synced from SOS → ${status}`, adminId);
    commitIncidents(incidents);
    return structuredClone(record);
  },
};
