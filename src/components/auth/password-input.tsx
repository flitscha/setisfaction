"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authInputClass } from "@/components/auth/auth-shell";
import { useT } from "@/lib/i18n/context";

// A show/hide toggle instead of a second "confirm password" field — a
// mistyped password is visible before submitting, and still recoverable via
// "forgot password" afterward.
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  minLength?: number;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        minLength={minLength}
        required
        className={`${authInputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted hover:text-foreground"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
