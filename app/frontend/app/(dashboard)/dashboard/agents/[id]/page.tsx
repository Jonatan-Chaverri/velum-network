"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, EyeOff, Globe, KeyRound, Layers3, Shield, Sparkles } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccessTokenCookie } from "@/lib/auth/cookies";
import type { Agent } from "@/lib/data/agents";
import {
  decryptAgentBalance,
  formatTokenAmount,
} from "@/lib/utils/agent-balance";
import {
  getAgentPrivateKey,
  saveAgentPrivateKey,
} from "@/lib/utils/agent-private-key-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatPrice(agent: Agent) {
  if (!agent.service) {
    return null;
  }

  return `${agent.service.price} ${agent.service.currency} / ${agent.service.billingUnit}`;
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={mono ? "mt-2 break-all font-mono text-sm text-slate-200" : "mt-2 text-sm text-slate-200"}>
        {value}
      </div>
    </div>
  );
}

export default function AgentDetailsPage() {
  const params = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceToken, setBalanceToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAgent() {
      try {
        const accessToken = getAccessTokenCookie();

        if (!accessToken) {
          throw new Error("You must be signed in to view this agent.");
        }

        const response = await fetch(`${API_URL}/api/agents/${params.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          agent?: Agent;
        };

        if (!response.ok || !data.success || !data.agent) {
          throw new Error(data.error || "Failed to load agent details.");
        }

        if (!cancelled) {
          setAgent(data.agent);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load agent details.",
          );
        }
      }
    }

    void loadAgent();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!agent) {
      return;
    }

    const storedPrivateKey = getAgentPrivateKey(agent.id);
    if (storedPrivateKey) {
      setPrivateKeyInput(storedPrivateKey);
    } else {
      setPrivateKeyInput("");
    }

    setBalance(null);
    setBalanceError(null);
    setBalanceToken(null);
  }, [agent]);

  useEffect(() => {
    if (agent && privateKeyInput.trim()) {
      saveAgentPrivateKey(agent.id, privateKeyInput.trim());
    }
  }, [agent, privateKeyInput]);

  async function handleLoadBalance() {
    if (!agent) {
      return;
    }

    if (!privateKeyInput.trim()) {
      setBalanceError("Enter the agent private key to decrypt the on-chain balance.");
      setBalance(null);
      return;
    }

    const accessToken = getAccessTokenCookie();
    if (!accessToken) {
      setBalanceError("You must be signed in to load the balance.");
      setBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    setBalanceError(null);
    setBalance(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agent.id}/balance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        balance?: {
          token: string;
          encrypted: number[];
        };
      };

      if (!response.ok || !data.success || !data.balance) {
        throw new Error(data.error || "Failed to load the encrypted agent balance.");
      }

      const decryptedBalance = decryptAgentBalance(
        data.balance.encrypted,
        privateKeyInput.trim(),
      );

      setBalance(formatTokenAmount(decryptedBalance, 6));
      setBalanceToken(data.balance.token);
    } catch (loadBalanceError) {
      console.error(loadBalanceError);
      setBalanceError(
        loadBalanceError instanceof Error
          ? loadBalanceError.message
          : "Failed to load the encrypted agent balance.",
      );
    } finally {
      setIsLoadingBalance(false);
    }
  }

  if (!agent && !error) {
    return (
      <div className="space-y-6">
        <DashboardTopbar
          title="Loading agent"
          description="Preparing the latest details for this workspace."
        />
        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <DashboardTopbar
          title="Agent details"
          description="We couldn't load the requested agent."
        />
        <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
          {error || "Agent not found."}
        </div>
      </div>
    );
  }

  const priceLabel = formatPrice(agent);

  return (
    <div className="space-y-6">
      <DashboardTopbar title={agent.title} description={agent.description} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                <Layers3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Agent identity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="On-chain agent id" value={agent.agentId} />
            <DetailItem label="Category" value={agent.category} />
            <DetailItem label="Public key" value={agent.publicKey} mono />
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-fuchsia-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Lifecycle</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Created at" value={formatDate(agent.createdAt)} />
            <DetailItem label="Updated at" value={formatDate(agent.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Commercial status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Service availability
              </div>
              <div className="mt-3">
                {agent.service ? (
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                    Selling services
                  </Badge>
                ) : (
                  <Badge className="border-white/10 bg-white/5 text-slate-300">
                    Internal only
                  </Badge>
                )}
              </div>
            </div>
            {priceLabel ? <DetailItem label="Price" value={priceLabel} /> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-300">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>On-chain balance</CardTitle>
                  <p className="mt-1 text-sm text-slate-400">
                    Unlock the encrypted treasury with the agent private key.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.5rem] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_55%),rgba(255,255,255,0.03)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/70">
                  Current decrypted balance
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {balance ? `${balance} WETH` : "Protected"}
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  This balance is stored encrypted on-chain. Enter the agent private key here to
                  decrypt it locally in your browser.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="agent-private-key">Agent private key</Label>
                <div className="relative">
                  <Input
                    id="agent-private-key"
                    type={showPrivateKey ? "text" : "password"}
                    value={privateKeyInput}
                    onChange={(event) => setPrivateKeyInput(event.target.value)}
                    placeholder="0x..."
                    className="pr-11 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    aria-label={showPrivateKey ? "Hide private key" : "Show private key"}
                  >
                    {showPrivateKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs leading-6 text-slate-500">
                  This key stays local to your browser and is only used to decrypt the encrypted
                  balance.
                </p>
              </div>

              {balanceError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {balanceError}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {balanceToken ? (
                  <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Token address
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-slate-200">
                      {balanceToken}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    Load the balance to view the on-chain token address.
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLoadBalance}
                  disabled={isLoadingBalance || !privateKeyInput.trim()}
                  className="sm:self-end"
                >
                  {isLoadingBalance ? "Decrypting balance..." : "Load on-chain balance"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Agent details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem label="Title" value={agent.title} />
              <DetailItem label="Description" value={agent.description} />
              <DetailItem label="Category" value={agent.category} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Service details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agent.service ? (
              <>
                <DetailItem label="Price" value={agent.service.price} />
                <DetailItem label="Currency" value={agent.service.currency} />
                <DetailItem label="Pricing model" value={agent.service.pricingModel} />
                <DetailItem label="Billing unit" value={agent.service.billingUnit} />
                <DetailItem label="Status" value={agent.service.status} />
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                This agent does not currently expose a service to other agents.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {agent.service ? (
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                <Globe className="h-5 w-5" />
              </div>
              <CardTitle>Service endpoint</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Endpoint URL" value={agent.service.endpointUrl} mono />
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Service created at"
                value={formatDate(agent.service.createdAt)}
              />
              <DetailItem
                label="Service updated at"
                value={formatDate(agent.service.updatedAt)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
