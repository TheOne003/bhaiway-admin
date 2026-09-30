"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

interface ThemeSwitcherProps {
  className?: string;
  compact?: boolean;
}

function subscribe() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeSwitcher({ className, compact = false }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 items-center rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-1",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-0.5",
        className,
      )}
      data-testid="theme-switcher"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bw-bg)]",
              active
                ? "bg-[var(--bw-elevated)] text-[var(--bw-text-primary)] shadow-sm"
                : "text-[var(--bw-text-muted)] hover:text-[var(--bw-text-secondary)]",
            )}
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={label}
            data-testid={`theme-${value}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
