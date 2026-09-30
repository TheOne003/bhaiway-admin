"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AccountStatusBadge,
  VerificationBadge,
} from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useOps } from "@/providers/OpsProvider";
import { driversService } from "@/services/drivers";
import type { DriverProfile } from "@/types/driver";

type DriverDetail = DriverProfile & {
  name: string;
  phoneMasked: string;
  email: string;
  gender: string;
  joinedAt: string;
  lastActiveAt: string;
};

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const driverId = params.id;
  const { drivers, loading, peopleError, refresh, verifications } = useOps();
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLocalLoading(true);
      try {
        const next = await driversService.getDriverById(driverId);
        if (!cancelled) {
          setDetail(next);
          setLocalError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLocalError(err instanceof Error ? err.message : "Unable to load driver.");
        }
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, drivers]);

  const driverVerifications = useMemo(
    () => (detail ? verifications.filter((v) => v.userId === detail.userId) : []),
    [verifications, detail],
  );

  const activity = useMemo(() => {
    if (!detail) return [];
    const items = [
      { id: "created", title: "Driver profile created", at: detail.createdAt },
      { id: "joined", title: "Account joined", at: detail.joinedAt },
      { id: "active", title: "Last active", at: detail.lastActiveAt },
      ...(detail.vehicle
        ? [{ id: "vehicle", title: `Vehicle linked · ${detail.vehicle.vehicleId}`, at: detail.createdAt }]
        : []),
      ...driverVerifications.map((v) => ({
        id: v.id,
        title: `${v.type.replace(/_/g, " ")} · ${v.status}`,
        at: v.updatedAt,
      })),
      {
        id: "status",
        title: `Status · ${detail.status}`,
        at: detail.updatedAt,
      },
    ];
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [detail, driverVerifications]);

  if ((loading || localLoading) && !detail) {
    return <LoadingState label="Loading driver…" />;
  }

  if ((peopleError || localError) && !detail) {
    return (
      <div className="space-y-3">
        <ErrorState
          title="Unable to load driver."
          message={localError ?? peopleError ?? "Unknown error"}
        />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-3" data-testid="driver-not-found">
        <ErrorState title="Driver not found" message={`No driver matches ${driverId}.`} />
        <Link href="/drivers">
          <Button variant="secondary">Back to drivers</Button>
        </Link>
      </div>
    );
  }

  function verHref(type: string) {
    const record = driverVerifications.find((v) => v.type === type);
    return record ? `/verification?id=${record.id}` : undefined;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="driver-detail-page">
      <Link href="/drivers" className="text-sm text-[var(--bw-brand)] hover:underline">
        ← Drivers
      </Link>

      <header className="space-y-2 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{detail.driverId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusBadge status={detail.status} />
            <span className="text-sm tabular-nums text-[var(--bw-text-secondary)]">
              Rating {detail.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </header>

      <Section title="Profile">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Name" value={detail.name} />
          <Field label="Phone" value={detail.phoneMasked} />
          <Field label="Email" value={detail.email} />
          <Field label="Gender" value={detail.gender} />
          <Field label="Joined" value={formatIstDateTime(new Date(detail.joinedAt))} />
          <Field label="Last active" value={formatIstDateTime(new Date(detail.lastActiveAt))} />
        </dl>
      </Section>

      <Section title="Verification">
        <ul className="space-y-2" data-testid="driver-verification-summary">
          <VerLink label="Government ID" status={detail.governmentIdStatus} href={verHref("GOVERNMENT_ID")} />
          <VerLink label="Driving Licence" status={detail.licenceStatus} href={verHref("DRIVING_LICENCE")} />
          <VerLink
            label="Vehicle RC"
            status={detail.vehicle?.rcStatus ?? "NOT_STARTED"}
            href={verHref("VEHICLE_RC")}
          />
          <VerLink
            label="Insurance"
            status={detail.vehicle?.insuranceStatus ?? "NOT_STARTED"}
            href={verHref("INSURANCE")}
          />
          <VerLink label="Corporate" status={detail.corporateStatus} href={verHref("CORPORATE")} />
        </ul>
      </Section>

      <Section title="Vehicle Context">
        {detail.vehicle ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="driver-vehicle-context">
            <Field label="Vehicle ID" value={detail.vehicle.vehicleId} />
            <Field label="Registration" value={detail.vehicle.registrationMasked} />
            <Field label="Manufacturer" value={detail.vehicle.make} />
            <Field label="Model" value={detail.vehicle.model} />
            <Field label="Fuel type" value={detail.vehicle.fuelType} />
            <Field label="RC status" value={detail.vehicle.rcStatus} />
            <Field label="Insurance status" value={detail.vehicle.insuranceStatus} />
          </dl>
        ) : (
          <p className="text-sm text-[var(--bw-text-secondary)]">No vehicle linked.</p>
        )}
      </Section>

      <Section title="Operations">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="driver-operations">
          <Field label="Total rides" value={String(detail.totalRides)} />
          <Field label="Completed" value={String(detail.completedRides)} />
          <Field label="Cancelled" value={String(detail.cancelledRides)} />
          <Field label="Cancellation %" value={`${detail.cancellationRate.toFixed(1)}%`} />
          <Field label="Rating" value={detail.rating.toFixed(1)} />
        </dl>
      </Section>

      <Section title="Earnings">
        <p className="text-sm text-[var(--bw-text-secondary)]">{detail.earningsSummaryNote}</p>
      </Section>

      <Section title="Activity">
        <ol className="space-y-2 text-sm" data-testid="driver-activity">
          {activity.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-3 border-b border-[var(--bw-border)] py-2 last:border-0"
            >
              <span>{item.title}</span>
              <span className="shrink-0 text-xs text-[var(--bw-text-muted)]">
                {formatIstDateTime(new Date(item.at))}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--bw-text-primary)]">{value}</dd>
    </div>
  );
}

function VerLink({
  label,
  status,
  href,
}: {
  label: string;
  status: Parameters<typeof VerificationBadge>[0]["status"];
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <VerificationBadge status={status} />
    </div>
  );
  if (!href) return <li>{content}</li>;
  return (
    <li>
      <Link
        href={href}
        className="block rounded-md px-1 py-1 hover:bg-[var(--bw-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
      >
        {content}
      </Link>
    </li>
  );
}
