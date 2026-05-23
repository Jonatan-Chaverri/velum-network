import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateAgentForm() {
  return (
    <div className="grid gap-6">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Step 1 · Define agent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Agent name</Label>
            <Input id="agent-name" placeholder="Research Procurement Agent" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the agent's payment behavior and commercial role."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" placeholder="Research" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Step 2 · Payment controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="limit">Spending limits</Label>
              <Input id="limit" placeholder="$10,000/day" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-methods">Allowed payment methods</Label>
              <Input id="payment-methods" placeholder="Card rails, account balance" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            Recipient whitelist toggle
            <div className="mt-2 text-slate-500">
              Restrict transfers to approved marketplaces, vendors, or internal agents.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Step 3 · Secure agent setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Agent account generated successfully
            </div>
            <p className="mt-2 text-emerald-50/80">
              Velum provisions secure payment credentials behind the scenes so your agent can transact without manual key handling.
            </p>
          </div>
          <Button>Create agent workspace</Button>
        </CardContent>
      </Card>
    </div>
  );
}
