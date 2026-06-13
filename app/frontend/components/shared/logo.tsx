import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Velum Network"
        width={40}
        height={40}
        priority
        className="h-10 w-10 object-contain"
      />
      <span className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
        Velum Network
      </span>
    </Link>
  );
}
