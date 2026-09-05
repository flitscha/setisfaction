"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, usernameToEmail } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = trpc.auth.register.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await register.mutateAsync({ username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return;
    }

    // The account now exists; sign in to establish a session in this browser.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (signInError) {
      setError("Account created — please log in.");
      router.push("/login");
      return;
    }

    router.push("/today");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">Create account</h1>
        </div>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={inputClass}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? "Creating…" : "Create account"}
        </Button>

        <Link href="/login" className="text-sm text-muted text-center">
          Already have an account? Log in
        </Link>
      </form>
    </main>
  );
}
