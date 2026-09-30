import {
  MOCK_SESSION_REMEMBER_TTL_MS,
  MOCK_SESSION_TTL_MS,
  SINGLE_ADMIN,
} from "@/mock/auth";
import type {
  AuthService,
  AuthSession,
  LoginCredentials,
  LoginResult,
} from "@/types/auth";

/**
 * Client auth service.
 *
 * Session authority is the HttpOnly cookie set by /api/auth/login.
 * localStorage holds a public profile cache for UI only — never passwords.
 * Token field is a non-secret marker; real session token is HttpOnly-only.
 */

const SESSION_STORAGE_KEY = "bw_admin_session_v1";
const COOKIE_BACKED_TOKEN = "httpOnly";

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function simulateLatency(ms = 350): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toUiSession(input: {
  admin: AuthSession["admin"];
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
}): AuthSession {
  return {
    token: COOKIE_BACKED_TOKEN,
    admin: input.admin,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    remember: input.remember,
  };
}

export const authService: AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    await simulateLatency();

    const loginId = (credentials.loginId ?? credentials.email ?? "").trim();
    const password = credentials.password;
    const remember = Boolean(credentials.remember);

    if (credentials.otpCode === "__force_2fa__") {
      return {
        ok: false,
        requiresTwoFactor: true,
        challengeId: `chal_${SINGLE_ADMIN.id}`,
        reason: "requires_2fa",
      };
    }

    // Vitest: avoid HTTP dependency; still never store password.
    if (process.env.VITEST === "true") {
      const expectedId = (process.env.ADMIN_LOGIN_ID ?? "admin").trim().toLowerCase();
      const expectedPw = process.env.ADMIN_PASSWORD ?? "";
      if (
        !expectedPw ||
        loginId.trim().toLowerCase() !== expectedId ||
        password !== expectedPw
      ) {
        return {
          ok: false,
          requiresTwoFactor: false,
          reason: "invalid_credentials",
          message: "Invalid login ID or password.",
        };
      }
      const issuedAt = new Date();
      const ttl = remember ? MOCK_SESSION_REMEMBER_TTL_MS : MOCK_SESSION_TTL_MS;
      const session = toUiSession({
        admin: { ...SINGLE_ADMIN },
        issuedAt: issuedAt.toISOString(),
        expiresAt: new Date(issuedAt.getTime() + ttl).toISOString(),
        remember,
      });
      writeStoredSession(session);
      return { ok: true, requiresTwoFactor: false, session };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ loginId, password, remember }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        admin?: AuthSession["admin"];
        issuedAt?: string;
        expiresAt?: string;
        remember?: boolean;
        message?: string;
        reason?: string;
      };

      if (!res.ok || !data.ok || !data.admin || !data.issuedAt || !data.expiresAt) {
        return {
          ok: false,
          requiresTwoFactor: false,
          reason: "invalid_credentials",
          message: data.message ?? "Invalid login ID or password.",
        };
      }

      const session = toUiSession({
        admin: data.admin,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        remember: Boolean(data.remember),
      });
      writeStoredSession(session);
      return { ok: true, requiresTwoFactor: false, session };
    } catch {
      return {
        ok: false,
        requiresTwoFactor: false,
        reason: "unknown",
        message: "Unable to sign in right now. Try again.",
      };
    }
  },

  async logout(): Promise<void> {
    await simulateLatency(120);
    try {
      if (process.env.VITEST !== "true") {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      }
    } catch {
      // still clear local cache
    }
    writeStoredSession(null);
  },

  async getSession(): Promise<AuthSession | null> {
    if (process.env.VITEST === "true") {
      return readStoredSession();
    }
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        writeStoredSession(null);
        return null;
      }
      const data = (await res.json()) as {
        ok: boolean;
        session?: {
          admin: AuthSession["admin"];
          issuedAt: string;
          expiresAt: string;
          remember: boolean;
        };
      };
      if (!data.ok || !data.session) {
        writeStoredSession(null);
        return null;
      }
      const session = toUiSession(data.session);
      writeStoredSession(session);
      return session;
    } catch {
      return readStoredSession();
    }
  },

  async refreshSession(): Promise<AuthSession | null> {
    return this.getSession();
  },
};

export function getMockLoginHint(): { loginId: string; passwordHint: string } {
  return {
    loginId: "admin",
    passwordHint: "Configured via server environment (never shown in UI).",
  };
}
