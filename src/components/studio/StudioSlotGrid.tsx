"use client";

import { cn } from "@/lib/utils";
import {
  STUDIO_SLOT_CODES,
  STUDIO_SLOT_LABELS,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";
import type { StudioSlotAvailability } from "@/types/studio-booking";

type StudioSlotGridProps = {
  slots: StudioSlotAvailability[];
  selectedSlot: StudioSlotCode | null;
  pendingSlot: StudioSlotCode | null;
  loading: boolean;
  disabled?: boolean;
  onSelect: (slotCode: StudioSlotCode) => void;
};

function availabilityByCode(
  slots: StudioSlotAvailability[]
): Map<StudioSlotCode, boolean> {
  const map = new Map<StudioSlotCode, boolean>();
  for (const slot of slots) {
    map.set(slot.slotCode, slot.available);
  }
  return map;
}

export function StudioSlotGrid({
  slots,
  selectedSlot,
  pendingSlot,
  loading,
  disabled,
  onSelect,
}: StudioSlotGridProps) {
  const availability = availabilityByCode(slots);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {STUDIO_SLOT_CODES.map((slotCode) => {
        const available = availability.get(slotCode) ?? true;
        const isSelected = selectedSlot === slotCode;
        const isPending = pendingSlot === slotCode;
        const isOccupied = !available;
        const isDisabled = disabled || loading || isOccupied || isPending;

        return (
          <button
            key={slotCode}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(slotCode)}
            aria-pressed={isSelected}
            className={cn(
              "min-h-11 rounded-[var(--radius-control)] border px-3 py-3 text-left text-sm transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page",
              isSelected
                ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                : "border-border-default bg-surface-card text-text-primary hover:border-border-strong hover:bg-surface-muted/60",
              isOccupied && !isSelected && "cursor-not-allowed opacity-50",
              isPending && "cursor-wait opacity-70"
            )}
          >
            <span className="font-medium">{STUDIO_SLOT_LABELS[slotCode]}</span>
            <span
              className={cn(
                "mt-1 block text-xs",
                isSelected
                  ? "text-brand-primary-foreground/80"
                  : "text-text-muted"
              )}
            >
              {loading
                ? "Checking availability…"
                : isPending
                  ? "Booking in progress…"
                  : isOccupied
                    ? "Occupied"
                    : "Available"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
