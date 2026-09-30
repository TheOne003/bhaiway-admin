import type {
  ReportDefinition,
  ReportFilters,
  ReportRecord,
} from "@/types/report";
import { ridesService } from "@/services/rides";
import { usersService } from "@/services/users";
import { driversService } from "@/services/drivers";
import { safetyService } from "@/services/safety";
import { incidentsService } from "@/services/incidents";
import { verificationService } from "@/services/verification";
import { transactionsService } from "@/services/transactions";
import { supportService } from "@/services/support";
import { notificationEngine } from "@/services/notificationEngine";
import { couponsService } from "@/services/coupons";
import { referralsService } from "@/services/referrals";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "rpt_def_rides",
    name: "Ride Operations",
    description: "Ride inventory by network and status from current domain data.",
    category: "RIDE_OPERATIONS",
    source: "ridesService",
  },
  {
    id: "rpt_def_users",
    name: "User Activity",
    description: "User directory snapshot with type and status.",
    category: "USER_ACTIVITY",
    source: "usersService",
  },
  {
    id: "rpt_def_drivers",
    name: "Driver Operations",
    description: "Driver operational status and verification summaries.",
    category: "DRIVER_OPERATIONS",
    source: "driversService",
  },
  {
    id: "rpt_def_safety",
    name: "Safety Events",
    description: "SOS and incident records.",
    category: "SAFETY",
    source: "safetyService+incidentsService",
  },
  {
    id: "rpt_def_verification",
    name: "Verification Queue",
    description: "Identity and document verification states.",
    category: "VERIFICATION",
    source: "verificationService",
  },
  {
    id: "rpt_def_money",
    name: "Money Movement",
    description: "Ledger transactions from the money domain.",
    category: "MONEY",
    source: "transactionsService",
  },
  {
    id: "rpt_def_support",
    name: "Support Volume",
    description: "Support tickets by status and priority.",
    category: "SUPPORT",
    source: "supportService",
  },
  {
    id: "rpt_def_comms",
    name: "Communication Delivery",
    description: "Notification engine delivery snapshot.",
    category: "COMMUNICATION",
    source: "notificationEngine",
  },
  {
    id: "rpt_def_growth",
    name: "Growth Activity",
    description: "Coupons and referrals.",
    category: "GROWTH",
    source: "couponsService+referralsService",
  },
];

let generated: ReportRecord[] = [];
let forceError = false;

export function __resetReportsForTests(): void {
  generated = [];
  forceError = false;
}

export function __setReportsErrorForTests(enabled: boolean): void {
  forceError = enabled;
}

function csvEscape(cell: string): string {
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function reportToCsv(report: ReportRecord): string {
  const header = report.columns.map(csvEscape).join(",");
  const body = report.rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

async function buildReport(
  def: ReportDefinition,
  generatedBy: string,
  filters: Record<string, string> = {},
): Promise<ReportRecord> {
  const generatedAt = "2026-09-20T12:00:00.000Z";
  const base = {
    id: `rpt_${def.id}_${Date.now()}`,
    definitionId: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    source: def.source,
    filters,
    generatedAt,
    generatedBy,
    status: "READY" as const,
  };

  switch (def.category) {
    case "RIDE_OPERATIONS": {
      let rides = await ridesService.getRides();
      if (filters.network && filters.network !== "ALL") {
        rides = rides.filter((r) => r.networkType === filters.network);
      }
      return {
        ...base,
        summary: [
          { label: "Total rides", value: String(rides.length) },
          {
            label: "Completed",
            value: String(rides.filter((r) => r.status === "completed").length),
          },
          {
            label: "Cancelled",
            value: String(rides.filter((r) => r.status === "cancelled").length),
          },
        ],
        columns: ["id", "network", "status", "driver", "scheduledStart", "fare"],
        rows: rides.map((r) => [
          r.id,
          r.networkType,
          r.status,
          r.driver.name,
          r.scheduledStart,
          String(r.fare),
        ]),
      };
    }
    case "USER_ACTIVITY": {
      const users = await usersService.getUsers();
      return {
        ...base,
        summary: [
          { label: "Users", value: String(users.length) },
          {
            label: "Active",
            value: String(users.filter((u) => u.status === "ACTIVE").length),
          },
        ],
        columns: ["id", "name", "userType", "status", "joinedAt"],
        rows: users.map((u) => [u.id, u.name, u.userType, u.status, u.joinedAt]),
      };
    }
    case "DRIVER_OPERATIONS": {
      const drivers = await driversService.getDrivers();
      return {
        ...base,
        summary: [{ label: "Drivers", value: String(drivers.length) }],
        columns: ["driverId", "name", "status", "rating", "totalRides", "cancellationRate"],
        rows: drivers.map((d) => [
          d.driverId,
          d.name,
          d.status,
          String(d.rating),
          String(d.totalRides),
          String(d.cancellationRate),
        ]),
      };
    }
    case "SAFETY": {
      const [sos, incidents] = await Promise.all([
        safetyService.getSOSCases(),
        incidentsService.getIncidents(),
      ]);
      return {
        ...base,
        summary: [
          { label: "SOS", value: String(sos.length) },
          { label: "Incidents", value: String(incidents.length) },
        ],
        columns: ["kind", "id", "status", "severity", "createdAt"],
        rows: [
          ...sos.map((s) => ["SOS", s.id, s.status, s.severity, s.createdAt]),
          ...incidents.map((i) => ["INCIDENT", i.id, i.status, i.severity, i.createdAt]),
        ],
      };
    }
    case "VERIFICATION": {
      const list = await verificationService.getVerifications();
      return {
        ...base,
        summary: [{ label: "Records", value: String(list.length) }],
        columns: ["id", "userId", "type", "status", "createdAt"],
        rows: list.map((v) => [v.id, v.userId, v.type, v.status, v.createdAt]),
      };
    }
    case "MONEY": {
      const txns = await transactionsService.getTransactions();
      return {
        ...base,
        summary: [
          { label: "Transactions", value: String(txns.length) },
          {
            label: "Volume (paise)",
            value: String(txns.reduce((s, t) => s + Math.abs(t.amountPaise), 0)),
          },
        ],
        columns: ["id", "userId", "type", "amountPaise", "status", "createdAt"],
        rows: txns.map((t) => [
          t.id,
          t.userId,
          t.type,
          String(t.amountPaise),
          t.status,
          t.createdAt,
        ]),
      };
    }
    case "SUPPORT": {
      const tickets = await supportService.getTickets();
      return {
        ...base,
        summary: [{ label: "Tickets", value: String(tickets.length) }],
        columns: ["id", "subject", "status", "priority", "createdAt"],
        rows: tickets.map((t) => [t.id, t.subject, t.status, t.priority, t.createdAt]),
      };
    }
    case "COMMUNICATION": {
      const notifs = await notificationEngine.getNotifications();
      return {
        ...base,
        summary: [{ label: "Notifications", value: String(notifs.length) }],
        columns: ["id", "channel", "status", "title", "createdAt"],
        rows: notifs.map((n) => [
          n.id,
          n.channel,
          n.status,
          n.title,
          n.createdAt,
        ]),
      };
    }
    case "GROWTH": {
      const [coupons, referrals] = await Promise.all([
        couponsService.getCoupons(),
        referralsService.getReferrals(),
      ]);
      return {
        ...base,
        summary: [
          { label: "Coupons", value: String(coupons.length) },
          { label: "Referrals", value: String(referrals.length) },
        ],
        columns: ["kind", "id", "code", "status", "metric"],
        rows: [
          ...coupons.map((c) => ["COUPON", c.id, c.code, c.status, String(c.usedCount)]),
          ...referrals.map((r) => [
            "REFERRAL",
            r.id,
            r.code,
            r.status,
            String(r.rewardAmountPaise),
          ]),
        ],
      };
    }
    default:
      return {
        ...base,
        status: "FAILED",
        summary: [{ label: "Error", value: "Unknown category" }],
        columns: [],
        rows: [],
      };
  }
}

export const reportsService = {
  async getDefinitions(): Promise<ReportDefinition[]> {
    if (forceError) throw new Error("Unable to load reports.");
    return structuredClone(REPORT_DEFINITIONS);
  },

  async listGenerated(filters: ReportFilters = {}): Promise<ReportRecord[]> {
    if (forceError) throw new Error("Unable to load reports.");
    let list = structuredClone(generated);
    if (filters.category && filters.category !== "ALL") {
      list = list.filter((r) => r.category === filters.category);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    return list.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
  },

  async getReportById(id: string): Promise<ReportRecord | null> {
    return structuredClone(generated.find((r) => r.id === id) ?? null);
  },

  async generate(
    definitionId: string,
    generatedBy: string,
    filters: Record<string, string> = {},
  ): Promise<ReportRecord> {
    if (forceError) throw new Error("Unable to generate report.");
    const def = REPORT_DEFINITIONS.find((d) => d.id === definitionId);
    if (!def) throw new Error("Report definition not found.");
    const report = await buildReport(def, generatedBy, filters);
    generated = [report, ...generated.filter((r) => r.definitionId !== definitionId)];
    return structuredClone(report);
  },

  async refresh(reportId: string, generatedBy: string): Promise<ReportRecord | null> {
    const existing = generated.find((r) => r.id === reportId);
    if (!existing) return null;
    return this.generate(existing.definitionId, generatedBy, existing.filters);
  },

  exportCsv(report: ReportRecord): string {
    return reportToCsv(report);
  },
};

export type ReportsService = typeof reportsService;
