// Local midnight boundaries for "today", computed in the browser so the server
// doesn't need to guess the user's timezone.
export function getLocalDayRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
