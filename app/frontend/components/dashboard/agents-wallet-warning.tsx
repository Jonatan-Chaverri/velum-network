"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AgentsWalletWarning() {
  const { address, connectWallet, isConnecting, isCorrectNetwork, switchNetwork } = useWallet();

  if (address && isCorrectNetwork) {
    return null;
  }

  return (
    <Card className="border-amber-400/30 bg-amber-500/10">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-100">Wallet connection required</p>
            <p className="text-sm text-amber-100/80">
              New agents are registered on-chain from the user wallet, so agent creation stays
              disabled until you connect MetaMask on Arbitrum Sepolia.
            </p>
          </div>
        </div>
        {address ? (
          <Button variant="secondary" onClick={switchNetwork}>
            Switch Network
          </Button>
        ) : (
          <Button variant="secondary" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CreateAgentButton() {
  const { address, isCorrectNetwork } = useWallet();
  const isDisabled = !address || !isCorrectNetwork;

  if (isDisabled) {
    return (
      <Button disabled title="Connect your wallet on Arbitrum Sepolia to create agents.">
        Create Agent
      </Button>
    );
  }

  return (
    <Button asChild>
      <Link href="/dashboard/agents/new">Create Agent</Link>
    </Button>
  );
}
