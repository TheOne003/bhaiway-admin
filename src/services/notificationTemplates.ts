import { MOCK_TEMPLATES } from "@/mock/notificationTemplates";
import { auditService } from "@/services/audit";
import {
  canTransitionTemplateStatus,
  renderTemplate,
  SAMPLE_TEMPLATE_VARS,
  validateTemplate,
} from "@/lib/notificationTemplates";
import type { NotificationTemplate, TemplateStatus } from "@/types/communication";

let templates: NotificationTemplate[] = structuredClone(MOCK_TEMPLATES);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export const notificationTemplatesService = {
  async getTemplates(): Promise<NotificationTemplate[]> {
    assertOk();
    return structuredClone(templates);
  },

  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    assertOk();
    const t = templates.find((x) => x.id === id);
    return t ? structuredClone(t) : null;
  },

  async setStatus(
    id: string,
    status: TemplateStatus,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<NotificationTemplate> {
    assertOk();
    const current = templates.find((t) => t.id === id);
    if (!current) throw new Error("Template not found.");
    if (!canTransitionTemplateStatus(current.status, status)) {
      throw new Error(`Cannot transition template from ${current.status} to ${status}.`);
    }
    if (status === "ACTIVE") {
      const v = validateTemplate(current);
      if (!v.valid) throw new Error(v.errors.join(" "));
    }
    const updated = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: input.adminId,
    };
    templates = templates.map((t) => (t.id === id ? updated : t));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "comms.template_status_changed",
      targetType: "notification_template",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  preview(id: string, vars: Record<string, string> = SAMPLE_TEMPLATE_VARS) {
    const t = templates.find((x) => x.id === id);
    if (!t) throw new Error("Template not found.");
    return renderTemplate(t.body, vars, t.subject);
  },

  validateTemplate,
  renderTemplate,

  __resetForTests() {
    templates = structuredClone(MOCK_TEMPLATES);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
