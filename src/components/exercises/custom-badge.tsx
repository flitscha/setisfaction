// Marks an exercise as the viewer's own (custom-created or a forked/edited
// copy of a standard one) — as opposed to the shared standard exercise
// everyone else sees too. Kept visually distinct from the accent green (PR
// stars, primary actions) so it doesn't compete with those.
export function CustomBadge() {
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 shrink-0">
      Custom
    </span>
  );
}
