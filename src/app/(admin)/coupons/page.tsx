"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { CouponStatusBadge } from "@/components/status/MoneyBadges";
import { Button } from "@/components/ui/Button";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ReasonConfirmDialog } from "@/components/ui/ReasonConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatIstDateTime } from "@/lib/format";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOps } from "@/providers/OpsProvider";
import { calculateCouponDiscount, couponsService } from "@/services/coupons";
import type {
  Coupon,
  CouponAudience,
  CouponDiscountType,
  CouponStatus,
} from "@/types/coupon";

const SAMPLE_FARE_PAISE = 50000;

type StatusAction = { status: CouponStatus; label: string; testId?: string; danger?: boolean };

export default function CouponsPage() {
  const { session } = useAuth();
  const { refresh: refreshOps } = useOps();
  const adminId = session?.admin.id ?? "adm_001";
  const adminName = session?.admin.name ?? "Ops Admin";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CouponStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<StatusAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activateAfterCreate, setActivateAfterCreate] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE" as CouponDiscountType,
    discountValue: "10",
    maxDiscountRupees: "",
    minimumFareRupees: "",
    usageLimit: "",
    perUserLimit: "1",
    validFrom: "2026-09-01",
    validUntil: "2026-12-31",
    applicableNetwork: "ALL" as Coupon["applicableNetwork"],
    applicableUserType: "ALL" as CouponAudience,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await couponsService.getCoupons({
        status,
        search: search || undefined,
      });
      setCoupons(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => coupons.find((c) => c.id === selectedId) ?? null,
    [coupons, selectedId],
  );

  const preview = selected
    ? calculateCouponDiscount(selected, SAMPLE_FARE_PAISE)
    : { discountPaise: 0, errors: [] as string[] };

  function actionsFor(c: Coupon): StatusAction[] {
    switch (c.status) {
      case "ACTIVE":
        return [
          { status: "PAUSED", label: "Pause", testId: "coupon-pause" },
          { status: "DISABLED", label: "Disable", danger: true },
        ];
      case "PAUSED":
      case "DRAFT":
        return [
          { status: "ACTIVE", label: "Activate" },
          { status: "DISABLED", label: "Disable", danger: true },
        ];
      default:
        return [];
    }
  }

  async function applyStatus(reason: string) {
    if (!selected || !pending) return;
    setBusy(true);
    try {
      await couponsService.setCouponStatus(selected.id, pending.status, {
        adminId,
        adminName,
        reason,
      });
      setPending(null);
      await refreshOps();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coupon update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createCoupon() {
    setBusy(true);
    try {
      const created = await couponsService.createCoupon(
        {
          code: form.code,
          name: form.name,
          description: form.description,
          discountType: form.discountType,
          discountValue:
            form.discountType === "FIXED"
              ? rupeesToPaise(Number(form.discountValue))
              : Number(form.discountValue),
          maxDiscountPaise: form.maxDiscountRupees
            ? rupeesToPaise(Number(form.maxDiscountRupees))
            : null,
          minimumFarePaise: form.minimumFareRupees
            ? rupeesToPaise(Number(form.minimumFareRupees))
            : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          perUserLimit: Number(form.perUserLimit) || 1,
          validFrom: `${form.validFrom}T00:00:00.000Z`,
          validUntil: `${form.validUntil}T23:59:59.999Z`,
          applicableNetwork: form.applicableNetwork,
          applicableUserType: form.applicableUserType,
          status: "DRAFT",
        },
        { adminId, adminName },
      );
      if (activateAfterCreate) {
        await couponsService.setCouponStatus(created.id, "ACTIVE", {
          adminId,
          adminName,
          reason: "Activated on create",
        });
      }
      setCreateOpen(false);
      setSelectedId(created.id);
      await refreshOps();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create coupon failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && coupons.length === 0 && !error) {
    return <LoadingState label="Loading coupons…" />;
  }

  return (
    <PageContainer width="wide" testId="coupons-page">
      <PageHeader
        title="Coupons"
        description="Growth coupons — create, pause, activate, or disable with reason."
        actions={
          <Button size="sm" data-testid="coupon-create" onClick={() => setCreateOpen(true)}>
            Create Coupon
          </Button>
        }
      />

      {error ? (
        <div className="space-y-2">
          <ErrorState title="Unable to load coupons." message={error} />
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "DRAFT", "PAUSED", "EXPIRED", "DISABLED"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={status === id}
            onClick={() => setStatus(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              status === id
                ? "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                : "border-[var(--bw-border)] text-[var(--bw-text-secondary)]",
            )}
          >
            {id === "ALL" ? "All" : id}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search code, name…"
        className="h-10 w-full max-w-md rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />

      {coupons.length === 0 ? (
        <EmptyState title="No coupons match filters." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)]">
          <table className="min-w-full text-left text-sm" data-testid="coupons-table">
            <thead className="border-b border-[var(--bw-border)] bg-[var(--bw-elevated)] text-xs uppercase text-[var(--bw-text-muted)]">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Discount</th>
                <th className="px-3 py-2">Used</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Valid until</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-[var(--bw-border)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.discountType === "FIXED"
                      ? formatMoney(c.discountValue)
                      : `${c.discountValue}%`}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {c.usedCount}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <CouponStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--bw-text-muted)]">
                    {formatIstDateTime(new Date(c.validUntil))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--bw-brand)] hover:underline"
                      onClick={() => setSelectedId(c.id)}
                      data-testid={`coupon-open-${c.id}`}
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
        open={Boolean(selected) && !createOpen}
        title={selected ? `${selected.code} · ${selected.name}` : "Coupon"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="space-y-4" data-testid="coupon-detail">
            <CouponStatusBadge status={selected.status} />
            <dl className="grid gap-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Description" value={selected.description} />
              <Row
                label="Discount"
                value={
                  selected.discountType === "FIXED"
                    ? formatMoney(selected.discountValue)
                    : `${selected.discountValue}% off`
                }
              />
              <Row
                label="Max discount"
                value={
                  selected.maxDiscountPaise != null
                    ? formatMoney(selected.maxDiscountPaise)
                    : "—"
                }
              />
              <Row
                label="Min fare"
                value={
                  selected.minimumFarePaise != null
                    ? formatMoney(selected.minimumFarePaise)
                    : "—"
                }
              />
              <Row label="Network" value={selected.applicableNetwork} />
              <Row label="Valid from" value={formatIstDateTime(new Date(selected.validFrom))} />
              <Row label="Valid until" value={formatIstDateTime(new Date(selected.validUntil))} />
            </dl>

            <section className="rounded-md border border-[var(--bw-border)] bg-[var(--bw-elevated)] p-3 text-sm">
              <h3 className="text-xs font-semibold uppercase text-[var(--bw-text-muted)]">
                Sample fare preview
              </h3>
              <p className="mt-1 tabular-nums">
                Fare {formatMoney(SAMPLE_FARE_PAISE)} → discount{" "}
                {formatMoney(preview.discountPaise)} (
                {formatMoney(SAMPLE_FARE_PAISE - preview.discountPaise)} net)
              </p>
              {preview.errors.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--bw-danger)]">{preview.errors.join(" ")}</p>
              ) : null}
            </section>

            <div className="flex flex-wrap gap-2">
              {actionsFor(selected).map((action) => (
                <Button
                  key={action.status}
                  variant={action.danger ? "danger" : "secondary"}
                  size="sm"
                  disabled={busy}
                  data-testid={action.testId}
                  onClick={() => setPending(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <DetailDrawer
        open={createOpen}
        title="Create coupon"
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-3 text-sm" data-testid="coupon-create-form">
          <Field label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
          <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Discount type</span>
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  discountType: e.target.value as CouponDiscountType,
                }))
              }
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed (₹)</option>
            </select>
          </label>
          <Field
            label={form.discountType === "FIXED" ? "Discount (₹)" : "Discount (%)"}
            value={form.discountValue}
            onChange={(v) => setForm((f) => ({ ...f, discountValue: v }))}
          />
          <Field
            label="Max discount (₹, optional)"
            value={form.maxDiscountRupees}
            onChange={(v) => setForm((f) => ({ ...f, maxDiscountRupees: v }))}
          />
          <Field
            label="Min fare (₹, optional)"
            value={form.minimumFareRupees}
            onChange={(v) => setForm((f) => ({ ...f, minimumFareRupees: v }))}
          />
          <Field
            label="Usage limit (optional)"
            value={form.usageLimit}
            onChange={(v) => setForm((f) => ({ ...f, usageLimit: v }))}
          />
          <Field
            label="Per-user limit"
            value={form.perUserLimit}
            onChange={(v) => setForm((f) => ({ ...f, perUserLimit: v }))}
          />
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Network</span>
            <select
              value={form.applicableNetwork}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  applicableNetwork: e.target.value as Coupon["applicableNetwork"],
                }))
              }
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            >
              <option value="ALL">All</option>
              <option value="OFFICE">Office</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Audience</span>
            <select
              value={form.applicableUserType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  applicableUserType: e.target.value as CouponAudience,
                }))
              }
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            >
              <option value="ALL">All</option>
              <option value="RIDER">Rider</option>
              <option value="DRIVER">Driver</option>
              <option value="NEW_USER">New user</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Valid from</span>
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--bw-text-muted)]">Valid until</span>
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activateAfterCreate}
              onChange={(e) => setActivateAfterCreate(e.target.checked)}
            />
            Activate after create
          </label>
          <Button
            size="sm"
            disabled={busy || !form.code.trim() || !form.name.trim()}
            onClick={() => void createCoupon()}
          >
            Create
          </Button>
        </div>
      </DetailDrawer>

      <ReasonConfirmDialog
        open={Boolean(pending)}
        title={pending ? `${pending.label} coupon` : "Coupon action"}
        description="Status change is audited."
        confirmLabel={pending?.label ?? "Confirm"}
        danger={pending?.danger}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void applyStatus(reason)}
      />
    </PageContainer>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[var(--bw-text-muted)]">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--bw-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-sm"
      />
    </label>
  );
}
