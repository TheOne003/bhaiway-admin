import { MOCK_USERS } from "@/mock/users";
import type { AudienceSpec } from "@/types/communication";

/** Deterministic audience resolution for Phase 7 mocks. */
export function resolveAudience(audience: AudienceSpec): string[] {
  const users = MOCK_USERS;
  switch (audience.type) {
    case "USER":
    case "CUSTOM_USER_SET":
      return [...new Set(audience.userIds ?? [])];
    case "RIDER":
      return users.filter((u) => u.userType === "RIDER" || u.userType === "BOTH").map((u) => u.id);
    case "DRIVER":
      return users.filter((u) => u.userType === "DRIVER" || u.userType === "BOTH").map((u) => u.id);
    case "BOTH":
      return users.filter((u) => u.userType === "BOTH").map((u) => u.id);
    case "OFFICE_COMMUTE_USERS":
      return ["usr_001", "usr_002", "usr_008"];
    case "OUTSTATION_USERS":
      return ["usr_004", "usr_006", "usr_010"];
    case "VERIFIED_USERS":
      return users
        .filter((u) => u.governmentVerificationStatus === "APPROVED")
        .slice(0, 4)
        .map((u) => u.id);
    default:
      return [];
  }
}
