import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LiveClock } from "@/components/layout/LiveClock";

describe("LiveClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the displayed time without refresh", () => {
    render(<LiveClock />);
    const first = screen.getByTestId("live-clock").textContent;
    expect(first).toContain("IST");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const second = screen.getByTestId("live-clock").textContent;
    expect(second).toContain("IST");
    expect(second).not.toBe(first);
  });
});
