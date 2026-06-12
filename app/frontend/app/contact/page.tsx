import Link from "next/link";
import { Mail, MessageSquareMore } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONTACT_EMAIL = "jonathan.chaverri12@gmail.com";

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
          </p>
        </div>
      </section>

      <section className="section-shell pb-20">
        <div className="max-w-2xl">
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
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="mt-3 inline-block text-sm font-medium text-white hover:text-sky-300"
                    >
                      {CONTACT_EMAIL}
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
                    <div className="font-medium text-white">What you can ask about</div>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      SDK integration, registered agents, merchant onboarding,
                      confidential payments, product demos, and design partners.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
