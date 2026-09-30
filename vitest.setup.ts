import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Allow importing server-only modules in Node vitest suites.
vi.mock("server-only", () => ({}));

process.env.ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID ?? "admin";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "India@0192";
process.env.VITEST = "true";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
