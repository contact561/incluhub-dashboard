import { STUDIO_SLOT_LABELS } from "@/lib/constants/studioSlots";
import type { AssistantAvailabilityChoice } from "@/types/studio-booking";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00+05:30`));
}

export function AssistantAvailabilitySummary({ choices }: { choices: AssistantAvailabilityChoice[] }) {
  if (choices.length === 0) return <p className="mt-3 text-sm text-text-muted">Your assistants have not shared timings yet. You may wait or book another available slot after checking with them directly.</p>;
  const counts = new Map<string, number>();
  for (const choice of choices) counts.set(`${choice.bookingDate}:${choice.slotCode}`, (counts.get(`${choice.bookingDate}:${choice.slotCode}`) ?? 0) + 1);
  const sorted = choices.slice().sort((a, b) => (counts.get(`${b.bookingDate}:${b.slotCode}`) ?? 0) - (counts.get(`${a.bookingDate}:${a.slotCode}`) ?? 0) || a.bookingDate.localeCompare(b.bookingDate));
  return <div className="mt-3 space-y-2">
    <p className="text-sm font-medium text-text-primary">Assistant recommendations</p>
    <ul className="space-y-1 text-sm text-text-muted">
      {sorted.map((choice, index) => <li key={`${choice.assistantStudentId}-${choice.bookingDate}-${choice.slotCode}-${index}`}>
        {counts.get(`${choice.bookingDate}:${choice.slotCode}`) === 2 ? "Both assistants" : choice.assistantName}: {formatDate(choice.bookingDate)} · {STUDIO_SLOT_LABELS[choice.slotCode]}
      </li>)}
    </ul>
  </div>;
}

