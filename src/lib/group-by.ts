export type GroupSection<T> = { groupId: string | null; groupName: string; items: T[] };

// Buckets items by the group(s) they belong to (an item with several groups
// appears in each one), plus an "Ungrouped" bucket for items with none.
// Only returns non-empty sections.
export function groupItemsByGroup<T>(
  items: T[],
  groups: { id: string; name: string }[],
  getGroupIds: (item: T) => string[],
): GroupSection<T>[] {
  const sections: GroupSection<T>[] = groups.map((g) => ({ groupId: g.id, groupName: g.name, items: [] }));
  const sectionByGroupId = new Map(sections.map((s) => [s.groupId, s]));
  const ungrouped: T[] = [];

  for (const item of items) {
    const groupIds = getGroupIds(item);
    if (groupIds.length === 0) {
      ungrouped.push(item);
      continue;
    }
    for (const groupId of groupIds) {
      sectionByGroupId.get(groupId)?.items.push(item);
    }
  }

  const nonEmptySections = sections.filter((s) => s.items.length > 0);
  if (ungrouped.length > 0) {
    nonEmptySections.push({ groupId: null, groupName: "Ungrouped", items: ungrouped });
  }
  return nonEmptySections;
}
