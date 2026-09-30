import type { SOSStatus } from "@/types/sos";

const ALLOWED: Record<SOSStatus, SOSStatus[]> = {
  TRIGGERED: ["ACKNOWLEDGED", "RESPONDING", "RESOLVED", "FALSE_ALARM"],
  ACKNOWLEDGED: ["RESPONDING", "RESOLVED", "FALSE_ALARM"],
  RESPONDING: ["RESOLVED", "FALSE_ALARM"],
  RESOLVED: [],
  FALSE_ALARM: [],
};

export function canTransitionSos(from: SOSStatus, to: SOSStatus): boolean {
  return ALLOWED[from].includes(to);
}

export type SosAction = "acknowledge" | "respond" | "resolve" | "false_alarm";

export function nextSosStatus(action: SosAction): SOSStatus {
  switch (action) {
    case "acknowledge":
      return "ACKNOWLEDGED";
    case "respond":
      return "RESPONDING";
    case "resolve":
      return "RESOLVED";
    case "false_alarm":
      return "FALSE_ALARM";
  }
}
