"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, EllipsisVertical, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

type Platform = "ios" | "android";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome on Android fires beforeinstallprompt once, early in page load —
// captured at module scope (plain state + subscribers, like view-as.ts) so
// it isn't missed when this component mounts after it fired.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useDeferredPrompt() {
  return useSyncExternalStore(
    subscribe,
    () => deferredPrompt,
    () => null,
  );
}

function detectPlatform(): Platform | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support tells them apart.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return null;
}

export function isRunningInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const DISMISSED_KEY = "installHintDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribeNever = () => () => {};

// Explains how to add the site to the home screen as an app (it's a PWA —
// there's no app store listing). Hidden when already running installed.
// `collapsible` is the login page's variant: a one-line teaser that expands
// on tap and can be dismissed for good on this device.
export function InstallAppHint({ collapsible = false }: { collapsible?: boolean }) {
  const t = useT();
  const installPrompt = useDeferredPrompt();
  // The server can't know the device, so it renders nothing ("server"
  // snapshot) and the real values apply right after hydration.
  const detected = useSyncExternalStore(subscribeNever, detectPlatform, () => "server" as const);
  const installed = useSyncExternalStore(subscribeNever, isRunningInstalled, () => true);
  const storedDismissed = useSyncExternalStore(subscribeNever, () => collapsible && readDismissed(), () => true);
  const [dismissed, setDismissed] = useState(false);
  const [chosenPlatform, setChosenPlatform] = useState<Platform | null>(null);
  const [expanded, setExpanded] = useState(!collapsible);

  if (detected === "server" || installed || storedDismissed || dismissed) return null;
  const platform: Platform = chosenPlatform ?? detected ?? "ios";

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // nothing to persist to — hides for this visit only
    }
    setDismissed(true);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((l) => l());
    if (outcome === "accepted") setDismissed(true);
  }

  if (!expanded) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
        <Smartphone size={20} className="shrink-0 text-accent" />
        <button type="button" onClick={() => setExpanded(true)} className="flex-1 text-left">
          <p className="text-sm font-medium">{t("install.title")}</p>
          <p className="text-xs text-muted">{t("install.teaser")}</p>
        </button>
        <button type="button" onClick={dismiss} aria-label={t("install.dismiss")} className="p-1 text-muted">
          <X size={16} />
        </button>
      </div>
    );
  }

  const iosSteps = [
    { icon: null, text: t("install.iosStep1") },
    { icon: <Share size={16} className="inline -mt-0.5" />, text: t("install.iosStep2") },
    { icon: <SquarePlus size={16} className="inline -mt-0.5" />, text: t("install.iosStep3") },
    { icon: null, text: t("install.iosStep4") },
  ];
  const androidSteps = [
    { icon: null, text: t("install.androidStep1") },
    { icon: <EllipsisVertical size={16} className="inline -mt-0.5" />, text: t("install.androidStep2") },
    { icon: <Download size={16} className="inline -mt-0.5" />, text: t("install.androidStep3") },
  ];
  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Smartphone size={20} className="shrink-0 text-accent mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("install.title")}</p>
          <p className="text-xs text-muted">{t("install.why")}</p>
        </div>
        {collapsible && (
          <button type="button" onClick={dismiss} aria-label={t("install.dismiss")} className="p-1 -m-1 text-muted">
            <X size={16} />
          </button>
        )}
      </div>

      {platform === "android" && installPrompt && (
        <Button type="button" onClick={install}>
          {t("install.installNow")}
        </Button>
      )}

      <div className="flex rounded-lg border border-card-border overflow-hidden text-xs font-medium">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setChosenPlatform(p)}
            aria-pressed={platform === p}
            className={`flex-1 px-2 py-1.5 transition-colors ${platform === p ? "bg-accent text-accent-foreground" : "text-muted"}`}
          >
            {p === "ios" ? "iPhone / iPad" : "Android"}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2 text-sm">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-xs font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <span>
              {step.text} {step.icon}
            </span>
          </li>
        ))}
      </ol>

      {platform === "ios" && <p className="text-xs text-muted">{t("install.iosLoginAgain")}</p>}
      {detected === null && <p className="text-xs text-muted">{t("install.openOnPhone")}</p>}
    </div>
  );
}
