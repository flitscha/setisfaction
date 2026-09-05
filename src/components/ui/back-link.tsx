import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 py-2 -my-2 text-sm text-muted hover:text-foreground w-fit">
      <ArrowLeft size={18} />
      {label}
    </Link>
  );
}
