"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function GroupMultiSelect({
  selectedGroupIds,
  onChange,
}: {
  selectedGroupIds: string[];
  onChange: (groupIds: string[]) => void;
}) {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.group.list.useQuery();
  const [newGroupName, setNewGroupName] = useState("");

  const createGroup = trpc.group.create.useMutation({
    onSuccess: async (group) => {
      await utils.group.list.invalidate();
      onChange([...selectedGroupIds, group.id]);
      setNewGroupName("");
    },
  });

  function toggle(groupId: string) {
    if (selectedGroupIds.includes(groupId)) {
      onChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onChange([...selectedGroupIds, groupId]);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1">Groups (optional)</legend>

      {groups && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggle(group.id)}
                className={`text-sm rounded-lg px-3 py-1 border border-card-border ${
                  isSelected ? "bg-accent text-accent-foreground border-transparent" : ""
                }`}
              >
                {group.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name"
          className="border border-card-border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-0 text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={newGroupName.trim() === "" || createGroup.isPending}
          onClick={() => createGroup.mutate({ name: newGroupName.trim() })}
        >
          Add
        </Button>
      </div>
      {createGroup.error && <p className="text-red-600 text-sm">{createGroup.error.message}</p>}
    </fieldset>
  );
}
