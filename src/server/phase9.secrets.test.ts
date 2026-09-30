import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Phase 9 secret exposure guards", () => {
  it("does not embed bootstrap password in client constants", () => {
    const constants = readFileSync(
      join(process.cwd(), "src/config/constants.ts"),
      "utf8",
    );
    expect(constants).not.toMatch(/India@/);
    expect(constants).not.toMatch(/ADMIN_PASSWORD/);
    expect(constants).toMatch(/MOCK_LOGIN/);
    expect(constants).not.toMatch(/password\s*:/);
  });

  it("env example uses placeholder password only", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(example).toMatch(/ADMIN_PASSWORD=change-me-local-only/);
    expect(example).not.toMatch(/India@/);
  });

  it("DevEventSimulator is gated out of production AdminShell", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/layout/AdminShell.tsx"),
      "utf8",
    );
    expect(shell).toMatch(/NODE_ENV !== \"production\"/);
    const simulator = readFileSync(
      join(process.cwd(), "src/components/dev/DevEventSimulator.tsx"),
      "utf8",
    );
    expect(simulator).toMatch(/NODE_ENV === \"production\"/);
  });
});
