"use client";

import { useSyncExternalStore } from "react";
import { formatIstTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
}

/** Cached snapshot — React requires getSnapshot to return a stable value until subscribe notifies. */
let cachedNow = 0;

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (cachedNow === 0) cachedNow = Date.now();
  const id = window.setInterval(() => {
    cachedNow = Date.now();
    onStoreChange();
  }, 1000);
  return () => window.clearInterval(id);
}

function getClientSnapshot(): number {
  if (cachedNow === 0) cachedNow = Date.now();
  return cachedNow;
}

function getServerSnapshot(): number {
  return 0;
}

export function LiveClock({ className, showSeconds = true }: LiveClockProps) {
  const timestamp = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!timestamp) {
    return (
      <time
        className={cn("tabular-nums text-sm text-[var(--bw-text-secondary)]", className)}
        dateTime=""
        aria-label="Current time loading"
      >
        --:-- -- IST
      </time>
    );
  }

  const now = new Date(timestamp);
  const label = showSeconds
    ? formatIstTime(now)
    : formatIstTime(now).replace(/:\d{2}\s/, " ");

  return (
    <time
      className={cn("tabular-nums text-sm text-[var(--bw-text-secondary)]", className)}
      dateTime={now.toISOString()}
      data-testid="live-clock"
      aria-live="polite"
      aria-atomic="true"
    >
      {label}
    </time>
  );
}
