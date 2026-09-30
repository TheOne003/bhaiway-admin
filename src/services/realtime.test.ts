import { describe, expect, it } from "vitest";
import { MockRealtimeService } from "@/services/realtime";

describe("MockRealtimeService", () => {
  it("delivers events to subscribers only while connected", () => {
    const bus = new MockRealtimeService();
    const received: string[] = [];
    bus.subscribe((event) => received.push(event.type));

    bus.emit({
      id: "evt_1",
      type: "sos.activated",
      timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(received).toHaveLength(0);

    bus.connect();
    bus.emit({
      id: "evt_2",
      type: "notification.created",
      timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(received).toEqual(["notification.created"]);
  });
});
