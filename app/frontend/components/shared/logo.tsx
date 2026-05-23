import Link from "next/link";
import { ShieldEllipsis } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-glow">
        <ShieldEllipsis className="h-5 w-5 text-sky-300" />
      </span>
      <span className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
        Velum Network
      </span>
    </Link>
  );
}
