"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/bhaiway/BrandMark";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/States";
import { PRODUCT_TAGLINE } from "@/config/constants";
import { useAuth } from "@/providers/AuthProvider";

function LoginForm() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ loginId?: string; password?: string }>({});

  const banner = useMemo(() => {
    if (reason === "session_expired") {
      return "Your session expired. Please sign in again.";
    }
    return null;
  }, [reason]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  function validate(): boolean {
    const next: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) next.loginId = "Login ID is required.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await login({ loginId, password, remember });
      if (result.ok) {
        router.replace("/dashboard");
        return;
      }
      if (result.requiresTwoFactor) {
        setFormError("Two-factor authentication is required. OTP flow will be enabled in a later phase.");
        return;
      }
      setFormError(result.message);
    } catch {
      setFormError("Unable to sign in right now. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Preparing login…" />;
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in srgb, var(--bw-brand) 22%, transparent), transparent 55%), var(--bw-bg)",
        }}
        aria-hidden
      />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <BrandMark showTagline />
          <p className="mt-3 text-sm text-[var(--bw-text-secondary)]">
            Operations Control Center
          </p>
        </div>
        <ThemeSwitcher compact />
      </div>

      <div className="rounded-xl border-2 border-[var(--bw-brand)]/25 bg-[var(--bw-surface)] p-6 shadow-lg shadow-[var(--bw-brand)]/10">
        <h1 className="text-xl font-semibold text-[var(--bw-brand)]">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{PRODUCT_TAGLINE}</p>

        {banner ? (
          <p
            className="mt-4 rounded-md border border-[var(--bw-warning)] bg-[var(--bw-warning-soft)] px-3 py-2 text-sm text-[var(--bw-warning)]"
            role="status"
            data-testid="session-expired-banner"
          >
            {banner}
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate data-testid="login-form">
          <Input
            label="Login ID"
            name="loginId"
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            error={fieldErrors.loginId}
            placeholder="admin"
          />

          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <button
              type="button"
              className="absolute right-2 top-8 inline-flex h-8 w-8 items-center justify-center rounded text-[var(--bw-text-muted)] hover:text-[var(--bw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              data-testid="toggle-password"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--bw-text-secondary)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--bw-border)]"
              />
              Remember session
            </label>
            <button
              type="button"
              className="text-sm text-[var(--bw-brand)] hover:underline"
              onClick={() =>
                setFormError("Password reset will be available when identity APIs are connected.")
              }
            >
              Forgot password?
            </button>
          </div>

          {formError ? (
            <p className="text-sm text-[var(--bw-danger)]" role="alert" data-testid="login-error">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={submitting} data-testid="login-submit">
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--bw-text-muted)]">
        Mock authentication only. No production credentials.{" "}
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>{" "}
        requires a session.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading login…" />}>
      <LoginForm />
    </Suspense>
  );
}
