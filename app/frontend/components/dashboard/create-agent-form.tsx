"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

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
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const keyPair = await generateAgentKeyPair();

      const response = await fetch(`${API_URL}/api/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          sellsServices: form.sellsServices,
          publicKey: serializePublicKey(keyPair.publicKey),
          privateKey: keyPair.privateKey,
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

      router.push("/dashboard/agents");
    } catch (submissionError) {
      setRequestError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not create agent workspace.",
      );
      setSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Secure workspace provisioning stays automatic
            </div>
            <p className="mt-2 text-emerald-50/80">
              Velum can still provision the agent workspace and credentials behind the
              scenes once the configuration is complete.
            </p>
          </div>

          {requestError ? <p className="text-sm text-rose-300">{requestError}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating agent workspace..." : "Create agent workspace"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
