import {
  TEMPLATE_VARIABLES,
  type NotificationTemplate,
  type TemplateStatus,
} from "@/types/communication";
import type { NotificationChannel } from "@/types/notifications";

const VAR_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractTemplateVariables(body: string, subject?: string | null): string[] {
  const found = new Set<string>();
  for (const text of [body, subject ?? ""]) {
    let m: RegExpExecArray | null;
    const re = new RegExp(VAR_PATTERN.source, "g");
    while ((m = re.exec(text)) !== null) found.add(m[1]);
  }
  return [...found];
}

export function renderTemplate(
  body: string,
  vars: Record<string, string>,
  subject?: string | null,
): { body: string; subject: string | null; unknownVariables: string[] } {
  const unknown = new Set<string>();
  function replace(text: string): string {
    return text.replace(VAR_PATTERN, (_, name: string) => {
      if (!(name in vars)) {
        unknown.add(name);
        return `{{${name}}}`;
      }
      return vars[name];
    });
  }
  return {
    body: replace(body),
    subject: subject != null ? replace(subject) : null,
    unknownVariables: [...unknown],
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTemplate(input: {
  body: string;
  subject: string | null;
  channels: NotificationChannel[];
  status?: TemplateStatus;
}): TemplateValidationResult {
  const errors: string[] = [];
  if (!input.body.trim()) errors.push("Body is required.");
  if (input.channels.length === 0) errors.push("At least one channel is required.");
  if (input.channels.includes("EMAIL") && !input.subject?.trim()) {
    errors.push("Email channel requires a subject.");
  }
  const allowed = new Set<string>(TEMPLATE_VARIABLES);
  const vars = extractTemplateVariables(input.body, input.subject);
  for (const v of vars) {
    if (!allowed.has(v)) errors.push(`Unknown variable: {{${v}}}`);
  }
  // Malformed: unmatched braces
  if (/\{\{[^}]*$/.test(input.body) || /\{\{[^}]*$/.test(input.subject ?? "")) {
    errors.push("Malformed variable syntax.");
  }
  if (/\{[^{]|[^}]\}/.test(input.body.replace(VAR_PATTERN, ""))) {
    // soft check — single braces left after known vars
  }
  return { valid: errors.length === 0, errors };
}

export function canTransitionTemplateStatus(
  from: TemplateStatus,
  to: TemplateStatus,
): boolean {
  if (from === to) return true;
  if (from === "DRAFT" && (to === "ACTIVE" || to === "ARCHIVED")) return true;
  if (from === "ACTIVE" && (to === "ARCHIVED" || to === "DRAFT")) return true;
  if (from === "ARCHIVED" && to === "DRAFT") return true;
  return false;
}

export const SAMPLE_TEMPLATE_VARS: Record<string, string> = {
  userName: "Rahul",
  rideId: "BW-RIDE-001",
  driverName: "Aman Driver",
  pickup: "Synthetic Hub A",
  dropoff: "Synthetic Hub B",
  amount: "₹250",
  ticketId: "tkt_001",
  verificationType: "GOVERNMENT_ID",
};

export type { NotificationTemplate };
