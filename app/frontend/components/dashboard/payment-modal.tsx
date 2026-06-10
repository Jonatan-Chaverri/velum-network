"use client";

import { useEffect, useMemo, useState } from "react";

import { getAccessTokenCookie } from "@/lib/auth/cookies";
import type { Agent } from "@/lib/data/agents";
import {
  buildTransferConfidentialCalldata,
  convertAgentTransferPublicInputs,
  convertDisplayAmountToProofAmount,
  generateAgentTransferProof,
} from "@/lib/utils/agent-private-features";
import { getAgentPrivateKey } from "@/lib/utils/agent-private-key-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const states = [
  "Preparing secure payment...",
  "Loading encrypted balances...",
  "Generating transfer proof...",
  "Submitting confidential transfer...",
  "Payment completed",
];

type BalanceResponse = {
  success?: boolean;
  error?: string;
  balance?: {
    token: string;
    encrypted: number[];
  };
};

export function PaymentModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ownedAgents, setOwnedAgents] = useState<Agent[]>([]);
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>([]);
  const [senderAgentId, setSenderAgentId] = useState("");
  const [receiverAgentId, setReceiverAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [metadata, setMetadata] = useState("Provision GPU batch inference for research cycle 4.");

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadAgents() {
      try {
        const accessToken = getAccessTokenCookie();
        if (!accessToken) {
          throw new Error("You must be signed in to prepare a confidential payment.");
        }

        const [ownedResponse, marketplaceResponse] = await Promise.all([
          fetch(`${API_URL}/api/agents`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/marketplace`, {
            cache: "no-store",
          }),
        ]);

        const ownedPayload = (await ownedResponse.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          agents?: Agent[];
        };
        const marketplacePayload = (await marketplaceResponse.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          agents?: Agent[];
        };

        if (!ownedResponse.ok || !ownedPayload.success || !ownedPayload.agents) {
          throw new Error(ownedPayload.error || "Could not load your agents.");
        }

        if (!marketplaceResponse.ok || !marketplacePayload.success || !marketplacePayload.agents) {
          throw new Error(marketplacePayload.error || "Could not load marketplace agents.");
        }

        if (cancelled) {
          return;
        }

        const nextOwnedAgents = ownedPayload.agents;
        const nextMarketplaceAgents = marketplacePayload.agents;

        setOwnedAgents(nextOwnedAgents);
        setMarketplaceAgents(nextMarketplaceAgents);
        setSenderAgentId((current) => current || nextOwnedAgents[0]?.id || "");
        setReceiverAgentId((current) => current || nextMarketplaceAgents[0]?.id || "");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load payment options.");
        }
      }
    }

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const availableReceiverAgents = useMemo(
    () => marketplaceAgents.filter((agent) => agent.id !== senderAgentId),
    [marketplaceAgents, senderAgentId],
  );

  useEffect(() => {
    if (!availableReceiverAgents.some((agent) => agent.id === receiverAgentId)) {
      setReceiverAgentId(availableReceiverAgents[0]?.id || "");
    }
  }, [availableReceiverAgents, receiverAgentId]);

  const senderAgent = ownedAgents.find((agent) => agent.id === senderAgentId) ?? null;
  const receiverAgent = availableReceiverAgents.find((agent) => agent.id === receiverAgentId) ?? null;
  const isValidAmount = /^(?:0|[1-9]\d*)(?:\.\d{0,3})?$/.test(amount) && Number(amount) > 0;

  async function loadBalance(agentId: string, isOwnedAgent: boolean) {
    const accessToken = getAccessTokenCookie();
    if (!accessToken) {
      throw new Error("You must be signed in to load encrypted balances.");
    }

    const endpoint = isOwnedAgent
      ? `${API_URL}/api/agents/${agentId}/balance`
      : `${API_URL}/api/agents/public/${agentId}/balance`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as BalanceResponse;

    if (!response.ok || !payload.success || !payload.balance) {
      throw new Error(payload.error || "Could not load encrypted agent balance.");
    }

    return payload.balance;
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!senderAgent || !receiverAgent) {
      setError("Choose both a sender and a recipient agent.");
      return;
    }

    if (!isValidAmount) {
      setError("Enter a valid positive amount with at most 3 decimals.");
      return;
    }

    const senderPrivateKey = getAgentPrivateKey(senderAgent.id);
    if (!senderPrivateKey) {
      setError("Unlock the sender agent on its details page first so the private key is available locally.");
      return;
    }

    setIsSubmitting(true);

    try {
      setStep(0);
      const proofAmount = convertDisplayAmountToProofAmount(amount, "Transfer amount");

      setStep(1);
      const [senderBalance, receiverBalance] = await Promise.all([
        loadBalance(senderAgent.id, true),
        loadBalance(receiverAgent.id, false),
      ]);

      if (senderBalance.token.toLowerCase() !== receiverBalance.token.toLowerCase()) {
        throw new Error("Sender and receiver balances are using different tokens.");
      }

      setStep(2);
      const { proof, publicInputs } = await generateAgentTransferProof({
        senderAgentId: senderAgent.agentId,
        senderPrivateKey,
        senderPublicKey: senderAgent.publicKey,
        senderCurrentEncryptedBalance: senderBalance.encrypted,
        receiverAgentId: receiverAgent.agentId,
        receiverPublicKey: receiverAgent.publicKey,
        receiverCurrentEncryptedBalance: receiverBalance.encrypted,
        token: senderBalance.token,
        amount: proofAmount,
      });

      const packedPublicInputs = convertAgentTransferPublicInputs(publicInputs);

      // Build calldata locally too so transfer uses the same proof-input shape as deposit/withdraw.
      // The backend submits this owner-only transaction after re-encoding the same proof payload.
      buildTransferConfidentialCalldata(packedPublicInputs, proof);

      setStep(3);
      const accessToken = getAccessTokenCookie();
      if (!accessToken) {
        throw new Error("You must be signed in to submit the confidential transfer.");
      }

      const response = await fetch(`${API_URL}/api/agents/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          senderAgentId: senderAgent.id,
          receiverAgentId: receiverAgent.id,
          proofInputs: Array.from(packedPublicInputs),
          proof: Array.from(proof),
          token: senderBalance.token,
          amount: proofAmount.toString(),
          metadata,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        txHash?: string;
      };

      if (!response.ok || !payload.success || !payload.txHash) {
        throw new Error(payload.error || "Could not submit the confidential transfer.");
      }

      setStep(4);
      setSuccess(`Confidential payment completed: ${payload.txHash}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete the confidential transfer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setStep(0);
          setError(null);
          setSuccess(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>New payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send payment</DialogTitle>
          <DialogDescription>
            Choose a sender and recipient agent, then submit a confidential transfer using the same proof conventions as deposits.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sender-agent">Sender agent</Label>
            <select
              id="sender-agent"
              value={senderAgentId}
              onChange={(event) => setSenderAgentId(event.target.value)}
              className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            >
              {ownedAgents.length === 0 ? (
                <option value="">No owned agents available</option>
              ) : (
                ownedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipient-agent">Recipient agent</Label>
            <select
              id="recipient-agent"
              value={receiverAgentId}
              onChange={(event) => setReceiverAgentId(event.target.value)}
              className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            >
              {availableReceiverAgents.length === 0 ? (
                <option value="">No recipient agents available</option>
              ) : (
                availableReceiverAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.125"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <Input id="payment-method" value="Encrypted treasury transfer" readOnly />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="metadata">Metadata</Label>
            <Textarea
              id="metadata"
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-white">{states[step]}</div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400 transition-all"
                style={{ width: `${((step + 1) / states.length) * 100}%` }}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          <Button
            onClick={() => void handleSubmit()}
            disabled={!senderAgent || !receiverAgent || !isValidAmount || isSubmitting}
          >
            {isSubmitting ? "Processing payment..." : "Confirm payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
