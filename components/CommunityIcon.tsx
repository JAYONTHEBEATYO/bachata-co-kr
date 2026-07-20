import {
  CalendarDays,
  CircleHelp,
  Clapperboard,
  MessagesSquare,
  Megaphone,
  Mic2,
  Music2,
  School,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import type { CSSProperties } from "react";

const iconByCategory: Record<string, LucideIcon> = {
  free: MessagesSquare,
  questions: CircleHelp,
  video: Clapperboard,
  events: CalendarDays,
  promotion: Megaphone,
  academyReview: School,
  dancerReview: Sparkles,
  socialReview: Music2,
  ama: Mic2
};

export function CommunityIcon({
  category,
  color,
  size = 18,
  className = ""
}: {
  category: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const Icon = iconByCategory[category] || MessagesSquare;
  return (
    <span className={`community-icon ${className}`} style={{ "--community-color": color } as CSSProperties}>
      <Icon size={size} strokeWidth={2.15} />
    </span>
  );
}
