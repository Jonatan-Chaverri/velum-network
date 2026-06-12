"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
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

function InfoRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-6">
      <div className="shrink-0 pt-0.5 text-xs uppercase tracking-wide text-slate-500 sm:w-36">
        {label}
      </div>
      <div
        className={
          mono
            ? "min-w-0 break-all font-mono text-xs leading-5 text-slate-200 sm:text-right"
            : "min-w-0 text-sm text-slate-200 sm:text-right"
        }
      >
        {children}
      </div>
    </div>
  );
}

function WalletGate({
  address,
  isConnecting,
  isCorrectNetwork,
  onConnect,
  onSwitchNetwork,
}: {
  address: string | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  onConnect: () => void;
  onSwitchNetwork: () => void;
}) {
  if (!address) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-4 w-4 shrink-0" />
          Connect your controller wallet to move funds.
        </div>
        <Button type="button" variant="secondary" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect wallet"}
        </Button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Switch your wallet to Arbitrum Sepolia.
        </div>
        <Button type="button" variant="secondary" onClick={onSwitchNetwork}>
          Switch network
        </Button>
      </div>
    );
  }

  return null;
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
  const [isGeneratingSdkKey, setIsGeneratingSdkKey] = useState(false);
  const [sdkKey, setSdkKey] = useState<string | null>(null);
  const [sdkKeyExpiresAt, setSdkKeyExpiresAt] = useState<string | null>(null);
  const [sdkKeyError, setSdkKeyError] = useState<string | null>(null);
  const [sdkKeyCopied, setSdkKeyCopied] = useState(false);

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
    setSdkKey(null);
    setSdkKeyExpiresAt(null);
    setSdkKeyError(null);
    setSdkKeyCopied(false);
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

  async function handleGenerateSdkKey() {
    if (!agent) {
      return;
    }

    if (!privateKeyInput.trim()) {
      setSdkKeyError("Unlock the treasury first — the SDK key seals this agent's private key.");
      return;
    }

    setIsGeneratingSdkKey(true);
    setSdkKeyError(null);

    try {
      const accessToken = getAccessTokenCookie();
      if (!accessToken) {
        throw new Error("You must be signed in to issue an SDK API key.");
      }

      const response = await fetch(`${API_URL}/api/agents/${agent.id}/sdk-key`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privateKey: privateKeyInput.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        apiKey?: string;
        expiresAt?: string;
      };

      if (!response.ok || !data.success || !data.apiKey) {
        throw new Error(data.error || "Failed to issue the SDK API key.");
      }

      setSdkKey(data.apiKey);
      setSdkKeyExpiresAt(data.expiresAt ?? null);
      setSdkKeyCopied(false);
    } catch (sdkKeyFlowError) {
      console.error("[agent-sdk-key] issuance failed", sdkKeyFlowError);
      setSdkKeyError(
        sdkKeyFlowError instanceof Error
          ? sdkKeyFlowError.message
          : "Failed to issue the SDK API key.",
      );
    } finally {
      setIsGeneratingSdkKey(false);
    }
  }

  async function handleCopySdkKey() {
    if (!sdkKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sdkKey);
      setSdkKeyCopied(true);
      setTimeout(() => setSdkKeyCopied(false), 2000);
    } catch {
      setSdkKeyError("Could not copy to the clipboard — select the key manually.");
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

      // Decrypt the current balance locally: the circuit takes the plaintext as a
      // private witness and proves balance >= amount without revealing it on-chain.
      const currentPlainBalance = decryptAgentBalance(
        unlockedBalance.encrypted,
        privateKeyInput.trim(),
      );

      const { proof, publicInputs } = await generateAgentWithdrawProof({
        agentId: agent.agentId,
        agentPrivateKey: privateKeyInput.trim(),
        agentPublicKey: agent.publicKey,
        currentEncryptedBalance: unlockedBalance.encrypted,
        currentBalance: currentPlainBalance,
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
  const isUnlocked = isPrivateFeaturesUnlocked;

  return (
    <div className="space-y-8">
      <DashboardTopbar title={agent.title} description={agent.description} />

      {/* ── Confidential treasury: the primary surface of this page ── */}
      <Card className="rounded-[1.75rem]">
        <CardHeader className="border-b border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Confidential treasury</CardTitle>
                <p className="mt-1 text-sm text-slate-400">
                  Balance stored encrypted on-chain — only this agent&apos;s key can read it.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  isUnlocked
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                }
              >
                {isUnlocked ? "Unlocked" : "Locked"}
              </Badge>
              {isUnlocked ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadBalance}
                  disabled={isLoadingBalance}
                >
                  <RefreshCw className={isLoadingBalance ? "mr-2 h-3.5 w-3.5 animate-spin" : "mr-2 h-3.5 w-3.5"} />
                  Refresh
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!isUnlocked ? (
            /* Unlock gate: one clear action before anything else */
            <div className="mx-auto max-w-xl py-6 text-center">
              <div className="mx-auto w-fit rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-200">
                <KeyRound className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">
                Unlock this agent&apos;s treasury
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter the agent&apos;s private key to decrypt the balance and enable deposits
                and withdrawals. The key{" "}
                <span className="text-slate-200">never leaves your browser</span> — it&apos;s
                used locally to decrypt and to generate zero-knowledge proofs.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Input
                    id="agent-private-key"
                    type={showPrivateKey ? "text" : "password"}
                    value={privateKeyInput}
                    onChange={(event) => setPrivateKeyInput(event.target.value)}
                    placeholder="Agent private key (0x...)"
                    className="pr-11 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    aria-label={showPrivateKey ? "Hide private key" : "Show private key"}
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={handleLoadBalance}
                  disabled={isLoadingBalance || !privateKeyInput.trim()}
                >
                  {isLoadingBalance ? "Unlocking..." : "Unlock treasury"}
                </Button>
              </div>

              {balanceError ? (
                <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left text-sm text-rose-200">
                  {balanceError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Decrypted balance, front and center */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Decrypted balance
                  </div>
                  <div className="mt-2 text-5xl font-semibold tracking-tight text-white">
                    {balance !== null ? formatTokenAmount(balance, AGENT_TOKEN_DECIMALS) : "—"}
                    <span className="ml-3 text-xl font-normal text-slate-400">WETH</span>
                  </div>
                </div>
                {balanceToken ? (
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Token</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{balanceToken}</div>
                  </div>
                ) : null}
              </div>

              {balanceError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {balanceError}
                </div>
              ) : null}

              <WalletGate
                address={address}
                isConnecting={isConnecting}
                isCorrectNetwork={isCorrectNetwork}
                onConnect={() => void connectWallet()}
                onSwitchNetwork={() => void switchNetwork()}
              />

              {walletError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {walletError}
                </div>
              ) : null}

              {/* Deposit / Withdraw, side by side */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-center gap-3">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-300" />
                    <h4 className="font-medium text-white">Deposit</h4>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Fund the treasury with WETH from your wallet. Approves the ERC-20, then
                    submits a private deposit proof.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <Label htmlFor="deposit-amount" className="sr-only">
                      Amount to deposit
                    </Label>
                    <div className="flex gap-3">
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
                      <Button
                        type="button"
                        onClick={() => void handleDeposit()}
                        disabled={
                          !isValidDepositAmount || !address || !isCorrectNetwork || isDepositing
                        }
                      >
                        {isDepositing ? "Depositing..." : "Deposit"}
                      </Button>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      WETH, up to 3 decimals. Proof generation takes ~1 min in your browser.
                    </p>
                  </div>
                  {!depositAmount || isValidDepositAmount ? null : (
                    <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      Enter a valid positive amount with at most 3 decimals.
                    </div>
                  )}
                  {depositError ? (
                    <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {depositError}
                    </div>
                  ) : null}
                  {depositSuccess ? (
                    <div className="mt-3 break-all rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                      {depositSuccess}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-center gap-3">
                    <ArrowUpFromLine className="h-4 w-4 text-fuchsia-300" />
                    <h4 className="font-medium text-white">Withdraw</h4>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Send WETH back to your wallet. The proof verifies the treasury covers the
                    amount — without revealing it.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <Label htmlFor="withdraw-amount" className="sr-only">
                      Amount to withdraw
                    </Label>
                    <div className="flex gap-3">
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleWithdraw()}
                        disabled={
                          !isValidWithdrawAmount || !address || !isCorrectNetwork || isWithdrawing
                        }
                      >
                        {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                      </Button>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Paid out to the connected controller wallet.
                    </p>
                  </div>
                  {!withdrawAmount || isValidWithdrawAmount ? null : (
                    <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      Enter a valid positive amount with at most 3 decimals.
                    </div>
                  )}
                  {withdrawError ? (
                    <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {withdrawError}
                    </div>
                  ) : null}
                  {withdrawSuccess ? (
                    <div className="mt-3 break-all rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                      {withdrawSuccess}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SDK access: pay & charge programmatically ── */}
      <Card className="rounded-[1.75rem]">
        <CardHeader className="border-b border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>SDK access</CardTitle>
                <p className="mt-1 text-sm text-slate-400">
                  Let this agent pay and charge programmatically with{" "}
                  <span className="text-slate-200">@velum/sdk</span>.
                </p>
              </div>
            </div>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sky-300 underline-offset-4 hover:underline"
            >
              View the docs ↗
            </a>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {sdkKey ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                Copy this key now — it is shown <span className="font-semibold">only once</span>{" "}
                and cannot be retrieved again
                {sdkKeyExpiresAt ? ` (expires ${formatDate(sdkKeyExpiresAt)})` : ""}. Store it as{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VELUM_API_KEY</code>.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 break-all rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-200">
                  {sdkKey}
                </div>
                <Button type="button" variant="secondary" onClick={() => void handleCopySdkKey()}>
                  {sdkKeyCopied ? (
                    <>
                      <Check className="mr-2 h-3.5 w-3.5 text-emerald-300" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                Issues a 5-day API key for this agent. Your private key is sealed inside it
                (AES-256-GCM) so the platform&apos;s prover can pay on the agent&apos;s behalf —
                it is decrypted only in memory, never stored.
                {!isUnlocked ? (
                  <span className="mt-1 block text-amber-200/90">
                    Unlock the treasury above first — the key is needed to issue SDK access.
                  </span>
                ) : null}
              </p>
              <Button
                type="button"
                onClick={() => void handleGenerateSdkKey()}
                disabled={!isUnlocked || isGeneratingSdkKey}
              >
                <KeyRound className="mr-2 h-3.5 w-3.5" />
                {isGeneratingSdkKey ? "Generating..." : "Generate API key"}
              </Button>
            </div>
          )}

          {sdkKeyError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {sdkKeyError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Identity & service: compact reference info ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Velum agent ID">#{agent.agentId}</InfoRow>
            <InfoRow label="Category">{agent.category}</InfoRow>
            <InfoRow label="ERC-8004">
              {agent.erc8004Url && agent.erc8004AgentId != null ? (
                <a
                  href={agent.erc8004Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sky-300 underline-offset-4 hover:underline"
                >
                  Agent #{agent.erc8004AgentId} — view on-chain identity ↗
                </a>
              ) : (
                <span className="text-slate-500">Not registered</span>
              )}
            </InfoRow>
            <InfoRow label="Created">{formatDate(agent.createdAt)}</InfoRow>
            <InfoRow label="Updated">{formatDate(agent.updatedAt)}</InfoRow>
            <InfoRow label="ElGamal public key" mono>
              {agent.publicKey}
            </InfoRow>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Service</CardTitle>
              {agent.service ? (
                <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  Selling services
                </Badge>
              ) : (
                <Badge className="border-white/10 bg-white/5 text-slate-300">Internal only</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {agent.service ? (
              <>
                <InfoRow label="Price">{priceLabel}</InfoRow>
                <InfoRow label="Pricing model">{agent.service.pricingModel}</InfoRow>
                <InfoRow label="Status">{agent.service.status}</InfoRow>
                <InfoRow label="Endpoint" mono>
                  {agent.service.endpointUrl}
                </InfoRow>
                <InfoRow label="Listed since">{formatDate(agent.service.createdAt)}</InfoRow>
              </>
            ) : (
              <p className="py-3 text-sm leading-6 text-slate-400">
                This agent doesn&apos;t expose a paid service in the marketplace. It can still
                hold a confidential treasury and pay other agents.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
