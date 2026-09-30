import type { NotificationChannel } from "@/types/notifications";

export interface ChannelSendInput {
  notificationId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  subject?: string | null;
  attemptNumber: number;
}

export interface ChannelSendResult {
  status: "SENT" | "DELIVERED" | "FAILED";
  provider: string;
  providerReference: string;
  failureReason: string | null;
  deliveredAt: string | null;
}

export interface NotificationChannelProvider {
  readonly id: string;
  readonly channel: NotificationChannel;
  send(input: ChannelSendInput): Promise<ChannelSendResult>;
}

function mockRef(prefix: string, notificationId: string, attempt: number): string {
  return `MOCK-${prefix}-${notificationId}-${attempt}`;
}

export const mockInAppProvider: NotificationChannelProvider = {
  id: "mock-inapp",
  channel: "IN_APP",
  async send(input) {
    return {
      status: "DELIVERED",
      provider: "mock-inapp",
      providerReference: mockRef("INAPP", input.notificationId, input.attemptNumber),
      failureReason: null,
      deliveredAt: new Date().toISOString(),
    };
  },
};

export const mockPushProvider: NotificationChannelProvider = {
  id: "mock-push",
  channel: "PUSH",
  async send(input) {
    return {
      status: "SENT",
      provider: "mock-push",
      providerReference: mockRef("PUSH", input.notificationId, input.attemptNumber),
      failureReason: null,
      deliveredAt: null,
    };
  },
};

export const mockSmsProvider: NotificationChannelProvider = {
  id: "mock-sms",
  channel: "SMS",
  async send(input) {
    // Deterministic failure for specific synthetic id suffix
    if (input.notificationId.endsWith("_fail")) {
      return {
        status: "FAILED",
        provider: "mock-sms",
        providerReference: mockRef("SMS", input.notificationId, input.attemptNumber),
        failureReason: "Mock SMS gateway timeout",
        deliveredAt: null,
      };
    }
    return {
      status: "SENT",
      provider: "mock-sms",
      providerReference: mockRef("SMS", input.notificationId, input.attemptNumber),
      failureReason: null,
      deliveredAt: null,
    };
  },
};

export const mockEmailProvider: NotificationChannelProvider = {
  id: "mock-email",
  channel: "EMAIL",
  async send(input) {
    return {
      status: "DELIVERED",
      provider: "mock-email",
      providerReference: mockRef("EMAIL", input.notificationId, input.attemptNumber),
      failureReason: null,
      deliveredAt: new Date().toISOString(),
    };
  },
};

export const mockWhatsAppProvider: NotificationChannelProvider = {
  id: "mock-whatsapp",
  channel: "WHATSAPP",
  async send(input) {
    return {
      status: "SENT",
      provider: "mock-whatsapp",
      providerReference: mockRef("WA", input.notificationId, input.attemptNumber),
      failureReason: null,
      deliveredAt: null,
    };
  },
};

const PROVIDERS: Record<NotificationChannel, NotificationChannelProvider> = {
  IN_APP: mockInAppProvider,
  PUSH: mockPushProvider,
  SMS: mockSmsProvider,
  EMAIL: mockEmailProvider,
  WHATSAPP: mockWhatsAppProvider,
};

export function getChannelProvider(channel: NotificationChannel): NotificationChannelProvider {
  return PROVIDERS[channel];
}
