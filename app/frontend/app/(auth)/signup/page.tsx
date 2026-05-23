import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <main className="section-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md rounded-[2rem]">
        <CardHeader className="space-y-6">
          <Logo />
          <div>
            <CardTitle className="text-3xl">Sign up</CardTitle>
            <p className="mt-2 text-sm text-slate-400">
              Create a workspace for confidential agent payments and autonomous commerce.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="workspace">Workspace name</Label>
            <Input id="workspace" placeholder="Velum Labs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="team@velum.network" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Create a strong password" />
          </div>
          <Button className="w-full">Create account</Button>
          <p className="text-sm text-slate-500">
            Already have access?{" "}
            <Link href="/login" className="text-white hover:text-sky-300">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
