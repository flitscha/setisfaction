"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/lib/i18n/context";

export function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const t = useT();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      router.push("/admin");
    },
  });

  const canConfirm = confirmText === username;

  return (
    <>
      <button onClick={() => setShowModal(true)} aria-label={t("admin.deleteThisUser")} className="p-2 -m-2 hover:text-red-900">
        <Trash2 size={18} />
      </button>

      {showModal && (
        <Modal title={t("admin.deleteUser")} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-3 text-foreground">
            <p className="text-sm">{t("admin.deleteConfirm", { name: username })}</p>
            <p className="text-sm text-muted">{t("admin.typeToConfirm", { name: username })}</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="border border-card-border rounded-lg px-3 py-2 bg-transparent"
              autoComplete="off"
              autoFocus
            />
            {deleteUser.error && <p className="text-red-600 text-sm">{deleteUser.error.message}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={deleteUser.isPending}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteUser.mutate({ userId })}
                disabled={!canConfirm || deleteUser.isPending}
              >
                {deleteUser.isPending ? t("common.deleting") : t("admin.deletePermanently")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
