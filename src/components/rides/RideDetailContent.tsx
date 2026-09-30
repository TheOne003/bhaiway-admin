import Link from "next/link";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { RideStatusBadge, SafetyBadge } from "@/components/status/RideStatusBadge";
import { Button } from "@/components/ui/Button";
import { formatEta } from "@/lib/rideGeo";
import { formatIstDateTime, formatRelativeTime } from "@/lib/format";
import type { Ride } from "@/types/ride";

interface RideDetailContentProps {
  ride: Ride;
  compact?: boolean;
}

export function RideDetailContent({ ride, compact = false }: RideDetailContentProps) {
  const timeline = buildTimeline(ride);

  return (
    <div className="space-y-5" data-testid="ride-detail-content" data-ride-id={ride.id}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--bw-text-primary)]">
            Ride #{ride.id}
          </h2>
          <NetworkBadge network={ride.networkType} />
          <RideStatusBadge status={ride.status} />
        </div>
        <p className="text-xs text-[var(--bw-text-muted)]">{ride.city}</p>
      </header>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Route
        </h3>
        <p className="mt-1 text-sm font-medium text-[var(--bw-text-primary)]">
          {ride.route.origin.name}
        </p>
        <p className="text-xs text-[var(--bw-text-muted)]" aria-hidden>
          ↓
        </p>
        <p className="text-sm font-medium text-[var(--bw-text-primary)]">
          {ride.route.destination.name}
        </p>
        <p className="mt-1 text-xs text-[var(--bw-text-muted)]">
          {ride.route.distanceKm} km · ~{ride.route.estimatedDurationMin} min
        </p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Live
        </h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--bw-text-muted)]">Current location</dt>
            <dd className="text-right tabular-nums" data-testid="ride-current-location">
              {ride.currentLocation
                ? `${ride.currentLocation.lat.toFixed(3)}, ${ride.currentLocation.lng.toFixed(3)}`
                : "—"}
            </dd>
          </div>
          {ride.currentLocation?.label ? (
            <p className="text-xs text-[var(--bw-text-secondary)]">{ride.currentLocation.label}</p>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--bw-text-muted)]">ETA</dt>
            <dd data-testid="ride-eta">{formatEta(ride.etaMinutes)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--bw-text-muted)]">Last GPS update</dt>
            <dd data-testid="ride-gps-updated">
              {ride.currentLocation
                ? formatRelativeTime(ride.currentLocation.timestamp)
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Driver
        </h3>
        <p className="mt-1 text-sm font-medium">{ride.driver.name}</p>
        <p className="text-xs text-[var(--bw-text-secondary)]">
          Rating {ride.driver.rating.toFixed(1)} · {ride.driver.status.replace("_", " ")}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Vehicle
        </h3>
        <p className="mt-1 text-sm font-medium">{ride.vehicle.registration}</p>
        <p className="text-xs text-[var(--bw-text-secondary)]">
          {ride.vehicle.make} {ride.vehicle.model}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Passengers
        </h3>
        <p className="mt-1 text-sm">
          {ride.booked} booked · {ride.seats - ride.booked} available · {ride.seats} seats
        </p>
        {!compact && ride.passengers.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-[var(--bw-text-secondary)]">
            {ride.passengers.map((p) => (
              <li key={p.id}>
                Seat {p.seat}: {p.name}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Financial
        </h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--bw-text-muted)]">Fare</dt>
            <dd>₹{ride.fare}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--bw-text-muted)]">Security</dt>
            <dd>₹{ride.securityAmount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--bw-text-muted)]">Payment</dt>
            <dd className="capitalize">{ride.paymentStatus}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--bw-text-muted)]">OTP</dt>
            <dd className="capitalize">{ride.otpStatus.replace("_", " ")}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Safety
        </h3>
        <div className="mt-2">
          <SafetyBadge status={ride.safetyStatus} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Timeline
        </h3>
        <ol className="mt-2 space-y-2 border-l border-[var(--bw-border)] pl-3">
          {timeline.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="font-medium text-[var(--bw-text-primary)]">{item.label}</p>
              <p className="text-xs text-[var(--bw-text-muted)]">
                {formatIstDateTime(new Date(item.timestamp))}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {compact ? (
        <div className="flex flex-wrap gap-2 border-t border-[var(--bw-border)] pt-4">
          <Link href={`/rides/${ride.id}`}>
            <Button size="sm" data-testid="open-full-ride">
              Open full ride details
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => undefined}
            title="Communication APIs not connected"
          >
            Contact driver
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function buildTimeline(ride: Ride) {
  const events = [
    { id: "created", label: "Created", timestamp: ride.createdAt },
    ride.publishedAt
      ? { id: "published", label: "Published", timestamp: ride.publishedAt }
      : null,
    ride.booked > 0
      ? { id: "booked", label: "Passenger booked", timestamp: ride.createdAt }
      : null,
    { id: "accepted", label: "Driver accepted", timestamp: ride.scheduledStart },
    ride.otpStatus === "verified"
      ? {
          id: "otp",
          label: "OTP verified",
          timestamp: ride.actualStart ?? ride.scheduledStart,
        }
      : null,
    ride.actualStart
      ? { id: "started", label: "Ride started", timestamp: ride.actualStart }
      : null,
    ride.currentLocation
      ? {
          id: "current",
          label: "Current",
          timestamp: ride.currentLocation.timestamp,
        }
      : null,
  ];
  return events.filter(Boolean) as { id: string; label: string; timestamp: string }[];
}
