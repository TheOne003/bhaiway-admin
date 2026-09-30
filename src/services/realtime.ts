/**
 * Realtime provider boundary.
 *
 * Current: MockRealtimeService (in-process event bus).
 * Production adapter requirements:
 * - WebSocket or SSE transport with authenticated admin sessions
 * - Heartbeat + reconnect with backoff
 * - At-least-once delivery with client-side dedupe by event.id
 * - Ordered per-entity streams where safety/money events require it
 * - Durable fan-out for critical SOS events (never silently drop)
 *
 * UI must continue to consume RealtimeService only — never the mock bus directly.
 */
import type { RealtimeEvent, RealtimeListener, RealtimeService } from "@/types/realtime";

/**
 * MockRealtimeService — emits deterministic demo events.
 * Swap later for WebSocket/SSE without changing UI consumers.
 */
export class MockRealtimeService implements RealtimeService {
  private listeners = new Set<RealtimeListener>();
  private connected = false;
  private timers: ReturnType<typeof setInterval>[] = [];

  connect(): void {
    if (this.connected) return;
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Test / demo helper to push an event through the bus. */
  emit(event: RealtimeEvent): void {
    if (!this.connected) return;
    this.listeners.forEach((listener) => listener(event));
  }
}

let singleton: MockRealtimeService | null = null;

export function getRealtimeService(): RealtimeService {
  if (!singleton) {
    singleton = new MockRealtimeService();
  }
  return singleton;
}

export function getMockRealtimeService(): MockRealtimeService {
  return getRealtimeService() as MockRealtimeService;
}
