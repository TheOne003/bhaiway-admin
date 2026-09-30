import { authService } from "./auth";
import { alertsService } from "./alerts";
import { auditService } from "./audit";
import { assuredRideService } from "./assuredRide";
import { dashboardService } from "./dashboard";
import { driversService } from "./drivers";
import { incidentsService } from "./incidents";
import { notificationsService } from "./notifications";
import { getRealtimeService } from "./realtime";
import { riskService } from "./risk";
import { ridesService } from "./rides";
import { safetyService } from "./safety";
import { systemHealthService } from "./systemHealth";
import { usersService } from "./users";
import { verificationService } from "./verification";
import { walletService } from "./wallet";
import { transactionsService } from "./transactions";
import { securityDepositService } from "./securityDeposits";
import { refundsService } from "./refunds";
import { creditsService } from "./credits";
import { couponsService } from "./coupons";
import { referralsService } from "./referrals";
import { notificationEngine } from "./notificationEngine";
import { notificationTemplatesService } from "./notificationTemplates";
import { notificationAutomationsService } from "./notificationAutomations";
import { notificationCampaignsService } from "./notificationCampaigns";
import { communicationsService } from "./communications";
import { supportService } from "./support";
import { analyticsService } from "./analytics";
import { reportsService } from "./reports";
import { infrastructureService } from "./infrastructure";
import { permissionsService } from "./permissions";
import { platformSettingsService } from "./platformSettings";

export const services = {
  auth: authService,
  systemHealth: systemHealthService,
  alerts: alertsService,
  notifications: notificationsService,
  dashboard: dashboardService,
  rides: ridesService,
  users: usersService,
  drivers: driversService,
  verification: verificationService,
  safety: safetyService,
  incidents: incidentsService,
  assuredRide: assuredRideService,
  risk: riskService,
  audit: auditService,
  realtime: getRealtimeService(),
  wallet: walletService,
  transactions: transactionsService,
  securityDeposits: securityDepositService,
  refunds: refundsService,
  credits: creditsService,
  coupons: couponsService,
  referrals: referralsService,
  notificationEngine,
  notificationTemplates: notificationTemplatesService,
  notificationAutomations: notificationAutomationsService,
  notificationCampaigns: notificationCampaignsService,
  communications: communicationsService,
  support: supportService,
  analytics: analyticsService,
  reports: reportsService,
  infrastructure: infrastructureService,
  permissions: permissionsService,
  platformSettings: platformSettingsService,
};

export type Services = typeof services;
