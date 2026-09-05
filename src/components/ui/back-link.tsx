import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm text-muted hover:text-foreground w-fit">
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
