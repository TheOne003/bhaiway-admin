export type AdminRole =
  | "super_admin"
  | "ops_admin"
  | "support_agent"
  | "safety_officer"
  | "finance_admin"
  | "viewer";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarInitials: string;
}

export interface AuthSession {
  token: string;
  admin: AdminUser;
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
}

export interface LoginCredentials {
  /** Login ID (temporary single-admin uses "admin"). */
  loginId?: string;
  /** @deprecated Prefer loginId — retained for compatibility. */
  email?: string;
  password: string;
  remember?: boolean;
  /** Reserved for future 2FA/OTP integration. */
  otpCode?: string;
}

export type LoginFailureReason =
  | "invalid_credentials"
  | "session_expired"
  | "requires_2fa"
  | "account_locked"
  | "unknown";

export interface LoginSuccess {
  ok: true;
  session: AuthSession;
  requiresTwoFactor: false;
}

export interface LoginRequiresTwoFactor {
  ok: false;
  requiresTwoFactor: true;
  challengeId: string;
  reason: "requires_2fa";
}

export interface LoginFailure {
  ok: false;
  requiresTwoFactor: false;
  reason: Exclude<LoginFailureReason, "requires_2fa">;
  message: string;
}

export type LoginResult = LoginSuccess | LoginRequiresTwoFactor | LoginFailure;

export interface AuthService {
  login(credentials: LoginCredentials): Promise<LoginResult>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
}
