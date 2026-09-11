"use client";

import { useLocale, type Locale } from "@/lib/i18n/context";

// Unlike the exercise-category form, this applies immediately on tap rather
// than needing a separate Save — it's a per-device preference with nothing
// to send to the server, so there's no round trip to wait on or fail.
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

export function LanguageForm() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const selected = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            className={`flex-1 rounded-2xl border p-4 text-center font-medium transition-colors ${
              selected ? "border-accent bg-accent text-accent-foreground" : "border-card-border bg-card"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
