"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAccessTokenCookie } from "@/lib/auth/cookies";
import { generateAgentKeyPair, serializePublicKey } from "@/lib/utils/crypto";
import { cn } from "@/lib/utils";

const categoryOptions = [
  "Research",
  "Payments",
  "Customer Support",
  "Sales",
  "Operations",
  "Data Analysis",
  "Security",
  "Marketing",
  "Developer Tools",
  "Procurement",
] as const;

const priceModelOptions = ["per response", "subscription"] as const;
const currencyOptions = ["USDC"] as const;
const statusOptions = ["visible", "hidden"] as const;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type PriceModel = (typeof priceModelOptions)[number];
type Currency = (typeof currencyOptions)[number];
type VisibilityStatus = (typeof statusOptions)[number];

type FormState = {
  name: string;
  description: string;
  category: string;
  sellsServices: boolean;
  price: string;
  priceModel: PriceModel;
  currency: Currency;
  endpointUrl: string;
  status: VisibilityStatus;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type PreparedRegistration = {
  agentId: string;
  publicKey: string;
  privateKey: string;
  txHash?: string;
};

const initialForm: FormState = {
  name: "",
  description: "",
  category: categoryOptions[0],
  sellsServices: false,
  price: "",
  priceModel: "per response",
  currency: "USDC",
  endpointUrl: "",
  status: "visible",
};

function isValidPrice(value: string) {
  return /^\d+(\.\d{1,6})?$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function SelectField({
  id,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-60",
          disabled && "text-slate-300",
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function CreateAgentForm() {
  const router = useRouter();
  const {
    address,
    connectWallet,
    error: walletError,
    isConnecting,
    isCorrectNetwork,
    sendTransaction,
    switchNetwork,
  } = useWallet();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string | null>(null);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [preparedRegistration, setPreparedRegistration] = useState<PreparedRegistration | null>(
    null,
  );

  const billingUnit = form.priceModel === "per response" ? "response" : "month";

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(null);
    setSuccess(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Agent name is required.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (!form.category) {
      nextErrors.category = "Please select a category.";
    }

    if (form.sellsServices) {
      if (!form.price.trim()) {
        nextErrors.price = "Price is required when the agent sells services.";
      } else if (!isValidPrice(form.price.trim())) {
        nextErrors.price = "Use a positive number with up to 6 decimal places.";
      }

      if (!form.endpointUrl.trim()) {
        nextErrors.endpointUrl = "Endpoint URL is required.";
      } else if (!isValidUrl(form.endpointUrl.trim())) {
        nextErrors.endpointUrl = "Enter a valid http or https URL.";
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setRequestError(null);
      setSuccess(null);
      return;
    }

    const accessToken = getAccessTokenCookie();

    if (!accessToken) {
      setRequestError("You need to be logged in to create an agent.");
      setSuccess(null);
      return;
    }

    if (!address) {
      setRequestError("Connect your MetaMask wallet before creating an agent.");
      setSuccess(null);
      return;
    }

    if (!isCorrectNetwork) {
      setRequestError("Switch your wallet to Arbitrum Sepolia before creating an agent.");
      setSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);
    setSuccess(null);

    let registration = preparedRegistration;

    try {
      if (!registration) {
        const keyPair = await generateAgentKeyPair();
        const serializedPublicKey = serializePublicKey(keyPair.publicKey);

        console.log("[agent-create] preparing agent registration", {
          address,
          sellsServices: form.sellsServices,
          category: form.category,
        });

        const prepareResponse = await fetch(`${API_URL}/api/agents/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            publicKey: serializedPublicKey,
          }),
        });

        const preparePayload = (await prepareResponse.json()) as {
          error?: string;
          agentId?: string;
          transaction?: {
            to: string;
            data: string;
          };
        };

        if (!prepareResponse.ok || !preparePayload.agentId || !preparePayload.transaction) {
          throw new Error(preparePayload.error || "Could not prepare the on-chain agent deploy.");
        }

        console.log("[agent-create] prepared on backend", {
          agentId: preparePayload.agentId,
          contract: preparePayload.transaction.to,
        });

        const { txHash } = await sendTransaction(preparePayload.transaction);

        registration = {
          agentId: preparePayload.agentId,
          publicKey: serializedPublicKey,
          privateKey: keyPair.privateKey,
          txHash,
        };
        setPreparedRegistration(registration);
        console.log("[agent-create] on-chain registration confirmed", {
          agentId: registration.agentId,
          txHash,
        });
      }

      console.log("[agent-create] persisting agent metadata", {
        agentId: registration.agentId,
        txHash: registration.txHash ?? null,
      });

      const response = await fetch(`${API_URL}/api/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          agentId: registration.agentId,
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          sellsServices: form.sellsServices,
          publicKey: registration.publicKey,
          service: form.sellsServices
            ? {
                price: form.price.trim(),
                priceModel: form.priceModel,
                currency: form.currency,
                billingUnit,
                endpointUrl: form.endpointUrl.trim(),
                status: form.status,
              }
            : undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not create agent workspace.");
      }

      console.log("[agent-create] agent persisted successfully", {
        agentId: registration.agentId,
        txHash: registration.txHash ?? null,
      });
      setGeneratedPrivateKey(registration.privateKey);
      setPrivateKeyCopied(false);
      setPreparedRegistration(null);
      setSuccess("Agent deployed on-chain and saved in Velum.");
    } catch (submissionError) {
      const fallbackMessage = "Could not create agent workspace.";
      const message =
        submissionError instanceof Error ? submissionError.message : fallbackMessage;

      if (registration) {
        console.error("[agent-create] failed after on-chain registration", {
          agentId: registration.agentId,
          txHash: registration.txHash ?? null,
          error: submissionError,
        });
        setRequestError(
          `${message} The on-chain agent registration may already have succeeded${
            registration.txHash ? ` (tx: ${registration.txHash})` : ""
          }, so you can retry and Velum will only save the remaining backend metadata.`,
        );
      } else {
        console.error("[agent-create] failed before backend persistence", {
          error: submissionError,
        });
        setRequestError(message);
      }
      setSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (generatedPrivateKey) {
    return (
      <Card className="rounded-[1.75rem] border-amber-400/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-amber-200">Save your agent private key</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p className="text-sm text-amber-100/90">
            This private key is shown <strong>only once</strong> and is never stored by
            Velum. Copy it now and keep it somewhere safe — you will not be able to
            recover it later. Anyone with this key controls the agent&apos;s confidential
            balances.
          </p>

          <div className="grid gap-2">
            <Label htmlFor="generated-private-key">Private key</Label>
            <Textarea
              id="generated-private-key"
              value={generatedPrivateKey}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedPrivateKey);
                  setPrivateKeyCopied(true);
                } catch {
                  setPrivateKeyCopied(false);
                }
              }}
            >
              {privateKeyCopied ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Copied
                </span>
              ) : (
                "Copy to clipboard"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setGeneratedPrivateKey(null);
                router.push("/dashboard/agents");
              }}
            >
              I have saved my private key
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Agent basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Research Procurement Agent"
            />
            {errors.name ? <p className="text-sm text-rose-300">{errors.name}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Describe what the agent does and how it interacts with the network."
            />
            {errors.description ? (
              <p className="text-sm text-rose-300">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <SelectField
                id="category"
                value={form.category}
                onChange={(value) => updateForm("category", value)}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option} className="bg-slate-950 text-white">
                    {option}
                  </option>
                ))}
              </SelectField>
              {errors.category ? (
                <p className="text-sm text-rose-300">{errors.category}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Sell services to other agents</Label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                <Button
                  type="button"
                  variant={form.sellsServices ? "default" : "ghost"}
                  onClick={() => updateForm("sellsServices", true)}
                  className="rounded-[1rem]"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={form.sellsServices ? "ghost" : "default"}
                  onClick={() => updateForm("sellsServices", false)}
                  className="rounded-[1rem]"
                >
                  No
                </Button>
              </div>
              <p className="text-xs leading-6 text-slate-500">
                Enable this if the agent will expose paid services to other agents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {form.sellsServices ? (
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Service offering</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  placeholder="0.250000"
                />
                <p className="text-xs leading-6 text-slate-500">
                  Accepts floating point values up to 6 decimals.
                </p>
                {errors.price ? <p className="text-sm text-rose-300">{errors.price}</p> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price-model">Price model</Label>
                <SelectField
                  id="price-model"
                  value={form.priceModel}
                  onChange={(value) => updateForm("priceModel", value as PriceModel)}
                >
                  {priceModelOptions.map((option) => (
                    <option key={option} value={option} className="bg-slate-950 text-white">
                      {option}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <SelectField
                  id="currency"
                  value={form.currency}
                  onChange={(value) => updateForm("currency", value as Currency)}
                >
                  {currencyOptions.map((option) => (
                    <option key={option} value={option} className="bg-slate-950 text-white">
                      {option}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="billing-unit">Billing unit</Label>
                <SelectField
                  id="billing-unit"
                  value={billingUnit}
                  onChange={() => undefined}
                  disabled
                >
                  <option value={billingUnit} className="bg-slate-950 text-white">
                    {billingUnit}
                  </option>
                </SelectField>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <SelectField
                  id="status"
                  value={form.status}
                  onChange={(value) => updateForm("status", value as VisibilityStatus)}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option} className="bg-slate-950 text-white">
                      {option}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endpoint-url">Endpoint URL</Label>
              <Input
                id="endpoint-url"
                type="url"
                value={form.endpointUrl}
                onChange={(event) => updateForm("endpointUrl", event.target.value)}
                placeholder="https://agent.example.com/api/respond"
              />
              <p className="text-xs leading-6 text-slate-500">
                This endpoint will be used by other agents to access the service.
              </p>
              {errors.endpointUrl ? (
                <p className="text-sm text-rose-300">{errors.endpointUrl}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Ready to create</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!address || !isCorrectNetwork ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Wallet approval is required
              </div>
              <p className="mt-2 text-amber-50/80">
                The new agent must be registered on-chain from your wallet so you become its
                controller. Connect MetaMask and use Arbitrum Sepolia before submitting.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!address ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={connectWallet}
                    disabled={isConnecting}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={switchNetwork}>
                    Switch to Arbitrum Sepolia
                  </Button>
                )}
              </div>
              {walletError ? <p className="mt-3 text-xs text-amber-200">{walletError}</p> : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Wallet-controlled deployment, backend-managed workspace
            </div>
            <p className="mt-2 text-emerald-50/80">
              Velum still provisions the workspace and metadata automatically, but the
              registration transaction is now signed directly by your wallet so you remain
              the controller of the agent on-chain.
            </p>
          </div>

          {requestError ? <p className="text-sm text-rose-300">{requestError}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <Button type="submit" disabled={isSubmitting || !address || !isCorrectNetwork}>
            {isSubmitting
              ? preparedRegistration
                ? "Saving agent metadata..."
                : "Waiting for wallet confirmation..."
              : "Create agent workspace"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
