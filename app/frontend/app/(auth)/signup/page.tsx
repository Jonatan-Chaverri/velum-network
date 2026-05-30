"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { setSessionCookies } from "@/lib/auth/cookies";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SignupForm = {
  name: string;
  lastName: string;
  organization: string;
  email: string;
  password: string;
};

const initialForm: SignupForm = {
  name: "",
  lastName: "",
  organization: "",
  email: "",
  password: "",
};

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name || !form.lastName || !form.email || !form.password) {
      setError("Name, last name, email, and password are required.");
      return;
    }

    if (!isValidPassword(form.password)) {
      setError(
        "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one number.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create account.");
      }

      setSessionCookies(data.tokens.accessToken, data.tokens.refreshToken);
      setForm(initialForm);
      setSuccess("Account created successfully. Redirecting...");
      router.push("/dashboard");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="section-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-lg rounded-[2rem]">
        <CardHeader className="space-y-6">
          <Logo />
          <div>
            <CardTitle className="text-3xl">Sign up</CardTitle>
            <p className="mt-2 text-sm text-slate-400">
              Create an account to register services, configure confidential payments,
              and monetize your existing AI agents.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Jane"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={form.organization}
                onChange={(event) =>
                  setForm((current) => ({ ...current, organization: event.target.value }))
                }
                placeholder="Velum Labs"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="jane@company.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Create a strong password"
              />
              <p className="text-xs leading-6 text-slate-500">
                Use at least 8 characters, including one uppercase letter, one
                lowercase letter, and one number.
              </p>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-sm text-slate-500">
              Already have access?{" "}
              <Link href="/login" className="text-white hover:text-sky-300">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
