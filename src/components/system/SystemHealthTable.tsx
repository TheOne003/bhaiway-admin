"use client";

import { useMemo, useState } from "react";
import { ServiceStatusBadge } from "@/components/status/PriorityBadge";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { formatCategory, formatServiceStatus } from "@/lib/systemHealth";
import { formatIstDateTime, formatRelativeTime } from "@/lib/format";
import type { ServiceHealthDetail, SystemHealthSummary } from "@/types/systemHealth";

interface SystemHealthTableProps {
  health: SystemHealthSummary;
  initialServiceId?: string | null;
}

export function SystemHealthTable({ health, initialServiceId = null }: SystemHealthTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialServiceId);

  const selected = useMemo(
    () => health.services.find((s) => s.id === selectedId) ?? null,
    [health.services, selectedId],
  );

  if (health.services.length === 0) {
    return (
      <EmptyState
        title="No services"
        description="System health returned an empty service list."
      />
    );
  }

  return (
    <div data-testid="system-health-table">
      <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Response Time</th>
              <th className="px-3 py-2 font-medium">Error Rate</th>
              <th className="px-3 py-2 font-medium">Last Checked</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {health.services.map((service) => (
              <tr
                key={service.id}
                className="border-b border-[var(--bw-border)] last:border-0"
                data-testid={`service-row-${service.id}`}
                data-status={service.status}
              >
                <td className="px-3 py-2.5 font-medium text-[var(--bw-text-primary)]">
                  {service.name}
                </td>
                <td className="px-3 py-2.5 text-[var(--bw-text-secondary)]">
                  {formatCategory(service.category)}
                </td>
                <td className="px-3 py-2.5">
                  <ServiceStatusBadge status={service.status} />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[var(--bw-text-secondary)]">
                  {service.responseTimeMs == null ? "—" : `${service.responseTimeMs} ms`}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[var(--bw-text-secondary)]">
                  {service.errorRate.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-[var(--bw-text-muted)]">
                  {formatRelativeTime(service.lastCheckedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(service.id)}
                    data-testid={`view-service-${service.id}`}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.name ?? "Service"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? <ServiceDetailBody service={selected} /> : null}
      </DetailDrawer>
    </div>
  );
}

function ServiceDetailBody({ service }: { service: ServiceHealthDetail }) {
  const incidentDuration =
    service.incidentStartedAt && service.status !== "operational"
      ? formatRelativeTime(service.incidentStartedAt)
      : "—";

  return (
    <dl className="space-y-3 text-sm" data-testid="service-detail">
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Provider</dt>
        <dd>{service.provider}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Category</dt>
        <dd>{formatCategory(service.category)}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Status</dt>
        <dd>
          <ServiceStatusBadge status={service.status} />
          <span className="sr-only">{formatServiceStatus(service.status)}</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Response time</dt>
        <dd>{service.responseTimeMs == null ? "—" : `${service.responseTimeMs} ms`}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Error rate</dt>
        <dd>{service.errorRate.toFixed(1)}%</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Requests</dt>
        <dd className="tabular-nums">{service.requestCount}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Failed requests</dt>
        <dd className="tabular-nums">{service.failedRequestCount}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Last successful request</dt>
        <dd>{service.lastSuccessAt ? formatIstDateTime(new Date(service.lastSuccessAt)) : "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Last failed request</dt>
        <dd>{service.lastFailureAt ? formatIstDateTime(new Date(service.lastFailureAt)) : "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Uptime</dt>
        <dd>{service.uptimePercent.toFixed(2)}%</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--bw-text-muted)]">Incident duration</dt>
        <dd>{incidentDuration}</dd>
      </div>
      {service.status === "down" || service.status === "degraded" ? (
        <>
          <div>
            <dt className="text-xs text-[var(--bw-text-muted)]">HTTP / error</dt>
            <dd>
              {service.httpStatus ?? "—"}
              {service.errorMessage ? ` · ${service.errorMessage}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--bw-text-muted)]">Affected functionality</dt>
            <dd>
              {service.affectedFunctionality.length
                ? service.affectedFunctionality.join(", ")
                : "—"}
            </dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}
