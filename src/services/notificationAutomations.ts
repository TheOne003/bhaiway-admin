import { MOCK_AUTOMATIONS } from "@/mock/notificationAutomations";
import { auditService } from "@/services/audit";
import type {
  AutomationCondition,
  AutomationStatus,
  NotificationAutomation,
} from "@/types/communication";

let automations: NotificationAutomation[] = structuredClone(MOCK_AUTOMATIONS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function evaluateConditions(
  conditions: AutomationCondition[],
  payload: Record<string, unknown>,
): boolean {
  return conditions.every((c) => {
    const raw = payload[c.field];
    const value = raw == null ? "" : String(raw);
    if (c.op === "eq") return value === String(c.value);
    if (c.op === "neq") return value !== String(c.value);
    if (c.op === "in") {
      const list = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)];
      return list.includes(value);
    }
    return false;
  });
}

export const notificationAutomationsService = {
  async getAutomations(): Promise<NotificationAutomation[]> {
    assertOk();
    return structuredClone(automations);
  },

  async getAutomationById(id: string): Promise<NotificationAutomation | null> {
    assertOk();
    const a = automations.find((x) => x.id === id);
    return a ? structuredClone(a) : null;
  },

  async getActiveForEvent(eventType: string): Promise<NotificationAutomation[]> {
    assertOk();
    return structuredClone(
      automations.filter((a) => a.status === "ACTIVE" && a.eventType === eventType),
    );
  },

  async setStatus(
    id: string,
    status: AutomationStatus,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<NotificationAutomation> {
    assertOk();
    const current = automations.find((a) => a.id === id);
    if (!current) throw new Error("Automation not found.");
    const updated = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: input.adminId,
    };
    automations = automations.map((a) => (a.id === id ? updated : a));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "comms.automation_status_changed",
      targetType: "notification_automation",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  evaluateConditions,

  __resetForTests() {
    automations = structuredClone(MOCK_AUTOMATIONS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
