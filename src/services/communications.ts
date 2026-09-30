import { notificationEngine } from "@/services/notificationEngine";
import type { CommunicationLogEntry } from "@/types/communication";
import type { NotificationFilters } from "@/types/notifications";

export interface CommunicationFilters extends NotificationFilters {
  source?: "AUTOMATION" | "CAMPAIGN" | "MANUAL" | "SYSTEM" | "ALL";
}

export const communicationsService = {
  async getActivity(filters?: CommunicationFilters): Promise<CommunicationLogEntry[]> {
    const list = await notificationEngine.getNotifications(filters);
    return list.map((n) => {
      let source: CommunicationLogEntry["source"] = "SYSTEM";
      if (n.campaignId) source = "CAMPAIGN";
      else if (n.automationId) source = "AUTOMATION";
      else source = "SYSTEM";
      if (filters?.source && filters.source !== "ALL" && source !== filters.source) {
        return null;
      }
      return {
        id: `comm_${n.id}`,
        notificationId: n.id,
        source,
        campaignId: n.campaignId,
        automationId: n.automationId,
        channel: n.channel,
        category: n.category,
        recipientUserId: n.recipientUserId,
        status: n.status,
        createdAt: n.createdAt,
        deliveredAt: n.deliveredAt,
        failedAt: n.failedAt,
        title: n.title,
      } satisfies CommunicationLogEntry;
    }).filter(Boolean) as CommunicationLogEntry[];
  },

  async getDeliveryHistory(notificationId?: string) {
    return notificationEngine.getDeliveryHistory(notificationId);
  },
};
