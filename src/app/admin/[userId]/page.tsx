"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, ShieldAlert, Timer, Dumbbell } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export default function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: user, isLoading, error } = trpc.admin.getUser.useQuery({ userId });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      router.push("/admin");
    },
  });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">{error?.message ?? "User not found."}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-md mx-auto w-full flex flex-col">
      <div className="bg-amber-500/15 border-b-2 border-amber-500 px-4 py-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
        <ShieldAlert size={16} />
        <span>
          Viewing <strong>{user.username}</strong>&apos;s data as admin — read-only
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4 border-2 border-t-0 border-amber-500/40 flex-1">
        <div>
          <h1 className="text-xl font-semibold">{user.username}</h1>
          <p className="text-sm text-muted">Joined {user.createdAt.toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-card-border bg-card px-4 py-3">
            <p className="text-2xl font-semibold">{user.totalSets}</p>
            <p className="text-sm text-muted">Total sets</p>
          </div>
          <div className="rounded-lg border border-card-border bg-card px-4 py-3">
            <p className="text-2xl font-semibold">{user.totalTrainingDays}</p>
            <p className="text-sm text-muted">Training days</p>
          </div>
        </div>

        <div>
          <h2 className="font-medium px-1 mb-2">Exercises ({user.exercises.length})</h2>
          <div className="flex flex-col gap-2">
            {user.exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-lg border border-card-border bg-card px-4 py-3 flex items-center justify-between">
                <p>{exercise.name}</p>
                <div className="flex items-center gap-2 text-muted">
                  {exercise.tracksReps && <Hash size={16} aria-label="Tracks reps" />}
                  {exercise.tracksTime && <Timer size={16} aria-label="Tracks time" />}
                  {exercise.tracksWeight && <Dumbbell size={16} aria-label="Tracks weight" />}
                </div>
              </div>
            ))}
            {user.exercises.length === 0 && <p className="text-muted px-1 text-sm">No exercises yet.</p>}
          </div>
        </div>

        <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="mt-4">
          Delete this user
        </Button>
      </div>

      {showDeleteModal && (
        <DeleteUserModal
          username={user.username}
          isPending={deleteUser.isPending}
          error={deleteUser.error?.message}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => deleteUser.mutate({ userId })}
        />
      )}
    </main>
  );
}

function DeleteUserModal({
  username,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  username: string;
  isPending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText === username;

  return (
    <Modal title="Delete user" onClose={onCancel}>
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          This permanently deletes <strong>{username}</strong>&apos;s account, all their exercises, groups, and sets. This
          cannot be undone.
        </p>
        <p className="text-sm text-muted">
          Type <strong>{username}</strong> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="border border-card-border rounded-lg px-3 py-2 bg-transparent"
          autoComplete="off"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={!canConfirm || isPending}>
            {isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
