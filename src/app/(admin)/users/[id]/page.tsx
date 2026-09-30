"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AccountStatusBadge,
  UserTypeBadge,
  VerificationBadge,
} from "@/components/status/PeopleBadges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/DetailDrawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { auditService } from "@/services/audit";
import {
  emitUserStatusChange,
} from "@/services/realtimeBridge";
import {
  nextStatusForAction,
  usersService,
  type UserStatusAction,
} from "@/services/users";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { getUser, users, loading, peopleError, refresh, verifications } = useOps();
  const { session } = useAuth();
  const user = getUser(userId);
  const [pendingAction, setPendingAction] = useState<UserStatusAction | null>(null);
  const [busy, setBusy] = useState(false);

  const userVerifications = useMemo(
    () => verifications.filter((v) => v.userId === userId),
    [verifications, userId],
  );

  const activity = useMemo(() => {
    if (!user) return [];
    const items = [
      { id: "joined", title: "Account created", at: user.joinedAt },
      { id: "active", title: "Last active", at: user.lastActiveAt },
      ...userVerifications.map((v) => ({
        id: v.id,
        title: `${v.type.replace(/_/g, " ")} · ${v.status}`,
        at: v.updatedAt,
      })),
    ];
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [user, userVerifications]);

  if (loading && users.length === 0) {
    return <LoadingState label="Loading user…" />;
  }

  if (peopleError && !user) {
    return (
      <div className="space-y-3">
        <ErrorState title="Unable to load user." message={peopleError} />
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3" data-testid="user-not-found">
        <ErrorState title="User not found" message={`No user matches ${userId}.`} />
        <Link href="/users">
          <Button variant="secondary">Back to users</Button>
        </Link>
      </div>
    );
  }

  async function runAction(action: UserStatusAction) {
    if (!user) return;
    setBusy(true);
    try {
      const previous = user.status;
      const next = nextStatusForAction(action, previous);
      await usersService.updateUserStatus(user.id, next.status, {
        bookingRestricted: next.bookingRestricted,
        publishingRestricted: next.publishingRestricted,
      });
      await auditService.record({
        adminId: session?.admin.id ?? "adm_001",
        adminName: session?.admin.name ?? "Admin",
        action: `user.${action}`,
        targetType: "user",
        targetId: user.id,
        oldValue: { status: previous },
        newValue: { ...next },
        reason: `Admin action: ${action}`,
      });
      emitUserStatusChange({
        userId: user.id,
        previousStatus: previous,
        newStatus: next.status,
        timestamp: new Date().toISOString(),
      });
      await refresh();
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="user-detail-page">
      <Link href="/users" className="text-sm text-[var(--bw-brand)] hover:underline">
        ← Users
      </Link>

      <header className="space-y-2 rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-1 text-sm text-[var(--bw-text-secondary)]">{user.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <UserTypeBadge type={user.userType} />
            <AccountStatusBadge status={user.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/notifications?compose=1&userId=${encodeURIComponent(user.id)}`}>
            <Button size="sm" variant="secondary" data-testid="user-send-notification">
              Send Notification
            </Button>
          </Link>
          <Link href={`/support?userId=${encodeURIComponent(user.id)}`}>
            <Button size="sm" variant="secondary" data-testid="user-contact">
              Contact User
            </Button>
          </Link>
          <Link href={`/rides?search=${encodeURIComponent(user.id)}`}>
            <Button size="sm" variant="ghost">
              Rides
            </Button>
          </Link>
          <Link href={`/verification?userId=${encodeURIComponent(user.id)}`}>
            <Button size="sm" variant="ghost">
              Verification
            </Button>
          </Link>
          <Link href={`/wallet?userId=${encodeURIComponent(user.id)}`}>
            <Button size="sm" variant="ghost">
              Wallet
            </Button>
          </Link>
          {user.status !== "SUSPENDED" ? (
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => setPendingAction("suspend")}
              data-testid="user-action-suspend"
            >
              Suspend
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => setPendingAction("reactivate")}
              data-testid="user-action-reactivate"
            >
              Reactivate
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setPendingAction("restrict_booking")}
            data-testid="user-action-restrict-booking"
          >
            Restrict Booking
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setPendingAction("restrict_publishing")}
            data-testid="user-action-restrict-publishing"
          >
            Restrict Ride Publishing
          </Button>
        </div>
      </header>

      <Section title="Overview">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Phone" value={user.phoneMasked} />
          <Field label="Gender" value={user.gender} />
          <Field label="Joined" value={formatIstDateTime(new Date(user.joinedAt))} />
          <Field label="Last active" value={formatIstDateTime(new Date(user.lastActiveAt))} />
          <Field label="Rating" value={user.rating.toFixed(1)} />
        </dl>
      </Section>

      <Section title="Verification">
        <ul className="space-y-2" data-testid="user-verification-summary">
          <VerificationRow
            label="Government ID"
            status={user.governmentVerificationStatus}
            href={
              userVerifications.find((v) => v.type === "GOVERNMENT_ID")
                ? `/verification?id=${userVerifications.find((v) => v.type === "GOVERNMENT_ID")!.id}`
                : undefined
            }
          />
          <VerificationRow
            label="Corporate"
            status={user.corporateVerificationStatus}
            href={
              userVerifications.find((v) => v.type === "CORPORATE")
                ? `/verification?id=${userVerifications.find((v) => v.type === "CORPORATE")!.id}`
                : undefined
            }
          />
        </ul>
      </Section>

      <Section title="Ride Summary">
        <p className="text-sm tabular-nums">Total rides: {user.totalRides}</p>
        <Link
          href={`/rides?search=${encodeURIComponent(user.id)}`}
          className="mt-2 inline-block text-sm text-[var(--bw-brand)] hover:underline"
        >
          View rides →
        </Link>
      </Section>

      <Section title="Activity">
        {activity.length === 0 ? (
          <EmptyState title="No activity" />
        ) : (
          <ol className="space-y-2 text-sm" data-testid="user-activity">
            {activity.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-[var(--bw-border)] py-2 last:border-0">
                <span>{item.title}</span>
                <span className="shrink-0 text-xs text-[var(--bw-text-muted)]">
                  {formatIstDateTime(new Date(item.at))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Safety Summary">
        <p className="text-sm text-[var(--bw-text-secondary)]">
          Safety and SOS workflows are available in a later phase.
        </p>
      </Section>

      <Section title="Wallet Summary">
        <Link
          href={`/wallet?userId=${encodeURIComponent(user.id)}`}
          className="text-sm text-[var(--bw-brand)] hover:underline"
        >
          Open wallet →
        </Link>
      </Section>

      <Section title="Support Summary">
        <Link
          href={`/support?userId=${encodeURIComponent(user.id)}`}
          className="text-sm text-[var(--bw-brand)] hover:underline"
        >
          Open support →
        </Link>
      </Section>

      <ConfirmDialog
        open={pendingAction != null}
        title={
          pendingAction === "suspend"
            ? "Suspend user"
            : pendingAction === "reactivate"
              ? "Reactivate user"
              : pendingAction === "restrict_booking"
                ? "Restrict booking"
                : "Restrict ride publishing"
        }
        description="This action is audit-logged with admin, target, previous and new status."
        confirmLabel="Confirm"
        danger={pendingAction === "suspend"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) void runAction(pendingAction);
        }}
      />
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

function VerificationRow({
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
