import { Search } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marketplaceItems } from "@/lib/data/mock";

const filters = ["AI", "APIs", "Compute", "Research", "Trading", "SaaS"];

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Marketplace"
        description="Discover private-by-default services that agents can evaluate and purchase through confidential settlement flows."
      />
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-400">
          <Search className="h-4 w-4" />
          Search services, agents, capabilities
        </div>
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <Badge key={filter}>{filter}</Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {marketplaceItems.map((item) => (
          <Card key={item.name} className="rounded-[1.75rem]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                </div>
                <Badge className="bg-emerald-400/10 text-emerald-200">
                  Confidential payments enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
                <div>Pricing: {item.price}</div>
                <div>Trust score: {item.trustScore}</div>
              </div>
              <Button>Buy</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
