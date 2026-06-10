"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Layers3,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useWallet } from "@/components/providers/wallet-provider";
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
  AGENT_TOKEN_DECIMALS,
  buildApproveCalldata,
  buildDepositCalldata,
  buildWithdrawCalldata,
  convertAgentDepositPublicInputs,
  convertAgentWithdrawPublicInputs,
  convertDisplayAmountToProofAmount,
  convertProofAmountToErc20Amount,
  generateAgentDepositProof,
  generateAgentWithdrawProof,
} from "@/lib/utils/agent-private-features";
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
  const {
    address,
    config,
    connectWallet,
    error: walletError,
    isConnecting,
    isCorrectNetwork,
    sendTransaction,
    switchNetwork,
  } = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [balanceToken, setBalanceToken] = useState<string | null>(null);
  const [encryptedBalance, setEncryptedBalance] = useState<number[] | null>(null);

  const isValidDepositAmount =
    /^(?:0|[1-9]\d*)(?:\.\d{0,3})?$/.test(depositAmount) &&
    Number(depositAmount) > 0;
  const isValidWithdrawAmount =
    /^(?:0|[1-9]\d*)(?:\.\d{0,3})?$/.test(withdrawAmount) &&
    Number(withdrawAmount) > 0;
  const isPrivateFeaturesUnlocked = !!privateKeyInput.trim() && !!encryptedBalance;

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
    setEncryptedBalance(null);
    setDepositAmount("");
    setWithdrawAmount("");
    setDepositError(null);
    setDepositSuccess(null);
    setWithdrawError(null);
    setWithdrawSuccess(null);
  }, [agent]);

  useEffect(() => {
    if (agent && privateKeyInput.trim()) {
      saveAgentPrivateKey(agent.id, privateKeyInput.trim());
    }
  }, [agent, privateKeyInput]);

  async function loadEncryptedBalance() {
    if (!agent) {
      throw new Error("Agent details are not loaded yet.");
    }

    const accessToken = getAccessTokenCookie();
    if (!accessToken) {
      throw new Error("You must be signed in to load the balance.");
    }

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

    return data.balance;
  }

  async function handleLoadBalance() {
    if (!privateKeyInput.trim()) {
      setBalanceError("Enter the agent private key to unlock the private on-chain features.");
      setBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    setBalanceError(null);
    setDepositError(null);
    setDepositSuccess(null);

    try {
      const loadedBalance = await loadEncryptedBalance();
      const decryptedBalance = decryptAgentBalance(
        loadedBalance.encrypted,
        privateKeyInput.trim(),
      );

      console.log("[agent-private] unlocked private features", {
        agentId: agent?.agentId,
        token: loadedBalance.token,
        encryptedBytes: loadedBalance.encrypted.length,
      });

      setEncryptedBalance(loadedBalance.encrypted);
      setBalance(decryptedBalance);
      setBalanceToken(loadedBalance.token);
    } catch (loadBalanceError) {
      console.error("[agent-private] unlock failed", loadBalanceError);
      setEncryptedBalance(null);
      setBalance(null);
      setBalanceToken(null);
      setBalanceError(
        loadBalanceError instanceof Error
          ? loadBalanceError.message
          : "Failed to load the encrypted agent balance.",
      );
    } finally {
      setIsLoadingBalance(false);
    }
  }

  async function registerDepositTransaction(txHash: string, token: string, amount: bigint) {
    try {
      await fetch(`${API_URL}/api/transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_hash: txHash,
          type: "DEPOSIT",
          token,
          amount: amount.toString(),
          sender_agent_id: null,
          receiver_agent_id: agent?.agentId ?? null,
          associated_wallet: address,
        }),
      });
    } catch (registrationError) {
      console.error("[agent-deposit] transaction registration failed", registrationError);
    }
  }

  async function registerWithdrawTransaction(txHash: string, token: string, amount: bigint) {
    try {
      await fetch(`${API_URL}/api/transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_hash: txHash,
          type: "WITHDRAW",
          token,
          amount: amount.toString(),
          sender_agent_id: agent?.agentId ?? null,
          receiver_agent_id: null,
          associated_wallet: address,
        }),
      });
    } catch (registrationError) {
      console.error("[agent-withdraw] transaction registration failed", registrationError);
    }
  }

  async function handleDeposit() {
    if (!agent) {
      return;
    }

    setDepositError(null);
    setDepositSuccess(null);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!privateKeyInput.trim()) {
      setDepositError("Unlock the private features with the agent private key before depositing.");
      return;
    }

    if (!isValidDepositAmount) {
      setDepositError("Enter a valid positive amount with at most 3 decimals.");
      return;
    }

    if (!address) {
      setDepositError("Connect your wallet before depositing funds.");
      return;
    }

    if (!isCorrectNetwork) {
      try {
        await switchNetwork();
      } catch (switchError) {
        setDepositError(
          switchError instanceof Error
            ? switchError.message
            : "Switch your wallet to Arbitrum Sepolia before depositing.",
        );
        return;
      }
    }

    setIsDepositing(true);

    try {
      const unlockedBalance = await loadEncryptedBalance();
      const proofAmount = convertDisplayAmountToProofAmount(depositAmount);
      const erc20Amount = convertProofAmountToErc20Amount(proofAmount);

      console.log("[agent-deposit] preparing deposit", {
        agentId: agent.agentId,
        controller: address,
        token: unlockedBalance.token,
        displayAmount: depositAmount,
        proofAmount: proofAmount.toString(),
        erc20Amount: erc20Amount.toString(),
      });

      const approveCalldata = buildApproveCalldata(
        config.confidentialErc20Address,
        erc20Amount,
      );

      const { txHash: approvalTxHash } = await sendTransaction({
        to: unlockedBalance.token,
        data: approveCalldata,
      });

      console.log("[agent-deposit] approval confirmed", { approvalTxHash });

      const { proof, publicInputs } = await generateAgentDepositProof({
        agentId: agent.agentId,
        agentPrivateKey: privateKeyInput.trim(),
        agentPublicKey: agent.publicKey,
        currentEncryptedBalance: unlockedBalance.encrypted,
        token: unlockedBalance.token,
        amount: proofAmount,
      });

      console.log("[agent-deposit] proof generated", {
        publicInputs: publicInputs.length,
        proofBytes: proof.length,
      });

      const packedPublicInputs = convertAgentDepositPublicInputs(publicInputs);
      const depositCalldata = buildDepositCalldata(packedPublicInputs, proof);

      const { txHash } = await sendTransaction({
        to: config.confidentialErc20Address,
        data: depositCalldata,
      });

      console.log("[agent-deposit] deposit confirmed", {
        txHash,
        agentId: agent.agentId,
      });

      await registerDepositTransaction(txHash, unlockedBalance.token, erc20Amount);
      setDepositAmount("");
      setDepositSuccess(`Deposit confirmed on-chain: ${txHash}`);

      const refreshedBalance = await loadEncryptedBalance();
      const decryptedBalance = decryptAgentBalance(
        refreshedBalance.encrypted,
        privateKeyInput.trim(),
      );

      setEncryptedBalance(refreshedBalance.encrypted);
      setBalance(decryptedBalance);
      setBalanceToken(refreshedBalance.token);
    } catch (depositFlowError) {
      console.error("[agent-deposit] deposit failed", depositFlowError);
      setDepositError(
        depositFlowError instanceof Error
          ? depositFlowError.message
          : "Could not deposit funds into the agent treasury.",
      );
    } finally {
      setIsDepositing(false);
    }
  }

  async function handleWithdraw() {
    if (!agent) {
      return;
    }

    setWithdrawError(null);
    setWithdrawSuccess(null);
    setDepositError(null);
    setDepositSuccess(null);

    if (!privateKeyInput.trim()) {
      setWithdrawError("Unlock the private features with the agent private key before withdrawing.");
      return;
    }

    if (!isValidWithdrawAmount) {
      setWithdrawError("Enter a valid positive amount with at most 3 decimals.");
      return;
    }

    if (!address) {
      setWithdrawError("Connect your wallet before withdrawing funds.");
      return;
    }

    if (!isCorrectNetwork) {
      try {
        await switchNetwork();
      } catch (switchError) {
        setWithdrawError(
          switchError instanceof Error
            ? switchError.message
            : "Switch your wallet to Arbitrum Sepolia before withdrawing.",
        );
        return;
      }
    }

    setIsWithdrawing(true);

    try {
      const unlockedBalance = await loadEncryptedBalance();
      const proofAmount = convertDisplayAmountToProofAmount(withdrawAmount, "Withdraw amount");
      const erc20Amount = convertProofAmountToErc20Amount(proofAmount);

      console.log("[agent-withdraw] preparing withdraw", {
        agentId: agent.agentId,
        controller: address,
        token: unlockedBalance.token,
        displayAmount: withdrawAmount,
        proofAmount: proofAmount.toString(),
        erc20Amount: erc20Amount.toString(),
      });

      const { proof, publicInputs } = await generateAgentWithdrawProof({
        agentId: agent.agentId,
        agentPrivateKey: privateKeyInput.trim(),
        agentPublicKey: agent.publicKey,
        currentEncryptedBalance: unlockedBalance.encrypted,
        token: unlockedBalance.token,
        amount: proofAmount,
      });

      console.log("[agent-withdraw] proof generated", {
        publicInputs: publicInputs.length,
        proofBytes: proof.length,
      });

      const packedPublicInputs = convertAgentWithdrawPublicInputs(publicInputs);
      const withdrawCalldata = buildWithdrawCalldata(packedPublicInputs, proof);

      const { txHash } = await sendTransaction({
        to: config.confidentialErc20Address,
        data: withdrawCalldata,
      });

      console.log("[agent-withdraw] withdraw confirmed", {
        txHash,
        agentId: agent.agentId,
      });

      await registerWithdrawTransaction(txHash, unlockedBalance.token, erc20Amount);
      setWithdrawAmount("");
      setWithdrawSuccess(`Withdrawal confirmed on-chain: ${txHash}`);

      const refreshedBalance = await loadEncryptedBalance();
      const decryptedBalance = decryptAgentBalance(
        refreshedBalance.encrypted,
        privateKeyInput.trim(),
      );

      setEncryptedBalance(refreshedBalance.encrypted);
      setBalance(decryptedBalance);
      setBalanceToken(refreshedBalance.token);
    } catch (withdrawFlowError) {
      console.error("[agent-withdraw] withdraw failed", withdrawFlowError);
      setWithdrawError(
        withdrawFlowError instanceof Error
          ? withdrawFlowError.message
          : "Could not withdraw funds from the agent treasury.",
      );
    } finally {
      setIsWithdrawing(false);
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
                  {balance !== null
                    ? `${formatTokenAmount(balance, AGENT_TOKEN_DECIMALS)} WETH`
                    : "Protected"}
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  This balance is stored encrypted on-chain. Unlock private features once with the
                  agent private key to decrypt the balance locally and enable deposits from this
                  page.
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
                  balance and generate the private deposit proof.
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
                    Unlock the balance to reveal the on-chain token address.
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLoadBalance}
                  disabled={isLoadingBalance || !privateKeyInput.trim()}
                  className="sm:self-end"
                >
                  {isLoadingBalance
                    ? "Unlocking private features..."
                    : isPrivateFeaturesUnlocked
                      ? "Refresh balance"
                      : "Unlock private features"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-fuchsia-300">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Withdraw funds</CardTitle>
                  <p className="mt-1 text-sm text-slate-400">
                    Withdraw WETH from this encrypted treasury back to the controller wallet.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!address ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-3">
                      <p>Connect your wallet before withdrawing funds from this agent treasury.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void connectWallet()}
                        disabled={isConnecting}
                      >
                        {isConnecting ? "Connecting wallet..." : "Connect wallet"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {address && !isCorrectNetwork ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-3">
                      <p>Switch your wallet to Arbitrum Sepolia before withdrawing.</p>
                      <Button type="button" variant="secondary" onClick={() => void switchNetwork()}>
                        Switch network
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {!isPrivateFeaturesUnlocked ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Unlock private features above with the agent private key before generating a
                  withdraw proof.
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="withdraw-amount">Amount to withdraw</Label>
                <Input
                  id="withdraw-amount"
                  inputMode="decimal"
                  value={withdrawAmount}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    if (nextValue === "" || /^(?:0|[1-9]\d*)(?:\.\d{0,3})?$/.test(nextValue)) {
                      setWithdrawAmount(nextValue);
                    }
                  }}
                  placeholder="0.10"
                />
                <p className="text-xs leading-6 text-slate-500">
                  Uses the same proof amount encoding as deposits and submits the withdrawal proof
                  with the same wallet gas configuration.
                </p>
              </div>

              {!withdrawAmount || isValidWithdrawAmount ? null : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  Enter a valid positive amount with at most 3 decimals.
                </div>
              )}

              {walletError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {walletError}
                </div>
              ) : null}

              {withdrawError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {withdrawError}
                </div>
              ) : null}

              {withdrawSuccess ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  {withdrawSuccess}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-400">
                  This submits a private withdrawal proof on-chain and sends the underlying WETH
                  back to the connected controller wallet.
                </div>
                <Button
                  type="button"
                  onClick={() => void handleWithdraw()}
                  disabled={
                    !isValidWithdrawAmount ||
                    !address ||
                    !isCorrectNetwork ||
                    !isPrivateFeaturesUnlocked ||
                    isWithdrawing
                  }
                >
                  {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Deposit funds</CardTitle>
                  <p className="mt-1 text-sm text-slate-400">
                    Set how much WETH you want to deposit into this agent treasury.
                  </p>
                </div>
                </div>
              </CardHeader>
            <CardContent className="space-y-4">
              {!address ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-3">
                      <p>Connect your wallet before depositing funds into this agent treasury.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void connectWallet()}
                        disabled={isConnecting}
                      >
                        {isConnecting ? "Connecting wallet..." : "Connect wallet"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {address && !isCorrectNetwork ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-3">
                      <p>Switch your wallet to Arbitrum Sepolia before depositing.</p>
                      <Button type="button" variant="secondary" onClick={() => void switchNetwork()}>
                        Switch network
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {!isPrivateFeaturesUnlocked ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Unlock private features above with the agent private key before generating a
                  deposit proof.
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="deposit-amount">Amount to deposit</Label>
                <Input
                  id="deposit-amount"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    if (nextValue === "" || /^(?:0|[1-9]\d*)(?:\.\d{0,3})?$/.test(nextValue)) {
                      setDepositAmount(nextValue);
                    }
                  }}
                  placeholder="0.10"
                />
                <p className="text-xs leading-6 text-slate-500">
                  Accepts positive WETH amounts with up to 3 decimals, for example `0.125` or
                  `12.500`.
                </p>
              </div>

              {!depositAmount || isValidDepositAmount ? null : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  Enter a valid positive amount with at most 3 decimals.
                </div>
              )}

              {walletError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {walletError}
                </div>
              ) : null}

              {depositError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {depositError}
                </div>
              ) : null}

              {depositSuccess ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  {depositSuccess}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-400">
                  This funds the encrypted agent treasury with WETH by approving the ERC-20 transfer
                  first and then submitting a private deposit proof on-chain.
                </div>
                <Button
                  type="button"
                  onClick={() => void handleDeposit()}
                  disabled={
                    !isValidDepositAmount ||
                    !address ||
                    !isCorrectNetwork ||
                    !isPrivateFeaturesUnlocked ||
                    isDepositing
                  }
                >
                  {isDepositing ? "Depositing..." : "Deposit"}
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
