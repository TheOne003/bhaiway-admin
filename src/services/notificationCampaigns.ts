import { MOCK_CAMPAIGNS } from "@/mock/notificationCampaigns";
import { resolveAudience } from "@/services/audience";
import { auditService } from "@/services/audit";
import { notificationEngine } from "@/services/notificationEngine";
import { notificationTemplatesService } from "@/services/notificationTemplates";
import type { CampaignStatus, NotificationCampaign } from "@/types/communication";

let campaigns: NotificationCampaign[] = structuredClone(MOCK_CAMPAIGNS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export interface CampaignValidationResult {
  valid: boolean;
  errors: string[];
  recipientCount: number;
}

export async function validateCampaignStart(
  campaign: NotificationCampaign,
): Promise<CampaignValidationResult> {
  const errors: string[] = [];
  const template = await notificationTemplatesService.getTemplateById(campaign.templateId);
  if (!template || template.status !== "ACTIVE") errors.push("Template must be ACTIVE.");
  const recipients = resolveAudience(campaign.audience);
  if (recipients.length === 0) errors.push("Audience resolved to zero recipients.");
  if (campaign.channels.length === 0) errors.push("At least one channel is required.");
  if (template) {
    for (const ch of campaign.channels) {
      if (!template.channels.includes(ch)) {
        errors.push(`Channel ${ch} not supported by template.`);
      }
    }
  }
  return { valid: errors.length === 0, errors, recipientCount: recipients.length };
}

export const notificationCampaignsService = {
  async getCampaigns(): Promise<NotificationCampaign[]> {
    assertOk();
    return structuredClone(campaigns);
  },

  async getCampaignById(id: string): Promise<NotificationCampaign | null> {
    assertOk();
    const c = campaigns.find((x) => x.id === id);
    return c ? structuredClone(c) : null;
  },

  async validateStart(id: string): Promise<CampaignValidationResult> {
    const c = await this.getCampaignById(id);
    if (!c) throw new Error("Campaign not found.");
    return validateCampaignStart(c);
  },

  async startCampaign(
    id: string,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<NotificationCampaign> {
    assertOk();
    const current = campaigns.find((c) => c.id === id);
    if (!current) throw new Error("Campaign not found.");
    if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(current.status)) {
      throw new Error(`Cannot start campaign in status ${current.status}.`);
    }
    const validation = await validateCampaignStart(current);
    if (!validation.valid) throw new Error(validation.errors.join(" "));

    const now = new Date().toISOString();
    const result = await notificationEngine.runCampaign(current);
    const updated: NotificationCampaign = {
      ...current,
      status: "COMPLETED",
      startedAt: current.startedAt ?? now,
      completedAt: now,
      recipientCount: validation.recipientCount,
      deliveredCount: result.delivered,
      failedCount: result.failed,
      updatedAt: now,
    };
    campaigns = campaigns.map((c) => (c.id === id ? updated : c));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "comms.campaign_started",
      targetType: "notification_campaign",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status: updated.status, delivered: result.delivered },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  async setStatus(
    id: string,
    status: CampaignStatus,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<NotificationCampaign> {
    assertOk();
    const current = campaigns.find((c) => c.id === id);
    if (!current) throw new Error("Campaign not found.");
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    campaigns = campaigns.map((c) => (c.id === id ? updated : c));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "comms.campaign_status_changed",
      targetType: "notification_campaign",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status },
      reason: input.reason,
    });
    return structuredClone(updated);
  },

  __resetForTests() {
    campaigns = structuredClone(MOCK_CAMPAIGNS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
