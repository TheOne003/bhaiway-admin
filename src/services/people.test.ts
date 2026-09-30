import { describe, expect, it, beforeEach } from "vitest";
import {
  maskGovernmentIdLast4,
  maskLicenceLast4,
  maskPhoneLast4,
  isMaskedIdentityValue,
} from "@/lib/masking";
import { isIdentityApprovedForOperations, isOptionalVerification } from "@/mock/verification";
import {
  filterUsers,
  mapUserTypeLabel,
  nextStatusForAction,
  usersService,
  __resetUsersForTests,
} from "@/services/users";
import {
  filterDrivers,
  toDriverListItem,
  driversService,
  __resetDriversForTests,
} from "@/services/drivers";
import {
  filterVerifications,
  mapVerificationStatusLabel,
  toSummaryStatus,
  verificationService,
  __resetVerificationForTests,
} from "@/services/verification";
import { getMockVerificationProvider } from "@/services/verificationProvider";
import { MOCK_USERS } from "@/mock/users";
import { MOCK_DRIVER_PROFILES } from "@/mock/drivers";

beforeEach(() => {
  __resetUsersForTests();
  __resetDriversForTests();
  __resetVerificationForTests();
});

describe("user filtering and search", () => {
  it("filters by user type including BOTH for rider/driver tabs", () => {
    const riders = filterUsers(MOCK_USERS, { userType: "RIDER" });
    expect(riders.every((u) => u.userType === "RIDER" || u.userType === "BOTH")).toBe(true);
    const both = filterUsers(MOCK_USERS, { userType: "BOTH" });
    expect(both.every((u) => u.userType === "BOTH")).toBe(true);
  });

  it("filters by status and government verification", () => {
    const suspended = filterUsers(MOCK_USERS, { status: "SUSPENDED" });
    expect(suspended.length).toBeGreaterThan(0);
    expect(suspended.every((u) => u.status === "SUSPENDED")).toBe(true);
    const pending = filterUsers(MOCK_USERS, { governmentVerification: "PENDING" });
    expect(pending.every((u) => u.governmentVerificationStatus === "PENDING")).toBe(true);
  });

  it("searches by name, masked phone, id, email", async () => {
    const byName = await usersService.searchUsers("Neha");
    expect(byName.some((u) => u.id === "usr_001")).toBe(true);
    const byPhone = await usersService.searchUsers("4821");
    expect(byPhone.some((u) => u.id === "usr_001")).toBe(true);
    const byId = await usersService.searchUsers("usr_002");
    expect(byId).toHaveLength(1);
  });
});

describe("user type and account status mapping", () => {
  it("maps user types", () => {
    expect(mapUserTypeLabel("RIDER")).toBe("Rider");
    expect(mapUserTypeLabel("DRIVER")).toBe("Driver");
    expect(mapUserTypeLabel("BOTH")).toBe("Both");
  });

  it("maps account status actions", () => {
    expect(nextStatusForAction("suspend", "ACTIVE").status).toBe("SUSPENDED");
    expect(nextStatusForAction("reactivate", "SUSPENDED").status).toBe("ACTIVE");
    expect(nextStatusForAction("restrict_booking", "ACTIVE")).toMatchObject({
      status: "RESTRICTED",
      bookingRestricted: true,
    });
    expect(nextStatusForAction("restrict_publishing", "ACTIVE")).toMatchObject({
      status: "RESTRICTED",
      publishingRestricted: true,
    });
  });
});

describe("verification status and requirements", () => {
  it("maps verification status labels", () => {
    expect(mapVerificationStatusLabel("MANUAL_REVIEW")).toBe("MANUAL REVIEW");
    expect(toSummaryStatus("APPROVED")).toBe("APPROVED");
    expect(toSummaryStatus("PENDING")).toBe("PENDING");
  });

  it("treats corporate as optional and ignores pending corporate for ops approval", () => {
    expect(isOptionalVerification("CORPORATE")).toBe(true);
    expect(isOptionalVerification("GOVERNMENT_ID")).toBe(false);
    expect(
      isIdentityApprovedForOperations([
        { type: "GOVERNMENT_ID", status: "APPROVED", requirement: "required" },
        { type: "DRIVING_LICENCE", status: "APPROVED", requirement: "required" },
        { type: "VEHICLE_RC", status: "APPROVED", requirement: "required" },
        { type: "INSURANCE", status: "APPROVED", requirement: "required" },
        { type: "CORPORATE", status: "PENDING", requirement: "optional" },
      ]),
    ).toBe(true);
    expect(
      isIdentityApprovedForOperations([
        { type: "GOVERNMENT_ID", status: "PENDING", requirement: "required" },
        { type: "CORPORATE", status: "APPROVED", requirement: "optional" },
      ]),
    ).toBe(false);
  });
});

describe("driver profile mapping", () => {
  it("maps driver list items from profile", () => {
    const profile = MOCK_DRIVER_PROFILES[0];
    const item = toDriverListItem(profile, "Rahul Verma", "+91 XXXXX 7392");
    expect(item.driverId).toBe(profile.driverId);
    expect(item.vehicleRegistrationMasked).toBe(profile.vehicle?.registrationMasked);
  });

  it("filters drivers by verification and search", async () => {
    const all = await driversService.getDrivers();
    const pending = filterDrivers(all, { verification: "PENDING" });
    expect(pending.length).toBeGreaterThan(0);
    const search = filterDrivers(all, { search: "Rahul" });
    expect(search.some((d) => d.name.includes("Rahul"))).toBe(true);
  });
});

describe("verification provider mock", () => {
  it("supports deterministic approve / fail / manual / retry transitions", async () => {
    const provider = getMockVerificationProvider();
    const pending = await provider.getVerification("ver_gov_004");
    expect(pending?.status).toBe("PENDING");

    const approved = await verificationService.approve("ver_gov_004", "adm_test");
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.reviewedBy).toBe("adm_test");

    const failed = await verificationService.fail("ver_gov_004", "Invalid document", "adm_test");
    expect(failed?.status).toBe("FAILED");
    expect(failed?.failureReason).toBe("Invalid document");

    const manual = await verificationService.sendToManualReview(
      "ver_gov_004",
      "Needs ops review",
      "adm_test",
    );
    expect(manual?.status).toBe("MANUAL_REVIEW");

    const retried = await verificationService.retry("ver_gov_004");
    expect(retried?.status).toBe("PENDING");
    expect(retried?.failureReason).toBeNull();
  });

  it("filters verification queues by type and status", async () => {
    const gov = await verificationService.getVerifications({ type: "GOVERNMENT_ID" });
    expect(gov.every((v) => v.type === "GOVERNMENT_ID")).toBe(true);
    const filtered = filterVerifications(gov, { status: "PENDING" });
    expect(filtered.every((v) => v.status === "PENDING")).toBe(true);
  });
});

describe("masked identity formatting", () => {
  it("formats synthetic masked values", () => {
    expect(maskPhoneLast4("4821")).toBe("+91 XXXXX 4821");
    expect(maskGovernmentIdLast4("4821")).toBe("XXXX-XXXX-4821");
    expect(maskLicenceLast4("7291")).toBe("DL-XXXX-7291");
    expect(isMaskedIdentityValue("XXXX-XXXX-4821")).toBe(true);
    expect(isMaskedIdentityValue("123456789012")).toBe(false);
  });
});
