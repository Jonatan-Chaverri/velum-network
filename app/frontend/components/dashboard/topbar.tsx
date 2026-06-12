"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/providers/wallet-provider";

export function DashboardTopbar({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const {
    connectWallet,
    error,
    isConnecting,
    isCorrectNetwork,
    address,
    shortAddress,
    disconnectWallet,
    switchNetwork,
  } = useWallet();
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!walletMenuRef.current?.contains(event.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Badge>Confidential AI commerce</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-400">
            <Search className="h-4 w-4" />
            Search agents, policies, counterparties
          </div>
          {address ? (
            isCorrectNetwork ? (
              <div className="relative" ref={walletMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsWalletMenuOpen((current) => !current)}
                  className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  <Wallet className="h-4 w-4" />
                  {shortAddress}
                </button>
                {isWalletMenuOpen ? (
                  <div className="absolute right-0 top-14 z-20 min-w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-black/30 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => {
                        disconnectWallet();
                        setIsWalletMenuOpen(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                    >
                      Disconnect wallet
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Button variant="secondary" onClick={switchNetwork}>
                Switch to Arbitrum Sepolia
              </Button>
            )
          ) : (
            <Button variant="secondary" onClick={connectWallet} disabled={isConnecting}>
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
        {error ? <p className="text-right text-xs text-amber-300">{error}</p> : null}
      </div>
    </div>
  );
}
