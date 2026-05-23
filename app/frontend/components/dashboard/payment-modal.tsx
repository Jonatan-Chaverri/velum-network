"use client";

import { useState } from "react";

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

const states = [
  "Preparing secure payment...",
  "Checking policy and recipient...",
  "Executing transfer...",
  "Payment completed",
];

export function PaymentModal() {
  const [step, setStep] = useState(0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send payment</DialogTitle>
          <DialogDescription>
            Choose a service or agent, add context, and confirm a secure automated payment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient agent</Label>
            <Input id="recipient" defaultValue="Compute Provider" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" defaultValue="240.00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <Input id="payment-method" defaultValue="Workspace balance" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="metadata">Metadata</Label>
            <Textarea
              id="metadata"
              defaultValue="Provision GPU batch inference for research cycle 4."
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
          <Button onClick={() => setStep((prev) => (prev + 1) % states.length)}>
            Confirm payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
