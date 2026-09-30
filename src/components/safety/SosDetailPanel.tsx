import Link from "next/link";
import {
  SeverityBadge,
  SosStatusBadge,
} from "@/components/status/SafetyBadges";
import { NetworkBadge } from "@/components/status/NetworkBadge";
import { formatIstDateTime } from "@/lib/format";
import type { SOSRecord } from "@/types/sos";

interface SosDetailPanelProps {
  record: SOSRecord;
  userLabel?: (userId: string) => string;
}

export function SosDetailPanel({ record, userLabel }: SosDetailPanelProps) {
  const name = userLabel ?? ((id: string) => id);

  return (
    <div className="space-y-4" data-testid="sos-detail">
      <dl className="grid gap-3 text-sm">
        <DetailField label="SOS ID" value={record.id} />
        <DetailField
          label="Ride"
          value={
            <Link href={`/rides/${record.rideId}`} className="text-[var(--bw-brand)] hover:underline">
              {record.rideId}
            </Link>
          }
        />
        <DetailField label="Network" value={<NetworkBadge network={record.networkType} />} />
        <DetailField label="Status" value={<SosStatusBadge status={record.status} />} />
        <DetailField label="Severity" value={<SeverityBadge severity={record.severity} />} />
        <DetailField label="Category" value={record.category.replace(/_/g, " ")} />
        <DetailField label="Location" value={record.locationLabel} />
        <DetailField
          label="Coordinates"
          value={`${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`}
        />
        <DetailField
          label="Triggered by"
          value={`${name(record.triggeredByUserId)} (${record.triggeredByUserId})`}
        />
        <DetailField label="Driver ID" value={record.driverId} />
        <DetailField
          label="Triggered at"
          value={formatIstDateTime(new Date(record.triggeredAt))}
        />
        <DetailField
          label="Acknowledged"
          value={
            record.acknowledgedAt
              ? `${formatIstDateTime(new Date(record.acknowledgedAt))} · ${record.acknowledgedBy ?? "—"}`
              : "—"
          }
        />
        <DetailField
          label="Response started"
          value={
            record.responseStartedAt
              ? formatIstDateTime(new Date(record.responseStartedAt))
              : "—"
          }
        />
        <DetailField
          label="Resolved"
          value={
            record.resolvedAt
              ? `${formatIstDateTime(new Date(record.resolvedAt))} · ${record.resolvedBy ?? "—"}`
              : "—"
          }
        />
      </dl>

      {record.notes.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
            Notes
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--bw-text-secondary)]">
            {record.notes.map((note, i) => (
              <li key={`${record.id}_note_${i}`} className="rounded border border-[var(--bw-border)] px-2 py-1">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bw-text-muted)]">
          Timeline
        </h3>
        <ol className="mt-2 space-y-2 text-sm">
          {record.timeline.map((entry) => (
            <li key={entry.id} className="border-l-2 border-[var(--bw-border)] pl-3">
              <div className="font-medium text-[var(--bw-text-primary)]">{entry.label}</div>
              <div className="text-xs text-[var(--bw-text-muted)]">
                {formatIstDateTime(new Date(entry.timestamp))}
                {entry.actorId ? ` · ${entry.actorId}` : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--bw-text-primary)]">{value}</dd>
    </div>
  );
}
