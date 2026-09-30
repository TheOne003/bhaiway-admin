"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RideDetailContent } from "@/components/rides/RideDetailContent";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useOps } from "@/providers/OpsProvider";

export default function RideDetailPage() {
  const params = useParams<{ id: string }>();
  const rideId = params.id;
  const { getRide, loading, ridesError, refresh, rides } = useOps();
  const ride = getRide(rideId);

  if (loading && rides.length === 0) {
    return <LoadingState label="Loading ride…" />;
  }

  if (ridesError && !ride) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load ride." message={ridesError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="space-y-3" data-testid="ride-not-found">
        <ErrorState title="Ride not found" message={`No ride matches ${rideId}.`} />
        <Link href="/rides">
          <Button variant="secondary">Back to rides</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="ride-detail-page">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/rides" className="text-sm text-[var(--bw-brand)] hover:underline">
          ← Rides
        </Link>
        <Link
          href={`/live-map?ride=${ride.id}`}
          className="text-sm text-[var(--bw-brand)] hover:underline"
        >
          View on Live Map
        </Link>
      </div>
      <div className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5">
        <RideDetailContent ride={ride} />
      </div>
    </div>
  );
}
