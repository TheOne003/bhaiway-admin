import type { AccountStatus, User, UserType, VerificationSummaryStatus } from "@/types/user";

const T = "2026-09-20T00:00:00.000Z";

function user(
  partial: Omit<User, "createdAt" | "updatedAt" | "joinedAt" | "lastActiveAt"> & {
    joinedAt?: string;
    lastActiveAt?: string;
  },
): User {
  return {
    ...partial,
    joinedAt: partial.joinedAt ?? "2026-01-15T10:00:00.000Z",
    lastActiveAt: partial.lastActiveAt ?? T,
    createdAt: partial.joinedAt ?? "2026-01-15T10:00:00.000Z",
    updatedAt: T,
  };
}

export const MOCK_USERS: User[] = [
  user({
    id: "usr_001",
    name: "Neha Kapoor",
    email: "neha.kapoor@example.com",
    phoneMasked: "+91 XXXXX 4821",
    userType: "RIDER",
    gender: "female",
    status: "ACTIVE",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "APPROVED",
    rating: 4.7,
    totalRides: 42,
  }),
  user({
    id: "usr_002",
    name: "Rahul Verma",
    email: "rahul.verma@example.com",
    phoneMasked: "+91 XXXXX 7392",
    userType: "BOTH",
    gender: "male",
    status: "ACTIVE",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "PENDING",
    rating: 4.8,
    totalRides: 186,
  }),
  user({
    id: "usr_003",
    name: "Sana Iqbal",
    email: "sana.iqbal@example.com",
    phoneMasked: "+91 XXXXX 1104",
    userType: "DRIVER",
    gender: "female",
    status: "ACTIVE",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "NOT_REQUIRED",
    rating: 4.6,
    totalRides: 210,
  }),
  user({
    id: "usr_004",
    name: "Amit Shah",
    email: "amit.shah@example.com",
    phoneMasked: "+91 XXXXX 8820",
    userType: "RIDER",
    gender: "male",
    status: "INACTIVE",
    governmentVerificationStatus: "PENDING",
    corporateVerificationStatus: "NOT_REQUIRED",
    rating: 4.2,
    totalRides: 8,
    lastActiveAt: "2026-08-01T12:00:00.000Z",
  }),
  user({
    id: "usr_005",
    name: "Karan Malhotra",
    email: "karan.m@example.com",
    phoneMasked: "+91 XXXXX 5561",
    userType: "DRIVER",
    gender: "male",
    status: "SUSPENDED",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "FAILED",
    rating: 3.9,
    totalRides: 95,
  }),
  user({
    id: "usr_006",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phoneMasked: "+91 XXXXX 3340",
    userType: "BOTH",
    gender: "female",
    status: "RESTRICTED",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "APPROVED",
    rating: 4.5,
    totalRides: 120,
    bookingRestricted: true,
  }),
  user({
    id: "usr_007",
    name: "Imran Khan",
    email: "imran.khan@example.com",
    phoneMasked: "+91 XXXXX 9012",
    userType: "DRIVER",
    gender: "male",
    status: "ACTIVE",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "NOT_REQUIRED",
    rating: 4.5,
    totalRides: 340,
  }),
  user({
    id: "usr_008",
    name: "Meera Joshi",
    email: "meera.j@example.com",
    phoneMasked: "+91 XXXXX 2277",
    userType: "RIDER",
    gender: "female",
    status: "ACTIVE",
    governmentVerificationStatus: "FAILED",
    corporateVerificationStatus: "PENDING",
    rating: 4.1,
    totalRides: 3,
  }),
  user({
    id: "usr_009",
    name: "Pooja Rana",
    email: "pooja.rana@example.com",
    phoneMasked: "+91 XXXXX 6688",
    userType: "DRIVER",
    gender: "female",
    status: "ACTIVE",
    governmentVerificationStatus: "MANUAL_REVIEW",
    corporateVerificationStatus: "NOT_REQUIRED",
    rating: 4.4,
    totalRides: 78,
  }),
  user({
    id: "usr_010",
    name: "Vikram Rao",
    email: "vikram.rao@example.com",
    phoneMasked: "+91 XXXXX 1490",
    userType: "RIDER",
    gender: "male",
    status: "ACTIVE",
    governmentVerificationStatus: "APPROVED",
    corporateVerificationStatus: "NOT_REQUIRED",
    rating: 4.9,
    totalRides: 55,
  }),
];

export function countUsersByType(users: User[], type: UserType): number {
  return users.filter((u) => u.userType === type || (type !== "BOTH" && u.userType === "BOTH"))
    .length;
}

export function isDriverUser(user: User): boolean {
  return user.userType === "DRIVER" || user.userType === "BOTH";
}

export function mapStatusLabel(status: AccountStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function mapVerificationSummaryLabel(status: VerificationSummaryStatus): string {
  return status.replace(/_/g, " ");
}
