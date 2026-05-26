import type { BookableServiceType } from "@/lib/types";

export function getServiceDetailHref(
  serviceType: BookableServiceType | string | null | undefined,
  serviceId: string,
  trainerId?: string | null,
) {
  if (serviceType === "facility") return `/bookings/priestory/${serviceId}`;
  if (serviceType === "group") return `/bookings/skupinove-lekcie/${serviceId}`;
  if (serviceType === "trainer" && trainerId) return `/bookings/trainers/${trainerId}`;

  return `/bookings/${serviceId}`;
}

export function getServiceCheckoutHref(
  serviceType: BookableServiceType | string | null | undefined,
  serviceId: string,
  trainerId?: string | null,
) {
  if (serviceType === "facility") return `/bookings/priestory/${serviceId}/checkout`;
  if (serviceType === "group") return `/bookings/skupinove-lekcie/${serviceId}/checkout`;
  if (serviceType === "trainer" && trainerId) return `/bookings/trainers/${trainerId}/checkout`;

  return `/bookings/${serviceId}/checkout`;
}
