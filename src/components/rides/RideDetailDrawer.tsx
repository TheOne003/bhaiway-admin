"use client";

import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { RideDetailContent } from "@/components/rides/RideDetailContent";
import type { Ride } from "@/types/ride";

interface RideDetailDrawerProps {
  ride: Ride | null;
  open: boolean;
  onClose: () => void;
}

export function RideDetailDrawer({ ride, open, onClose }: RideDetailDrawerProps) {
  return (
    <DetailDrawer
      open={open && Boolean(ride)}
      title={ride ? `Ride #${ride.id}` : "Ride"}
      onClose={onClose}
    >
      {ride ? <RideDetailContent ride={ride} compact /> : null}
    </DetailDrawer>
  );
}
