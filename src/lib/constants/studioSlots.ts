export const STUDIO_TIMEZONE = "Asia/Kolkata" as const;

export const STUDIO_SLOT_CODES = [
  "slot_06_09",
  "slot_09_12",
  "slot_12_15",
  "slot_15_18",
  "slot_18_21",
] as const;

export type StudioSlotCode = (typeof STUDIO_SLOT_CODES)[number];

export const STUDIO_SLOT_LABELS: Record<StudioSlotCode, string> = {
  slot_06_09: "6:00 AM – 9:00 AM",
  slot_09_12: "9:00 AM – 12:00 PM",
  slot_12_15: "12:00 PM – 3:00 PM",
  slot_15_18: "3:00 PM – 6:00 PM",
  slot_18_21: "6:00 PM – 9:00 PM",
};

export function isStudioSlotCode(value: string): value is StudioSlotCode {
  return (STUDIO_SLOT_CODES as readonly string[]).includes(value);
}

export function getTodayInAsiaKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatStudioBookingDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: STUDIO_TIMEZONE,
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatStudioBookedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: STUDIO_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
