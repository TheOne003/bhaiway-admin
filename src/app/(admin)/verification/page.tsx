"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { VerificationBadge } from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { auditService } from "@/services/audit";
import { emitVerificationStatusChange } from "@/services/realtimeBridge";
import { filterVerifications, verificationService } from "@/services/verification";
import type { VerificationRecord, VerificationStatus, VerificationType } from "@/types/verification";

const TABS: { id: VerificationType; label: string }[] = [
  { id: "GOVERNMENT_ID", label: "Government ID" },
  { id: "DRIVING_LICENCE", label: "Driving Licence" },
  { id: "VEHICLE_RC", label: "Vehicle RC" },
  { id: "INSURANCE", label: "Insurance" },
  { id: "CORPORATE", label: "Corporate" },
];

export default function VerificationPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading verification…" />}>
      <VerificationPageInner />
    </Suspense>
  );
}

function VerificationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const { verifications, users, loading, peopleError, refresh } = useOps();
  const { session } = useAuth();
  const [tab, setTab] = useState<VerificationType>("GOVERNMENT_ID");
  const [status, setStatus] = useState<VerificationStatus | "ALL">("ALL");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [failId, setFailId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () => filterVerifications(verifications, { type: tab, status }),
    [verifications, tab, status],
  );

  const selected = useMemo(
    () => verifications.find((v) => v.id === selectedId) ?? null,
    [verifications, selectedId],
  );

  const userName = useCallback(
    (userId: string) => users.find((u) => u.id === userId)?.name ?? userId,
    [users],
  );

  function openDetail(id: string) {
    router.replace(`/verification?id=${id}`, { scroll: false });
  }

  function closeDetail() {
    router.replace("/verification", { scroll: false });
  }

  async function afterMutation(
    record: VerificationRecord,
    previousStatus: VerificationStatus,
    action: string,
    reason?: string,
  ) {
    await auditService.record({
      adminId: session?.admin.id ?? "adm_001",
      adminName: session?.admin.name ?? "Admin",
      action,
      targetType: "verification",
      targetId: record.id,
      oldValue: { status: previousStatus },
      newValue: { status: record.status },
      reason,
    });
    emitVerificationStatusChange({
      verificationId: record.id,
      userId: record.userId,
      type: record.type,
      previousStatus,
      newStatus: record.status,
      timestamp: new Date().toISOString(),
    });
    await refresh();
  }

  if (loading && verifications.length === 0) {
    return <LoadingState label="Loading verification…" />;
  }

  if (peopleError && verifications.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load verifications." message={peopleError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-testid="verification-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verification</h1>
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Identity and document queues. Corporate is optional and does not block approval.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" data-testid="verification-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              tab === item.id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
            data-testid={`verification-tab-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="sr-only">Status filter</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VerificationStatus | "ALL")}
            className="h-10 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
            data-testid="verification-status-filter"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="MANUAL_REVIEW">Manual Review</option>
            <option value="APPROVED">Approved</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No verifications in queue" description="Try another tab or status." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="verification-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase tracking-wide text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Verification ID</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--bw-border)] last:border-0"
                  data-testid={`verification-row-${item.id}`}
                  data-status={item.status}
                  data-type={item.type}
                >
                  <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                  <td className="px-3 py-2">
                    <div>{userName(item.userId)}</div>
                    <div className="text-xs text-[var(--bw-text-muted)]">{item.userId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{item.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <VerificationBadge status={item.status} />
                    {item.requirement === "optional" ? (
                      <span className="ml-1 text-[10px] uppercase text-[var(--bw-text-muted)]">
                        optional
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.provider}</td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.submittedAt))}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatIstDateTime(new Date(item.updatedAt))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                      onClick={() => openDetail(item.id)}
                      data-testid={`verification-open-${item.id}`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        title={selected ? `Verification ${selected.id}` : "Verification"}
        onClose={closeDetail}
      >
        {selected ? (
          <div className="space-y-4" data-testid="verification-detail">
            <dl className="grid gap-3 text-sm">
              <DetailField label="Verification ID" value={selected.id} />
              <DetailField
                label="User"
                value={
                  <Link
                    href={`/users/${selected.userId}`}
                    className="text-[var(--bw-brand)] hover:underline"
                  >
                    {userName(selected.userId)} ({selected.userId})
                  </Link>
                }
              />
              <DetailField label="Type" value={selected.type.replace(/_/g, " ")} />
              <DetailField
                label="Status"
                value={<VerificationBadge status={selected.status} />}
              />
              <DetailField
                label="Requirement"
                value={selected.requirement === "optional" ? "Optional" : "Required"}
              />
              <DetailField label="Provider" value={selected.provider} />
              <DetailField label="Masked reference" value={selected.maskedReference} />
              <DetailField
                label="Submitted"
                value={formatIstDateTime(new Date(selected.submittedAt))}
              />
              <DetailField
                label="Reviewed"
                value={
                  selected.reviewedAt
                    ? formatIstDateTime(new Date(selected.reviewedAt))
                    : "—"
                }
              />
              <DetailField label="Reviewed by" value={selected.reviewedBy ?? "—"} />
              {selected.failureReason ? (
                <DetailField label="Failure reason" value={selected.failureReason} />
              ) : null}
              {Object.keys(selected.metadata).length > 0 ? (
                <DetailField
                  label="Provider metadata"
                  value={Object.entries(selected.metadata)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                />
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-[var(--bw-border)] pt-4">
              {selected.status !== "APPROVED" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => setApproveId(selected.id)}
                  data-testid="verification-approve"
                >
                  Approve
                </Button>
              ) : null}
              {selected.status !== "FAILED" ? (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => setFailId(selected.id)}
                  data-testid="verification-reject"
                >
                  Reject / Fail
                </Button>
              ) : null}
              {selected.status !== "MANUAL_REVIEW" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setReviewId(selected.id)}
                  data-testid="verification-manual-review"
                >
                  Send to Manual Review
                </Button>
              ) : null}
              {(selected.status === "FAILED" || selected.status === "PENDING") && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setRetryId(selected.id)}
                  data-testid="verification-retry"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ErrorState title="Verification not found" message="Record may have been removed." />
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={approveId != null}
        title="Approve verification"
        description="Confirm approval. This action is audit-logged."
        confirmLabel="Confirm"
        onCancel={() => setApproveId(null)}
        onConfirm={() => {
          if (!approveId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await verificationService.getVerificationById(approveId);
              if (!current) return;
              const result = await verificationService.approve(
                approveId,
                session?.admin.id ?? "adm_001",
              );
              if (result) await afterMutation(result, current.status, "verification.approve");
            } finally {
              setBusy(false);
              setApproveId(null);
            }
          })();
        }}
      />

      <ReasonConfirmDialog
        open={failId != null}
        title="Reject Verification"
        description="Provide a reason. This action is audit-logged."
        confirmLabel="Confirm"
        reasonLabel="Reason"
        danger
        onCancel={() => setFailId(null)}
        onConfirm={(reason) => {
          if (!failId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await verificationService.getVerificationById(failId);
              if (!current) return;
              const result = await verificationService.fail(
                failId,
                reason,
                session?.admin.id ?? "adm_001",
              );
              if (result) {
                await afterMutation(result, current.status, "verification.fail", reason);
              }
            } finally {
              setBusy(false);
              setFailId(null);
            }
          })();
        }}
      />

      <ReasonConfirmDialog
        open={reviewId != null}
        title="Send to Manual Review"
        description="Provide a review reason. This action is audit-logged."
        confirmLabel="Confirm"
        reasonLabel="Reason"
        onCancel={() => setReviewId(null)}
        onConfirm={(reason) => {
          if (!reviewId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await verificationService.getVerificationById(reviewId);
              if (!current) return;
              const result = await verificationService.sendToManualReview(
                reviewId,
                reason,
                session?.admin.id ?? "adm_001",
              );
              if (result) {
                await afterMutation(result, current.status, "verification.manual_review", reason);
              }
            } finally {
              setBusy(false);
              setReviewId(null);
            }
          })();
        }}
      />

      <ConfirmDialog
        open={retryId != null}
        title="Retry verification"
        description="Retry may trigger a provider call in production. Confirm to continue."
        confirmLabel="Confirm"
        onCancel={() => setRetryId(null)}
        onConfirm={() => {
          if (!retryId) return;
          void (async () => {
            setBusy(true);
            try {
              const current = await verificationService.getVerificationById(retryId);
              if (!current) return;
              const result = await verificationService.retry(retryId);
              if (result) await afterMutation(result, current.status, "verification.retry");
            } finally {
              setBusy(false);
              setRetryId(null);
            }
          })();
        }}
      />
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
