import { applyDiscountPaise, percentOfPaise } from "@/lib/money";
import { MOCK_COUPONS } from "@/mock/coupons";
import { auditService } from "@/services/audit";
import type {
  Coupon,
  CouponDiscountResult,
  CouponFilters,
  CouponStatus,
  CouponValidationResult,
} from "@/types/coupon";

let coupons: Coupon[] = structuredClone(MOCK_COUPONS);
let forceError: string | null = null;

function assertOk() {
  if (forceError) throw new Error(forceError);
}

export function validateCouponConfig(
  input: Pick<
    Coupon,
    | "discountType"
    | "discountValue"
    | "maxDiscountPaise"
    | "usageLimit"
    | "validFrom"
    | "validUntil"
  >,
): CouponValidationResult {
  const errors: string[] = [];
  if (input.discountValue < 0) errors.push("Discount cannot be negative.");
  if (input.discountType === "PERCENTAGE" && input.discountValue > 100) {
    errors.push("Percentage discount cannot exceed 100.");
  }
  if (input.usageLimit != null && input.usageLimit < 0) {
    errors.push("Usage limit cannot be negative.");
  }
  if (input.validUntil < input.validFrom) {
    errors.push("End date cannot be before start date.");
  }
  if (input.maxDiscountPaise != null && input.maxDiscountPaise < 0) {
    errors.push("Max discount cannot be negative.");
  }
  return { valid: errors.length === 0, errors };
}

export function calculateCouponDiscount(
  coupon: Coupon,
  farePaise: number,
): CouponDiscountResult {
  const config = validateCouponConfig(coupon);
  if (!config.valid) return { discountPaise: 0, errors: config.errors };
  if (coupon.status !== "ACTIVE") {
    return { discountPaise: 0, errors: ["Coupon is not active."] };
  }
  if (coupon.minimumFarePaise != null && farePaise < coupon.minimumFarePaise) {
    return { discountPaise: 0, errors: ["Fare below minimum."] };
  }
  let raw = 0;
  if (coupon.discountType === "FIXED") raw = coupon.discountValue;
  else raw = percentOfPaise(farePaise, coupon.discountValue);
  const discountPaise = applyDiscountPaise(farePaise, raw, coupon.maxDiscountPaise);
  return { discountPaise, errors: [] };
}

export function filterCoupons(list: Coupon[], filters?: CouponFilters): Coupon[] {
  if (!filters) return list;
  return list.filter((c) => {
    if (filters.status && filters.status !== "ALL" && c.status !== filters.status) return false;
    if (filters.network && filters.network !== "ALL" && c.applicableNetwork !== "ALL") {
      if (c.applicableNetwork !== filters.network) return false;
    }
    if (filters.activeOnly && c.status !== "ACTIVE") return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${c.code} ${c.name} ${c.id}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export const couponsService = {
  async getCoupons(filters?: CouponFilters): Promise<Coupon[]> {
    assertOk();
    return structuredClone(filterCoupons(coupons, filters));
  },

  async getCouponById(id: string): Promise<Coupon | null> {
    assertOk();
    const c = coupons.find((x) => x.id === id);
    return c ? structuredClone(c) : null;
  },

  async setCouponStatus(
    id: string,
    status: CouponStatus,
    input: { adminId: string; adminName: string; reason: string },
  ): Promise<Coupon> {
    assertOk();
    const current = coupons.find((c) => c.id === id);
    if (!current) throw new Error("Coupon not found.");
    const check = validateCouponConfig(current);
    if (!check.valid && status === "ACTIVE") {
      throw new Error(check.errors.join(" "));
    }
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    coupons = coupons.map((c) => (c.id === id ? updated : c));
    await auditService.record({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "growth.coupon_status_changed",
      targetType: "coupon",
      targetId: id,
      oldValue: { status: current.status },
      newValue: { status },
      reason: input.reason,
    });
    const { emitGrowthCouponUpdated } = await import("@/services/realtimeBridge");
    emitGrowthCouponUpdated({
      couponId: id,
      code: updated.code,
      previousStatus: current.status,
      newStatus: status,
      timestamp: updated.updatedAt,
    });
    return structuredClone(updated);
  },

  async createCoupon(
    input: Omit<Coupon, "id" | "usedCount" | "createdAt" | "updatedAt" | "status"> & {
      status?: CouponStatus;
    },
    actor: { adminId: string; adminName: string },
  ): Promise<Coupon> {
    assertOk();
    const check = validateCouponConfig(input);
    if (!check.valid) throw new Error(check.errors.join(" "));
    if (!input.code.trim()) throw new Error("Coupon code is required.");
    if (coupons.some((c) => c.code.toUpperCase() === input.code.trim().toUpperCase())) {
      throw new Error("Coupon code already exists.");
    }
    const now = new Date().toISOString();
    const created: Coupon = {
      ...input,
      id: `cpn_${Date.now()}`,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim(),
      usedCount: 0,
      status: input.status ?? "DRAFT",
      createdAt: now,
      updatedAt: now,
    };
    coupons = [created, ...coupons];
    await auditService.record({
      adminId: actor.adminId,
      adminName: actor.adminName,
      action: "growth.coupon_created",
      targetType: "coupon",
      targetId: created.id,
      newValue: { code: created.code, status: created.status },
      reason: "Coupon created",
    });
    const { emitGrowthCouponUpdated } = await import("@/services/realtimeBridge");
    emitGrowthCouponUpdated({
      couponId: created.id,
      code: created.code,
      newStatus: created.status,
      timestamp: now,
    });
    return structuredClone(created);
  },

  validateCouponConfig,
  calculateCouponDiscount,

  __resetForTests() {
    coupons = structuredClone(MOCK_COUPONS);
    forceError = null;
  },

  __setErrorForTests(msg: string | null) {
    forceError = msg;
  },
};
