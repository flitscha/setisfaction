// Local midnight boundaries for "today", computed in the browser so the server
// doesn't need to guess the user's timezone.
export function getLocalDayRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// YYYY-MM-DD in the browser's local timezone, used to bucket timestamps by calendar day.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "Today", "Yesterday", "N days ago" relative to the local calendar day.
export function formatDaysAgo(date: Date): string {
  const { start } = getLocalDayRange();
  const otherDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((start.getTime() - otherDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
