/** BhaiWay mobility networks — always shown explicitly in the admin UI. */
export type RideNetwork = "OFFICE" | "OUTSTATION";

export const RIDE_NETWORK_LABELS: Record<RideNetwork, string> = {
  OFFICE: "Office Commute",
  OUTSTATION: "Outstation",
};
