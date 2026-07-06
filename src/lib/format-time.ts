import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

export function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  return `last seen ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

export function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso);
  return format(date, "HH:mm");
}

export function formatConversationTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}
