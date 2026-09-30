import { describe, expect, it } from "vitest";
import { formatIstTime, formatIstDate } from "@/lib/format";
import { formatAdminRole } from "@/lib/utils";
import { findNavItem, getPageTitle } from "@/config/navigation";

describe("format helpers", () => {
  it("formats IST time with timezone label", () => {
    const label = formatIstTime(new Date("2026-09-20T00:00:00.000Z"));
    expect(label).toContain("IST");
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formats IST date", () => {
    const label = formatIstDate(new Date("2026-09-20T00:00:00.000Z"));
    expect(label.length).toBeGreaterThan(0);
  });

  it("formats admin roles for display", () => {
    expect(formatAdminRole("ops_admin")).toBe("Ops Admin");
  });
});

describe("navigation", () => {
  it("resolves page titles from pathname", () => {
    expect(getPageTitle("/dashboard")).toBe("Dashboard");
    expect(getPageTitle("/safety/sos")).toBe("SOS");
    expect(findNavItem("/rides")?.href).toBe("/rides");
  });
});
