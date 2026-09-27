"use client";

import { PullUpIcon } from "@/components/icons/pull-up-icon";
import { useLocale, type Locale } from "@/lib/i18n/context";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
];

// Compact switch for the pre-login pages — the full LanguageForm lives in
// Settings, which isn't reachable before signing in.
function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex rounded-lg border border-card-border overflow-hidden text-xs font-medium">
      {LOCALES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          className={`px-2.5 py-1.5 transition-colors ${
            locale === option.value ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Shared frame for the pages shown without the app's normal chrome
// (login, register, password reset, email confirmation, onboarding).
export function AuthShell({
  title,
  subtitle,
  showLanguageToggle = true,
  children,
}: {
  title: string;
  subtitle?: string;
  showLanguageToggle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center p-6 pt-16">
      {showLanguageToggle && (
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
      )}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2 text-center">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export const authInputClass = "w-full border border-card-border rounded-lg px-3 py-2 bg-transparent";

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-red-600 text-sm">
      {children}
    </p>
  );
}
