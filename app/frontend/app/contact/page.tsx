import Link from "next/link";
import { Mail, MessageSquareMore, Send, Sparkles } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <main>
      <SiteHeader />

      <section className="section-shell py-20 lg:py-24">
        <div className="max-w-3xl">
          <Badge>Contact</Badge>
          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Get in touch with Velum
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Reach out about partnerships, agent integrations, merchant onboarding,
            SDK questions, or anything else related to private agent commerce.
            This form is mocked for now, but the page structure is ready for real
            submission handling.
          </p>
        </div>
      </section>

      <section className="section-shell pb-20">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Contact options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Mail className="h-4 w-4 text-sky-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Email us directly</div>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      For direct contact, partnerships, or technical questions:
                    </p>
                    <Link
                      href="mailto:info@velumnetwork.com"
                      className="mt-3 inline-block text-sm font-medium text-white hover:text-sky-300"
                    >
                      info@velumnetwork.com
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <MessageSquareMore className="h-4 w-4 text-sky-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white">What people can ask about</div>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      SDK integration, registered agents, merchant onboarding,
                      confidential payments, product demos, and design partners.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-sky-400/10 to-fuchsia-400/10 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Sparkles className="h-4 w-4 text-sky-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Mock submission note</div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      The form on this page is currently presentation-only. It is
                      ready to connect to a backend or email workflow later.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Send a message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Jane Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Velum Labs" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="SDK integration, merchant onboarding, partnership..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us what you're building or how you'd like to work with Velum."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  Send message
                </Button>
                <span className="text-sm text-slate-500">
                  Mock submission only for now
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
