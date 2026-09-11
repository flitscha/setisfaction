"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useLocale, useT } from "@/lib/i18n/context";

export default function AdminPage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === "de" ? "de-DE" : "en-US";
  const { data: isAdmin, isLoading: isLoadingRole } = trpc.admin.isAdmin.useQuery();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin === true });

  if (!isLoadingRole && !isAdmin) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">{t("admin.notAuthorized")}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck size={20} className="text-accent" />
        <h1 className="text-xl font-semibold">{t("admin.users")}</h1>
      </div>

      {isLoading && <p className="text-muted px-1">{t("common.loading")}</p>}

      <div className="flex flex-col gap-2">
        {users?.map((user) => (
          <Link
            key={user.userId}
            href={`/admin/${user.userId}/today`}
            className="rounded-lg border border-card-border bg-card px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="font-medium flex items-center gap-2">
                {user.username}
                {user.isAdmin && <span className="text-xs text-accent">{t("admin.admin")}</span>}
              </p>
              <p className="text-xs text-muted">
                {t("admin.joined", { date: user.createdAt.toLocaleDateString(dateLocale) })}
              </p>
            </div>
            <p className="text-sm text-muted">{t("admin.setsCount", { count: user.totalSets })}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
