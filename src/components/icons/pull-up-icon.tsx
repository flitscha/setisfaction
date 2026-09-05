// Matches the app icon (src/app/icon.tsx) — a figure hanging from a bar —
// so the same calisthenics mark shows up everywhere the brand appears
// in-app, not just as the installed PWA icon. Drop-in replacement for a
// lucide-react icon: sized by `size`, colored via currentColor.
export function PullUpIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={className}
    >
      <line x1="20" y1="15" x2="80" y2="15" strokeWidth="8" />
      <line x1="30" y1="15" x2="38" y2="45" strokeWidth="7" />
      <line x1="70" y1="15" x2="62" y2="45" strokeWidth="7" />
      <circle cx="50" cy="53" r="9" fill="currentColor" stroke="none" />
      <line x1="50" y1="62" x2="50" y2="80" strokeWidth="7" />
      <line x1="50" y1="80" x2="40" y2="97" strokeWidth="7" />
      <line x1="50" y1="80" x2="60" y2="97" strokeWidth="7" />
    </svg>
  );
}
