"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAppPath, useViewAsUser } from "@/components/admin/view-as-context";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";

export default function GroupsPage() {
  const isReadOnly = useViewAsUser() !== null;
  const appPath = useAppPath();
  const utils = trpc.useUtils();
  const { data: groups } = trpc.group.list.useQuery();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const createGroup = trpc.group.create.useMutation({
    onSuccess: async () => {
      await utils.group.list.invalidate();
      setNewName("");
    },
  });

  const renameGroup = trpc.group.rename.useMutation({
    onSuccess: async () => {
      await utils.group.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteGroup = trpc.group.delete.useMutation({
    onSuccess: async () => {
      setConfirmDeleteId(null);
      await utils.group.list.invalidate();
      await utils.exercise.list.invalidate();
    },
  });

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <BackLink href={appPath("/exercises")} label="Exercises" />
      <h1 className="text-xl font-semibold px-1">Groups</h1>
      <p className="text-sm text-muted px-1">
        Group exercises (e.g. Push, Pull, Legs) to see how much you train each one. An exercise can belong to
        several groups, or none.
      </p>

      {!isReadOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New group name"
            className="border border-card-border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-0"
          />
          <Button
            disabled={newName.trim() === "" || createGroup.isPending}
            onClick={() => createGroup.mutate({ name: newName.trim() })}
          >
            Add
          </Button>
        </div>
      )}
      {createGroup.error && <p className="text-red-600 text-sm">{createGroup.error.message}</p>}

      <div className="flex flex-col gap-2">
        {groups?.map((group) => (
          <div key={group.id} className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center gap-2">
            {editingId === group.id ? (
              <>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="border border-card-border rounded-lg px-2 py-1 bg-transparent flex-1 min-w-0"
                  autoFocus
                />
                <Button
                  variant="secondary"
                  onClick={() => renameGroup.mutate({ id: group.id, name: editingName.trim() })}
                  disabled={editingName.trim() === "" || renameGroup.isPending}
                >
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : confirmDeleteId === group.id ? (
              <>
                <p className="flex-1 text-sm">Delete &quot;{group.name}&quot;?</p>
                <Button
                  variant="primary"
                  className="bg-red-600 text-white hover:brightness-110"
                  onClick={() => deleteGroup.mutate({ id: group.id })}
                  disabled={deleteGroup.isPending}
                >
                  {deleteGroup.isPending ? "Deleting…" : "Confirm"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <p className="flex-1">{group.name}</p>
                {!isReadOnly && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingId(group.id);
                        setEditingName(group.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmDeleteId(group.id)}>
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
        {groups?.length === 0 && <p className="text-sm text-muted px-1">No groups yet.</p>}
      </div>
    </main>
  );
}
