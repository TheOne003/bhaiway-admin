"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { alertsService } from "@/services/alerts";
import { assuredRideService } from "@/services/assuredRide";
import { dashboardService } from "@/services/dashboard";
import { driversService } from "@/services/drivers";
import { incidentsService } from "@/services/incidents";
import { notificationsService, countUnread } from "@/services/notifications";
import { getRealtimeService } from "@/services/realtime";
import { applyRealtimeEvent } from "@/services/realtimeBridge";
import { riskService } from "@/services/risk";
import { ridesService } from "@/services/rides";
import { safetyService } from "@/services/safety";
import { systemHealthService } from "@/services/systemHealth";
import { usersService } from "@/services/users";
import { verificationService } from "@/services/verification";
import type { OpsAlert } from "@/types/alert";
import type { AssuredRideCase, CancellationCase, CompensationCase } from "@/types/assuredRide";
import type { DashboardSnapshot } from "@/types/dashboard";
import type { DriverListItem } from "@/types/driver";
import type { IncidentRecord } from "@/types/incident";
import type { OpsNotification } from "@/types/notification";
import type { RiskCase } from "@/types/risk";
import type { Ride, RideFilters } from "@/types/ride";
import type { SafetyEvent, SafetySummary } from "@/types/safety";
import type { SOSRecord } from "@/types/sos";
import type { SystemHealthSummary } from "@/types/systemHealth";
import type { User } from "@/types/user";
import type { VerificationRecord } from "@/types/verification";

interface OpsContextValue {
  health: SystemHealthSummary | null;
  alerts: OpsAlert[];
  notifications: OpsNotification[];
  dashboard: DashboardSnapshot | null;
  rides: Ride[];
  activeRides: Ride[];
  users: User[];
  drivers: DriverListItem[];
  verifications: VerificationRecord[];
  sosCases: SOSRecord[];
  incidents: IncidentRecord[];
  safetyEvents: SafetyEvent[];
  safetySummary: SafetySummary | null;
  assuredRides: AssuredRideCase[];
  cancellationCases: CancellationCase[];
  compensationCases: CompensationCase[];
  riskCases: RiskCase[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  ridesError: string | null;
  peopleError: string | null;
  safetyError: string | null;
  assuredError: string | null;
  refresh: () => Promise<void>;
  refreshRides: (filters?: RideFilters) => Promise<void>;
  refreshPeople: () => Promise<void>;
  refreshSafety: () => Promise<void>;
  refreshAssured: () => Promise<void>;
  getRide: (id: string) => Ride | undefined;
  getUser: (id: string) => User | undefined;
  getSos: (id: string) => SOSRecord | undefined;
  acknowledgeAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [notifications, setNotifications] = useState<OpsNotification[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [sosCases, setSosCases] = useState<SOSRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [safetySummary, setSafetySummary] = useState<SafetySummary | null>(null);
  const [assuredRides, setAssuredRides] = useState<AssuredRideCase[]>([]);
  const [cancellationCases, setCancellationCases] = useState<CancellationCase[]>([]);
  const [compensationCases, setCompensationCases] = useState<CompensationCase[]>([]);
  const [riskCases, setRiskCases] = useState<RiskCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ridesError, setRidesError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [assuredError, setAssuredError] = useState<string | null>(null);

  const refreshRides = useCallback(async (filters?: RideFilters) => {
    try {
      const next = await ridesService.getRides(filters);
      setRides(next);
      setRidesError(null);
    } catch (err) {
      setRidesError(err instanceof Error ? err.message : "Unable to load rides.");
    }
  }, []);

  const refreshPeople = useCallback(async () => {
    try {
      const [nextUsers, nextDrivers, nextVerifications] = await Promise.all([
        usersService.getUsers(),
        driversService.getDrivers(),
        verificationService.getVerifications(),
      ]);
      setUsers(nextUsers);
      setDrivers(nextDrivers);
      setVerifications(nextVerifications);
      setPeopleError(null);
    } catch (err) {
      setPeopleError(err instanceof Error ? err.message : "Unable to load people data.");
    }
  }, []);

  const refreshSafety = useCallback(async () => {
    try {
      const active = await ridesService.getActiveRides();
      const [nextSos, nextIncidents, nextEvents, summary] = await Promise.all([
        safetyService.getSOSCases(),
        incidentsService.getIncidents(),
        safetyService.getSafetyEvents(),
        safetyService.getSafetySummary(active.length),
      ]);
      setSosCases(nextSos);
      setIncidents(nextIncidents);
      setSafetyEvents(nextEvents);
      setSafetySummary(summary);
      setSafetyError(null);
    } catch (err) {
      setSafetyError(err instanceof Error ? err.message : "Unable to load safety data.");
    }
  }, []);

  const refreshAssured = useCallback(async () => {
    try {
      const [nextAssured, nextCancels, nextComp, nextRisk] = await Promise.all([
        assuredRideService.getAssuredRides(),
        assuredRideService.getCancellationCases(),
        assuredRideService.getCompensationCases(),
        riskService.getRiskCases(),
      ]);
      setAssuredRides(nextAssured);
      setCancellationCases(nextCancels);
      setCompensationCases(nextComp);
      setRiskCases(nextRisk);
      setAssuredError(null);
    } catch (err) {
      setAssuredError(err instanceof Error ? err.message : "Unable to load Assured Ride data.");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [
        nextHealth,
        nextAlerts,
        nextNotifications,
        nextDashboard,
        nextRides,
        nextUsers,
        nextDrivers,
        nextVerifications,
        nextSos,
        nextIncidents,
        nextEvents,
        nextAssured,
        nextCancels,
        nextComp,
        nextRisk,
      ] = await Promise.all([
        systemHealthService.getSystemHealth(),
        alertsService.getAlerts(),
        notificationsService.getNotifications(),
        dashboardService.getDashboard(),
        ridesService.getRides(),
        usersService.getUsers(),
        driversService.getDrivers(),
        verificationService.getVerifications(),
        safetyService.getSOSCases(),
        incidentsService.getIncidents(),
        safetyService.getSafetyEvents(),
        assuredRideService.getAssuredRides(),
        assuredRideService.getCancellationCases(),
        assuredRideService.getCompensationCases(),
        riskService.getRiskCases(),
      ]);
      setHealth(nextHealth);
      setAlerts(nextAlerts);
      setNotifications(nextNotifications);
      setDashboard(nextDashboard);
      setRides(nextRides);
      setUsers(nextUsers);
      setDrivers(nextDrivers);
      setVerifications(nextVerifications);
      setSosCases(nextSos);
      setIncidents(nextIncidents);
      setSafetyEvents(nextEvents);
      setAssuredRides(nextAssured);
      setCancellationCases(nextCancels);
      setCompensationCases(nextComp);
      setRiskCases(nextRisk);
      const activeCount = nextRides.filter(
        (r) => r.status === "active" || r.status === "delayed",
      ).length;
      setSafetySummary(await safetyService.getSafetySummary(activeCount));
      setError(null);
      setRidesError(null);
      setPeopleError(null);
      setSafetyError(null);
      setAssuredError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load operations data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    const realtime = getRealtimeService();
    realtime.connect();
    const unsubscribe = realtime.subscribe((event) => {
      void (async () => {
        await applyRealtimeEvent(event);
        await refresh();
      })();
    });
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  const acknowledgeAlert = useCallback(
    async (id: string) => {
      await alertsService.acknowledge(id);
      await refresh();
    },
    [refresh],
  );

  const resolveAlert = useCallback(
    async (id: string) => {
      await alertsService.resolve(id);
      await refresh();
    },
    [refresh],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      await notificationsService.markAsRead(id);
      await refresh();
    },
    [refresh],
  );

  const markAllNotificationsRead = useCallback(async () => {
    await notificationsService.markAllAsRead();
    await refresh();
  }, [refresh]);

  const activeRides = useMemo(
    () => rides.filter((r) => r.status === "active" || r.status === "delayed"),
    [rides],
  );

  const getRide = useCallback((id: string) => rides.find((r) => r.id === id), [rides]);
  const getUser = useCallback((id: string) => users.find((u) => u.id === id), [users]);
  const getSos = useCallback((id: string) => sosCases.find((s) => s.id === id), [sosCases]);

  const value = useMemo<OpsContextValue>(
    () => ({
      health,
      alerts,
      notifications,
      dashboard,
      rides,
      activeRides,
      users,
      drivers,
      verifications,
      sosCases,
      incidents,
      safetyEvents,
      safetySummary,
      assuredRides,
      cancellationCases,
      compensationCases,
      riskCases,
      unreadCount: countUnread(notifications),
      loading,
      error,
      ridesError,
      peopleError,
      safetyError,
      assuredError,
      refresh,
      refreshRides,
      refreshPeople,
      refreshSafety,
      refreshAssured,
      getRide,
      getUser,
      getSos,
      acknowledgeAlert,
      resolveAlert,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      health,
      alerts,
      notifications,
      dashboard,
      rides,
      activeRides,
      users,
      drivers,
      verifications,
      sosCases,
      incidents,
      safetyEvents,
      safetySummary,
      assuredRides,
      cancellationCases,
      compensationCases,
      riskCases,
      loading,
      error,
      ridesError,
      peopleError,
      safetyError,
      assuredError,
      refresh,
      refreshRides,
      refreshPeople,
      refreshSafety,
      refreshAssured,
      getRide,
      getUser,
      getSos,
      acknowledgeAlert,
      resolveAlert,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) {
    throw new Error("useOps must be used within OpsProvider");
  }
  return ctx;
}
