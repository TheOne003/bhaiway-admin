/** Synthetic masking helpers — never format real identity numbers. */

export function maskPhoneLast4(last4: string): string {
  const digits = last4.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `+91 XXXXX ${digits}`;
}

export function maskGovernmentIdLast4(last4: string): string {
  const digits = last4.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `XXXX-XXXX-${digits}`;
}

export function maskLicenceLast4(last4: string): string {
  const digits = last4.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `DL-XXXX-${digits}`;
}

export function maskRcPartial(prefix: string, suffix: string): string {
  const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);
  const cleanSuffix = suffix.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4);
  return `${cleanPrefix}${cleanSuffix ? "****" : "****"}`.replace(/\*{4,}/, "****");
}

export function isMaskedIdentityValue(value: string): boolean {
  return /X{2,}|[*]{2,}|XXXX/i.test(value);
}
