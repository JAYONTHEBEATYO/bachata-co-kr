import { CalendarDays, MapPin } from "lucide-react";
import type { EventCard } from "@/lib/types";

export function EventVisual({ event, compact = false }: { event: EventCard; compact?: boolean }) {
  if (event.posterUrl) {
    return <img className={compact ? "event-visual compact" : "event-visual"} src={event.posterUrl} alt={`${event.title} 포스터`} />;
  }

  return (
    <div className={compact ? "event-visual event-fallback compact" : "event-visual event-fallback"} aria-label={`${event.title} 일정 카드`}>
      <span>{event.region === "domestic" ? "KOREA" : "OVERSEAS"}</span>
      <strong>{event.title}</strong>
      <em><CalendarDays size={14} /> {event.dateLabel}</em>
      <em><MapPin size={14} /> {event.city}</em>
    </div>
  );
}
