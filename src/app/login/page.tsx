"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";
import { useT } from "@/lib/i18n/context";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowForgotPassword(false);
    setIsSubmitting(true);

    const { email } = await utils.auth.resolveLoginEmail.fetch({ username });

    if (!email) {
      setIsSubmitting(false);
      setError(t("auth.usernameOrPasswordWrong"));
      setShowForgotPassword(true);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      setError(t("auth.usernameOrPasswordWrong"));
      setShowForgotPassword(true);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">Setisfaction</h1>
        </div>

        <input
          type="text"
          placeholder={t("auth.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={inputClass}
        />

        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={inputClass}
        />

        {error && (
          <div className="flex flex-col gap-1">
            <p className="text-red-600 text-sm">{error}</p>
            {showForgotPassword && (
              <Link href="/forgot-password" className="text-sm text-muted underline w-fit">
                {t("auth.forgotPassword")}
              </Link>
            )}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.loggingIn") : t("auth.logIn")}
        </Button>

        <Link href="/register" className="text-sm text-muted text-center">
          {t("auth.newHereCreateAccount")}
        </Link>
      </form>
    </main>
  );
}
