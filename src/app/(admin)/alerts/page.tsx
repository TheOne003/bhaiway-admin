"use client";

import { AlertsPanel } from "@/components/alerts/AlertsPanel";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useOps } from "@/providers/OpsProvider";

export default function AlertsPage() {
  const { alerts, loading, error, refresh, acknowledgeAlert, resolveAlert } = useOps();

  if (loading && alerts.length === 0) {
    return <LoadingState label="Loading alerts…" />;
  }

  if (error && alerts.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <ErrorState title="Alerts unavailable" message={error} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="alerts-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Operational alerts across system health, safety, and support signals.
        </p>
      </header>
      <AlertsPanel
        alerts={alerts}
        onAcknowledge={acknowledgeAlert}
        onResolve={resolveAlert}
      />
    </div>
  );
}
