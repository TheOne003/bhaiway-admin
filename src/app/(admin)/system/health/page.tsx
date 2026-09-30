import { redirect } from "next/navigation";

/** Back-compat with Phase 1 nav path. */
export default function LegacySystemHealthRedirect() {
  redirect("/system-health");
}
