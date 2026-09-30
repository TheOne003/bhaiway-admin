import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeIndianRupee,
  Bell,
  Car,
  ClipboardList,
  FileText,
  Gift,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPinned,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Ticket,
  Users,
  UserCheck,
  Wallet,
  Building2,
  Route,
  Ban,
  HandCoins,
  Siren,
  Server,
  KeyRound,
  ScrollText,
  Megaphone,
  Workflow,
  History,
  BarChart3,
  Landmark,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  phase?: number;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    id: "command",
    label: "Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, phase: 2 },
      { label: "Live Map", href: "/live-map", icon: Map, phase: 3 },
      { label: "Alerts", href: "/alerts", icon: AlertTriangle, phase: 2 },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { label: "Users", href: "/users", icon: Users, phase: 4 },
      { label: "Drivers", href: "/drivers", icon: Car, phase: 4 },
      { label: "Verification", href: "/verification", icon: UserCheck, phase: 4 },
    ],
  },
  {
    id: "mobility",
    label: "Mobility",
    items: [
      { label: "Rides", href: "/rides", icon: Route, phase: 3 },
      { label: "Vehicles", href: "/vehicles", icon: Car, phase: 4 },
      { label: "Fare Management", href: "/fare-management", icon: BadgeIndianRupee, phase: 6 },
      { label: "Outstation", href: "/outstation", icon: MapPinned, phase: 3 },
      { label: "Office Commute", href: "/office-commute", icon: Building2, phase: 3 },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    items: [
      { label: "Live Monitoring", href: "/safety/live-monitoring", icon: Radio, phase: 5 },
      { label: "SOS", href: "/safety/sos", icon: Siren, phase: 5 },
      { label: "Incidents & Reports", href: "/safety/incidents", icon: ShieldAlert, phase: 5 },
    ],
  },
  {
    id: "assured",
    label: "Assured Ride",
    items: [
      { label: "Assured Rides", href: "/assured-rides", icon: Shield, phase: 5 },
      { label: "Cancellations", href: "/assured-rides/cancellations", icon: Ban, phase: 5 },
      { label: "Compensation", href: "/assured-rides/compensation", icon: HandCoins, phase: 5 },
      { label: "Fraud / Risk", href: "/assured-rides/fraud-risk", icon: AlertTriangle, phase: 5 },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { label: "Wallet", href: "/wallet", icon: Wallet, phase: 6 },
      { label: "Transactions", href: "/transactions", icon: Landmark, phase: 6 },
      { label: "Security Deposits", href: "/security-deposits", icon: Shield, phase: 6 },
      { label: "Refunds", href: "/refunds", icon: HandCoins, phase: 6 },
      { label: "Credits", href: "/credits", icon: Gift, phase: 6 },
    ],
  },
  {
    id: "growth",
    label: "Growth",
    items: [
      { label: "Coupons", href: "/coupons", icon: Ticket, phase: 6 },
      { label: "Referrals", href: "/referrals", icon: Gift, phase: 6 },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      { label: "Notification Center", href: "/notifications", icon: Bell, phase: 7 },
      { label: "Notification History", href: "/notifications/history", icon: History, phase: 7 },
      { label: "Templates", href: "/notifications/templates", icon: FileText, phase: 7 },
      { label: "Automations", href: "/notifications/automations", icon: Workflow, phase: 7 },
      { label: "Campaigns", href: "/notifications/campaigns", icon: Megaphone, phase: 7 },
      { label: "Communications", href: "/communications", icon: MessageSquare, phase: 7 },
    ],
  },
  {
    id: "customer-ops",
    label: "Customer Operations",
    items: [
      { label: "Support Tickets", href: "/support", icon: LifeBuoy, phase: 7 },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, phase: 8 },
      { label: "Reports", href: "/reports", icon: ClipboardList, phase: 8 },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { label: "API & Service Health", href: "/system-health", icon: HeartPulse, phase: 2 },
      { label: "Infrastructure", href: "/system/infrastructure", icon: Server, phase: 8 },
      { label: "System Alerts", href: "/system/alerts", icon: Activity, phase: 8 },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { label: "Admin Users", href: "/settings/admins", icon: Users, phase: 8 },
      { label: "Roles & Permissions", href: "/settings/roles", icon: KeyRound, phase: 8 },
      { label: "Audit Logs", href: "/settings/audit-logs", icon: ScrollText, phase: 8 },
      { label: "Platform Settings", href: "/settings/platform", icon: Settings, phase: 8 },
    ],
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  for (const section of NAVIGATION) {
    const match = section.items.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (match) return match;
  }
  return undefined;
}

export function getPageTitle(pathname: string): string {
  return findNavItem(pathname)?.label ?? "BhaiWay Admin";
}
