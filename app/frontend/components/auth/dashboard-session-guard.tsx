"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type DashboardSessionGuardProps = {
  children: ReactNode;
};

export function DashboardSessionGuard({
  children,
}: DashboardSessionGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    let isMounted = true;

    async function refreshSession() {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not refresh session");
        }

        if (isMounted) {
          setStatus("ready");
          router.refresh();
        }
      } catch {
        router.replace("/login");
      }
    }

    void refreshSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (status !== "ready") {
    return (
      <div className="section-shell flex min-h-screen items-center justify-center py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-sky-400/20" />
            <div className="absolute inset-2 rounded-full border border-t-sky-300 border-r-transparent border-b-fuchsia-300 border-l-transparent animate-spin" />
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-300 to-fuchsia-300 blur-[2px]" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">Loading dashboard</div>
            <p className="mt-2 text-sm text-slate-400">
              Preparing your workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
