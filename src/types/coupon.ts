export type CouponDiscountType = "FIXED" | "PERCENTAGE";

export type CouponStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "DISABLED";

export type CouponAudience = "ALL" | "RIDER" | "DRIVER" | "NEW_USER";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  /** FIXED: paise off. PERCENTAGE: 0–100. */
  discountValue: number;
  maxDiscountPaise: number | null;
  minimumFarePaise: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  applicableNetwork: "ALL" | "OFFICE" | "OUTSTATION";
  applicableUserType: CouponAudience;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CouponFilters {
  status?: CouponStatus | "ALL";
  network?: "ALL" | "OFFICE" | "OUTSTATION";
  search?: string;
  activeOnly?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CouponDiscountResult {
  discountPaise: number;
  errors: string[];
}
