import type { RideNetwork } from "@/types/network";
import { RIDE_NETWORK_LABELS } from "@/types/network";
import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  network: RideNetwork;
  className?: string;
}

export function NetworkBadge({ network, className }: NetworkBadgeProps) {
  const isOffice = network === "OFFICE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        isOffice
          ? "border-[var(--bw-office-border)] bg-[var(--bw-office-soft)] text-[var(--bw-office)]"
          : "border-[var(--bw-outstation-border)] bg-[var(--bw-outstation-soft)] text-[var(--bw-outstation)]",
        className,
      )}
      data-network={network}
    >
      <span aria-hidden>{isOffice ? "▣" : "◇"}</span>
      {network}
      <span className="sr-only">{RIDE_NETWORK_LABELS[network]}</span>
    </span>
  );
}
