import { MOCK_USERS } from "@/mock/users";
import type { AuditRecord } from "@/types/common";
import type { AccountStatus, User, UserFilters } from "@/types/user";

let users: User[] = structuredClone(MOCK_USERS);
let forceError = false;

export function __resetUsersForTests(): void {
  users = structuredClone(MOCK_USERS);
  forceError = false;
}

export function __setUsersErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

export function filterUsers(list: User[], filters: UserFilters = {}): User[] {
  const type = filters.userType ?? "ALL";
  const status = filters.status ?? "ALL";
  const gov = filters.governmentVerification ?? "ALL";
  const corp = filters.corporateVerification ?? "ALL";
  const gender = filters.gender ?? "ALL";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return list.filter((user) => {
    if (type !== "ALL") {
      if (type === "BOTH") {
        if (user.userType !== "BOTH") return false;
      } else if (user.userType !== type && user.userType !== "BOTH") {
        return false;
      }
    }
    if (status !== "ALL" && user.status !== status) return false;
    if (gov !== "ALL" && user.governmentVerificationStatus !== gov) return false;
    if (corp !== "ALL" && user.corporateVerificationStatus !== corp) return false;
    if (gender !== "ALL" && user.gender !== gender) return false;
    if (filters.joinedFrom && user.joinedAt < filters.joinedFrom) return false;
    if (filters.joinedTo && user.joinedAt > filters.joinedTo) return false;
    if (search) {
      const hay = [user.id, user.name, user.email, user.phoneMasked].join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function mapUserTypeLabel(type: User["userType"]): string {
  return type === "BOTH" ? "Both" : type.charAt(0) + type.slice(1).toLowerCase();
}

export const usersService = {
  async getUsers(filters: UserFilters = {}): Promise<User[]> {
    if (forceError) throw new Error("Unable to load users.");
    return structuredClone(filterUsers(users, filters));
  },

  async getUserById(id: string): Promise<User | null> {
    if (forceError) throw new Error("Unable to load users.");
    return structuredClone(users.find((u) => u.id === id) ?? null);
  },

  async getUsersByType(type: User["userType"]): Promise<User[]> {
    return this.getUsers({ userType: type });
  },

  async searchUsers(query: string): Promise<User[]> {
    return this.getUsers({ search: query });
  },

  async updateUserStatus(
    id: string,
    status: AccountStatus,
    options?: { bookingRestricted?: boolean; publishingRestricted?: boolean },
  ): Promise<User | null> {
    const user = users.find((u) => u.id === id);
    if (!user) return null;
    user.status = status;
    if (options?.bookingRestricted != null) user.bookingRestricted = options.bookingRestricted;
    if (options?.publishingRestricted != null) {
      user.publishingRestricted = options.publishingRestricted;
    }
    user.updatedAt = new Date().toISOString();
    const { syncDriverStatusForUser } = await import("@/services/drivers");
    syncDriverStatusForUser(id, status);
    return structuredClone(user);
  },

  async syncVerificationSummary(
    userId: string,
    government: User["governmentVerificationStatus"],
    corporate: User["corporateVerificationStatus"],
  ): Promise<void> {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    user.governmentVerificationStatus = government;
    user.corporateVerificationStatus = corporate;
    user.updatedAt = new Date().toISOString();
  },
};

export type UserStatusAction =
  | "suspend"
  | "reactivate"
  | "restrict_booking"
  | "restrict_publishing";

export function nextStatusForAction(
  action: UserStatusAction,
  current: AccountStatus,
): { status: AccountStatus; bookingRestricted?: boolean; publishingRestricted?: boolean } {
  switch (action) {
    case "suspend":
      return { status: "SUSPENDED" };
    case "reactivate":
      return { status: "ACTIVE", bookingRestricted: false, publishingRestricted: false };
    case "restrict_booking":
      return { status: current === "SUSPENDED" ? current : "RESTRICTED", bookingRestricted: true };
    case "restrict_publishing":
      return {
        status: current === "SUSPENDED" ? current : "RESTRICTED",
        publishingRestricted: true,
      };
    default:
      return { status: current };
  }
}

export type { AuditRecord };
